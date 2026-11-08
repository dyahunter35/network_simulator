"use client";

import { useMemo } from "react";
import { ChevronDown, Layers3, Package, Radio, Waypoints } from "lucide-react";
import { EVENT_LABELS, LAYER_NAMES, clockTime, cn, eventColor } from "@/lib/format";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";
import type { LayerId } from "@/lib/types";

const LAYER_TINTS: Record<LayerId, string> = {
  L1: "#94a3b8",
  L2: "#a78bfa",
  L3: "#5eead4",
  L4: "#7dd3fc",
  L7: "#f472b6",
};

export function PacketInspector() {
  const logs = useLabStore((s) => s.logs);
  const lastPacket = useLabStore((s) => s.lastPacket);
  const selectedEventId = useUIStore((s) => s.selectedEventId);
  const setSelectedEventId = useUIStore((s) => s.setSelectedEventId);

  const packetEvents = useMemo(
    () => logs.filter((event) => event.packet).slice(-9).reverse(),
    [logs]
  );

  const selected = useMemo(() => {
    if (selectedEventId) {
      const found = logs.find((event) => event.id === selectedEventId);
      if (found?.packet) return found;
    }
    return lastPacket;
  }, [logs, lastPacket, selectedEventId]);

  if (!selected?.packet) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center" dir="rtl">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-ink-900 text-faint">
          <Package size={20} strokeWidth={1.5} />
          <span className="absolute -end-1 -top-1 h-2 w-2 rounded-full bg-mint-400/70 shadow-[0_0_10px_rgba(45,212,191,.8)]" />
        </div>
        <div>
          <div className="text-[12px] font-medium text-mist">لا توجد حزمة محددة</div>
          <p className="mt-1 max-w-[330px] text-[10.5px] leading-relaxed text-faint">
            نفّذ أمرًا من الطرفية مثل <span className="code-inline">ping</span> أو{" "}
            <span className="code-inline">curl</span>، ثم اضغط على أي حدث في السجل لفحص بنية الحزمة طبقة بطبقة.
          </p>
        </div>
      </div>
    );
  }

  const packet = selected.packet;

  return (
    <div className="flex h-full min-h-0 flex-col" dir="rtl">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line-soft bg-ink-950/30 px-3 py-2">
        <div
          className="mono flex h-6 items-center gap-1.5 rounded border px-2 text-[9px] font-semibold tracking-wide"
          style={{
            color: eventColor(selected.kind),
            borderColor: `${eventColor(selected.kind)}35`,
            background: `${eventColor(selected.kind)}10`,
          }}
        >
          <Radio size={10} />
          {packet.protocol}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11.5px] font-semibold text-mist">{packet.title}</div>
          <div className="mono truncate text-[8.5px] text-faint">
            {selected.deviceName ? `${selected.deviceName} · ` : ""}
            {clockTime(selected.at)} · {EVENT_LABELS[selected.kind]}
          </div>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          {packetEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => setSelectedEventId(event.id)}
              className={cn(
                "mono h-5 shrink-0 rounded border px-1.5 text-[8px] transition-colors",
                event.id === selected.id
                  ? "border-mint-400/45 bg-mint-400/10 text-mint-200"
                  : "border-line-soft text-faint hover:border-line hover:text-dim"
              )}
              title={event.packet?.title}
            >
              {event.packet?.protocol ?? "PKT"}
            </button>
          ))}
        </div>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-line-soft bg-gradient-to-b from-ink-750/40 to-ink-900/20 px-3 py-2.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-400/10 text-sky-300">
            <Waypoints size={14} />
          </div>
          <div className="min-w-0">
            <p className="text-[10.5px] leading-relaxed text-dim">{packet.summary}</p>
          </div>
        </div>

        <div className="space-y-1.5">
          {packet.layers.map((layer, index) => {
            const layerId = layerIdOf(layer.name);
            const tone = layerId ? LAYER_TINTS[layerId] : "#94a3b8";
            return (
              <details
                key={`${layer.name}-${index}`}
                open
                className="group overflow-hidden rounded-lg border border-line-soft bg-ink-900/40"
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 px-2.5 py-1.5 transition-colors hover:bg-ink-750/40 [&::-webkit-details-marker]:hidden">
                  <span
                    className="mono flex h-5 w-9 shrink-0 items-center justify-center rounded border text-[8px] font-semibold"
                    style={{ color: tone, borderColor: `${tone}35`, background: `${tone}0e` }}
                  >
                    {layerId ?? "L?"}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[10.5px] font-medium text-mist/95">{layer.name}</span>
                    {layer.subtitle && (
                      <span className="mono block truncate text-[8px] text-faint">{layer.subtitle}</span>
                    )}
                  </span>
                  <span className="mono hidden text-[8px] text-faint sm:block">
                    {layerId ? LAYER_NAMES[layerId] : ""}
                  </span>
                  <ChevronDown
                    size={12}
                    className="shrink-0 text-faint transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="border-t border-line-soft/70 px-2.5 py-1.5">
                  <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
                    {layer.fields.map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-baseline justify-between gap-2 border-b border-dashed border-line-soft/40 py-1 last:border-0"
                      >
                        <span className="shrink-0 text-[8.5px] text-faint">{key}</span>
                        <span className="mono truncate text-[9.5px] text-mist/90" title={value}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            );
          })}
        </div>

        {packet.payload && (
          <div className="mt-3 overflow-hidden rounded-lg border border-line">
            <div className="flex items-center gap-1.5 border-b border-line-soft bg-ink-950/50 px-2.5 py-1.5">
              <Layers3 size={10} className="text-mint-300/70" />
              <span className="eyebrow">Payload</span>
            </div>
            <pre className="scroll-thin max-h-[140px] overflow-auto px-2.5 py-2 text-left font-mono text-[9.5px] leading-relaxed text-dim" dir="ltr">
              {packet.payload}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

function layerIdOf(name: string): LayerId | null {
  const value = name.toLowerCase();
  if (value.includes("physical") || value.includes("فيزيائي")) return "L1";
  if (value.includes("data link") || value.includes("ethernet") || value.includes("ربط")) return "L2";
  if (value.includes("network") || value.includes("ip") || value.includes("icmp") || value.includes("شبكة")) return "L3";
  if (value.includes("transport") || value.includes("tcp") || value.includes("udp") || value.includes("نقل")) return "L4";
  if (value.includes("application") || value.includes("dns") || value.includes("dhcp") || value.includes("http") || value.includes("تطبيق")) return "L7";
  return null;
}
