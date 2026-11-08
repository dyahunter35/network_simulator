import { createDevice, findDevice, findDeviceByName, wire } from "./devices";
import { ipToInt } from "./ip";
import type { Device, DeviceKind, NetLink, NetState, RouteEntry, TestRecord } from "./types";

/* ------------------------------- seed helpers ------------------------------ */

function dev(kind: DeviceKind, id: string, name: string, x: number, y: number): Device {
  return createDevice(kind, id, name, x, y);
}

const ETH = "p-0";
const FA = (n: number) => `fa-${n}`;
const G = (n: number) => `g-${n}`;
const GI = (n: number) => `gi-${n}`;

function setIp(
  device: Device,
  ifaceId: string,
  ip: string,
  prefix = 24
): Device {
  const iface = device.interfaces.find((i) => i.id === ifaceId);
  if (iface) {
    iface.ip = ip;
    iface.prefix = prefix;
  }
  return device;
}

function host(
  device: Device,
  gateway?: string,
  dns?: string
): Device {
  device.gateway = gateway;
  device.dns = dns;
  return device;
}

function route(dest: string, prefix: number, via: string): RouteEntry {
  return { id: `r-${dest}-${prefix}-${via}`, dest, prefix, via };
}

function link(
  aDevice: string,
  aIface: string,
  bDevice: string,
  bIface: string,
  type: NetLink["type"] = "copper"
): NetLink {
  return wire(
    { deviceId: aDevice, ifaceId: aIface },
    { deviceId: bDevice, ifaceId: bIface },
    type
  );
}

/* ---------------------------------- types ---------------------------------- */

export interface LabCheck {
  from: string;
  target: string;
  expect: "ok" | "fail" | "http";
  label: string;
}

export interface LabContext {
  state: NetState;
  tests: TestRecord[];
  hasIp: (name: string, ip: string, prefix?: number, ifaceId?: string) => boolean;
  hasRoute: (name: string, dest: string, prefix: number, via?: string) => boolean;
  hasService: (name: string, service: "dhcp" | "dns" | "web", enabled: boolean) => boolean;
  hasVlan: (name: string, ifaceId: string, vlan: number) => boolean;
  hasDnsRecord: (name: string, record: string, ip: string) => boolean;
  dhcpLease: (name: string) => boolean;
  natActive: (name: string) => boolean;
  noDuplicateIps: () => boolean;
  test: (from: string, to: string, kind: "ping" | "http", ok: boolean) => boolean;
}

export interface LabObjective {
  id: string;
  text: string;
  check: (ctx: LabContext) => boolean;
}

export interface Lab {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  difficulty: 1 | 2 | 3;
  minutes: number;
  icon: DeviceKind;
  accent: string;
  tags: string[];
  seed: () => { devices: Device[]; links: NetLink[] };
  objectives: LabObjective[];
  checks: LabCheck[];
  hints: string[];
  steps: { title: string; body: string }[];
}

/* --------------------------------- context --------------------------------- */

export function createLabContext(state: NetState, tests: TestRecord[]): LabContext {
  const deviceByName = (name: string) => findDeviceByName(state, name);
  const ipOf = (name: string, ifaceId?: string) => {
    const device = deviceByName(name);
    if (!device) return undefined;
    if (ifaceId) return device.interfaces.find((i) => i.id === ifaceId)?.ip;
    return device.interfaces.find((i) => i.ip)?.ip;
  };
  return {
    state,
    tests,
    hasIp: (name, ip, prefix, ifaceId) => {
      const device = deviceByName(name);
      if (!device) return false;
      return device.interfaces.some(
        (i) =>
          i.ip === ip &&
          (prefix === undefined || i.prefix === prefix) &&
          (ifaceId === undefined || i.id === ifaceId)
      );
    },
    hasRoute: (name, dest, prefix, via) => {
      const device = deviceByName(name);
      if (!device) return false;
      return device.routes.some(
        (r) => r.dest === dest && r.prefix === prefix && (via === undefined || r.via === via)
      );
    },
    hasService: (name, service, enabled) => {
      const device = deviceByName(name);
      return Boolean(device?.services?.[service]) === enabled;
    },
    hasVlan: (name, ifaceId, vlan) => {
      const device = deviceByName(name);
      return device?.interfaces.find((i) => i.id === ifaceId)?.vlan === vlan;
    },
    hasDnsRecord: (name, record, ip) => {
      const device = deviceByName(name);
      return Boolean(
        device?.dnsRecords?.some(
          (r) => r.name.toLowerCase() === record.toLowerCase() && r.ip === ip
        )
      );
    },
    dhcpLease: (name) => {
      const device = deviceByName(name);
      if (!device) return false;
      return (
        state.runtime.leases.some((lease) => lease.deviceId === device.id) ||
        device.interfaces.some((iface) => iface.dhcp && Boolean(iface.ip))
      );
    },
    natActive: (name) => {
      const device = deviceByName(name);
      if (!device) return false;
      return state.runtime.nat.some((n) => n.outsideIp === ipOf(name)) || Boolean(device.nat);
    },
    noDuplicateIps: () => {
      const seen = new Set<string>();
      for (const device of state.devices) {
        for (const iface of device.interfaces) {
          if (!iface.ip) continue;
          if (seen.has(iface.ip)) return false;
          seen.add(iface.ip);
        }
      }
      return true;
    },
    test: (from, to, kind, ok) => {
      const fromDev = deviceByName(from);
      const toDev = deviceByName(to);
      if (!fromDev || !toDev) return false;
      return tests.some(
        (t) =>
          t.kind === kind &&
          t.fromId === fromDev.id &&
          t.toId === toDev.id &&
          t.ok === ok
      );
    },
  };
}

/* ------------------------------ sandbox lab -------------------------------- */

