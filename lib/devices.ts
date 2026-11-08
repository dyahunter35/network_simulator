import type {
  Device,
  DeviceKind,
  Iface,
  NetLink,
  NetState,
  RuntimeState,
} from "./types";
import { networkOf } from "./ip";

export const DEVICE_META: Record<
  DeviceKind,
  {
    label: string;
    en: string;
    description: string;
    color: string;
    soft: string;
    ports: number;
    portPrefix: string;
  }
> = {
  pc: {
    label: "حاسوب",
    en: "PC",
    description: "محطة عمل طرفية",
    color: "#38bdf8",
    soft: "rgba(56,189,248,.12)",
    ports: 1,
    portPrefix: "eth",
  },
  laptop: {
    label: "حاسوب محمول",
    en: "Laptop",
    description: "عميل لاسلكي",
    color: "#7dd3fc",
    soft: "rgba(125,211,252,.12)",
    ports: 1,
    portPrefix: "wlan",
  },
  server: {
    label: "خادم",
    en: "Server",
    description: "خدمات DHCP / DNS / Web",
    color: "#fbbf24",
    soft: "rgba(251,191,36,.12)",
    ports: 2,
    portPrefix: "eth",
  },
  switch: {
    label: "مبدّل",
    en: "Switch",
    description: "ربط الأجهزة داخل الشبكة",
    color: "#a78bfa",
    soft: "rgba(167,139,250,.12)",
    ports: 8,
    portPrefix: "Fa0/",
  },
  router: {
    label: "موجّه",
    en: "Router",
    description: "توجيه الحزم بين الشبكات",
    color: "#2dd4bf",
    soft: "rgba(45,212,191,.12)",
    ports: 3,
    portPrefix: "G0/",
  },
  firewall: {
    label: "جدار حماية",
    en: "Firewall",
    description: "فلترة ومراقبة المرور",
    color: "#fb7185",
    soft: "rgba(251,113,133,.12)",
    ports: 2,
    portPrefix: "Gi",
  },
  ap: {
    label: "نقطة وصول",
    en: "Access Point",
    description: "توسيع الشبكة لاسلكيًا",
    color: "#34d399",
    soft: "rgba(52,211,153,.12)",
    ports: 1,
    portPrefix: "eth",
  },
  hub: {
    label: "مجمّع",
    en: "Hub",
    description: "بث فيزيائي لكل المنافذ",
    color: "#94a3b8",
    soft: "rgba(148,163,184,.12)",
    ports: 4,
    portPrefix: "port",
  },
};

export const L2_KINDS: DeviceKind[] = ["switch", "hub", "ap"];
export const L3_KINDS: DeviceKind[] = ["router", "firewall"];

export function isL2(device: Device): boolean {
  return L2_KINDS.includes(device.kind);
}

