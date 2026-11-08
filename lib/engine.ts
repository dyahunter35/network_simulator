import {
  findDevice,
  findDeviceByIp,
  findIfaceByIp,
  ifaceOf,
  isL2,
  isRouterLike,
  peerOf,
  primaryIp,
} from "./devices";
import {
  cidrMatch,
  inSubnet,
  ipLte,
  ipToInt,
  isPrivateIp,
  isValidIp,
  intToIp,
  randomLatency,
} from "./ip";
import type {
  ArpEntry,
  Device,
  DhcpResult,
  DnsResult,
  FlowResult,
  HttpResult,
  Iface,
  NetState,
  PacketDetail,
  PingResult,
  Protocol,
  RuntimeState,
  SimEvent,
} from "./types";

interface Ctx {
  s: NetState;
  events: SimEvent[];
  seq: number;
  clock: number;
  startedAt: number;
}

interface AddEventInput {
  device?: Device;
  deviceId?: string;
  deviceName?: string;
  kind: SimEvent["kind"];
  layer?: SimEvent["layer"];
  title: string;
  detail?: string;
  packet?: PacketDetail;
}

function createCtx(s: NetState): Ctx {
  return { s, events: [], seq: 0, clock: 0, startedAt: Date.now() };
}

function add(ctx: Ctx, input: AddEventInput): SimEvent {
  ctx.clock += 5 + (ctx.seq % 4) * 3;
  const event: SimEvent = {
    id: `ev-${Date.now()}-${++ctx.seq}`,
    at: ctx.startedAt,
    t: ctx.clock,
    kind: input.kind,
    layer: input.layer,
    title: input.title,
    detail: input.detail,
    packet: input.packet,
    deviceId: input.deviceId ?? input.device?.id,
    deviceName: input.deviceName ?? input.device?.name,
  };
  ctx.events.push(event);
  return event;
}

function cloneState(state: NetState): NetState {
  return {
    devices: structuredClone(state.devices),
    links: structuredClone(state.links),
    runtime: structuredClone(state.runtime),
  };
}

function isBroadcast(mac: string): boolean {
  return mac === "FF:FF:FF:FF:FF:FF" || mac === "ff:ff:ff:ff:ff:ff";
}

/* ------------------------------- L2 discovery ------------------------------ */

export interface L2Endpoint {
  deviceId: string;
  ifaceId: string;
  path: string[];
  vlan: number | null;
}

export function l2Reach(state: NetState, deviceId: string, ifaceId: string): L2Endpoint[] {
  const peer = peerOf(state, deviceId, ifaceId);
  if (!peer) return [];
  const endpoints: L2Endpoint[] = [];
  const visited = new Set<string>([deviceId]);
  type Item = { deviceId: string; ifaceId: string; path: string[]; vlan: number | null };
  const queue: Item[] = [
    { deviceId: peer.deviceId, ifaceId: peer.ifaceId, path: [deviceId, peer.deviceId], vlan: null },
  ];

  while (queue.length) {
    const cur = queue.shift()!;
    const device = findDevice(state, cur.deviceId);
    if (!device) continue;
    if (visited.has(device.id)) continue;
    visited.add(device.id);

    if (!isL2(device)) {
      endpoints.push({
        deviceId: device.id,
        ifaceId: cur.ifaceId,
        path: cur.path,
        vlan: cur.vlan,
      });
      continue;
    }

    let vlan = cur.vlan;
    const entryIface = ifaceOf(device, cur.ifaceId);
    if (!entryIface) continue;

    if (device.kind === "switch") {
      if (entryIface.trunk) {
        // Trunks carry everything.
      } else {
        const portVlan = entryIface.vlan ?? 1;
        if (vlan !== null && portVlan !== vlan) continue;
        vlan = portVlan;
      }
    }

    for (const port of device.interfaces) {
      if (port.id === cur.ifaceId) continue;
      if (device.kind === "switch") {
        if (vlan !== null && !port.trunk && (port.vlan ?? 1) !== vlan) continue;
      }
      const next = peerOf(state, device.id, port.id);
      if (!next) continue;
      if (visited.has(next.deviceId)) continue;
      queue.push({
        deviceId: next.deviceId,
        ifaceId: next.ifaceId,
        path: [...cur.path, next.deviceId],
        vlan,
      });
    }
  }
  return endpoints;
}

function switchPortToward(state: NetState, switchId: string, neighborId: string): Iface | undefined {
  const sw = findDevice(state, switchId);
  if (!sw) return undefined;
  for (const port of sw.interfaces) {
    const p = peerOf(state, switchId, port.id);
    if (p?.deviceId === neighborId) return port;
  }
  return undefined;
}

function learnMac(
  ctx: Ctx,
  switchDev: Device,
  prevDeviceId: string,
  mac: string,
  vlan: number | null,
  silent: boolean
) {
  const port = switchPortToward(ctx.s, switchDev.id, prevDeviceId);
  if (!port) return;
  const table = (ctx.s.runtime.mac[switchDev.id] ??= []);
  const entry = table.find((m) => m.mac === mac && m.vlan === (vlan ?? port.vlan ?? 1));
  if (entry) {
    entry.ifaceId = port.id;
    entry.learnedAt = Date.now();
  } else {
    table.push({
      mac,
      ifaceId: port.id,
      vlan: vlan ?? port.vlan ?? 1,
      learnedAt: Date.now(),
    });
  }
  if (!silent) {
    add(ctx, {
      device: switchDev,
      kind: "switch",
      layer: "L2",
      title: `تعلّم عنوان MAC ${mac}`,
      detail: `تم ربط ${mac} بالمنفذ ${port.name} — VLAN ${vlan ?? port.vlan ?? 1}`,
    });
  }
}

function macKnownPort(state: NetState, switchId: string, mac: string): Iface | undefined {
  const sw = findDevice(state, switchId);
  const entry = (state.runtime.mac[switchId] ?? []).find((m) => m.mac === mac);
  if (!sw || !entry) return undefined;
  return ifaceOf(sw, entry.ifaceId);
}

/* ------------------------------- ARP / L2 flow ----------------------------- */

