"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEVICE_META,
  createDevice,
  findDevice,
  findDeviceByIp,
  freeIfaces,
  isL2,
  peerOf,
  wirelessLinkType,
} from "@/lib/devices";
import {
  simulateDhcp,
  simulateHttp,
  simulatePing,
  simulateTrace,
  resolveDns as engineResolveDns,
  l2Reach,
} from "@/lib/engine";
import { getLab, seedLab } from "@/lib/labs";
import { isValidIp } from "@/lib/ip";
import type {
  Device,
  DeviceKind,
  DhcpPool,
  DnsRecord,
  EventKind,
  FirewallRule,
  Iface,
  NetLink,
  RuntimeState,
  SimEvent,
  TestRecord,
} from "@/lib/types";
import { emptyRuntime } from "@/lib/devices";

export type Selection = { type: "device" | "link"; id: string } | null;

export interface PacketAnimation {
  id: string;
  requestPath: string[];
  replyPath: string[];
  ok: boolean;
  kind: "ping" | "http" | "dhcp" | "trace";
  label: string;
}

export interface LabStore {
  devices: Device[];
  links: NetLink[];
  runtime: RuntimeState;
  activeLabId: string;
  tests: TestRecord[];
  logs: SimEvent[];
  selected: Selection;
  animation: PacketAnimation | null;
  lastPacket: SimEvent | null;
  hydrated: boolean;

  hydrate: () => void;
  setSelected: (selection: Selection) => void;
  addDevice: (kind: DeviceKind, at?: { x: number; y: number }) => Device;
  removeDevice: (id: string) => void;
  updateDevice: (id: string, patch: Partial<Device>) => void;
  updateIface: (deviceId: string, ifaceId: string, patch: Partial<Iface>) => void;
  setGateway: (deviceId: string, gateway: string) => void;
  setDns: (deviceId: string, dns: string) => void;
  setNat: (deviceId: string, enabled: boolean) => void;
  setFirewallDefault: (deviceId: string, policy: "allow" | "deny") => void;
  addRoute: (deviceId: string, route: { dest: string; prefix: number; via: string }) => void;
  removeRoute: (deviceId: string, routeId: string) => void;
  addFirewallRule: (deviceId: string, rule: Omit<FirewallRule, "id">) => void;
  removeFirewallRule: (deviceId: string, ruleId: string) => void;
  setService: (deviceId: string, service: "dhcp" | "dns" | "web", enabled: boolean) => void;
  updatePool: (deviceId: string, patch: Partial<DhcpPool>) => void;
  addDnsRecord: (deviceId: string, record: Omit<DnsRecord, "id">) => void;
  removeDnsRecord: (deviceId: string, recordId: string) => void;
  addLinkBetween: (
    sourceId: string,
    targetId: string,
    sourceIfaceId?: string
  ) => boolean;
  removeLink: (id: string) => void;
  deleteSelected: () => void;
  clearArp: (deviceId: string) => void;
  clearNat: () => void;
  clearLogs: () => void;
  pushLogs: (events: SimEvent[]) => void;
  setAnimation: (animation: PacketAnimation | null) => void;
  recordTest: (test: Omit<TestRecord, "id" | "at">) => void;
  clearTests: () => void;

  runPing: (srcId: string, target: string, count?: number) => ReturnType<typeof simulatePing>;
  runHttp: (srcId: string, target: string, port?: number) => ReturnType<typeof simulateHttp>;
  runDhcp: (clientId: string) => ReturnType<typeof simulateDhcp>;
  runTrace: (srcId: string, target: string) => ReturnType<typeof simulateTrace>;
  runDns: (srcId: string, name: string) => ReturnType<typeof engineResolveDns>;

  loadLab: (labId: string) => void;
  resetActiveLab: () => void;
}

function defaultLabState(labId: string) {
  const seed = seedLab(labId);
  return {
    devices: seed.devices,
    links: seed.links,
    runtime: emptyRuntime(),
    activeLabId: labId,
    tests: [] as TestRecord[],
    logs: [] as SimEvent[],
    selected: null as Selection,
    animation: null as PacketAnimation | null,
    lastPacket: null as SimEvent | null,
  };
}

function capLogs(logs: SimEvent[]): SimEvent[] {
  return logs.length > 400 ? logs.slice(logs.length - 400) : logs;
}

function eventKindFor(kind: "icmp" | "http" | "dhcp" | "trace"): EventKind {
  if (kind === "http") return "tcp";
  if (kind === "dhcp") return "dhcp";
  return "icmp";
}

