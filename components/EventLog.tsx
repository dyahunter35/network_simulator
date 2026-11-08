"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Inbox, Search, X } from "lucide-react";
import { EVENT_LABELS, clockTime, cn, eventColor } from "@/lib/format";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";
import type { EventKind, SimEvent } from "@/lib/types";

type Filter = "all" | "system" | "arp" | "icmp" | "dhcp" | "dns" | "tcp" | "switch" | "nat" | "firewall" | "route";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "system", label: "النظام" },
  { id: "arp", label: "ARP" },
  { id: "icmp", label: "ICMP" },
  { id: "dhcp", label: "DHCP" },
  { id: "dns", label: "DNS" },
  { id: "tcp", label: "TCP/HTTP" },
  { id: "switch", label: "L2" },
  { id: "route", label: "توجيه" },
  { id: "nat", label: "NAT" },
  { id: "firewall", label: "جدار" },
];

function groupOf(kind: EventKind): Filter {
  if (kind === "info" || kind === "success" || kind === "warn" || kind === "error") return "system";
  return kind;
}

export function EventLog() {
  const logs = useLabStore((s) => s.logs);
  const clearLogs = useLabStore((s) => s.clearLogs);
  const openEvent = useUIStore((s) => s.openEvent);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((event) => {
      if (filter !== "all" && groupOf(event.kind) !== filter) return false;
      if (!q) return true;
      return `${event.title} ${event.detail ?? ""} ${event.deviceName ?? ""} ${event.kind}`
        .toLowerCase()
        .includes(q);
    });
  }, [logs, filter, query]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [filtered.length]);

  const counts = useMemo(() => {
    const map = new Map<Filter, number>();
    logs.forEach((event) => {
      const group = groupOf(event.kind);
      map.set(group, (map.get(group) ?? 0) + 1);
    });
    return map;
  }, [logs]);

  return (
    <div className="flex h-full min-h-0 flex-col" dir="rtl">
      <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-line-soft bg-ink-950/30 px-2.5 py-1.5">
        {FILTERS.map((item) => {
          const count = item.id === "all" ? logs.length : counts.get(item.id) ?? 0;
          if (item.id !== "all" && !count) return null;
          return (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={cn(
                "mono flex h-[21px] items-center gap-1 rounded border px-1.5 text-[9px] transition-colors",
                filter === item.id
                  ? "border-mint-400/40 bg-mint-400/10 text-mint-200"
                  : "border-transparent text-faint hover:border-line hover:text-dim"
              )}
            >
              {item.label}
              <span className={cn("text-[8px]", filter === item.id ? "text-mint-300/70" : "text-faint/70")}>
                {count}
              </span>
            </button>
          );
        })}

        <div className="ms-auto flex items-center gap-1.5">
          <div className="relative">
            <Search size={11} className="pointer-events-none absolute start-2 top-1/2 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث…"
              className="field h-[23px] w-[112px] rounded border-line-soft bg-ink-950/60 ps-6 pe-5 font-sans text-[9.5px] focus:w-[145px]"
            />
            {query && (
              <button
                className="absolute end-1 top-1/2 -translate-y-1/2 text-faint hover:text-mist"
                onClick={() => setQuery("")}
                aria-label="مسح البحث"
              >
                <X size={10} />
              </button>
            )}
          </div>
          <button
            onClick={clearLogs}
            disabled={!logs.length}
            className="btn h-[23px] px-2 text-[9px] disabled:opacity-35"
          >
            مسح
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
        }}
        className="scroll-thin min-h-0 flex-1 overflow-y-auto"
      >
        {!filtered.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-faint">
            <Inbox size={22} strokeWidth={1.4} />
            <div className="text-[10.5px]">
              {logs.length ? "لا توجد أحداث مطابقة للتصفية." : "لا توجد أحداث بعد — نفّذ ping أو DHCP من الطرفية."}
            </div>
          </div>
        ) : (
          <div className="divide-y divide-line-soft/60">
            {filtered.map((event) => (
              <EventRow key={event.id} event={event} onOpen={() => openEvent(event.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ event, onOpen }: { event: SimEvent; onOpen: () => void }) {
  const color = eventColor(event.kind);
  const interactive = Boolean(event.packet);
  return (
    <button
      type="button"
      onClick={interactive ? onOpen : undefined}
      className={cn(
        "group flex w-full items-start gap-2 px-2.5 py-1.5 text-start transition-colors",
        interactive ? "cursor-pointer hover:bg-ink-750/45" : "cursor-default"
      )}
    >
      <span className="mono mt-[1px] w-[52px] shrink-0 text-[8.5px] tabular-nums text-faint">
        {clockTime(event.at)}
      </span>
      <span
        className="mono mt-[2px] w-[52px] shrink-0 rounded border px-1 py-px text-center text-[8px] leading-[12px]"
        style={{ color, borderColor: `${color}32`, background: `${color}0f` }}
      >
        {EVENT_LABELS[event.kind]}
      </span>
      <span className="min-w-0 flex-1 leading-snug">
        <span className="block text-[10.5px] text-mist/95">
          {event.deviceName && (
            <span className="mono me-1.5 text-[9px] text-faint">{event.deviceName}</span>
          )}
          {event.title}
        </span>
        {event.detail && (
          <span className="mono mt-0.5 block truncate text-[9px] text-faint">{event.detail}</span>
        )}
      </span>
      {event.layer && (
        <span className="mono mt-[2px] shrink-0 rounded border border-line-soft bg-ink-950/60 px-1 py-px text-[7.5px] text-faint">
          {event.layer}
        </span>
      )}
      {interactive && (
        <span className="mt-[2px] shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100">
          <ArrowUpRight size={11} />
        </span>
      )}
    </button>
  );
}