const sandboxSeed = () => {
  const pc1 = host(
    setIp(dev("pc", "pc1", "PC1", 80, 110), ETH, "192.168.10.10"),
    "192.168.10.1",
    "192.168.10.50"
  );
  const pc2 = host(
    setIp(dev("pc", "pc2", "PC2", 80, 320), ETH, "192.168.10.11"),
    "192.168.10.1",
    "192.168.10.50"
  );
  const sw1 = dev("switch", "sw1", "SW1", 400, 215);
  const r1 = dev("router", "r1", "R1", 690, 80);
  setIp(r1, G(0), "192.168.10.1");
  const srv1 = host(setIp(dev("server", "srv1", "SRV1", 690, 330), ETH, "192.168.10.50"));
  srv1.services = { dhcp: false, dns: true, web: true };
  srv1.dnsRecords = [
    { id: "d1", name: "lab.local", ip: "192.168.10.50" },
    { id: "d2", name: "www.lab.local", ip: "192.168.10.50" },
  ];
  const devices = [pc1, pc2, sw1, r1, srv1];
  const links = [
    link("pc1", ETH, "sw1", FA(0)),
    link("pc2", ETH, "sw1", FA(1)),
    link("sw1", FA(2), "r1", G(0)),
    link("sw1", FA(3), "srv1", ETH),
  ];
  return { devices, links };
};

const sandbox: Lab = {
  id: "sandbox",
  title: "المعمل التجريبي",
  subtitle: "شبكة مكتب صغيرة جاهزة للاستكشاف",
  description:
    "شبكة محلية جاهزة: حاسوبان وخادم متصلون بمبدّل، وموجّه يمثل البوابة. جرّب ping، افتح الخادم عبر الاسم، واستعرض جداول ARP وMAC.",
  difficulty: 1,
  minutes: 5,
  icon: "server",
  accent: "#2dd4bf",
  tags: ["ARP", "DNS", "ICMP", "Ethernet"],
  seed: sandboxSeed,
  objectives: [
    {
      id: "ping",
      text: "نفّذ ping من PC1 إلى PC2 بنجاح",
      check: (c) => c.test("PC1", "PC2", "ping", true),
    },
    {
      id: "dns",
      text: "حلّ الاسم lab.local عبر خادم DNS",
      check: (c) => c.test("PC1", "SRV1", "ping", true),
    },
    {
      id: "web",
      text: "افتح الموقع www.lab.local عبر HTTP",
      check: (c) => c.test("PC1", "SRV1", "http", true),
    },
    {
      id: "arp",
      text: "أكمل اتصالًا واحدًا على الأقل ليظهر جدول ARP",
      check: (c) => (c.state.runtime.arp["pc1"] ?? []).length > 0,
    },
  ],
  checks: [
    { from: "PC1", target: "PC2", expect: "ok", label: "PC1 ↔ PC2" },
    { from: "PC1", target: "lab.local", expect: "ok", label: "PC1 ↔ lab.local" },
    { from: "PC1", target: "www.lab.local", expect: "http", label: "HTTP www.lab.local" },
  ],
  hints: [
    "افتح طرفية PC1 من الأسفل واكتب: ping 192.168.10.11",
    "يمكنك استخدام الاسم بدل العنوان: ping lab.local — لكن تأكد أن DNS مهيأ على PC1.",
    "لاختبار الويب اكتب: curl www.lab.local — سيبدأ اتصال TCP كامل ثم طلب HTTP.",
  ],
  steps: [
    { title: "افهم الطوبولوجيا", body: "PC1 وPC2 وSRV1 متصلون بالمبدّل SW1، والموجّه R1 هو بوابة الشبكة 192.168.10.1." },
    { title: "اختبر ICMP", body: "من طرفية PC1 نفّذ ping 192.168.10.11. راقب حركة الإطار على المبدّل والأحداث في السجل." },
    { title: "اختبر DNS", body: "نفّذ nslookup lab.local ثم ping lab.local. الخادم SRV1 يحمل سجل A للاسم." },
    { title: "اختبر HTTP", body: "نفّذ curl www.lab.local وشاهد Three-way Handshake ثم استجابة 200 OK." },
    { title: "افحص الجداول", body: "اختر PC1 وافتح تبويب الجداول لترى جدول ARP، واختر SW1 لترى جدول MAC." },
  ],
};

/* --------------------------------- LAN lab --------------------------------- */

const lanSeed = () => {
  const pc1 = dev("pc", "lan-pc1", "PC1", 110, 130);
  const pc2 = dev("pc", "lan-pc2", "PC2", 110, 350);
  const sw1 = dev("switch", "lan-sw1", "SW1", 440, 240);
  return {
    devices: [pc1, pc2, sw1],
    links: [link("lan-pc1", ETH, "lan-sw1", FA(0)), link("lan-pc2", ETH, "lan-sw1", FA(1))],
  };
};