function arpResolve(
  ctx: Ctx,
  device: Device,
  iface: Iface,
  targetIp: string,
  silent = false
): { mac: string; deviceId: string; ifaceId: string; fromCache: boolean } | null {
  const table = (ctx.s.runtime.arp[device.id] ??= []);
  const cached = table.find((e) => e.ip === targetIp && e.ifaceId === iface.id);
  if (cached) {
    return { mac: cached.mac, deviceId: cached.deviceId ?? "", ifaceId: "", fromCache: true };
  }

  const reach = l2Reach(ctx.s, device.id, iface.id);
  let target: { device: Device; iface: Iface; endpoint: L2Endpoint } | null = null;
  for (const ep of reach) {
    const dev = findDevice(ctx.s, ep.deviceId);
    if (!dev) continue;
    const targetIface = ifaceOf(dev, ep.ifaceId);
    if (targetIface?.ip === targetIp) {
      target = { device: dev, iface: targetIface, endpoint: ep };
      break;
    }
  }

  if (!target) {
    if (!silent) {
      add(ctx, {
        device,
        kind: "arp",
        layer: "L2",
        title: `فشل ARP للعنوان ${targetIp}`,
        detail: `لا يوجد جهاز يستجيب لهذا العنوان داخل نطاق البث (${reach.length} جهاز تم فحصه).`,
      });
    }
    return null;
  }

  if (!silent) {
    add(ctx, {
      device,
      kind: "arp",
      layer: "L2",
      title: `ARP Request — من يستخدم ${targetIp}؟`,
      detail: `بث إلى ${reach.length} جهازًا داخل نطاق البث عبر ${iface.name}.`,
      packet: {
        title: "طلب ARP",
        protocol: "ARP",
        summary: `من ${device.name} للبحث عن ${targetIp}`,
        layers: [
          {
            name: "Ethernet II",
            subtitle: "إطار الطبقة الثانية",
            fields: [
              ["Destination", "FF:FF:FF:FF:FF:FF (بث)"],
              ["Source", iface.mac],
              ["Type", "0x0806 — ARP"],
            ],
          },
          {
            name: "ARP",
            subtitle: "بروتوكول تحليل العناوين",
            fields: [
              ["Operation", "Request (1)"],
              ["Sender IP", iface.ip ?? "—"],
              ["Sender MAC", iface.mac],
              ["Target IP", targetIp],
              ["Target MAC", "00:00:00:00:00:00"],
            ],
          },
        ],
        payload: "من يملك هذا العنوان؟ أرسل عنوانك الفيزيائي.",
      },
    });
  }

  const now = Date.now();
  const forwardEntry: ArpEntry = {
    ip: targetIp,
    mac: target.iface.mac,
    ifaceId: iface.id,
    deviceId: target.device.id,
    at: now,
  };
  table.push(forwardEntry);

  const reverseTable = (ctx.s.runtime.arp[target.device.id] ??= []);
  if (!reverseTable.some((e) => e.ip === iface.ip && e.ifaceId === target.iface.id)) {
    reverseTable.push({
      ip: iface.ip ?? "",
      mac: iface.mac,
      ifaceId: target.iface.id,
      deviceId: device.id,
      at: now,
    });
  }

  if (!silent) {
    add(ctx, {
      device: target.device,
      kind: "arp",
      layer: "L2",
      title: `ARP Reply — ${targetIp} هو ${target.iface.mac}`,
      detail: `${target.device.name} أرسل عنوانه الفيزيائي إلى ${device.name} (Unicast).`,
      packet: {
        title: "رد ARP",
        protocol: "ARP",
        summary: `${targetIp} مرتبط بـ ${target.iface.mac}`,
        layers: [
          {
            name: "Ethernet II",
            fields: [
              ["Destination", iface.mac],
              ["Source", target.iface.mac],
              ["Type", "0x0806 — ARP"],
            ],
          },
          {
            name: "ARP",
            fields: [
              ["Operation", "Reply (2)"],
              ["Sender IP", targetIp],
              ["Sender MAC", target.iface.mac],
              ["Target IP", iface.ip ?? "—"],
              ["Target MAC", iface.mac],
            ],
          },
        ],
        payload: "تم تحديث جدول ARP لدى المرسل.",
      },
    });
  }

  return {
    mac: target.iface.mac,
    deviceId: target.device.id,
    ifaceId: target.iface.id,
    fromCache: false,
  };
}

interface TransitResult {
  ok: boolean;
  nextDeviceId?: string;
  nextIfaceId?: string;
  path: string[];
  error?: string;
}

function l2Transit(
  ctx: Ctx,
  fromDevice: Device,
  egress: Iface,
  targetIp: string,
  srcIp: string,
  dstIp: string,
  srcMac: string,
  dstMac: string,
  ttl: number,
  proto: Protocol,
  silent: boolean
): TransitResult {
  const reach = l2Reach(ctx.s, fromDevice.id, egress.id);
  const endpoint = reach.find((ep) => {
    const dev = findDevice(ctx.s, ep.deviceId);
    return ifaceOf(dev!, ep.ifaceId)?.ip === targetIp;
  });

  if (!endpoint) {
    return {
      ok: false,
      path: [],
      error: `لا يمكن الوصول إلى ${targetIp} عبر الشبكة المحلية (${egress.name}).`,
    };
  }

  const switchPath: string[] = [];
  for (let i = 1; i < endpoint.path.length - 1; i++) {
    const swId = endpoint.path[i];
    const sw = findDevice(ctx.s, swId);
    if (!sw || !isL2(sw)) continue;
    const prevId = endpoint.path[i - 1];
    learnMac(ctx, sw, prevId, srcMac, null, silent);
    switchPath.push(swId);

    if (!silent) {
      const known = !isBroadcast(dstMac) ? macKnownPort(ctx.s, sw.id, dstMac) : undefined;
      add(ctx, {
        device: sw,
        kind: "switch",
        layer: "L2",
        title: isBroadcast(dstMac)
          ? "بث الإطار إلى جميع المنافذ"
          : known
            ? `إعادة توجيه الإطار إلى ${known.name}`
            : "Unknown Unicast — بث احتياطي",
        detail: `${srcMac} → ${dstMac} · ${srcIp} → ${dstIp} · TTL ${ttl}`,
        packet: {
          title: "إطار Ethernet",
          protocol: "Ethernet",
          summary: `تبديل الإطار داخل ${sw.name}`,
          layers: [
            {
              name: "Ethernet II",
              subtitle: `VLAN ${known?.vlan ?? "1"}`,
              fields: [
                ["Destination", isBroadcast(dstMac) ? `${dstMac} (بث)` : dstMac],
                ["Source", srcMac],
                ["Type", proto === "tcp" ? "0x0800 — IPv4" : "0x0800 — IPv4"],
              ],
            },
            {
              name: "IPv4",
              fields: [
                ["Source IP", srcIp],
                ["Destination IP", dstIp],
                ["TTL", String(ttl)],
                ["Protocol", proto === "icmp" ? "ICMP (1)" : proto === "tcp" ? "TCP (6)" : "UDP (17)"],
              ],
            },
          ],
          payload: "يتم إعادة توليد الإطار عند كل قفزة، أما حزمة IP فتبقى كما هي.",
        },
      });
    }
  }

  return {
    ok: true,
    nextDeviceId: endpoint.deviceId,
    nextIfaceId: endpoint.ifaceId,
    path: [...switchPath, endpoint.deviceId],
  };
}

/* -------------------------------- Routing ---------------------------------- */

export interface RouteHit {
  ifaceId: string;
  nextHop: string;
  kind: "connected" | "static" | "gateway";
  prefix: number;
}

export function pickRoute(
  state: NetState,
  device: Device,
  destIp: string
): RouteHit | null {
  for (const iface of device.interfaces) {
    if (iface.ip && iface.prefix !== undefined && inSubnet(destIp, iface.ip, iface.prefix)) {
      return { ifaceId: iface.id, nextHop: destIp, kind: "connected", prefix: iface.prefix };
    }
  }

  let best: { route: Device["routes"][number]; iface: Iface } | null = null;
  for (const route of device.routes) {
    const iface = device.interfaces.find(
      (i) => i.ip && i.prefix !== undefined && route.via && inSubnet(route.via, i.ip, i.prefix)
    );
    if (!iface) continue;
    if (!cidrMatch(`${route.dest}/${route.prefix}`, destIp)) continue;
    if (!best || route.prefix > best.route.prefix) {
      best = { route, iface };
    }
  }
  if (best) {
    return {
      ifaceId: best.iface.id,
      nextHop: best.route.via || destIp,
      kind: "static",
      prefix: best.route.prefix,
    };
  }

  if (!isRouterLike(device) && device.gateway) {
    const iface = device.interfaces.find(
      (i) => i.ip && i.prefix !== undefined && inSubnet(device.gateway!, i.ip, i.prefix)
    );
    if (iface) {
      return { ifaceId: iface.id, nextHop: device.gateway, kind: "gateway", prefix: iface.prefix ?? 24 };
    }
  }

  return null;
}