function makeEvent(
  kind: EventKind,
  title: string,
  detail?: string,
  device?: Device
): SimEvent {
  return {
    id: `sys-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    at: Date.now(),
    t: 0,
    kind,
    title,
    detail,
    deviceId: device?.id,
    deviceName: device?.name,
  };
}

const initial = defaultLabState("sandbox");

export const useLabStore = create<LabStore>()(
  persist(
    (set, get) => ({
      ...initial,
      hydrated: false,

      hydrate: () => {
        set({ hydrated: true });
      },

      setSelected: (selection) => set({ selected: selection }),

      addDevice: (kind, at) => {
        const state = get();
        const meta = DEVICE_META[kind];
        const sameKind = state.devices.filter((d) => d.kind === kind).length;
        const id = `${kind}-${Math.random().toString(36).slice(2, 8)}`;
        const name = `${meta.en === "Laptop" ? "LAP" : meta.en.toUpperCase()}${sameKind + 1}`;
        const baseX = at?.x ?? 420 + (state.devices.length % 3) * 40;
        const baseY = at?.y ?? 260 + (state.devices.length % 4) * 30;
        const device = createDevice(kind, id, name, Math.round(baseX - 90), Math.round(baseY - 50));
        set({
          devices: [...state.devices, device],
          selected: { type: "device", id: device.id },
          logs: capLogs([
            ...state.logs,
            makeEvent("info", `تمت إضافة ${name} إلى الشبكة`, "اسحب من مقبض الجهاز لتوصيله.", device),
          ]),
        });
        return device;
      },

      removeDevice: (id) => {
        const state = get();
        const device = findDevice(state, id);
        if (!device) return;
        const links = state.links.filter(
          (l) => l.a.deviceId !== id && l.b.deviceId !== id
        );
        const arp = { ...state.runtime.arp };
        const mac = { ...state.runtime.mac };
        delete arp[id];
        delete mac[id];
        set({
          devices: state.devices.filter((d) => d.id !== id),
          links,
          runtime: {
            ...state.runtime,
            arp,
            mac,
            leases: state.runtime.leases.filter((l) => l.deviceId !== id),
          },
          selected: state.selected?.id === id ? null : state.selected,
          logs: capLogs([
            ...state.logs,
            makeEvent("warn", `تم حذف ${device.name}`, "أُزيلت كل الوصلات المرتبطة به."),
          ]),
        });
      },

      updateDevice: (id, patch) => {
        set((state) => ({
          devices: state.devices.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        }));
      },

      updateIface: (deviceId, ifaceId, patch) => {
        const state = get();
        const device = findDevice(state, deviceId);
        if (!device) return;
        const before = device.interfaces.find((i) => i.id === ifaceId);
        const ipChanged =
          patch.ip !== undefined && patch.ip !== before?.ip;
        const arp = ipChanged ? { ...state.runtime.arp } : state.runtime.arp;
        if (ipChanged) delete arp[deviceId];
        const dhcpDone = { ...state.runtime.dhcpDone };
        if (ipChanged) delete dhcpDone[ifaceId];
        set({
          devices: state.devices.map((d) =>
            d.id === deviceId
              ? {
                  ...d,
                  interfaces: d.interfaces.map((i) =>
                    i.id === ifaceId ? { ...i, ...patch } : i
                  ),
                }
              : d
          ),
          runtime: { ...state.runtime, arp, dhcpDone },
        });
      },

      setGateway: (deviceId, gateway) => {
        set((state) => ({
          devices: state.devices.map((d) => (d.id === deviceId ? { ...d, gateway } : d)),
        }));
      },

      setDns: (deviceId, dns) => {
        set((state) => ({
          devices: state.devices.map((d) => (d.id === deviceId ? { ...d, dns } : d)),
        }));
      },

      setNat: (deviceId, enabled) => {
        set((state) => ({
          devices: state.devices.map((d) => (d.id === deviceId ? { ...d, nat: enabled } : d)),
        }));
      },

      setFirewallDefault: (deviceId, policy) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId ? { ...d, firewallDefault: policy } : d
          ),
        }));
      },

      addRoute: (deviceId, route) => {
        if (!isValidIp(route.dest) || !isValidIp(route.via)) return;
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId
              ? {
                  ...d,
                  routes: [
                    ...d.routes,
                    { ...route, id: `rt-${Date.now()}-${Math.random().toString(16).slice(2, 5)}` },
                  ],
                }
              : d
          ),
        }));
      },

      removeRoute: (deviceId, routeId) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId ? { ...d, routes: d.routes.filter((r) => r.id !== routeId) } : d
          ),
        }));
      },

      addFirewallRule: (deviceId, rule) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId
              ? {
                  ...d,
                  firewallRules: [
                    ...(d.firewallRules ?? []),
                    { ...rule, id: `fw-${Date.now()}-${Math.random().toString(16).slice(2, 5)}` },
                  ],
                }
              : d
          ),
        }));
      },

      removeFirewallRule: (deviceId, ruleId) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId
              ? { ...d, firewallRules: (d.firewallRules ?? []).filter((r) => r.id !== ruleId) }
              : d
          ),
        }));
      },

      setService: (deviceId, service, enabled) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId
              ? { ...d, services: { ...(d.services ?? {}), [service]: enabled } }
              : d
          ),
        }));
      },

      updatePool: (deviceId, patch) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId
              ? { ...d, dhcpPool: { ...(d.dhcpPool ?? { start: "", end: "", prefix: 24, gateway: "", dns: "" }), ...patch } }
              : d
          ),
        }));
      },

      addDnsRecord: (deviceId, record) => {
        if (!record.name.trim() || !isValidIp(record.ip)) return;
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId
              ? {
                  ...d,
                  dnsRecords: [
                    ...(d.dnsRecords ?? []),
                    { ...record, id: `dns-${Date.now()}-${Math.random().toString(16).slice(2, 5)}` },
                  ],
                }
              : d
          ),
        }));
      },

      removeDnsRecord: (deviceId, recordId) => {
        set((state) => ({
          devices: state.devices.map((d) =>
            d.id === deviceId
              ? { ...d, dnsRecords: (d.dnsRecords ?? []).filter((r) => r.id !== recordId) }
              : d
          ),
        }));
      },

      addLinkBetween: (sourceId, targetId, sourceIfaceId) => {
        const state = get();
        if (sourceId === targetId) return false;
        const source = findDevice(state, sourceId);
        const target = findDevice(state, targetId);
        if (!source || !target) return false;
        const already = state.links.some(
          (l) =>
            (l.a.deviceId === sourceId && l.b.deviceId === targetId) ||
            (l.a.deviceId === targetId && l.b.deviceId === sourceId)
        );
        if (already) return false;
        const sourceFree = freeIfaces(state, sourceId);
        const targetFree = freeIfaces(state, targetId);
        const srcIface = sourceIfaceId
          ? sourceFree.find((i) => i.id === sourceIfaceId)
          : sourceFree[0];
        const dstIface = targetFree[0];
        if (!srcIface || !dstIface) return false;
        const link: NetLink = {
          id: `l-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
          a: { deviceId: sourceId, ifaceId: srcIface.id },
          b: { deviceId: targetId, ifaceId: dstIface.id },
          type: wirelessLinkType(source, target),
        };
        set({
          links: [...state.links, link],
          logs: capLogs([
            ...state.logs,
            makeEvent(
              "info",
              `تم توصيل ${source.name} ↔ ${target.name}`,
              `${srcIface.name} ↔ ${dstIface.name}`
            ),
          ]),
        });
        return true;
      },

      removeLink: (id) => {
        set((state) => ({
          links: state.links.filter((l) => l.id !== id),
          selected: state.selected?.type === "link" && state.selected.id === id ? null : state.selected,
        }));
      },

      deleteSelected: () => {
        const { selected } = get();
        if (!selected) return;
        if (selected.type === "device") get().removeDevice(selected.id);
        else get().removeLink(selected.id);
      },

      clearArp: (deviceId) => {
        set((state) => {
          const arp = { ...state.runtime.arp };
          delete arp[deviceId];
          return { runtime: { ...state.runtime, arp } };
        });
      },

      clearNat: () => {
        set((state) => ({ runtime: { ...state.runtime, nat: [] } }));
      },

      clearLogs: () => set({ logs: [] }),

      pushLogs: (events) => {
        if (!events.length) return;
        set((state) => ({
          logs: capLogs([
            ...state.logs,
            ...events.map((e) => ({ ...e, at: Date.now() })),
          ]),
          lastPacket: [...events].reverse().find((e) => e.packet) ?? state.lastPacket,
        }));
      },

      setAnimation: (animation) => set({ animation }),

      recordTest: (test) => {
        set((state) => ({
          tests: [
            ...state.tests.slice(-60),
            {
              ...test,
              id: `test-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
              at: Date.now(),
            },
          ],
        }));
      },

      clearTests: () => set({ tests: [] }),

      runPing: (srcId, target, count = 4) => {
        const state = get();
        const result = simulatePing(
          { devices: state.devices, links: state.links, runtime: state.runtime },
          srcId,
          target,
          count
        );
        const source = findDevice(
          { devices: result.devices, links: state.links, runtime: result.runtime },
          srcId
        );
        const toId =
          result.targetDevId ??
          findDeviceByIp(
            { devices: result.devices, links: state.links, runtime: result.runtime },
            result.targetIp
          )?.id;
        get().pushLogs(result.events);
        set({
          devices: result.devices,
          runtime: result.runtime,
          animation: {
            id: `anim-${Date.now()}`,
            requestPath: result.requestPath,
            replyPath: result.replyPath,
            ok: result.ok,
            kind: "ping",
            label: target,
          },
        });
        if (toId && source) {
          get().recordTest({
            kind: "ping",
            fromId: srcId,
            toId,
            ok: result.ok,
            detail: result.error ?? `${count} packets`,
          });
        }
        return result;
      },

      runHttp: (srcId, target, port = 80) => {
        const state = get();
        const result = simulateHttp(
          { devices: state.devices, links: state.links, runtime: state.runtime },
          srcId,
          target,
          port
        );
        get().pushLogs(result.events);
        const toId =
          result.targetDevId ??
          findDeviceByIp(
            { devices: result.devices, links: state.links, runtime: result.runtime },
            result.targetIp
          )?.id;
        set({
          devices: result.devices,
          runtime: result.runtime,
          animation: {
            id: `anim-${Date.now()}`,
            requestPath: result.requestPath,
            replyPath: result.replyPath,
            ok: result.ok,
            kind: "http",
            label: target,
          },
        });
        if (toId) {
          get().recordTest({
            kind: "http",
            fromId: srcId,
            toId,
            ok: result.ok,
            detail: result.error ?? "HTTP 200",
          });
        }
        return result;
      },

      runDhcp: (clientId) => {
        const state = get();
        const result = simulateDhcp(
          { devices: state.devices, links: state.links, runtime: state.runtime },
          clientId
        );
        get().pushLogs(result.events);
        const client = findDevice(
          { devices: result.devices, links: state.links, runtime: result.runtime },
          clientId
        );
        let animation: PacketAnimation | null = null;
        if (result.ok && client) {
          const iface = client.interfaces.find((i) => i.ip === result.assignedIp);
          if (iface) {
            const reach = l2Reach(
              { devices: result.devices, links: state.links, runtime: result.runtime },
              clientId,
              iface.id
            );
            const server = result.events.find((e) => e.deviceName === result.serverName);
            const serverDev = result.serverName
              ? result.devices.find((d) => d.name === result.serverName)
              : undefined;
            const endpoint = reach.find((ep) => ep.deviceId === serverDev?.id);
            if (endpoint) {
              animation = {
                id: `anim-${Date.now()}`,
                requestPath: endpoint.path,
                replyPath: [...endpoint.path].reverse(),
                ok: true,
                kind: "dhcp",
                label: result.assignedIp ?? "DHCP",
              };
            }
            void server;
          }
        }
        set({
          devices: result.devices,
          runtime: result.runtime,
          animation: animation ?? get().animation,
        });
        return result;
      },

      runTrace: (srcId, target) => {
        const state = get();
        const result = simulateTrace(
          { devices: state.devices, links: state.links, runtime: state.runtime },
          srcId,
          target
        );
        get().pushLogs(result.events);
        const source = findDevice(
          { devices: state.devices, links: state.links, runtime: state.runtime },
          srcId
        );
        if (result.hops.length) {
          set({
            animation: {
              id: `anim-${Date.now()}`,
              requestPath: [srcId, ...result.hops.map((h) => h.deviceId)],
              replyPath: [],
              ok: result.ok,
              kind: "trace",
              label: target,
            },
          });
        }
        if (source && result.hops.length) {
          const last = result.hops[result.hops.length - 1];
          get().recordTest({
            kind: "trace",
            fromId: srcId,
            toId: last.deviceId,
            ok: result.ok,
            detail: `${result.hops.length} hops`,
          });
        }
        return result;
      },

      runDns: (srcId, name) => {
        const state = get();
        const result = engineResolveDns(
          { devices: state.devices, links: state.links, runtime: state.runtime },
          srcId,
          name
        );
        get().pushLogs(result.events);
        return result;
      },

      loadLab: (labId) => {
        const lab = getLab(labId);
        const state = defaultLabState(lab.id);
        set({
          ...state,
          logs: [
            makeEvent(
              "info",
              `تم تحميل معمل «${lab.title}»`,
              lab.description
            ),
          ],
          selected: null,
        });
      },

      resetActiveLab: () => {
        get().loadLab(get().activeLabId);
      },
    }),
    {
      name: "netlab-state-v1",
      version: 1,
      skipHydration: true,
      partialize: (state) => ({
        devices: state.devices,
        links: state.links,
        runtime: state.runtime,
        activeLabId: state.activeLabId,
        tests: state.tests,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrate();
        }
      },
    }
  )
);

export function selectDevice(id: string | undefined): Device | undefined {
  if (!id) return undefined;
  return useLabStore.getState().devices.find((d) => d.id === id);
}

export function getPeerName(state: { devices: Device[]; links: NetLink[] }, deviceId: string, ifaceId: string) {
  const peer = peerOf(state as never, deviceId, ifaceId);
  if (!peer) return null;
  return {
    device: findDevice(state as never, peer.deviceId),
    iface: findDevice(state as never, peer.deviceId)?.interfaces.find((i) => i.id === peer.ifaceId),
  };
}

export { isL2, eventKindFor };