const lan: Lab = {
  id: "lan",
  title: "أساسيات الشبكة المحلية",
  subtitle: "عنونة IP واختبار الاتصال",
  description:
    "أبسط سيناريو شبكي: جهازان متصلان بمبدّل. اضبط عناوين IP داخل نفس الشبكة وتأكد أن الاتصال يعمل دون الحاجة إلى موجّه.",
  difficulty: 1,
  minutes: 8,
  icon: "switch",
  accent: "#a78bfa",
  tags: ["IPv4", "Subnet", "ARP", "Switch"],
  seed: lanSeed,
  objectives: [
    {
      id: "ip1",
      text: "اضبط PC1 على 192.168.1.10/24",
      check: (c) => c.hasIp("PC1", "192.168.1.10", 24),
    },
    {
      id: "ip2",
      text: "اضبط PC2 على 192.168.1.11/24",
      check: (c) => c.hasIp("PC2", "192.168.1.11", 24),
    },
    {
      id: "ping",
      text: "نجاح ping من PC1 إلى PC2",
      check: (c) => c.test("PC1", "PC2", "ping", true),
    },
    {
      id: "arp",
      text: "تحقق من ظهور عنوان MAC الخاص بـ PC2 في جدول ARP لدى PC1",
      check: (c) => (c.state.runtime.arp["lan-pc1"] ?? []).some((e) => e.ip === "192.168.1.11"),
    },
  ],
  checks: [{ from: "PC1", target: "192.168.1.11", expect: "ok", label: "PC1 ↔ PC2" }],
  hints: [
    "اختر PC1 ثم تبويب الإعدادات وأدخل 192.168.1.10 مع البادئة /24.",
    "العنوانان يجب أن يكونا في نفس الشبكة: 192.168.1.0/24. لا حاجة لبوابة هنا.",
    "بعد الضبط نفّذ ping 192.168.1.11 من طرفية PC1 ثم افحص arp -a.",
  ],
  steps: [
    { title: "حدّد الشبكة", body: "الشبكة 192.168.1.0/24 تتسع لـ254 جهازًا. كل جهاز يحتاج عنوانًا فريدًا." },
    { title: "اضبط PC1", body: "IP: 192.168.1.10، القناع: 255.255.255.0 أو /24." },
    { title: "اضبط PC2", body: "IP: 192.168.1.11، القناع: /24." },
    { title: "اختبر", body: "من طرفية PC1 نفّذ ping 192.168.1.11. أول حزمة تُطلق طلب ARP للعثور على MAC." },
    { title: "افحص", body: "اختر SW1 وتبويب الجداول لترى MAC Table، واختر PC1 لترى ARP." },
  ],
};

/* ------------------------------- routing lab ------------------------------- */

const routingSeed = () => {
  const pc1 = dev("pc", "rt-pc1", "PC1", 50, 200);
  const r1 = dev("router", "rt-r1", "R1", 320, 190);
  const r2 = dev("router", "rt-r2", "R2", 630, 190);
  const pc2 = dev("pc", "rt-pc2", "PC2", 900, 200);
  return {
    devices: [pc1, r1, r2, pc2],
    links: [
      link("rt-pc1", ETH, "rt-r1", G(0)),
      link("rt-r1", G(1), "rt-r2", G(0)),
      link("rt-r2", G(1), "rt-pc2", ETH),
    ],
  };
};

const routing: Lab = {
  id: "routing",
  title: "التوجيه بين الشبكات",
  subtitle: "موجّهان ومسارات ثابتة",
  description:
    "اربط شبكتين منفصلتين عبر موجّهين، ثم أضف مسارات ثابتة يدوية. هذا هو قلب عمل مهندس الشبكات: كل شبكة لها عنوان، والموجّهات تحتاج أن تعرف الطريق.",
  difficulty: 3,
  minutes: 18,
  icon: "router",
  accent: "#2dd4bf",
  tags: ["Routing", "Static Route", "Gateway", "Subnet"],
  seed: routingSeed,
  objectives: [
    {
      id: "hosts",
      text: "اضبط الطرفيات: PC1 = 192.168.10.10/24 و PC2 = 192.168.20.10/24",
      check: (c) =>
        c.hasIp("PC1", "192.168.10.10", 24) && c.hasIp("PC2", "192.168.20.10", 24),
    },
    {
      id: "gateways",
      text: "اضبط البوابة الافتراضية للطرفيتين على موجّهها",
      check: (c) =>
        findDeviceByName(c.state, "PC1")?.gateway === "192.168.10.1" &&
        findDeviceByName(c.state, "PC2")?.gateway === "192.168.20.1",
    },
    {
      id: "r1",
      text: "R1: الواجهة G0/0 = 192.168.10.1/24 والواجهة G0/1 = 10.0.0.1/30",
      check: (c) =>
        c.hasIp("R1", "192.168.10.1", 24, G(0)) && c.hasIp("R1", "10.0.0.1", 30, G(1)),
    },
    {
      id: "r2",
      text: "R2: الواجهة G0/0 = 10.0.0.2/30 والواجهة G0/1 = 192.168.20.1/24",
      check: (c) =>
        c.hasIp("R2", "10.0.0.2", 30, G(0)) && c.hasIp("R2", "192.168.20.1", 24, G(1)),
    },
    {
      id: "route1",
      text: "أضف مسارًا ثابتًا على R1 إلى 192.168.20.0/24 عبر 10.0.0.2",
      check: (c) => c.hasRoute("R1", "192.168.20.0", 24, "10.0.0.2"),
    },
    {
      id: "route2",
      text: "أضف مسارًا ثابتًا على R2 إلى 192.168.10.0/24 عبر 10.0.0.1",
      check: (c) => c.hasRoute("R2", "192.168.10.0", 24, "10.0.0.1"),
    },
    {
      id: "ping",
      text: "نجاح ping من PC1 إلى PC2",
      check: (c) => c.test("PC1", "PC2", "ping", true),
    },
  ],
  checks: [{ from: "PC1", target: "192.168.20.10", expect: "ok", label: "PC1 ↔ PC2" }],
  hints: [
    "اربط البوابة على PC1 بـ 192.168.10.1، وعلى PC2 بـ 192.168.20.1.",
    "وصلة الموجّهين تستخدم /30 لأنها تحتاج عنوانين فقط: 10.0.0.1 و10.0.0.2.",
    "المسار الثابت يعني: الشبكة البعيدة + البادئة + عنوان القفزة التالية (جاره المباشر).",
    "إذا فشل ping، نفّذ tracert 192.168.20.10 لمعرفة أين يتوقف المسار.",
  ],
  steps: [
    { title: "عنونة LAN الأولى", body: "PC1: 192.168.10.10/24، البوابة 192.168.10.1. R1 G0/0: 192.168.10.1/24." },
    { title: "عنونة الوصلة بين الموجّهين", body: "R1 G0/1: 10.0.0.1/30، R2 G0/0: 10.0.0.2/30. نفس الشبكة 10.0.0.0/30." },
    { title: "عنونة LAN الثانية", body: "R2 G0/1: 192.168.20.1/24. PC2: 192.168.20.10/24 والبوابة 192.168.20.1." },
    { title: "أضف المسارات الثابتة", body: "على R1: 192.168.20.0/24 عبر 10.0.0.2. على R2: 192.168.10.0/24 عبر 10.0.0.1." },
    { title: "اختبر وتتبع", body: "ping من PC1 إلى 192.168.20.10 ثم tracert. يجب أن تظهر R1 وR2 في المسار." },
  ],
};

