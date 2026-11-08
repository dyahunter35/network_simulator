export type DeviceKind =
  | "pc"
  | "laptop"
  | "server"
  | "switch"
  | "router"
  | "firewall"
  | "ap"
  | "hub";

export type Protocol = "icmp" | "tcp" | "udp";

export interface Iface {
  id: string;
  name: string;
  mac: string;
  ip?: string;
  prefix?: number;
  dhcp?: boolean;
  vlan?: number;
  trunk?: boolean;
}

export interface RouteEntry {
  id: string;
  dest: string;
  prefix: number;
  via?: string;
}

export interface FirewallRule {
  id: string;
  action: "allow" | "deny";
  protocol: "any" | "icmp" | "tcp" | "udp";
  src: string;
  dst: string;
  port?: number;
}

export interface DhcpPool {
  start: string;
  end: string;
  prefix: number;
  gateway: string;
  dns: string;
}

export interface DnsRecord {
  id: string;
  name: string;
  ip: string;
}

export interface DeviceServices {
  dhcp?: boolean;
  dns?: boolean;
  web?: boolean;
}

export interface Device {
  id: string;
  kind: DeviceKind;
  name: string;
  x: number;
  y: number;
  interfaces: Iface[];
  gateway?: string;
  dns?: string;
  routes: RouteEntry[];
  nat?: boolean;
  firewallRules?: FirewallRule[];
  firewallDefault?: "allow" | "deny";
  dhcpPool?: DhcpPool;
  dnsRecords?: DnsRecord[];
  services?: DeviceServices;
  note?: string;
}

export interface LinkEnd {
  deviceId: string;
  ifaceId: string;
}

export interface NetLink {
  id: string;
  a: LinkEnd;
  b: LinkEnd;
  type: "copper" | "wireless";
}

export interface ArpEntry {
  ip: string;
  mac: string;
  ifaceId: string;
  deviceId?: string;
  at: number;
}

export interface MacEntry {
  mac: string;
  ifaceId: string;
  vlan: number;
  learnedAt: number;
}

export interface Lease {
  deviceId: string;
  ifaceId: string;
  ip: string;
  prefix: number;
  serverId: string;
  at: number;
  expiresAt: number;
}

export interface NatEntry {
  id: string;
  insideIp: string;
  outsideIp: string;
  destIp: string;
  at: number;
}

export interface RuntimeState {
  arp: Record<string, ArpEntry[]>;
  mac: Record<string, MacEntry[]>;
  leases: Lease[];
  nat: NatEntry[];
  dhcpDone: Record<string, string>;
}

export interface NetState {
  devices: Device[];
  links: NetLink[];
  runtime: RuntimeState;
}

export type EventKind =
  | "info"
  | "success"
  | "warn"
  | "error"
  | "arp"
  | "icmp"
  | "dhcp"
  | "dns"
  | "tcp"
  | "switch"
  | "nat"
  | "firewall"
  | "route";

export type LayerId = "L1" | "L2" | "L3" | "L4" | "L7";

export interface PacketLayer {
  name: string;
  subtitle?: string;
  fields: [string, string][];
}

export interface PacketDetail {
  title: string;
  protocol: string;
  summary: string;
  layers: PacketLayer[];
  payload?: string;
}

export interface SimEvent {
  id: string;
  at: number;
  t: number;
  deviceId?: string;
  deviceName?: string;
  kind: EventKind;
  layer?: LayerId;
  title: string;
  detail?: string;
  packet?: PacketDetail;
}

export interface TestRecord {
  id: string;
  kind: "ping" | "http" | "trace";
  fromId: string;
  toId: string;
  ok: boolean;
  at: number;
  detail?: string;
}

export interface FlowResult {
  ok: boolean;
  path: string[];
  routers: string[];
  srcIp: string;
  destIp: string;
  deliveredIp?: string;
  destinationDevId?: string;
  error?: string;
  blockedBy?: string;
}

export interface PingResult {
  ok: boolean;
  events: SimEvent[];
  requestPath: string[];
  replyPath: string[];
  latency: number[];
  srcIp: string;
  targetIp: string;
  targetName?: string;
  targetDevId?: string;
  error?: string;
  devices: Device[];
  runtime: RuntimeState;
  arpUsed: boolean;
}

export interface DhcpResult {
  ok: boolean;
  events: SimEvent[];
  assignedIp?: string;
  prefix?: number;
  gateway?: string;
  dns?: string;
  serverName?: string;
  error?: string;
  devices: Device[];
  runtime: RuntimeState;
}

export interface DnsResult {
  ok: boolean;
  events: SimEvent[];
  ip?: string;
  error?: string;
}

export interface HttpResult {
  ok: boolean;
  events: SimEvent[];
  requestPath: string[];
  replyPath: string[];
  status?: number;
  body?: string;
  error?: string;
  devices: Device[];
  runtime: RuntimeState;
  srcIp: string;
  targetIp: string;
  targetDevId?: string;
}
