"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Circle, Eraser, TerminalSquare } from "lucide-react";
import { connectedRoutes, findDeviceByName, primaryIp } from "@/lib/devices";
import { isValidIp } from "@/lib/ip";
import { cn } from "@/lib/format";
import type { Device } from "@/lib/types";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";

interface TermLine {
  id: number;
  kind: "cmd" | "out" | "ok" | "err" | "dim" | "warn";
  text: string;
  prompt?: string;
}

const HISTORY = new Map<string, TermLine[]>();
const COMMAND_HISTORY = new Map<string, string[]>();
let lineCounter = 1;
let lastTerminalDevice = "";

const COMMANDS = [
  "help",
  "ipconfig",
  "ping",
  "tracert",
  "arp -a",
  "route",
  "dhcp",
  "nslookup",
  "curl",
  "clear",
];

export function Terminal() {
  const devices = useLabStore((s) => s.devices);
  const selected = useLabStore((s) => s.selected);
  const setSelected = useLabStore((s) => s.setSelected);
  const runPing = useLabStore((s) => s.runPing);
  const runTrace = useLabStore((s) => s.runTrace);
  const runDhcp = useLabStore((s) => s.runDhcp);
  const runDns = useLabStore((s) => s.runDns);
  const runHttp = useLabStore((s) => s.runHttp);
  const runtime = useLabStore((s) => s.runtime);
  const toast = useUIStore((s) => s.toast);

  const selectedId = selected?.type === "device" ? selected.id : undefined;
  const fallback = useMemo(() => {
    const firstPc = devices.find((d) => d.kind === "pc");
    return firstPc?.id ?? devices[0]?.id ?? "";
  }, [devices]);

  const [activeId, setActiveId] = useState<string>(() => {
    if (selectedId) return selectedId;
    if (lastTerminalDevice && devices.some((d) => d.id === lastTerminalDevice)) return lastTerminalDevice;
    return fallback;
  });
  const [lines, setLines] = useState<TermLine[]>([]);
  const [input, setInput] = useState("");
  const [cmdIndex, setCmdIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedId) setActiveId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!devices.some((d) => d.id === activeId)) {
      setActiveId(fallback);
    }
  }, [devices, activeId, fallback]);

  const active = devices.find((d) => d.id === activeId);

  useEffect(() => {
    if (!active) {
      setLines([]);
      return;
    }
    lastTerminalDevice = active.id;
    let stored = HISTORY.get(active.id);
    if (!stored) {
      stored = [
        {
          id: lineCounter++,
          kind: "dim",
          text: "NETLAB shell v1.0 · اكتب help لعرض الأوامر المتاحة",
        },
        {
          id: lineCounter++,
          kind: "out",
          text: `Connected to ${active.name} — ${primaryIp(active) ?? "no IP"} · ${active.kind.toUpperCase()}`,
        },
      ];
      HISTORY.set(active.id, stored);
    }
    setLines(stored);
    setCmdIndex(-1);
  }, [active]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const push = (deviceId: string, newLines: Omit<TermLine, "id">[]) => {
    const stored = HISTORY.get(deviceId) ?? [];
    const withIds = newLines.map((l) => ({ ...l, id: lineCounter++ }));
    const next = [...stored, ...withIds].slice(-240);
    HISTORY.set(deviceId, next);
    setLines(next);
  };

  const execute = (raw: string) => {
    if (!active) return;
    const command = raw.trim();
    if (!command) return;
    setInput("");
    setCmdIndex(-1);
    const hist = COMMAND_HISTORY.get(active.id) ?? [];
    COMMAND_HISTORY.set(active.id, [...hist, command].slice(-50));
    push(active.id, [{ kind: "cmd", text: command, prompt: `${active.name}>` }]);

    const parts = command.split(/\s+/);
    const head = parts[0].toLowerCase();
    const rest = command.slice(parts[0].length).trim();

    const out = (text: string, kind: TermLine["kind"] = "out") =>
      push(active.id, [{ kind, text }]);

    switch (head) {
      case "help":
      case "?": {
        push(active.id, [
          { kind: "out", text: "الأوامر المتاحة:" },
          { kind: "dim", text: "  ipconfig              عرض عناوين الواجهات والبوابة وDNS" },
          { kind: "dim", text: "  ping <host|ip> [n]    اختبار الوصول (ICMP Echo)" },
          { kind: "dim", text: "  tracert <host|ip>     تتبع المسار قفزة بقفزة" },
          { kind: "dim", text: "  arp -a                عرض جدول ARP" },
          { kind: "dim", text: "  route                 عرض جدول التوجيه" },
          { kind: "dim", text: "  dhcp                  طلب عنوان عبر DHCP" },
          { kind: "dim", text: "  nslookup <name>       استعلام DNS" },
          { kind: "dim", text: "  curl <host|ip>[:port] طلب HTTP" },
          { kind: "dim", text: "  show mac / show vlan  جداول المبدّل" },
          { kind: "dim", text: "  clear                 مسح الشاشة" },
          { kind: "dim", text: "  help                  هذه القائمة" },
        ]);
        break;
      }

      case "clear":
        HISTORY.set(active.id, []);
        setLines([]);
        break;

      case "hostname":
        out(active.name);
        break;

      case "ipconfig":
      case "ifconfig":
      case "ip": {
        if (rest === "a" || rest === "addr" || rest === "" || rest === "config") {
          const rows: Omit<TermLine, "id">[] = [];
          for (const iface of active.interfaces) {
            rows.push({
              kind: "out",
              text: `${iface.name}: ${iface.ip ? `inet ${iface.ip}/${iface.prefix}` : iface.dhcp ? "DHCP pending (no lease)" : "no ip address"}`,
            });
            rows.push({ kind: "dim", text: `        ether ${iface.mac}${iface.vlan ? `  vlan ${iface.vlan}` : ""}` });
          }
          if (active.gateway) rows.push({ kind: "out", text: `default via ${active.gateway}` });
          if (active.dns) rows.push({ kind: "out", text: `DNS server: ${active.dns}` });
          if (active.kind === "switch" || active.kind === "hub" || active.kind === "ap") {
            rows.push({ kind: "dim", text: "Layer 2 device — no IP stack required for switching." });
          }
          push(active.id, rows);
        } else if (rest.startsWith("route")) {
          showRoutes(active, out);
        } else {
          out("usage: ipconfig | ip a | ip route", "warn");
        }
        break;
      }

      case "ping": {
        if (!rest) {
          out("usage: ping <ip|hostname> [count]", "warn");
          break;
        }
        const [target, countRaw] = rest.split(/\s+/);
        const count = Math.min(8, Math.max(1, Number(countRaw) || 4));
        out(`PING ${target}${isValidIp(target) ? "" : " (resolving…)"} 56(84) bytes of data.`);
        const res = runPing(active.id, target, count);
        if (res.ok) {
          const host = res.targetName ? `${res.targetName} (${res.targetIp})` : res.targetIp;
          const replies = res.latency.length
            ? res.latency
            : Array.from({ length: count }, () => 0);
          push(
            active.id,
            replies.map((ms, i) => ({
              kind: "out" as const,
              text: `64 bytes from ${host}: icmp_seq=${i + 1} ttl=${64 - (i === 0 ? 0 : 0)} time=${ms.toFixed(1)} ms`,
            }))
          );
          push(active.id, [
            { kind: "dim", text: `--- ${host} ping statistics ---` },
            {
              kind: "ok",
              text: `${count} packets transmitted, ${res.latency.length} received, 0% packet loss`,
            },
            {
              kind: "dim",
              text: `rtt min/avg/max = ${Math.min(...res.latency).toFixed(1)}/${(res.latency.reduce((a, b) => a + b, 0) / res.latency.length).toFixed(1)}/${Math.max(...res.latency).toFixed(1)} ms`,
            },
          ]);
        } else {
          push(active.id, [
            { kind: "err", text: "Request timed out." },
            { kind: "dim", text: `--- ${target} ping statistics ---` },
            { kind: "err", text: `${count} packets transmitted, 0 received, 100% packet loss` },
          ]);
          if (res.error) push(active.id, [{ kind: "warn", text: `! ${res.error}` }]);
        }
        break;
      }

      case "tracert":
      case "traceroute": {
        if (!rest) {
          out("usage: tracert <ip|hostname>", "warn");
          break;
        }
        out(`Tracing route to ${rest} over a maximum of 15 hops`);
        const res = runTrace(active.id, rest);
        if (res.hops.length) {
          push(
            active.id,
            res.hops.map((hop, index) => ({
              kind: "out" as const,
              text: ` ${String(index + 1).padStart(2)}   ${hop.ms.toFixed(1)} ms   ${hop.ip.padEnd(15)} ${hop.name}`,
            }))
          );
        }
        if (res.ok) {
          out("Trace complete.", "ok");
        } else {
          out(`Trace stopped: ${res.error ?? "destination unreachable"}`, "err");
        }
        break;
      }

      case "arp": {
        const table = runtime.arp[active.id] ?? [];
        if (!table.length) {
          out("ARP table is empty. Run ping to populate it.", "dim");
        } else {
          push(active.id, [
            { kind: "dim", text: "  Address           HWtype  HWaddress            Iface" },
            ...table.map((entry) => ({
              kind: "out" as const,
              text: `  ${entry.ip.padEnd(17)} ether   ${entry.mac.padEnd(20)} ${active.interfaces.find((i) => i.id === entry.ifaceId)?.name ?? entry.ifaceId}`,
            })),
          ]);
        }
        break;
      }

      case "route": {
        if (rest === "print") {
          showRoutes(active, out);
        } else {
          showRoutes(active, out);
        }
        break;
      }

      case "show": {
        if (active.kind === "switch" && (rest === "mac" || rest === "mac address-table")) {
          const table = runtime.mac[active.id] ?? [];
          if (!table.length) {
            out("MAC table is empty. Generate traffic to populate it.", "dim");
          } else {
            push(active.id, [
              { kind: "dim", text: "  MAC Address        Port     VLAN" },
              ...table.map((entry) => ({
                kind: "out" as const,
                text: `  ${entry.mac.padEnd(18)} ${entry.ifaceId.padEnd(8)} ${entry.vlan}`,
              })),
            ]);
          }
        } else if (active.kind === "switch" && rest === "vlan") {
          const groups = new Map<number, string[]>();
          active.interfaces.forEach((i) => {
            const vlan = i.vlan ?? 1;
            groups.set(vlan, [...(groups.get(vlan) ?? []), i.name]);
          });
          push(active.id, [
            { kind: "dim", text: "VLAN  Ports" },
            ...Array.from(groups.entries()).map(([vlan, ports]) => ({
              kind: "out" as const,
              text: `${String(vlan).padEnd(5)} ${ports.join(", ")}`,
            })),
          ]);
        } else if (rest === "ip route") {
          showRoutes(active, out);
        } else {
          out("usage: show mac | show vlan | show ip route", "warn");
        }
        break;
      }

      case "dhcp":
      case "renew": {
        if (active.kind === "switch" || active.kind === "hub" || active.kind === "ap") {
          out("DHCP client is not available on Layer 2 devices.", "warn");
          break;
        }
        push(active.id, [
          { kind: "dim", text: "DHCPDISCOVER on all interfaces (broadcast)…" },
        ]);
        const res = runDhcp(active.id);
        if (res.ok) {
          push(active.id, [
            { kind: "out", text: `DHCPOFFER from ${res.serverName ?? "server"}: ${res.assignedIp}/${res.prefix}` },
            { kind: "ok", text: `DHCPACK: bound ${res.assignedIp}/${res.prefix}` },
            { kind: "dim", text: `gateway ${res.gateway}   dns ${res.dns}   lease 24h` },
          ]);
        } else {
          push(active.id, [{ kind: "err", text: `DHCP failed: ${res.error}` }]);
          if (!res.error?.includes("خادم")) {
            out("Check that a DHCP server is enabled and in the same broadcast domain.", "warn");
          }
        }
        break;
      }

      case "nslookup":
      case "dig": {
        if (!rest) {
          out("usage: nslookup <hostname>", "warn");
          break;
        }
        if (isValidIp(rest)) {
          out("nslookup expects a hostname, not an IP address.", "warn");
          break;
        }
        out(`Server: ${active.dns ?? "not configured"}`, active.dns ? "out" : "err");
        const res = runDns(active.id, rest);
        if (res.ok && res.ip) {
          push(active.id, [
            { kind: "dim", text: "" },
            { kind: "out", text: `Name:    ${rest}` },
            { kind: "ok", text: `Address: ${res.ip}` },
          ]);
        } else {
          out(`** server can't find ${rest}: ${res.error ?? "NXDOMAIN"}`, "err");
        }
        break;
      }

      case "curl": {
        if (!rest) {
          out("usage: curl <host|ip>[:port]", "warn");
          break;
        }
        let target = rest;
        let port = 80;
        const colon = rest.lastIndexOf(":");
        if (colon > 0 && /^\d+$/.test(rest.slice(colon + 1))) {
          target = rest.slice(0, colon);
          port = Number(rest.slice(colon + 1));
        }
        out(`* Trying ${target}${port !== 80 ? `:${port}` : ""}…`);
        const res = runHttp(active.id, target, port);
        if (res.ok) {
          push(active.id, [
            { kind: "dim", text: "* TCP handshake: SYN → SYN-ACK → ACK (established)" },
            { kind: "out", text: `> GET / HTTP/1.1` },
            { kind: "out", text: `> Host: ${target}` },
            { kind: "ok", text: "< HTTP/1.1 200 OK" },
            { kind: "dim", text: "< Content-Type: text/html; charset=utf-8" },
            { kind: "out", text: "" },
            { kind: "ok", text: "  It works!" },
          ]);
        } else {
          push(active.id, [
            { kind: "err", text: `curl: (7) Failed to connect — ${res.error ?? "connection refused"}` },
          ]);
        }
        break;
      }

      default:
        out(`command not found: ${parts[0]} — اكتب help`, "err");
    }
  };

  const showRoutes = (device: Device, out: (text: string, kind?: TermLine["kind"]) => void) => {
    const rows: Omit<TermLine, "id">[] = [
      { kind: "dim", text: "Destination        Gateway         Iface   Type" },
    ];
    [...connectedRoutes(device), ...device.routes.map((r) => ({ ...r, ifaceName: "static" }))].forEach(
      (route) => {
        rows.push({
          kind: "out",
          text: `${`${route.dest}/${route.prefix}`.padEnd(19)}${(("via" in route && route.via) || "connected").padEnd(16)}${(route as { ifaceName?: string }).ifaceName ?? "—"}`,
        });
      }
    );
    if (device.gateway) {
      rows.push({ kind: "out", text: `${"0.0.0.0/0".padEnd(19)}${device.gateway.padEnd(16)}default` });
    }
    if (rows.length === 1) rows.push({ kind: "dim", text: "No routes configured." });
    rows.forEach((r) => push(device.id, [{ kind: r.kind, text: r.text }]));
    void out;
  };

  const complete = () => {
    if (!input.trim()) return;
    const match = COMMANDS.find((c) => c.startsWith(input.trim().toLowerCase()));
    if (match) setInput(match);
  };

  const navigateHistory = (dir: -1 | 1) => {
    if (!active) return;
    const hist = COMMAND_HISTORY.get(active.id) ?? [];
    if (!hist.length) return;
    let index = cmdIndex;
    if (index === -1) index = dir === -1 ? hist.length : -1;
    const next = index + dir;
    if (next < 0) {
      setCmdIndex(-1);
      setInput("");
    } else if (next >= hist.length) {
      setCmdIndex(-1);
      setInput("");
    } else {
      setCmdIndex(next);
      setInput(hist[next]);
    }
  };

  if (!active) {
    return (
      <div className="flex h-full items-center justify-center text-[11px] text-faint">
        اختر جهازًا لعرض طرفيته.
      </div>
    );
  }

  return (
    <div className="terminal flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line-soft bg-ink-950/40 px-3" dir="rtl">
        <TerminalSquare size={13} className="text-mint-300/80" />
        <span className="text-[9.5px] text-faint">الطرفية</span>
        <select
          value={active.id}
          onChange={(e) => {
            const id = e.target.value;
            setActiveId(id);
            setSelected({ type: "device", id });
          }}
          className="field h-6 w-auto min-w-0 max-w-[190px] rounded border-line-soft bg-ink-900 px-1.5 font-sans text-[9.5px]"
          dir="ltr"
        >
          {devices.map((device) => (
            <option key={device.id} value={device.id}>
              {device.name}
            </option>
          ))}
        </select>
        <span className="hidden truncate text-[8.5px] text-faint sm:inline">
          {primaryIp(active) ?? "no ip"} · {active.interfaces.length} if
        </span>
        <div className="ms-auto flex items-center gap-1">
          <span className="hidden items-center gap-1 text-[8.5px] text-mint-300/80 sm:flex">
            <Circle size={5} fill="currentColor" /> online
          </span>
          <button
            className="icon-btn h-6 w-6"
            title="مسح الطرفية"
            onClick={() => {
              HISTORY.set(active.id, []);
              setLines([]);
            }}
          >
            <Eraser size={12} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="scroll-thin min-h-0 flex-1 cursor-text overflow-y-auto px-3 py-2.5"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line) => (
          <div key={line.id} className="term-out">
            {line.kind === "cmd" ? (
              <>
                <span className="term-prompt">{line.prompt}</span>{" "}
                <span className="term-cmd">{line.text}</span>
              </>
            ) : (
              <span
                className={cn(
                  line.kind === "ok" && "term-ok",
                  line.kind === "err" && "term-err",
                  line.kind === "dim" && "term-dim",
                  line.kind === "warn" && "term-warn"
                )}
              >
                {line.text || "\u00a0"}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-line-soft bg-ink-950/40 px-3 py-1.5">
        <div className="mb-1.5 hidden flex-wrap items-center gap-1 md:flex" dir="rtl">
          <span className="text-[8.5px] text-faint">جرّب:</span>
          {["ping", "tracert", "ipconfig", "dhcp", "nslookup", "curl", "arp -a", "show mac"].map((cmd) => (
            <button
              key={cmd}
              onClick={() => {
                setInput(cmd + (cmd === "ping" || cmd === "tracert" || cmd === "nslookup" || cmd === "curl" ? " " : ""));
                inputRef.current?.focus();
              }}
              className="mono rounded border border-line-soft bg-ink-900 px-1.5 py-0.5 text-[8px] text-faint transition-colors hover:border-line hover:text-mint-200"
            >
              {cmd}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2" dir="ltr">
          <ChevronRight size={13} className="shrink-0 text-mint-300" />
          <span className="mono shrink-0 text-[11px] font-semibold text-mint-300">
            {active.name}
            <span className="text-faint">&gt;</span>
          </span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                execute(input);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                navigateHistory(-1);
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                navigateHistory(1);
              } else if (e.key === "Tab") {
                e.preventDefault();
                complete();
              }
            }}
            className="mono min-w-0 flex-1 border-0 bg-transparent text-[11px] text-mist caret-mint-300 placeholder:text-faint focus:outline-none"
            placeholder="اكتب الأمر هنا… (help)"
            spellCheck={false}
            autoComplete="off"
          />
          <span className="hidden text-[8px] text-faint sm:inline">↑↓ history · Tab complete</span>
        </div>
      </div>
    </div>
  );
}