/* --------------------------------- Firewall -------------------------------- */

function checkFirewall(
  ctx: Ctx,
  fw: Device,
  srcIp: string,
  dstIp: string,
  proto: Protocol,
  dport: number | undefined,
  silent: boolean
): boolean {
  const rules = fw.firewallRules ?? [];
  const match = rules.find((rule) => {
    if (rule.protocol !== "any" && rule.protocol !== proto) return false;
    if (rule.port && rule.protocol === "tcp" && dport !== rule.port) return false;
    return cidrMatch(rule.src || "any", srcIp) && cidrMatch(rule.dst || "any", dstIp);
  });

  const policy = fw.firewallDefault ?? "allow";
  const allowed = match ? match.action === "allow" : policy === "allow";
  if (!silent) {
    add(ctx, {
      device: fw,
      kind: "firewall",
      layer: "L4",
      title: match
        ? `${match.action === "allow" ? "سماح" : "حظر"} بموجب القاعدة: ${match.src} → ${match.dst} ${match.protocol.toUpperCase()}${match.port ? `:${match.port}` : ""}`
        : `تطبيق السياسة الافتراضية (${policy === "allow" ? "سماح" : "حظر"})`,
      detail: `${srcIp} → ${dstIp} · ${proto.toUpperCase()}${dport ? `/${dport}` : ""} · ${allowed ? "مرور مسموح" : "تم إسقاط الحزمة"}`,
      packet: {
        title: allowed ? "حزمة مسموحة" : "حزمة محظورة",
        protocol: proto.toUpperCase(),
        summary: `${fw.name} تحقق من قواعد الأمان`,
        layers: [
          {
            name: "IPv4",
            fields: [
              ["Source", srcIp],
              ["Destination", dstIp],
              ["Protocol", proto.toUpperCase()],
            ],
          },
          {
            name: "Transport",
            fields: [
              ["Protocol", proto.toUpperCase()],
              ["Destination port", dport ? String(dport) : "—"],
            ],
          },
        ],
        payload: allowed ? "متابعة الفحص ثم التوجيه." : "إسقاط الحزمة وإنهاء الاتصال.",
      },
    });
  }
  return allowed;
}

/* ------------------------------- NAT helpers ------------------------------- */

function applyNatForward(
  ctx: Ctx,
  router: Device,
  egress: Iface,
  srcIp: string,
  dstIp: string,
  silent: boolean
): string {
  if (!router.nat || !isPrivateIp(srcIp) || !egress.ip) return srcIp;
  if (inSubnet(srcIp, egress.ip, egress.prefix ?? 24)) return srcIp;
  if (!isPrivateIp(egress.ip)) {
    const existing = ctx.s.runtime.nat.find(
      (n) => n.insideIp === srcIp && n.outsideIp === egress.ip && n.destIp === dstIp
    );
    if (!existing) {
      ctx.s.runtime.nat.push({
        id: `nat-${ctx.s.runtime.nat.length + 1}`,
        insideIp: srcIp,
        outsideIp: egress.ip,
        destIp: dstIp,
        at: Date.now(),
      });
    }
    if (!silent) {
      add(ctx, {
        device: router,
        kind: "nat",
        layer: "L3",
        title: `ترجمة NAT: ${srcIp} ↔ ${egress.ip}`,
        detail: `تم استبدال المصدر الخاص بالعنوان العام للمنفذ ${egress.name} قبل الخروج إلى ${dstIp}.`,
        packet: {
          title: "ترجمة عنوان الشبكة",
          protocol: "NAT",
          summary: "NAT Overload — ترجمة عنوان المصدر",
          layers: [
            {
              name: "قبل الترجمة",
              fields: [
                ["Source IP", srcIp],
                ["Destination IP", dstIp],
                ["Interface", egress.name],
              ],
            },
            {
              name: "بعد الترجمة",
              fields: [
                ["Source IP", egress.ip],
                ["Destination IP", dstIp],
                ["الجدول", "NAT Translation Table"],
              ],
            },
          ],
          payload: "الاحتفاظ بالعنوان الخاص في جدول الترجمة لإعادة الردود لاحقًا.",
        },
      });
    }
    return egress.ip;
  }
  return srcIp;
}

function applyNatReverse(
  ctx: Ctx,
  router: Device,
  srcIp: string,
  dstIp: string,
  silent: boolean
): { srcIp: string; dstIp: string; translated: boolean } {
  if (!router.nat) return { srcIp, dstIp, translated: false };
  const entry = [...ctx.s.runtime.nat]
    .reverse()
    .find((n) => n.outsideIp === dstIp && n.destIp === srcIp);
  if (!entry) return { srcIp, dstIp, translated: false };
  if (!silent) {
    add(ctx, {
      device: router,
      kind: "nat",
      layer: "L3",
      title: `إعادة الترجمة: ${dstIp} → ${entry.insideIp}`,
      detail: "وصل رد من الشبكة العامة، فتمت مطابقته مع جلسة NAT وإعادة توجيهه للجهاز الداخلي.",
      packet: {
        title: "رد NAT",
        protocol: "NAT",
        summary: "Reverse NAT Translation",
        layers: [
          {
            name: "الرد الوارد",
            fields: [
              ["Source IP", srcIp],
              ["Destination IP", dstIp],
            ],
          },
          {
            name: "بعد المطابقة",
            fields: [
              ["Source IP", srcIp],
              ["Destination IP", entry.insideIp],
              ["الجلسة", entry.id],
            ],
          },
        ],
        payload: "إعادة كتابة عنوان الوجهة إلى الجهاز الداخلي.",
      },
    });
  }
  return { srcIp, dstIp: entry.insideIp, translated: true };
}

/* ------------------------------- Packet view ------------------------------- */

function icmpPacket(
  device: Device,
  iface: Iface,
  dstMac: string,
  srcIp: string,
  dstIp: string,
  ttl: number,
  type: "request" | "reply"
): PacketDetail {
  return {
    title: type === "request" ? "ICMP Echo Request" : "ICMP Echo Reply",
    protocol: "ICMP",
    summary: `${srcIp} → ${dstIp}`,
    layers: [
      {
        name: "Ethernet II",
        subtitle: "الطبقة الثانية",
        fields: [
          ["Destination MAC", dstMac],
          ["Source MAC", iface.mac],
          ["Type", "0x0800 — IPv4"],
        ],
      },
      {
        name: "IPv4",
        subtitle: "الطبقة الثالثة",
        fields: [
          ["Source IP", srcIp],
          ["Destination IP", dstIp],
          ["TTL", String(ttl)],
          ["Protocol", "ICMP (1)"],
          ["Header checksum", "0x9C4A"],
        ],
      },
      {
        name: "ICMP",
        subtitle: "رسالة التحكم",
        fields: [
          ["Type", type === "request" ? "8 — Echo Request" : "0 — Echo Reply"],
          ["Code", "0"],
          ["Identifier", "0x1F3A"],
          ["Sequence", type === "request" ? "1" : "1"],
          ["Data", "56 bytes"],
        ],
      },
    ],
    payload: type === "request" ? "طلب التحقق من الوصول إلى الطرف الآخر." : "الطرف الآخر يستجيب بنجاح.",
  };
}