export function isRouterLike(device: Device): boolean {
  return L3_KINDS.includes(device.kind);
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function macFor(deviceId: string, ifaceId: string): string {
  const h = hashString(`${deviceId}:${ifaceId}`);
  const bytes = [0x02, 0x00, h & 255, (h >>> 8) & 255, (h >>> 16) & 255, (h >>> 24) & 255];
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join(":").toUpperCase();
}

function makeIsNumber(kind: DeviceKind): number {
  return DEVICE_META[kind].ports;
}

export function makeIface(deviceId: string, kind: DeviceKind, index: number): Iface {
  const meta = DEVICE_META[kind];
  const name =
    kind === "switch"
      ? `Fa0/${index + 1}`
      : kind === "router"
        ? `G0/${index}`
        : kind === "firewall"
          ? `Gi${index + 1}`
          : kind === "hub"
            ? `Port ${index + 1}`
            : `eth${index}`;
  const id = `${kind === "switch" ? "fa" : kind === "router" ? "g" : kind === "firewall" ? "gi" : "p"}-${index}`;
  return {
    id,
    name,
    mac: macFor(deviceId, id),
    prefix: kind === "switch" || kind === "hub" || kind === "ap" ? undefined : 24,
    vlan: kind === "switch" || kind === "ap" ? 1 : undefined,
    dhcp: kind === "pc" || kind === "laptop" ? false : undefined,
  };
}

export function createDevice(
  kind: DeviceKind,
  id: string,
  name: string,
  x: number,
  y: number
): Device {
  const count = makeIsNumber(kind);
  const interfaces: Iface[] = [];
  for (let i = 0; i < count; i++) interfaces.push(makeIface(id, kind, i));
  const device: Device = {
    id,
    kind,
    name,
    x,
    y,
    interfaces,
    routes: [],
  };
  if (kind === "router" || kind === "firewall") {
    device.firewallDefault = "allow";
    device.nat = false;
  }
  if (kind === "firewall") {
    device.firewallRules = [];
  }
  if (kind === "server") {
    device.services = { dhcp: false, dns: false, web: false };
    device.dhcpPool = {
      start: "192.168.1.100",
      end: "192.168.1.150",
      prefix: 24,
      gateway: "192.168.1.1",
      dns: "192.168.1.53",
    };
    device.dnsRecords = [];
  }
  if (kind === "ap") {
    device.interfaces[0].vlan = 1;
  }
  return device;
}

export function emptyRuntime(): RuntimeState {
  return { arp: {}, mac: {}, leases: [], nat: [], dhcpDone: {} };
}

export function emptyState(): NetState {
  return { devices: [], links: [], runtime: emptyRuntime() };
}

export function linkId(a: string, b: string): string {
  return `link-${a}-${b}`;
}

export function wire(
  a: { deviceId: string; ifaceId: string },
  b: { deviceId: string; ifaceId: string },
  type: NetLink["type"] = "copper"
): NetLink {
  const id = linkId(`${a.deviceId}-${a.ifaceId}`, `${b.deviceId}-${b.ifaceId}`);
  return { id, a, b, type };
}

export function findDevice(state: NetState, id: string): Device | undefined {
  return state.devices.find((d) => d.id === id);
}

export function findDeviceByName(state: NetState, name: string): Device | undefined {
  return state.devices.find((d) => d.name === name);
}

export function ifaceOf(device: Device, ifaceId: string): Iface | undefined {
  return device.interfaces.find((i) => i.id === ifaceId);
}

export function primaryIface(device: Device): Iface | undefined {
  return device.interfaces.find((i) => i.ip) ?? device.interfaces[0];
}

export function primaryIp(device: Device): string | undefined {
  return device.interfaces.find((i) => i.ip)?.ip;
}

export function findDeviceByIp(state: NetState, ip: string): Device | undefined {
  return state.devices.find((d) =>
    d.interfaces.some((i) => i.ip === ip)
  );
}

export function findIfaceByIp(
  state: NetState,
  ip: string
): { device: Device; iface: Iface } | undefined {
  for (const device of state.devices) {
    const iface = device.interfaces.find((i) => i.ip === ip);
    if (iface) return { device, iface };
  }
  return undefined;
}

export function usedIfaceIds(state: NetState, deviceId: string): Set<string> {
  const used = new Set<string>();
  for (const link of state.links) {
    if (link.a.deviceId === deviceId) used.add(link.a.ifaceId);
    if (link.b.deviceId === deviceId) used.add(link.b.ifaceId);
  }
  return used;
}

export function freeIfaces(state: NetState, deviceId: string): Iface[] {
  const device = findDevice(state, deviceId);
  if (!device) return [];
  const used = usedIfaceIds(state, deviceId);
  return device.interfaces.filter((i) => !used.has(i.id));
}

export function linkForIface(
  state: NetState,
  deviceId: string,
  ifaceId: string
): NetLink | undefined {
  return state.links.find(
    (l) =>
      (l.a.deviceId === deviceId && l.a.ifaceId === ifaceId) ||
      (l.b.deviceId === deviceId && l.b.ifaceId === ifaceId)
  );
}

export function peerOf(
  state: NetState,
  deviceId: string,
  ifaceId: string
): { deviceId: string; ifaceId: string } | undefined {
  const link = linkForIface(state, deviceId, ifaceId);
  if (!link) return undefined;
  return link.a.deviceId === deviceId && link.a.ifaceId === ifaceId ? link.b : link.a;
}

export function ifaceLabel(state: NetState, deviceId: string, ifaceId: string): string {
  const device = findDevice(state, deviceId);
  return ifaceOf(device!, ifaceId)?.name ?? ifaceId;
}

export function allAssignedIps(state: NetState): string[] {
  const ips: string[] = [];
  for (const d of state.devices) {
    for (const i of d.interfaces) if (i.ip) ips.push(i.ip);
  }
  return ips;
}

export function connectedRoutes(device: Device) {
  return device.interfaces
    .filter((i) => i.ip && i.prefix !== undefined)
    .map((i) => ({
      id: `c-${device.id}-${i.id}`,
      dest: networkOf(i.ip!, i.prefix!),
      prefix: i.prefix!,
      ifaceId: i.id,
      ifaceName: i.name,
      ip: i.ip!,
      kind: "connected" as const,
    }));
}

export function deviceCounts(state: NetState) {
  return {
    devices: state.devices.length,
    links: state.links.length,
    configured: state.devices.filter((d) => d.interfaces.some((i) => i.ip)).length,
    online: state.devices.filter((d) => d.interfaces.some((i) => i.ip)).length,
  };
}

export function wirelessLinkType(a: Device, b: Device): NetLink["type"] {
  if (a.kind === "ap" || b.kind === "ap") return "wireless";
  return "copper";
}
