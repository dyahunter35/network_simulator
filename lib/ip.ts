export function isValidIp(ip: string): boolean {
  const parts = ip.trim().split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

export function ipToInt(ip: string): number {
  const parts = ip.trim().split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return 0;
  return (
    (((parts[0] << 24) >>> 0) +
      ((parts[1] << 16) >>> 0) +
      ((parts[2] << 8) >>> 0) +
      (parts[3] >>> 0)) >>>
    0
  );
}

export function intToIp(n: number): string {
  const v = n >>> 0;
  return [v >>> 24, (v >>> 16) & 255, (v >>> 8) & 255, v & 255].join(".");
}

export function prefixToMask(prefix: number): string {
  if (prefix <= 0) return "0.0.0.0";
  if (prefix >= 32) return "255.255.255.255";
  return intToIp((0xffffffff << (32 - prefix)) >>> 0);
}

export function prefixToInt(prefix: number): number {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xffffffff;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

export function networkOf(ip: string, prefix: number): string {
  return intToIp((ipToInt(ip) & prefixToInt(prefix)) >>> 0);
}

export function broadcastOf(ip: string, prefix: number): string {
  return intToIp((ipToInt(networkOf(ip, prefix)) | (~prefixToInt(prefix) >>> 0)) >>> 0);
}

export function inSubnet(ip: string, netIp: string, prefix: number): boolean {
  if (!isValidIp(ip) || !isValidIp(netIp)) return false;
  return networkOf(ip, prefix) === networkOf(netIp, prefix);
}

export function sameSubnet(a: string, b: string, prefix: number): boolean {
  return inSubnet(a, b, prefix);
}

export function cidrMatch(cidr: string, ip: string): boolean {
  const v = cidr.trim();
  if (v === "any" || v === "*" || v === "0.0.0.0/0") return true;
  if (!v) return false;
  const [net, pre] = v.split("/");
  const prefix = pre === undefined ? 32 : Number(pre);
  if (!isValidIp(net) || !Number.isFinite(prefix)) return false;
  return inSubnet(ip, net, Math.max(0, Math.min(32, prefix)));
}

export function isPrivateIp(ip: string): boolean {
  if (!isValidIp(ip)) return false;
  return (
    inSubnet(ip, "10.0.0.0", 8) ||
    inSubnet(ip, "172.16.0.0", 12) ||
    inSubnet(ip, "192.168.0.0", 16)
  );
}

export function parseCidr(value: string): { ip: string; prefix: number } | null {
  const [ip, pre] = value.trim().split("/");
  if (!isValidIp(ip)) return null;
  const prefix = pre === undefined ? 24 : Number(pre);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  return { ip, prefix };
}

export function ipRangeSize(prefix: number): number {
  return Math.max(1, 2 ** (32 - prefix) - 2);
}

export function nextIp(ip: string): string {
  return intToIp((ipToInt(ip) + 1) >>> 0);
}

export function lastUsableOf(ip: string, prefix: number): string {
  const b = ipToInt(broadcastOf(ip, prefix));
  return intToIp(Math.max(0, b - 1));
}

export function firstUsableOf(ip: string, prefix: number): string {
  return intToIp((ipToInt(networkOf(ip, prefix)) + 1) >>> 0);
}

export function ipLte(a: string, b: string): boolean {
  return ipToInt(a) <= ipToInt(b);
}

export function prefixLabel(prefix: number): string {
  return `/${prefix}`;
}

export function subnetMaskText(prefix: number): string {
  return `${prefixToMask(prefix)} (/${prefix})`;
}

export function usableHosts(prefix: number): number {
  if (prefix >= 31) return prefix === 32 ? 1 : 2;
  return 2 ** (32 - prefix) - 2;
}

export function binaryIp(ip: string): string {
  return ip
    .split(".")
    .map((p) => Number(p).toString(2).padStart(8, "0"))
    .join(".");
}

export function randomLatency(index: number): number {
  const seed = [1.8, 2.4, 2.1, 3.0, 1.6, 2.8];
  return seed[index % seed.length];
}