/* -------------------------------- DHCP lab --------------------------------- */

const dhcpSeed = () => {
  const pc1 = dev("pc", "dh-pc1", "PC1", 70, 110);
  const pc2 = dev("pc", "dh-pc2", "PC2", 70, 330);
  pc1.interfaces[0].dhcp = true;
  pc2.interfaces[0].dhcp = true;
  const sw1 = dev("switch", "dh-sw1", "SW1", 370, 220);
  const r1 = dev("router", "dh-r1", "R1", 640, 80);
  setIp(r1, G(0), "192.168.1.1");
  const srv1 = dev("server", "dh-srv1", "SRV1", 640, 330);
  setIp(srv1, ETH, "192.168.1.53");
  srv1.services = { dhcp: false, dns: true, web: false };
  srv1.dhcpPool = {
    start: "192.168.1.100",
    end: "192.168.1.150",
    prefix: 24,
    gateway: "192.168.1.1",
    dns: "192.168.1.53",
  };
  return {
    devices: [pc1, pc2, sw1, r1, srv1],
    links: [
      link("dh-pc1", ETH, "dh-sw1", FA(0)),
      link("dh-pc2", ETH, "dh-sw1", FA(1)),
      link("dh-sw1", FA(2), "dh-r1", G(0)),
      link("dh-sw1", FA(3), "dh-srv1", ETH),
    ],
  };
};

const dhcpLab: Lab = {
  id: "dhcp",
  title: "خادم DHCP تلقائي",
  subtitle: "توزيع العناوين بنمط DORA",
  description:
    "بدلًا من كتابة عنوان IP يدويًا على كل جهاز، شغّل خدمة DHCP واسمح للخادم بتوزيع العناوين والبوابة وDNS تلقائيًا. تابع رحلة DORA الأربعة.",
  difficulty: 2,
  minutes: 12,
  icon: "server",
  accent: "#fbbf24",
  tags: ["DHCP", "DORA", "Lease", "Broadcast"],
  seed: dhcpSeed,
  objectives: [
    {
      id: "pool",
      text: "فعّل خدمة DHCP على SRV1 مع نطاق 192.168.1.100 — 192.168.1.150",
      check: (c) => {
        const srv = findDeviceByName(c.state, "SRV1");
        return (
          c.hasService("SRV1", "dhcp", true) &&
          srv?.dhcpPool?.start === "192.168.1.100" &&
          srv?.dhcpPool?.end === "192.168.1.150" &&
          srv?.dhcpPool?.prefix === 24
        );
      },
    },
    {
      id: "pc1",
      text: "حصل PC1 على عنوان تلقائي عبر DHCP",
      check: (c) => c.dhcpLease("PC1"),
    },
    {
      id: "pc2",
      text: "حصل PC2 على عنوان تلقائي عبر DHCP",
      check: (c) => c.dhcpLease("PC2"),
    },
    {
      id: "unique",
      text: "العنوانان مختلفان وداخل النطاق",
      check: (c) => {
        const pc1 = findDeviceByName(c.state, "PC1")?.interfaces[0].ip;
        const pc2 = findDeviceByName(c.state, "PC2")?.interfaces[0].ip;
        if (!pc1 || !pc2 || pc1 === pc2) return false;
        return [pc1, pc2].every(
          (ip) => ipToInt(ip) >= ipToInt("192.168.1.100") && ipToInt(ip) <= ipToInt("192.168.1.150")
        );
      },
    },
    {
      id: "ping",
      text: "نجاح ping بين PC1 وPC2 بعد الحصول على العناوين",
      check: (c) => c.test("PC1", "PC2", "ping", true),
    },
  ],
  checks: [{ from: "PC1", target: "PC2", expect: "ok", label: "PC1 ↔ PC2" }],
  hints: [
    "اختر SRV1 ثم الإعدادات وفعّل خدمة DHCP. النطاق الجاهز هو 192.168.1.100–150.",
    "من طرفية كل حاسوب نفّذ الأمر: dhcp — أو استخدم زر «طلب DHCP» في لوحة الإعدادات.",
    "بعد حصول الجهازين على عنوانين، نفّذ ping بينهما.",
    "راقب الأحداث: Discover → Offer → Request → ACK.",
  ],
  steps: [
    { title: "جهّز الخادم", body: "SRV1 يملك 192.168.1.53/24. فعّل خدمة DHCP وتأكد أن النطاق 192.168.1.100–150 والبوابة 192.168.1.1." },
    { title: "اطلب العنوان", body: "من طرفية PC1 نفّذ dhcp. يُرسل Discover بثًا لكل الشبكة." },
    { title: "تابع DORA", body: "الخادم يعرض عنوانًا (Offer)، العميل يطلبه (Request)، ثم يؤكد الخادم (ACK)." },
    { title: "كرّر مع PC2", body: "نفّذ dhcp من طرفية PC2. لاحظ أن العنوان التالي مختلف ولا يتعارض مع الأول." },
    { title: "اختبر", body: "ping بين PC1 وPC2، ثم افحص جدول Leases في لوحة الخادم." },
  ],
};