function tcpPacket(
  srcIp: string,
  dstIp: string,
  srcPort: number,
  dstPort: number,
  flags: string,
  ttl: number
): PacketDetail {
  return {
    title: `TCP ${flags}`,
    protocol: "TCP",
    summary: `${srcIp}:${srcPort} → ${dstIp}:${dstPort}`,
    layers: [
      {
        name: "IPv4",
        fields: [
          ["Source IP", srcIp],
          ["Destination IP", dstIp],
          ["TTL", String(ttl)],
          ["Protocol", "TCP (6)"],
        ],
      },
      {
        name: "TCP",
        fields: [
          ["Source port", String(srcPort)],
          ["Destination port", String(dstPort)],
          ["Flags", flags],
          ["Sequence", "1043"],
          ["Acknowledgment", flags.includes("ACK") ? "2094" : "0"],
          ["Window", "64240"],
        ],
      },
    ],
    payload: flags === "SYN" ? "طلب بدء اتصال (Three-way handshake)." : "تأكيد استلام.",
  };
}

/* ------------------------------ Flow forwarding ---------------------------- */

interface ForwardOptions {
  proto: Protocol;
  dport?: number;
  ttl?: number;
  enforcePolicy?: boolean;
  sourceIp?: string;
  silent?: boolean;
  flowId?: string;
}

interface ForwardInner extends FlowResult {
  finalSrcIp: string;
  currentTtl: number;
}

function forwardPacket(
  ctx: Ctx,
  srcDevId: string,
  destIp: string,
  opts: ForwardOptions
): ForwardInner {
  const events = ctx.events;
  const silent = opts.silent ?? false;
  const srcDevice = findDevice(ctx.s, srcDevId);
  if (!srcDevice) {
    return {
      ok: false,
      path: [],
      routers: [],
      srcIp: "",
      destIp,
      finalSrcIp: "",
      currentTtl: 64,
      error: "الجهاز المصدر غير موجود.",
    };
  }

  let sourceIface: Iface | undefined;
  if (opts.sourceIp) {
    sourceIface = srcDevice.interfaces.find((i) => i.ip === opts.sourceIp);
  } else {
    const route = pickRoute(ctx.s, srcDevice, destIp);
    if (route) sourceIface = ifaceOf(srcDevice, route.ifaceId);
  }
  if (!sourceIface || !sourceIface.ip) {
    return {
      ok: false,
      path: [srcDevice.id],
      routers: [],
      srcIp: "",
      destIp,
      finalSrcIp: "",
      currentTtl: 64,
      error: `${srcDevice.name}: لا يوجد عنوان IP أو مسار صالح للوصول إلى ${destIp}.`,
    };
  }

  let srcIp = sourceIface.ip;
  let dstIp = destIp;
  const srcMac = sourceIface.mac;
  const path: string[] = [srcDevice.id];
  const routers: string[] = [];
  let ttl = opts.ttl ?? 64;
  let current = srcDevice;
  let ingress: Iface = sourceIface;
  let first = true;
  let guard = 0;
  let delivered = false;

  if (destIp === srcIp) {
    if (!silent) {
      add(ctx, {
        device: srcDevice,
        kind: "icmp",
        layer: "L3",
        title: "الاتصال بالعنوان المحلي (Loopback)",
        detail: `الوجهة ${destIp} موجودة على نفس الجهاز.`,
      });
    }
    return {
      ok: true,
      path,
      routers,
      srcIp,
      destIp,
      finalSrcIp: srcIp,
      deliveredIp: destIp,
      destinationDevId: srcDevice.id,
      currentTtl: ttl,
    };
  }

  while (guard++ < 32) {
    if (!first) {
      const natResult = applyNatReverse(ctx, current, srcIp, dstIp, silent);
      srcIp = natResult.srcIp;
      dstIp = natResult.dstIp;

      const localFace = current.interfaces.find((i) => i.ip === dstIp);
      if (localFace) {
        delivered = true;
        if (!silent) {
          add(ctx, {
            device: current,
            kind: opts.proto === "tcp" ? "tcp" : "icmp",
            layer: opts.proto === "tcp" ? "L4" : "L3",
            title: `تم تسليم الحزمة إلى ${current.name}`,
            detail: `الوجهة ${dstIp} مطابقة للواجهة ${localFace.name}.`,
            packet:
              opts.proto === "tcp"
                ? tcpPacket(srcIp, dstIp, 51514, opts.dport ?? 80, "SYN", ttl)
                : icmpPacket(current, localFace, ingress.mac, srcIp, dstIp, ttl, "request"),
          });
        }
        return {
          ok: true,
          path,
          routers,
          srcIp,
          destIp,
          deliveredIp: dstIp,
          destinationDevId: current.id,
          finalSrcIp: srcIp,
          currentTtl: ttl,
        };
      }

      if (opts.enforcePolicy && current.kind === "firewall") {
        if (!checkFirewall(ctx, current, srcIp, dstIp, opts.proto, opts.dport, silent)) {
          return {
            ok: false,
            path,
            routers,
            srcIp,
            destIp,
            finalSrcIp: srcIp,
            currentTtl: ttl,
            error: `تم حظر الحزمة بواسطة ${current.name}.`,
            blockedBy: current.id,
          };
        }
      }

      routers.push(current.id);
      ttl -= 1;
      if (ttl <= 0) {
        if (!silent) {
          add(ctx, {
            device: current,
            kind: "warn",
            layer: "L3",
            title: "انتهت مدة حياة الحزمة (TTL = 0)",
            detail: `${current.name} أسقطت الحزمة؛ عدد القفزات تجاوز الحد المسموح.`,
          });
        }
        return {
          ok: false,
          path,
          routers,
          srcIp,
          destIp,
          finalSrcIp: srcIp,
          currentTtl: 0,
          error: "انتهت مدة حياة الحزمة (TTL).",
        };
      }
    }

    const route = pickRoute(ctx.s, current, dstIp);
    if (!route) {
      if (!silent) {
        add(ctx, {
          device: current,
          kind: "route",
          layer: "L3",
          title: `لا يوجد مسار إلى ${dstIp}`,
          detail: isRouterLike(current)
            ? `${current.name} لا تملك مسارًا متصلًا أو ثابتًا يغطي هذه الوجهة.`
            : `يجب ضبط البوابة الافتراضية أو مسار مناسب على ${current.name}.`,
        });
      }
      return {
        ok: false,
        path,
        routers,
        srcIp,
        destIp,
        finalSrcIp: srcIp,
        currentTtl: ttl,
        error: `لا يوجد مسار من ${current.name} إلى ${dstIp}.`,
      };
    }

    const egress = ifaceOf(current, route.ifaceId);
    if (!egress || !egress.ip) {
      return {
        ok: false,
        path,
        routers,
        srcIp,
        destIp,
        finalSrcIp: srcIp,
        currentTtl: ttl,
        error: `الواجهة ${route.ifaceId} غير مهيأة.`,
      };
    }

    const translatedSrc = applyNatForward(ctx, current, egress, srcIp, dstIp, silent);
    srcIp = translatedSrc;

    const arp = arpResolve(ctx, current, egress, route.nextHop, silent);
    if (!arp) {
      return {
        ok: false,
        path,
        routers,
        srcIp,
        destIp,
        finalSrcIp: srcIp,
        currentTtl: ttl,
        error: `فشل تحليل ARP للعنوان ${route.nextHop} من ${current.name} عبر ${egress.name}.`,
      };
    }

    if (!silent && isRouterLike(current) && !first) {
      add(ctx, {
        device: current,
        kind: "route",
        layer: "L3",
        title: `${dstIp} عبر ${route.nextHop} من ${egress.name}`,
        detail: `نوع المسار: ${route.kind === "connected" ? "متصل" : route.kind === "static" ? "ثابت" : "بوابة"} · TTL ${ttl}`,
        packet: icmpPacket(current, egress, arp.mac, srcIp, dstIp, ttl, "request"),
      });
    }

    if (!silent && isRouterLike(current) && first) {
      add(ctx, {
        device: current,
        kind: "route",
        layer: "L3",
        title: `توجيه الحزمة نحو ${route.nextHop}`,
        detail: `${current.name}: ${srcIp} → ${dstIp} عبر ${egress.name}.`,
        packet: icmpPacket(current, egress, arp.mac, srcIp, dstIp, ttl, "request"),
      });
    }

    const transit = l2Transit(
      ctx,
      current,
      egress,
      route.nextHop,
      srcIp,
      dstIp,
      egress.mac,
      arp.mac,
      ttl,
      opts.proto,
      silent
    );

    if (!transit.ok || !transit.nextDeviceId) {
      return {
        ok: false,
        path,
        routers,
        srcIp,
        destIp,
        finalSrcIp: srcIp,
        currentTtl: ttl,
        error: transit.error ?? "فشل تمرير الإطار داخل الشبكة المحلية.",
      };
    }

    path.push(...transit.path);
    const nextDevice = findDevice(ctx.s, transit.nextDeviceId);
    if (!nextDevice) {
      return {
        ok: false,
        path,
        routers,
        srcIp,
        destIp,
        finalSrcIp: srcIp,
        currentTtl: ttl,
        error: "الجهاز التالي غير موجود.",
      };
    }
    ingress = ifaceOf(nextDevice, transit.nextIfaceId ?? "") ?? nextDevice.interfaces[0];
    current = nextDevice;
    first = false;

    if (guard === 31) {
      return {
        ok: false,
        path,
        routers,
        srcIp,
        destIp,
        finalSrcIp: srcIp,
        currentTtl: ttl,
        error: "حلقة توجيه: تجاوز عدد القفزات المسموح.",
      };
    }
  }

  return {
    ok: delivered,
    path,
    routers,
    srcIp,
    destIp,
    finalSrcIp: srcIp,
    currentTtl: ttl,
    error: "تعذر إكمال المسار.",
  };
}

