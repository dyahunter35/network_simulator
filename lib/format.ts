import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { EventKind, LayerId } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const EVENT_COLORS: Record<EventKind, string> = {
  info: "#94a3b8",
  success: "#5eead4",
  warn: "#fcd34d",
  error: "#fb7185",
  arp: "#c4b5fd",
  icmp: "#7dd3fc",
  dhcp: "#fbbf24",
  dns: "#f472b6",
  tcp: "#7dd3fc",
  switch: "#a78bfa",
  nat: "#2dd4bf",
  firewall: "#fb7185",
  route: "#5eead4",
};

export const EVENT_LABELS: Record<EventKind, string> = {
  info: "معلومة",
  success: "نجاح",
  warn: "تحذير",
  error: "خطأ",
  arp: "ARP",
  icmp: "ICMP",
  dhcp: "DHCP",
  dns: "DNS",
  tcp: "TCP",
  switch: "L2",
  nat: "NAT",
  firewall: "جدار",
  route: "توجيه",
};

export const LAYER_NAMES: Record<LayerId, string> = {
  L1: "الطبقة الفيزيائية",
  L2: "ربط البيانات",
  L3: "الشبكة",
  L4: "النقل",
  L7: "التطبيقات",
};

export const LAYER_SHORT: Record<LayerId, string> = {
  L1: "Physical",
  L2: "Data Link",
  L3: "Network",
  L4: "Transport",
  L7: "Application",
};

export function eventColor(kind: EventKind): string {
  return EVENT_COLORS[kind] ?? "#94a3b8";
}

export function clockTime(at: number): string {
  const d = new Date(at);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function relativeMs(at: number): string {
  return `+${Math.max(0, Math.round((Date.now() - at) / 100) / 10)}s`;
}

export function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}