/* --------------------------------- DNS lab --------------------------------- */

const dnsSeed = () => {
  const pc1 = host(setIp(dev("pc", "dn-pc1", "PC1", 80, 200), ETH, "192.168.1.10"), "192.168.1.1", "192.168.1.53");
  const sw1 = dev("switch", "dn-sw1", "SW1", 380, 200);
  const dns1 = dev("server", "dn-dns1", "DNS1", 680, 80);
  setIp(dns1, ETH, "192.168.1.53");
  dns1.services = { dhcp: false, dns: true, web: false };
  dns1.dnsRecords = [];
  const web1 = dev("server", "dn-web1", "WEB1", 680, 330);
  setIp(web1, ETH, "192.168.1.80");
  web1.services = { dhcp: false, dns: false, web: true };
  return {
    devices: [pc1, sw1, dns1, web1],
    links: [
      link("dn-pc1", ETH, "dn-sw1", FA(0)),
      link("dn-dns1", ETH, "dn-sw1", FA(1)),
      link("dn-web1", ETH, "dn-sw1", FA(2)),
    ],
  };
};

const dnsLab: Lab = {
  id: "dns",
  title: "DNS وخدمة الويب",
  subtitle: "من الاسم إلى العنوان ثم إلى الصفحة",
  description:
    "الأسماء أسهل من الأرقام. أضف سجل A على خادم DNS، ثم استخدم الاسم للوصول إلى خادم ويب. ستشاهد استعلام UDP/53 ثم اتصال TCP/80.",
  difficulty: 2,
  minutes: 12,
  icon: "server",
  accent: "#f472b6",
  tags: ["DNS", "HTTP", "TCP", "A Record"],
  seed: dnsSeed,
  objectives: [
    {
      id: "record",
      text: "أضف سجل A على DNS1: intranet.lab → 192.168.1.80",
      check: (c) => c.hasDnsRecord("DNS1", "intranet.lab", "192.168.1.80"),
    },
    {
      id: "client",
      text: "تأكد أن PC1 يستخدم 192.168.1.53 كخادم DNS",
      check: (c) => findDeviceByName(c.state, "PC1")?.dns === "192.168.1.53",
    },
    {
      id: "ping",
      text: "نجاح ping إلى intranet.lab بالاسم",
      check: (c) => c.test("PC1", "WEB1", "ping", true),
    },
    {
      id: "http",
      text: "تحميل الصفحة عبر curl intranet.lab",
      check: (c) => c.test("PC1", "WEB1", "http", true),
    },
  ],
  checks: [
    { from: "PC1", target: "intranet.lab", expect: "ok", label: "Ping بالاسم" },
    { from: "PC1", target: "intranet.lab", expect: "http", label: "HTTP بالاسم" },
  ],
  hints: [
    "اختر DNS1 ثم الإعدادات ← سجلات DNS وأضف: intranet.lab = 192.168.1.80.",
    "خدمة DNS مفعّلة بالفعل، وPC1 يشير إلى 192.168.1.53.",
    "من طرفية PC1 نفّذ: nslookup intranet.lab ثم curl intranet.lab.",
    "إن ظهر NXDOMAIN فراجع الاسم في السجل وتهجئته.",
  ],
  steps: [
    { title: "افهم الأدوار", body: "DNS1 يحوّل الأسماء إلى عناوين. WEB1 يستضيف الموقع على 192.168.1.80." },
    { title: "أضف السجل", body: "على DNS1 أضف سجل A بالاسم intranet.lab والعنوان 192.168.1.80." },
    { title: "استعلم", body: "من PC1 نفّذ nslookup intranet.lab. راقب حزمة UDP/53 في السجل." },
    { title: "اتصل بالموقع", body: "نفّذ curl intranet.lab. سيتم حل الاسم، ثم SYN/SYN-ACK/ACK، ثم GET و200 OK." },
    { title: "لاحظ الطبقات", body: "اختر حدث HTTP في السجل وافتح تبويب الرزمة لرؤية التغليف من TCP إلى HTTP." },
  ],
};

/* -------------------------------- VLAN lab --------------------------------- */

const vlanSeed = () => {
  const pc1 = host(setIp(dev("pc", "vl-pc1", "PC1", 60, 70), ETH, "192.168.10.10"), "192.168.10.1");
  const pc2 = host(setIp(dev("pc", "vl-pc2", "PC2", 60, 330), ETH, "192.168.10.11"), "192.168.10.1");
  const pc3 = host(setIp(dev("pc", "vl-pc3", "PC3", 760, 70), ETH, "192.168.10.12"), "192.168.10.1");
  const pc4 = host(setIp(dev("pc", "vl-pc4", "PC4", 760, 330), ETH, "192.168.10.13"), "192.168.10.1");
  const sw1 = dev("switch", "vl-sw1", "SW1", 400, 200);
  return {
    devices: [pc1, pc2, pc3, pc4, sw1],
    links: [
      link("vl-pc1", ETH, "vl-sw1", FA(0)),
      link("vl-pc2", ETH, "vl-sw1", FA(1)),
      link("vl-pc3", ETH, "vl-sw1", FA(2)),
      link("vl-pc4", ETH, "vl-sw1", FA(3)),
    ],
  };
};