/* ---------------------------------- DNS ------------------------------------ */

export function resolveDns(
  state: NetState,
  deviceId: string,
  name: string,
  events?: SimEvent[]
): DnsResult {
  const s = cloneState(state);
  const ctx = createCtx(s);
  if (events) ctx.events = events;
  const result = resolveDnsInner(ctx, deviceId, name);
  return { ...result, events: ctx.events };
}

function resolveDnsInner(ctx: Ctx, deviceId: string, name: string): DnsResult {
  const device = findDevice(ctx.s, deviceId);
  if (!device) return { ok: false, events: ctx.events, error: "الجهاز غير موجود." };
  const dnsIp = device.dns;
  if (!dnsIp) {
    add(ctx, {
      device,
      kind: "error",
      layer: "L7",
      title: "لا يوجد خادم DNS مهيأ",
      detail: "أضف عنوان خادم DNS في إعدادات الجهاز أولًا.",
    });
    return { ok: false, events: ctx.events, error: "لا يوجد خادم DNS مهيأ." };
  }
  const found = findIfaceByIp(ctx.s, dnsIp);
  if (!found || !found.device.services?.dns) {
    add(ctx, {
      device,
      kind: "error",
      layer: "L7",
      title: `خادم DNS ${dnsIp} غير متاح`,
      detail: "تحقق من عنوان الخادم وأن خدمة DNS مفعّلة عليه.",
    });
    return { ok: false, events: ctx.events, error: `خادم DNS ${dnsIp} غير متاح.` };
  }
  add(ctx, {
    device,
    kind: "dns",
    layer: "L7",
    title: `استعلام DNS: ${name}`,
    detail: `UDP/53 → ${dnsIp}`,
    packet: {
      title: "DNS Query",
      protocol: "DNS",
      summary: `A؟ ${name}`,
      layers: [
        {
          name: "UDP",
          fields: [
            ["Source port", "52344"],
            ["Destination port", "53"],
          ],
        },
        {
          name: "DNS",
          fields: [
            ["Transaction ID", "0x2F1C"],
            ["Flags", "Standard query"],
            ["Question", name],
            ["Type", "A (IPv4)"],
          ],
        },
      ],
      payload: "ما هو عنوان IPv4 لهذا الاسم؟",
    },
  });
  const record = (found.device.dnsRecords ?? []).find(
    (r) => r.name.toLowerCase() === name.toLowerCase()
  );
  if (!record) {
    add(ctx, {
      device: found.device,
      kind: "error",
      layer: "L7",
      title: `NXDOMAIN — لا يوجد سجل للاسم ${name}`,
      detail: "أضف سجل A على خادم DNS.",
    });
    return { ok: false, events: ctx.events, error: `الاسم ${name} غير موجود في خادم DNS.` };
  }
  if (!isValidIp(record.ip)) {
    add(ctx, {
      device: found.device,
      kind: "error",
      layer: "L7",
      title: `سجل DNS غير صالح للاسم ${name}`,
    });
    return { ok: false, events: ctx.events, error: "سجل DNS يحتوي عنوانًا غير صالح." };
  }
  add(ctx, {
    device: found.device,
    kind: "dns",
    layer: "L7",
    title: `DNS Reply: ${name} = ${record.ip}`,
    detail: `TTL 3600 · A Record`,
    packet: {
      title: "DNS Response",
      protocol: "DNS",
      summary: `${name} → ${record.ip}`,
      layers: [
        {
          name: "UDP",
          fields: [
            ["Source port", "53"],
            ["Destination port", "52344"],
          ],
        },
        {
          name: "DNS",
          fields: [
            ["Transaction ID", "0x2F1C"],
            ["Flags", "Standard response"],
            ["Answer", `${name} A ${record.ip}`],
            ["TTL", "3600"],
          ],
        },
      ],
      payload: "تخزين النتيجة في ذاكرة DNS المؤقتة.",
    },
  });
  return { ok: true, events: ctx.events, ip: record.ip };
}

/* ---------------------------------- Ping ----------------------------------- */

function resolveTarget(ctx: Ctx, srcDeviceId: string, target: string): {
  ip?: string;
  name?: string;
  error?: string;
} {
  if (isValidIp(target)) return { ip: target };
  // Allow device names (e.g. "ping PC2") in addition to DNS names.
  const named = ctx.s.devices.find(
    (device) => device.name.toLowerCase() === target.trim().toLowerCase()
  );
  const namedIp = named?.interfaces.find((iface) => iface.ip)?.ip;
  if (named && namedIp) return { ip: namedIp, name: named.name };
  const dns = resolveDnsInner(ctx, srcDeviceId, target);
  if (!dns.ok || !dns.ip) return { error: dns.error ?? "تعذر تحليل الاسم." };
  return { ip: dns.ip, name: target };
}

