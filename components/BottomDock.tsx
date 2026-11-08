"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, ListTree, Package, TerminalSquare } from "lucide-react";
import { Terminal } from "@/components/Terminal";
import { EventLog } from "@/components/EventLog";
import { PacketInspector } from "@/components/PacketInspector";
import { cn } from "@/lib/format";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";

const TABS = [
  { id: "terminal" as const, label: "الطرفية", icon: TerminalSquare },
  { id: "events" as const, label: "سجل الأحداث", icon: ListTree },
  { id: "packet" as const, label: "فحص الحزمة", icon: Package },
];

export function BottomDock() {
  const bottomTab = useUIStore((s) => s.bottomTab);
  const bottomOpen = useUIStore((s) => s.bottomOpen);
  const setBottomTab = useUIStore((s) => s.setBottomTab);
  const setBottomOpen = useUIStore((s) => s.setBottomOpen);
  const logs = useLabStore((s) => s.logs);
  const lastPacket = useLabStore((s) => s.lastPacket);

  const [height, setHeight] = useState(272);
  const dragRef = useRef<{ y: number; height: number } | null>(null);

  const packets = logs.filter((event) => event.packet).length;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { y: event.clientY, height };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const next = dragRef.current.height + (dragRef.current.y - event.clientY);
    setHeight(Math.max(150, Math.min(560, next)));
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  return (
    <section
      className="relative z-20 flex shrink-0 flex-col border-t border-line bg-ink-950/80 backdrop-blur-xl"
      style={{ height: bottomOpen ? height : 38 }}
    >
      {bottomOpen && (
        <div
          role="separator"
          aria-orientation="horizontal"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onDoubleClick={() => setHeight(272)}
          className="group absolute -top-1.5 inset-x-0 z-10 h-3 cursor-row-resize"
          title="اسحب لتغيير الارتفاع"
        >
          <div className="mx-auto mt-[5px] h-[3px] w-10 rounded-full bg-line transition-colors group-hover:bg-mint-400/50" />
        </div>
      )}

      <div className="flex h-[38px] shrink-0 items-center gap-1 border-b border-line-soft px-2">
        <div className="flex items-center gap-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = bottomTab === tab.id && bottomOpen;
            const count =
              tab.id === "events" ? logs.length : tab.id === "packet" ? packets : 0;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (!bottomOpen) setBottomOpen(true);
                  setBottomTab(tab.id);
                }}
                className={cn(
                  "flex h-[27px] items-center gap-1.5 rounded-md px-2 text-[10px] transition-colors",
                  active
                    ? "bg-mint-400/[0.09] text-mint-200"
                    : "text-dim hover:bg-ink-750/50 hover:text-mist"
                )}
              >
                <Icon size={12} strokeWidth={1.9} />
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "mono rounded px-1 text-[8px]",
                      active ? "bg-mint-400/15 text-mint-200" : "bg-ink-750 text-faint"
                    )}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="ms-auto flex items-center gap-1.5">
          {lastPacket?.packet && bottomTab === "packet" && (
            <span className="mono hidden text-[8.5px] text-faint md:inline">
              آخر حزمة: {lastPacket.packet.protocol}
            </span>
          )}
          {bottomTab === "terminal" && (
            <span className="mono hidden text-[8.5px] text-faint lg:inline">
              shell v1.0 · help
            </span>
          )}
          <button
            className="icon-btn h-6 w-6"
            aria-label={bottomOpen ? "تصغير اللوحة السفلية" : "توسيع اللوحة السفلية"}
            onClick={() => setBottomOpen(!bottomOpen)}
          >
            {bottomOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {bottomOpen && (
        <div className="min-h-0 flex-1">
          {bottomTab === "terminal" && <Terminal />}
          {bottomTab === "events" && <EventLog />}
          {bottomTab === "packet" && <PacketInspector />}
        </div>
      )}
    </section>
  );
}