const vlanLab: Lab = {
  id: "vlan",
  title: "تقسيم VLAN",
  subtitle: "عزل منطقي داخل مبدّل واحد",
  description:
    "كل الأجهزة على نفس المبدّل ونفس الشبكة IP، لكن VLAN تفصل حركة المرور منطقيًا. اضبط المنافذ واختبر من يمكنه رؤية من.",
  difficulty: 2,
  minutes: 10,
  icon: "switch",
  accent: "#a78bfa",
  tags: ["VLAN", "Broadcast Domain", "Isolation"],
  seed: vlanSeed,
  objectives: [
    {
      id: "vlan10",
      text: "اجعل المنفذين Fa0/1 و Fa0/2 في VLAN 10",
      check: (c) => c.hasVlan("SW1", FA(0), 10) && c.hasVlan("SW1", FA(1), 10),
    },
    {
      id: "vlan20",
      text: "اجعل المنفذين Fa0/3 و Fa0/4 في VLAN 20",
      check: (c) => c.hasVlan("SW1", FA(2), 20) && c.hasVlan("SW1", FA(3), 20),
    },
    {
      id: "same",
      text: "نجاح ping بين PC1 وPC2 (نفس VLAN)",
      check: (c) => c.test("PC1", "PC2", "ping", true),
    },
    {
      id: "isolated",
      text: "فشل ping بين PC1 وPC3 (VLAN مختلفة)",
      check: (c) => c.test("PC1", "PC3", "ping", false),
    },
  ],
  checks: [
    { from: "PC1", target: "PC2", expect: "ok", label: "داخل VLAN 10" },
    { from: "PC1", target: "PC3", expect: "fail", label: "بين VLAN 10 و20" },
  ],
  hints: [
    "اختر SW1 ثم تبويب الإعدادات، وغيّر قيمة VLAN لكل منفذ.",
    "Fa0/1 وFa0/2 ← VLAN 10. Fa0/3 وFa0/4 ← VLAN 20.",
    "الأجهزة في نفس الشبكة IP لكن VLAN تمنع الإطار من عبور حدودها.",
    "نفّذ اختبارات المعمل بالزر أعلى اللوحة لترى النجاح والفشل معًا.",
  ],
  steps: [
    { title: "افهم الفكرة", body: "المبدّل الواحد يمكن تقسيمه لعدة شبكات بث مستقلة. كل VLAN = نطاق بث منفصل." },
    { title: "اضبط المنافذ", body: "عيّن Fa0/1 وFa0/2 إلى VLAN 10، وFa0/3 وFa0/4 إلى VLAN 20." },
    { title: "اختبر داخل VLAN", body: "ping PC1 → PC2 يجب أن ينجح: نفس VLAN ونفس الشبكة." },
    { title: "اختبر العزل", body: "ping PC1 → PC3 يجب أن يفشل عند ARP؛ الإطار لا يعبر إلى VLAN 20." },
    { title: "ماذا بعد؟", body: "للتواصل بين VLANs تحتاج توجيهًا (Router-on-a-Stick أو Layer 3 Switch)." },
  ],
};

/* --------------------------------- NAT lab --------------------------------- */

const natSeed = () => {
  const pc1 = host(setIp(dev("pc", "nt-pc1", "PC1", 60, 180), ETH, "192.168.1.10"), "192.168.1.1");
  const sw1 = dev("switch", "nt-sw1", "SW1", 340, 250);
  const r1 = dev("router", "nt-r1", "R1-NAT", 620, 250);
  setIp(r1, G(0), "192.168.1.1");
  setIp(r1, G(1), "203.0.113.2", 24);
  r1.nat = false;
  const srv = dev("server", "nt-srv", "SRV-PUBLIC", 900, 250);
  setIp(srv, ETH, "203.0.113.10", 24);
  srv.gateway = "203.0.113.2";
  srv.services = { dhcp: false, dns: false, web: true };
  return {
    devices: [pc1, sw1, r1, srv],
    links: [
      link("nt-pc1", ETH, "nt-sw1", FA(0)),
      link("nt-sw1", FA(1), "nt-r1", G(0)),
      link("nt-r1", G(1), "nt-srv", ETH),
    ],
  };
};

const natLab: Lab = {
  id: "nat",
  title: "NAT والاتصال بالإنترنت",
  subtitle: "عنوان خاص يصل إلى عالم عام",
  description:
    "جهازك الداخلي يستخدم 192.168.1.10، لكن الخادم العام لا يعرف هذا العنوان. شغّل NAT على الموجّه ليقوم بالترجمة، وتابع جدول الترجمات في الطريق ذهابًا وإيابًا.",
  difficulty: 3,
  minutes: 14,
  icon: "router",
  accent: "#22d3ee",
  tags: ["NAT", "PAT", "Public/Private", "Routing"],
  seed: natSeed,
  objectives: [
    {
      id: "pc",
      text: "PC1: 192.168.1.10/24 والبوابة 192.168.1.1",
      check: (c) => c.hasIp("PC1", "192.168.1.10", 24) && findDeviceByName(c.state, "PC1")?.gateway === "192.168.1.1",
    },
    {
      id: "inside",
      text: "R1-NAT: الواجهة الداخلية G0/0 = 192.168.1.1/24",
      check: (c) => c.hasIp("R1-NAT", "192.168.1.1", 24, G(0)),
    },
    {
      id: "outside",
      text: "R1-NAT: الواجهة الخارجية G0/1 = 203.0.113.2/24",
      check: (c) => c.hasIp("R1-NAT", "203.0.113.2", 24, G(1)),
    },
    {
      id: "nat",
      text: "فعّل NAT على R1-NAT",
      check: (c) => Boolean(findDeviceByName(c.state, "R1-NAT")?.nat),
    },
    {
      id: "ping",
      text: "نجاح ping من PC1 إلى الخادم العام 203.0.113.10",
      check: (c) => c.test("PC1", "SRV-PUBLIC", "ping", true),
    },
    {
      id: "table",
      text: "ظهور ترجمة NAT في جدول الموجّه",
      check: (c) => c.state.runtime.nat.length > 0,
    },
  ],
  checks: [{ from: "PC1", target: "203.0.113.10", expect: "ok", label: "PC1 ↔ الإنترنت" }],
  hints: [
    "PC1 والموجّه الداخلي جاهزان تقريبًا. تأكد من البوابة 192.168.1.1.",
    "اختر R1-NAT وفعّل مفتاح NAT في الإعدادات.",
    "بعد التفعيل نفّذ ping 203.0.113.10 من PC1 ثم افحص تبويب الجداول ← NAT.",
    "لاحظ أن مصدر الحزمة عند الخادم هو 203.0.113.2 وليس 192.168.1.10.",
  ],
  steps: [
    { title: "راجع العنونة", body: "PC1 داخل 192.168.1.0/24، والخادم العام 203.0.113.10/24 على وصلة الموجّه الخارجية." },
    { title: "فعّل NAT", body: "على R1-NAT فعّل NAT. سيترجم عنوان المصدر الخاص إلى عنوان الواجهة الخارجية." },
    { title: "اختبر", body: "ping 203.0.113.10 من PC1. المسار: PC1 → R1 → الخادم." },
    { title: "تابع الترجمة", body: "افتح جدول NAT على R1. عند الرد، يُعاد العنوان إلى 192.168.1.10 عبر الجلسة." },
    { title: "جرّب HTTP", body: "curl 203.0.113.10 لإكمال اتصال TCP عبر NAT." },
  ],
};