export function simulatePing(
  state: NetState,
  srcId: string,
  target: string,
  count = 1
): PingResult {
  const s = cloneState(state);
  const ctx = createCtx(s);
  const srcDevice = findDevice(s, srcId);
  if (!srcDevice) {
    return {
      ok: false,
      events: [],
      requestPath: [],
      replyPath: [],
      latency: [],
      srcIp: "",
      targetIp: target,
      error: "الجهاز المصدر غير موجود.",
      devices: s.devices,
      runtime: s.runtime,
      arpUsed: false,
    };
  }
  const resolved = resolveTarget(ctx, srcId, target);
  if (!resolved.ip) {
    return {
      ok: false,
      events: ctx.events,
      requestPath: [],
      replyPath: [],
      latency: [],
      srcIp: primaryIp(srcDevice) ?? "",
      targetIp: target,
      error: resolved.error,
      devices: s.devices,
      runtime: s.runtime,
      arpUsed: false,
    };
  }
  const targetIp = resolved.ip;
  const targetDev = findDeviceByIp(s, targetIp);

  let lastRequestPath: string[] = [];
  let lastReplyPath: string[] = [];
  const latencies: number[] = [];
  let ok = true;
  let error: string | undefined;
  let arpUsed = false;

  const runs = Math.max(1, Math.min(8, count));
  for (let i = 0; i < runs; i++) {
    const beforeArp = JSON.stringify(s.runtime.arp[srcId] ?? []);
    if (!ctx.events.some((e) => e.title.startsWith("إرسال ICMP"))) {
      add(ctx, {
        device: srcDevice,
        kind: "icmp",
        layer: "L3",
        title: `إرسال ICMP Echo Request إلى ${resolved.name ? `${resolved.name} (${targetIp})` : targetIp}`,
        detail: `من ${primaryIp(srcDevice) ?? srcDevice.name} · 56 bytes · TTL 64`,
        packet: icmpPacket(
          srcDevice,
          srcDevice.interfaces.find((f) => f.ip) ?? srcDevice.interfaces[0],
          "FF:FF:FF:FF:FF:FF",
          primaryIp(srcDevice) ?? "0.0.0.0",
          targetIp,
          64,
          "request"
        ),
      });
    }

    const request = forwardPacket(ctx, srcId, targetIp, {
      proto: "icmp",
      enforcePolicy: true,
      ttl: 64,
    });
    if (!request.ok || !request.destinationDevId) {
      ok = false;
      error = request.error;
      lastRequestPath = request.path;
      break;
    }
    const afterArp = JSON.stringify(s.runtime.arp[srcId] ?? []);
    if (beforeArp !== afterArp) arpUsed = true;

    const reply = forwardPacket(ctx, request.destinationDevId, request.finalSrcIp, {
      proto: "icmp",
      enforcePolicy: false,
      ttl: 64,
      sourceIp: targetIp,
    });
    if (!reply.ok) {
      ok = false;
      error = reply.error ?? "لم يصل رد ICMP.";
      lastRequestPath = request.path;
      lastReplyPath = reply.path;
      break;
    }

    lastRequestPath = request.path;
    lastReplyPath = reply.path;
    latencies.push(randomLatency(i + request.routers.length));

    if (!ctx.events.some((e) => e.title.startsWith("رد ICMP"))) {
      add(ctx, {
        device: findDevice(s, request.destinationDevId),
        kind: "success",
        layer: "L3",
        title: `رد ICMP Echo Reply من ${targetIp}`,
        detail: `RTT ${latencies[latencies.length - 1].toFixed(1)}ms · TTL ${64 - request.routers.length}`,
        packet: icmpPacket(
          findDevice(s, request.destinationDevId)!,
          findIfaceByIp(s, targetIp)?.iface ?? findDevice(s, request.destinationDevId)!.interfaces[0],
          "FF:FF:FF:FF:FF:FF",
          targetIp,
          primaryIp(srcDevice) ?? request.finalSrcIp,
          64 - request.routers.length,
          "reply"
        ),
      });
    }
  }

  if (ok) {
    add(ctx, {
      device: srcDevice,
      kind: "success",
      layer: "L3",
      title: `نجح الاتصال: ${srcDevice.name} ↔ ${resolved.name ?? targetIp}`,
      detail: `${latencies.length}/${runs} رد · متوسط ${(latencies.reduce((a, b) => a + b, 0) / Math.max(1, latencies.length)).toFixed(1)}ms`,
    });
  } else {
    add(ctx, {
      device: srcDevice,
      kind: "error",
      layer: "L3",
      title: `فشل الاتصال مع ${resolved.name ?? targetIp}`,
      detail: error,
    });
  }

  return {
    ok,
    events: ctx.events,
    requestPath: lastRequestPath,
    replyPath: lastReplyPath,
    latency: latencies,
    srcIp: primaryIp(srcDevice) ?? "",
    targetIp,
    targetName: resolved.name,
    targetDevId: targetDev?.id,
    error,
    devices: s.devices,
    runtime: s.runtime,
    arpUsed,
  };
}

/* ---------------------------------- Trace ---------------------------------- */

export function simulateTrace(
  state: NetState,
  srcId: string,
  target: string
): {
  ok: boolean;
  events: SimEvent[];
  hops: { deviceId: string; ip: string; name: string; ms: number }[];
  error?: string;
  devices: Device[];
  runtime: RuntimeState;
} {
  const s = cloneState(state);
  const ctx = createCtx(s);
  const srcDevice = findDevice(s, srcId);
  if (!srcDevice) {
    return { ok: false, events: [], hops: [], error: "الجهاز غير موجود.", devices: s.devices, runtime: s.runtime };
  }
  const resolved = resolveTarget(ctx, srcId, target);
  if (!resolved.ip) {
    return { ok: false, events: ctx.events, hops: [], error: resolved.error, devices: s.devices, runtime: s.runtime };
  }
  const targetIp = resolved.ip;
  const hops: { deviceId: string; ip: string; name: string; ms: number }[] = [];
  let done = false;
  let error: string | undefined;

  for (let ttl = 1; ttl <= 15; ttl++) {
    const res = forwardPacket(ctx, srcId, targetIp, {
      proto: "icmp",
      enforcePolicy: true,
      ttl,
      silent: true,
    });
    if (res.routers.length >= ttl) {
      const hopId = res.routers[ttl - 1];
      if (!hops.some((h) => h.deviceId === hopId)) {
        const hopDev = findDevice(s, hopId);
        hops.push({
          deviceId: hopId,
          ip: primaryIp(hopDev!) ?? "—",
          name: hopDev?.name ?? hopId,
          ms: randomLatency(ttl),
        });
      }
    }
    if (res.ok) {
      done = true;
      break;
    }
    if (res.blockedBy) {
      error = res.error;
      break;
    }
    if (res.routers.length < ttl) {
      error = res.error;
      break;
    }
  }

  const targetDev = findDeviceByIp(s, targetIp);
  if (done && targetDev && !hops.some((h) => h.deviceId === targetDev.id)) {
    hops.push({
      deviceId: targetDev.id,
      ip: targetIp,
      name: resolved.name ? `${targetDev.name} (${resolved.name})` : targetDev.name,
      ms: randomLatency(hops.length + 2),
    });
  }

  hops.forEach((hop, index) => {
    add(ctx, {
      deviceId: hop.deviceId,
      deviceName: hop.name,
      kind: done ? "success" : "route",
      layer: "L3",
      title: `Hop ${index + 1}: ${hop.ip} — ${hop.name}`,
      detail: `${hop.ms.toFixed(1)} ms · TTL ${index + 1}`,
    });
  });

  add(ctx, {
    device: srcDevice,
    kind: done ? "success" : error ? "error" : "warn",
    layer: "L3",
    title: done
      ? `وصل التتبع إلى ${resolved.name ?? targetIp}`
      : `توقف التتبع: ${error ?? "تعذر إكمال المسار"}`,
    detail: `${hops.length} قفزة`,
  });

  return {
    ok: done,
    events: ctx.events,
    hops,
    error: done ? undefined : error,
    devices: s.devices,
    runtime: s.runtime,
  };
}