/* ------------------------------- firewall lab ------------------------------ */

const firewallSeed = () => {
  const pc1 = host(setIp(dev("pc", "fw-pc1", "PC1", 60, 200), ETH, "192.168.1.10"), "192.168.1.1");
  const sw1 = dev("switch", "fw-sw1", "SW1", 330, 260);
  const fw1 = dev("firewall", "fw-fw1", "FW1", 610, 260);
  setIp(fw1, GI(0), "192.168.1.1");
  setIp(fw1, GI(1), "10.10.10.1");
  fw1.firewallRules = [];
  fw1.firewallDefault = "allow";
  const srv = dev("server", "fw-srv", "WEB1", 890, 260);
  setIp(srv, ETH, "10.10.10.10");
  srv.gateway = "10.10.10.1";
  srv.services = { dhcp: false, dns: false, web: true };
  return {
    devices: [pc1, sw1, fw1, srv],
    links: [
      link("fw-pc1", ETH, "fw-sw1", FA(0)),
      link("fw-sw1", FA(1), "fw-fw1", GI(0)),
      link("fw-fw1", GI(1), "fw-srv", ETH),
    ],
  };
};

const firewallLab: Lab = {
  id: "firewall",
  title: "جدار الحماية",
  subtitle: "اسمح بالويب وامنع ICMP",
  description:
    "جدار الحماية يفحص الحزم قبل تمريرها. أضف قاعدة تمنع ping، بينما يبقى تصفح الويب مسموحًا. ثم راقب قرار الجدار لكل حزمة.",
  difficulty: 2,
  minutes: 12,
  icon: "firewall",
  accent: "#fb7185",
  tags: ["Firewall", "ACL", "ICMP", "TCP/80"],
  seed: firewallSeed,
  objectives: [
    {
      id: "inside",
      text: "FW1: الواجهة الداخلية Gi1 = 192.168.1.1/24",
      check: (c) => c.hasIp("FW1", "192.168.1.1", 24, GI(0)),
    },
    {
      id: "outside",
      text: "FW1: الواجهة الخارجية Gi2 = 10.10.10.1/24",
      check: (c) => c.hasIp("FW1", "10.10.10.1", 24, GI(1)),
    },
    {
      id: "denyIcmp",
      text: "أضف قاعدة رفض بروتوكول ICMP من أي مصدر إلى أي وجهة",
      check: (c) => {
        const fw = findDeviceByName(c.state, "FW1");
        return Boolean(
          fw?.firewallRules?.some(
            (r) => r.action === "deny" && (r.protocol === "icmp" || r.protocol === "any")
          )
        );
      },
    },
    {
      id: "pingFail",
      text: "فشل ping من PC1 إلى WEB1 بسبب قاعدة الحظر",
      check: (c) => c.test("PC1", "WEB1", "ping", false),
    },
    {
      id: "http",
      text: "نجاح تحميل الصفحة عبر curl 10.10.10.10",
      check: (c) => c.test("PC1", "WEB1", "http", true),
    },
  ],
  checks: [
    { from: "PC1", target: "10.10.10.10", expect: "fail", label: "ICMP محظور" },
    { from: "PC1", target: "10.10.10.10", expect: "http", label: "HTTP مسموح" },
  ],
  hints: [
    "تأكد من عناوين FW1 على الواجهتين، وأن PC1 بوابته 192.168.1.1.",
    "اختر FW1 ← الإعدادات ← قواعد الجدار. أضف قاعدة Deny / ICMP / any → any.",
    "سياسة الجدار الافتراضية هي السماح، لذلك HTTP سيعمل حتى بدون قاعدة سماح صريحة.",
    "نفّذ ping (يجب أن يفشل) ثم curl 10.10.10.10 (يجب أن ينجح).",
  ],
  steps: [
    { title: "راجع المسار", body: "PC1 → SW1 → FW1 → WEB1. FW1 هي نقطة الفحص الوحيدة بين الشبكتين." },
    { title: "أضف قاعدة الحظر", body: "قاعدة أولى: Deny، Protocol ICMP، Source any، Destination any." },
    { title: "جرّب ping", body: "ping 10.10.10.10 من PC1. ستُسقط FW1 الحزمة ويظهر ذلك كحدث أحمر." },
    { title: "جرّب الويب", body: "curl 10.10.10.10 يمر لأن قاعدة ICMP لا تطابق TCP/80." },
    { title: "توسّع", body: "جرّب إضافة قاعدة تسمح TCP/80 فقط ثم غيّر السياسة الافتراضية إلى الحظر." },
  ],
};

/* ----------------------------- troubleshooting ----------------------------- */

const troubleSeed = () => {
  const pc1 = host(setIp(dev("pc", "ts-pc1", "PC1", 60, 120), ETH, "192.168.10.10"), "192.168.10.1");
  const pc2 = host(setIp(dev("pc", "ts-pc2", "PC2", 60, 350), ETH, "192.168.10.10"));
  const sw1 = dev("switch", "ts-sw1", "SW1", 360, 240);
  const r1 = dev("router", "ts-r1", "R1", 640, 240);
  setIp(r1, G(0), "192.168.10.1");
  setIp(r1, G(1), "10.20.0.1");
  const srv = host(setIp(dev("server", "ts-srv", "SRV1", 890, 240), ETH, "10.20.0.50"), "10.20.0.1");
  srv.services = { dhcp: false, dns: false, web: true };
  return {
    devices: [pc1, pc2, sw1, r1, srv],
    links: [
      link("ts-pc1", ETH, "ts-sw1", FA(0)),
      link("ts-pc2", ETH, "ts-sw1", FA(1)),
      link("ts-sw1", FA(2), "ts-r1", G(0)),
      link("ts-r1", G(1), "ts-srv", ETH),
    ],
  };
};

const troubleshoot: Lab = {
  id: "troubleshoot",
  title: "مهمة استكشاف أعطال",
  subtitle: "شبكة مكسورة... أصلحها",
  description:
    "هناك عطلان مخفيان في الشبكة: تعارض في عنوان IP وبوابة مفقودة. استخدم الأدوات المتاحة لتشخيص المشكلة وإصلاحها قبل أن يشتكي المستخدمون.",
  difficulty: 3,
  minutes: 15,
  icon: "pc",
  accent: "#f97316",
  tags: ["Troubleshooting", "Duplicate IP", "Gateway", "Diagnostics"],
  seed: troubleSeed,
  objectives: [
    {
      id: "duplicate",
      text: "اكتشف تعارض IP بين PC1 وPC2 وأصلحه",
      check: (c) => {
        const pc2 = findDeviceByName(c.state, "PC2")?.interfaces[0].ip;
        return c.noDuplicateIps() && pc2 === "192.168.10.12";
      },
    },
    {
      id: "gateway",
      text: "اضبط البوابة الافتراضية المفقودة على PC2",
      check: (c) => findDeviceByName(c.state, "PC2")?.gateway === "192.168.10.1",
    },
    {
      id: "server",
      text: "أثبت وصول PC2 إلى SRV1 عبر ping",
      check: (c) => c.test("PC2", "SRV1", "ping", true),
    },
    {
      id: "pc1",
      text: "تأكد أن PC1 ما زال يعمل (ping إلى الخادم)",
      check: (c) => c.test("PC1", "SRV1", "ping", true),
    },
    {
      id: "http",
      text: "تأكد من خدمة الويب على SRV1 عبر HTTP",
      check: (c) => c.test("PC2", "SRV1", "http", true),
    },
  ],
  checks: [
    { from: "PC2", target: "10.20.0.50", expect: "ok", label: "PC2 ↔ SRV1" },
    { from: "PC1", target: "10.20.0.50", expect: "ok", label: "PC1 ↔ SRV1" },
    { from: "PC2", target: "10.20.0.50", expect: "http", label: "HTTP" },
  ],
  hints: [
    "ابدأ من PC2: نفّذ ipconfig. لاحظ عنوان IP والبوابة.",
    "نجاح PC1 وفشل PC2 غالبًا يعني أن المشكلة محلية في PC2 أو تعارض عناوين.",
    "قارن عناوين الأجهزة: PC1 وPC2 يستخدمان نفس العنوان! غيّر PC2 إلى 192.168.10.12.",
    "لا تنسَ البوابة 192.168.10.1 على PC2 للوصول إلى شبكة الخادم 10.20.0.0/24.",
  ],
  steps: [
    { title: "اجمع المعلومات", body: "من طرفية PC1 نفّذ ping 10.20.0.50. من PC2 نفّذ ipconfig ثم ping 192.168.10.1." },
    { title: "حدّد التعارض", body: "PC1 وPC2 يحملان 192.168.10.10. غيّر عنوان PC2 إلى 192.168.10.12/24." },
    { title: "أضف البوابة", body: "PC2 بلا بوابة، لذا لا يعرف طريق الخروج من 192.168.10.0/24. اضبط 192.168.10.1." },
    { title: "تحقق", body: "ping من PC2 إلى 10.20.0.50 ثم curl 10.20.0.50." },
    { title: "راجع الحل", body: "أعد فحص الجداول وتأكد أن PC1 وPC2 وSRV1 يعملون معًا." },
  ],
};

/* --------------------------------- registry -------------------------------- */

export const LABS: Lab[] = [
  sandbox,
  lan,
  routing,
  dhcpLab,
  dnsLab,
  vlanLab,
  natLab,
  firewallLab,
  troubleshoot,
];

export const DEFAULT_LAB_ID = "sandbox";

export function getLab(id: string): Lab {
  return LABS.find((l) => l.id === id) ?? LABS[0];
}

export function seedLab(id: string): { devices: Device[]; links: NetLink[] } {
  return getLab(id).seed();
}

export function validateObjectives(
  lab: Lab,
  state: NetState,
  tests: TestRecord[]
): { id: string; done: boolean }[] {
  const ctx = createLabContext(state, tests);
  return lab.objectives.map((o) => {
    let done = false;
    try {
      done = o.check(ctx);
    } catch {
      done = false;
    }
    return { id: o.id, done };
  });
}

export function findDeviceIdByName(state: NetState, name: string): string | undefined {
  return findDeviceByName(state, name)?.id;
}

export { findDevice };