/* ----------------------------------- DHCP ---------------------------------- */

export function simulateDhcp(state: NetState, clientId: string): DhcpResult {
  const s = cloneState(state);
  const ctx = createCtx(s);
  const client = findDevice(s, clientId);
  if (!client) {
    return { ok: false, events: [], error: "الجهاز غير موجود.", devices: s.devices, runtime: s.runtime };
  }

  let clientIface: Iface | undefined =
    client.interfaces.find((i) => i.dhcp && !i.ip) ??
    client.interfaces.find((i) => i.dhcp) ??
    client.interfaces.find((i) => !i.ip);
  if (!clientIface) clientIface = client.interfaces[0];

  const reach = l2Reach(s, client.id, clientIface.id);
  if (reach.length === 0) {
    add(ctx, {
      device: client,
      kind: "error",
      layer: "L3",
      title: "لا يوجد اتصال فيزيائي",
      detail: "وصّل الواجهة بكابل أو عبر نقطة وصول أولًا.",
    });
    return {
      ok: false,
      events: ctx.events,
      error: "لا يوجد اتصال فيزيائي بالواجهة.",
      devices: s.devices,
      runtime: s.runtime,
    };
  }

  let server: Device | undefined;
  let serverIface: Iface | undefined;
  for (const ep of reach) {
    const dev = findDevice(s, ep.deviceId);
    if (dev?.services?.dhcp && dev.dhcpPool && isValidIp(dev.dhcpPool.start)) {
      server = dev;
      serverIface = ifaceOf(dev, ep.ifaceId);
      break;
    }
  }

  add(ctx, {
    device: client,
    kind: "dhcp",
    layer: "L4",
    title: "DHCP Discover — بث للبحث عن خادم",
    detail: `MAC ${clientIface.mac} · UDP 68 → 67 · بث`,
    packet: {
      title: "DHCP Discover",
      protocol: "DHCP",
      summary: `${client.name} يبحث عن خادم DHCP`,
      layers: [
        {
          name: "Ethernet II",
          fields: [
            ["Destination", "FF:FF:FF:FF:FF:FF"],
            ["Source", clientIface.mac],
          ],
        },
        {
          name: "UDP",
          fields: [
            ["Source port", "68"],
            ["Destination port", "67"],
          ],
        },
        {
          name: "DHCP",
          fields: [
            ["Message type", "DISCOVER"],
            ["Client MAC", clientIface.mac],
            ["Requested IP", "0.0.0.0"],
          ],
        },
      ],
      payload: "هل يوجد خادم DHCP على الشبكة؟",
    },
  });

  if (!server || !serverIface || !server.dhcpPool) {
    add(ctx, {
      device: client,
      kind: "error",
      layer: "L7",
      title: "لا يوجد خادم DHCP يستجيب",
      detail: "أضف خادمًا وفعّل خدمة DHCP مع تحديد نطاق العناوين.",
    });
    return {
      ok: false,
      events: ctx.events,
      error: "لا يوجد خادم DHCP داخل نطاق البث.",
      devices: s.devices,
      runtime: s.runtime,
    };
  }

  const pool = server.dhcpPool;
  if (!isValidIp(pool.start) || !isValidIp(pool.end) || ipToInt(pool.start) > ipToInt(pool.end)) {
    add(ctx, {
      device: server,
      kind: "error",
      layer: "L7",
      title: "نطاق DHCP غير صالح",
      detail: "تحقق من بداية ونهاية النطاق.",
    });
    return {
      ok: false,
      events: ctx.events,
      error: "نطاق DHCP غير صالح على الخادم.",
      devices: s.devices,
      runtime: s.runtime,
    };
  }

  const usedIps = new Set<string>();
  for (const d of s.devices) {
    for (const i of d.interfaces) {
      if (i.ip && !(d.id === client.id && i.id === clientIface.id)) usedIps.add(i.ip);
    }
  }
  for (const lease of s.runtime.leases) {
    if (!(lease.deviceId === client.id && lease.ifaceId === clientIface.id)) usedIps.add(lease.ip);
  }

  const existingLease = s.runtime.leases.find(
    (l) => l.deviceId === client.id && l.ifaceId === clientIface!.id
  );
  let chosen: string | null = null;
  if (
    existingLease &&
    ipToInt(existingLease.ip) >= ipToInt(pool.start) &&
    ipToInt(existingLease.ip) <= ipToInt(pool.end) &&
    !usedIps.has(existingLease.ip)
  ) {
    chosen = existingLease.ip;
  }
  if (!chosen) {
    const start = ipToInt(pool.start);
    const end = ipToInt(pool.end);
    for (let v = start; v <= end && v - start < 1024; v++) {
      const candidate = intToIp(v);
      if (candidate === pool.gateway || usedIps.has(candidate)) continue;
      chosen = candidate;
      break;
    }
  }

  if (!chosen) {
    add(ctx, {
      device: server,
      kind: "error",
      layer: "L7",
      title: "نفدت عناوين نطاق DHCP",
      detail: `النطاق ${pool.start} — ${pool.end} ممتلئ.`,
    });
    return {
      ok: false,
      events: ctx.events,
      error: "نفدت عناوين DHCP المتاحة.",
      devices: s.devices,
      runtime: s.runtime,
    };
  }

  add(ctx, {
    device: server,
    kind: "dhcp",
    layer: "L7",
    title: `DHCP Offer: ${chosen}/${pool.prefix}`,
    detail: `عرض من ${server.name} إلى ${client.name}`,
    packet: {
      title: "DHCP Offer",
      protocol: "DHCP",
      summary: `عرض عنوان ${chosen}`,
      layers: [
        {
          name: "UDP",
          fields: [
            ["Source port", "67"],
            ["Destination port", "68"],
          ],
        },
        {
          name: "DHCP",
          fields: [
            ["Message type", "OFFER"],
            ["Your IP", chosen],
            ["Subnet mask", `/${pool.prefix}`],
            ["Gateway", pool.gateway],
            ["DNS", pool.dns],
          ],
        },
      ],
      payload: "هل تقبل هذا العنوان؟",
    },
  });

  add(ctx, {
    device: client,
    kind: "dhcp",
    layer: "L7",
    title: `DHCP Request: طلب ${chosen}`,
    detail: `تأكيد الرغبة في استخدام العرض`,
    packet: {
      title: "DHCP Request",
      protocol: "DHCP",
      summary: `طلب تثبيت ${chosen}`,
      layers: [
        {
          name: "DHCP",
          fields: [
            ["Message type", "REQUEST"],
            ["Requested IP", chosen],
            ["Server", serverIface.ip ?? "—"],
          ],
        },
      ],
      payload: "أوافق على العرض.",
    },
  });

  clientIface.ip = chosen;
  clientIface.prefix = pool.prefix;
  clientIface.dhcp = true;
  client.gateway = pool.gateway;
  client.dns = pool.dns;

  s.runtime.leases = s.runtime.leases.filter(
    (l) => !(l.deviceId === client.id && l.ifaceId === clientIface!.id)
  );
  s.runtime.leases.push({
    deviceId: client.id,
    ifaceId: clientIface.id,
    ip: chosen,
    prefix: pool.prefix,
    serverId: server.id,
    at: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  s.runtime.dhcpDone[clientIface.id] = chosen;

  add(ctx, {
    device: server,
    kind: "dhcp",
    layer: "L7",
    title: `DHCP ACK: تأكيد ${chosen}`,
    detail: `البوابة ${pool.gateway} · DNS ${pool.dns} · المدة 24 ساعة`,
    packet: {
      title: "DHCP ACK",
      protocol: "DHCP",
      summary: `تم تثبيت ${chosen}`,
      layers: [
        {
          name: "DHCP",
          fields: [
            ["Message type", "ACK"],
            ["Your IP", chosen],
            ["Lease time", "86400s"],
            ["Subnet mask", `/${pool.prefix}`],
            ["Router", pool.gateway],
            ["DNS", pool.dns],
          ],
        },
      ],
      payload: "تم تفعيل الإعدادات على العميل.",
    },
  });

  add(ctx, {
    device: client,
    kind: "success",
    layer: "L3",
    title: `تم الحصول على ${chosen}/${pool.prefix} عبر DHCP`,
    detail: `من ${server.name} (${serverIface.ip ?? "—"})`,
  });

  return {
    ok: true,
    events: ctx.events,
    assignedIp: chosen,
    prefix: pool.prefix,
    gateway: pool.gateway,
    dns: pool.dns,
    serverName: server.name,
    devices: s.devices,
    runtime: s.runtime,
  };
}

/* ----------------------------------- HTTP ---------------------------------- */

export function simulateHttp(
  state: NetState,
  srcId: string,
  target: string,
  port = 80
): HttpResult {
  const s = cloneState(state);
  const ctx = createCtx(s);
  const srcDevice = findDevice(s, srcId);
  if (!srcDevice) {
    return {
      ok: false,
      events: [],
      requestPath: [],
      replyPath: [],
      error: "الجهاز غير موجود.",
      devices: s.devices,
      runtime: s.runtime,
      srcIp: "",
      targetIp: target,
    };
  }
  const resolved = resolveTarget(ctx, srcId, target);
  if (!resolved.ip) {
    return {
      ok: false,
      events: ctx.events,
      requestPath: [],
      replyPath: [],
      error: resolved.error,
      devices: s.devices,
      runtime: s.runtime,
      srcIp: primaryIp(srcDevice) ?? "",
      targetIp: target,
    };
  }
  const targetIp = resolved.ip;
  const srcIp = primaryIp(srcDevice) ?? "";
  add(ctx, {
    device: srcDevice,
    kind: "tcp",
    layer: "L4",
    title: `بدء اتصال TCP إلى ${resolved.name ?? targetIp}:${port}`,
    detail: "SYN → Three-way handshake",
    packet: tcpPacket(srcIp, targetIp, 51514, port, "SYN", 64),
  });

  const request = forwardPacket(ctx, srcId, targetIp, {
    proto: "tcp",
    dport: port,
    enforcePolicy: true,
    ttl: 64,
  });
  if (!request.ok || !request.destinationDevId) {
    add(ctx, {
      device: srcDevice,
      kind: "error",
      layer: "L4",
      title: "تعذر إنشاء الاتصال",
      detail: request.error,
    });
    return {
      ok: false,
      events: ctx.events,
      requestPath: request.path,
      replyPath: [],
      error: request.error,
      devices: s.devices,
      runtime: s.runtime,
      srcIp,
      targetIp,
      targetDevId: request.destinationDevId,
    };
  }

  const targetDev = findDevice(s, request.destinationDevId)!;
  const targetIface = findIfaceByIp(s, targetIp)?.iface ?? targetDev.interfaces[0];

  add(ctx, {
    device: targetDev,
    kind: "tcp",
    layer: "L4",
    title: `SYN-ACK من ${targetDev.name}:${port}`,
    detail: "الخادم جاهز لاستقبال الاتصال",
    packet: tcpPacket(targetIp, srcIp, port, 51514, "SYN, ACK", 64 - request.routers.length),
  });
  add(ctx, {
    device: srcDevice,
    kind: "tcp",
    layer: "L4",
    title: "ACK — اكتمل Three-way Handshake",
    detail: "الاتصال أصبح Established",
    packet: tcpPacket(srcIp, targetIp, 51514, port, "ACK", 64),
  });

  const webEnabled = Boolean(targetDev.services?.web);
  if (!webEnabled) {
    add(ctx, {
      device: targetDev,
      kind: "error",
      layer: "L7",
      title: `المنفذ ${port} مغلق على ${targetDev.name}`,
      detail: "فعّل خدمة الويب (Web) على الخادم أو تحقق من رقم المنفذ.",
    });
    return {
      ok: false,
      events: ctx.events,
      requestPath: request.path,
      replyPath: [],
      error: `المنفذ ${port} مغلق.`,
      devices: s.devices,
      runtime: s.runtime,
      srcIp,
      targetIp,
      targetDevId: targetDev.id,
    };
  }

  add(ctx, {
    device: srcDevice,
    kind: "tcp",
    layer: "L7",
    title: `GET / HTTP/1.1 — Host: ${resolved.name ?? targetIp}`,
    detail: `طلب صفحة الويب من ${targetDev.name}`,
    packet: {
      title: "HTTP Request",
      protocol: "HTTP",
      summary: `GET / HTTP/1.1`,
      layers: [
        {
          name: "TCP",
          fields: [
            ["Source port", "51514"],
            ["Destination port", String(port)],
            ["Flags", "PSH, ACK"],
          ],
        },
        {
          name: "HTTP",
          fields: [
            ["Method", "GET"],
            ["Path", "/"],
            ["Host", resolved.name ?? targetIp],
            ["User-Agent", "NETLAB/1.0"],
            ["Accept", "text/html"],
          ],
        },
      ],
      payload: "طلب المحتوى من خادم الويب.",
    },
  });

  add(ctx, {
    device: targetDev,
    kind: "success",
    layer: "L7",
    title: "HTTP/1.1 200 OK — تم تحميل الصفحة",
    detail: `${targetDev.name} استجاب للطلب بنجاح.`,
    packet: {
      title: "HTTP Response",
      protocol: "HTTP",
      summary: "200 OK · text/html",
      layers: [
        {
          name: "HTTP",
          fields: [
            ["Status", "200 OK"],
            ["Server", "NETLAB Web Server"],
            ["Content-Type", "text/html; charset=utf-8"],
            ["Content-Length", "1024"],
            ["Connection", "keep-alive"],
          ],
        },
        {
          name: "HTML",
          fields: [
            ["Title", targetDev.name],
            ["Body", "<h1>It works!</h1>"],
          ],
        },
      ],
      payload: "تم تسليم الصفحة إلى العميل.",
    },
  });

  const replyPath = [...request.path].reverse();
  return {
    ok: true,
    events: ctx.events,
    requestPath: request.path,
    replyPath,
    status: 200,
    body: "It works!",
    devices: s.devices,
    runtime: s.runtime,
    srcIp,
    targetIp,
    targetDevId: targetDev.id,
  };
}

export { createCtx, cloneState, resolveDnsInner, add };
