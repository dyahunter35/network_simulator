"use client";

import { useState } from "react";
import {
  BookOpen,
  Calculator,
  Check,
  ChevronLeft,
  CircleHelp,
  Clock,
  Command,
  Cpu,
  Lightbulb,
  ListChecks,
  Play,
  Plus,
  X,
} from "lucide-react";
import { DEVICE_META } from "@/lib/devices";
import { LABS } from "@/lib/labs";
import { canvasView } from "@/lib/canvasBus";
import { cn } from "@/lib/format";
import { useLabChecks, useLabProgress } from "@/lib/useLab";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";
import { DeviceGlyph, KindChip, ProgressRing } from "@/components/common";
import type { DeviceKind } from "@/lib/types";

const PALETTE: DeviceKind[] = ["pc", "laptop", "server", "switch", "router", "firewall", "ap", "hub"];

export function LeftSidebar() {
  const [tab, setTab] = useState<"labs" | "devices">("labs");
  const [hint, setHint] = useState(0);
  const { lab, results, done, total, pct } = useLabProgress();
  const { running, run } = useLabChecks();
  const addDevice = useLabStore((s) => s.addDevice);
  const devices = useLabStore((s) => s.devices);
  const openModal = useUIStore((s) => s.openModal);
  const toast = useUIStore((s) => s.toast);
  const leftOpen = useUIStore((s) => s.leftOpen);
  const setLeftOpen = useUIStore((s) => s.setLeftOpen);

  const add = (kind: DeviceKind) => {
    const device = addDevice(kind, canvasView.center);
    toast(
      `تمت إضافة ${device.name}`,
      `${DEVICE_META[kind].label} · ${device.interfaces.length} منفذ — اسحب من المقبض الجانبي للتوصيل.`,
      "success"
    );
  };

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm max-[1180px]:block hidden"
        data-open={leftOpen}
        onClick={() => setLeftOpen(false)}
        style={{ display: leftOpen ? "block" : "none" }}
      />
      <aside
        className="sidebar-left panel relative z-40 flex w-[286px] shrink-0 flex-col border-e border-line"
        data-open={leftOpen}
      >
        <div className="flex items-center gap-2 border-b border-line px-3.5 py-3">
          <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg border border-line bg-ink-950/60 p-1">
            <TabButton active={tab === "labs"} onClick={() => setTab("labs")} icon={<ListChecks size={13} />}>
              المعامل
            </TabButton>
            <TabButton active={tab === "devices"} onClick={() => setTab("devices")} icon={<Cpu size={13} />}>
              الأجهزة
            </TabButton>
          </div>
          <button
            className="icon-btn mobile-only"
            aria-label="إغلاق"
            onClick={() => setLeftOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          {tab === "labs" ? (
            <div className="space-y-3 p-3">
              <div className="rounded-xl border border-line bg-gradient-to-b from-ink-750/70 to-ink-900/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="eyebrow">المعمل الحالي</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[12.5px] font-semibold text-mist">
                      <DeviceGlyph kind={lab.icon} size={14} className="shrink-0" />
                      <span className="truncate">{lab.title}</span>
                    </div>
                  </div>
                  <ProgressRing done={done} total={total} size={32} />
                </div>
                <p className="mt-2 text-[10.5px] leading-relaxed text-dim">{lab.description}</p>

                <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-ink-950">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-mint-500 to-mint-300 transition-all duration-500"
                    style={{ width: `${pct * 100}%` }}
                  />
                </div>

                <div className="mt-3 space-y-0.5">
                  {results.map((result, index) => (
                    <div key={result.id} className="objective" data-done={result.done}>
                      <span
                        className={cn(
                          "mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border",
                          result.done
                            ? "border-mint-400/60 bg-mint-400/15 text-mint-300"
                            : "border-line bg-ink-950 text-transparent"
                        )}
                      >
                        <Check size={9} strokeWidth={3} />
                      </span>
                      <span>{lab.objectives[index].text}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  <button
                    className="btn h-7 flex-1 border-mint-400/30 bg-mint-400/10 px-2 text-[10px] text-mint-200 hover:bg-mint-400/20"
                    onClick={run}
                    disabled={running}
                  >
                    <Play size={10} fill="currentColor" />
                    {running ? "جارٍ الفحص…" : "فحص الاتصال"}
                  </button>
                  <button
                    className="btn h-7 px-2 text-[10px]"
                    onClick={() => setHint((h) => h + 1)}
                    title="تلميح"
                  >
                    <Lightbulb size={11} />
                    تلميح
                  </button>
                  <button
                    className="btn h-7 px-2 text-[10px]"
                    onClick={() => openModal({ kind: "guide" })}
                    title="دليل المعمل"
                  >
                    <BookOpen size={11} />
                  </button>
                </div>

                {hint > 0 && (
                  <div className="animate-fade-up mt-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.055] px-2.5 py-2 text-[10.5px] leading-relaxed text-amber-200/90">
                    <span className="mono me-1 text-[9px] text-amber-400">HINT {((hint - 1) % lab.hints.length) + 1}</span>
                    {lab.hints[(hint - 1) % lab.hints.length]}
                  </div>
                )}

                <div className="mt-2 flex items-center justify-between text-[9.5px] text-faint">
                  <span className="flex items-center gap-1">
                    <Clock size={10} /> {lab.minutes} دقيقة
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="mono">{"●".repeat(lab.difficulty)}</span>
                    <span className="ms-0.5">{["", "مبتدئ", "متوسط", "متقدم"][lab.difficulty]}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between px-1">
                <span className="eyebrow">كل المعامل · {LABS.length}</span>
                <span className="text-[9px] text-faint">اختر معملًا للبدء</span>
              </div>

              <div className="space-y-1.5">
                {LABS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openModal({ kind: "lab", labId: item.id })}
                    data-active={item.id === lab.id}
                    className="lab-card group flex w-full items-center gap-2.5 px-2.5 py-2 text-start"
                  >
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border"
                      style={{
                        color: item.accent,
                        borderColor: `${item.accent}30`,
                        background: `${item.accent}10`,
                      }}
                    >
                      <DeviceGlyph kind={item.icon} size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[11.5px] font-medium text-mist">{item.title}</span>
                        {item.id === lab.id && (
                          <span className="mono rounded bg-mint-400/10 px-1 py-px text-[8px] text-mint-300">
                            نشط
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-[9.5px] text-faint">{item.subtitle}</div>
                    </div>
                    <ChevronLeft
                      size={13}
                      className="shrink-0 text-faint transition-transform group-hover:-translate-x-0.5"
                    />
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-line-soft bg-ink-900/40 p-2.5">
                <div className="eyebrow mb-1.5">المهارات في هذا المعمل</div>
                <div className="flex flex-wrap gap-1">
                  {lab.tags.map((tag) => (
                    <span key={tag} className="chip h-[19px] text-[9px]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pb-2">
                <ToolButton icon={<Calculator size={13} />} label="حاسبة Subnet" onClick={() => openModal({ kind: "subnet" })} />
                <ToolButton icon={<CircleHelp size={13} />} label="المرجع" onClick={() => openModal({ kind: "reference" })} />
                <ToolButton icon={<Command size={13} />} label="اختصارات" onClick={() => openModal({ kind: "shortcuts" })} />
                <ToolButton icon={<BookOpen size={13} />} label="دليل المعمل" onClick={() => openModal({ kind: "guide" })} />
              </div>
            </div>
          ) : (
            <div className="space-y-3 p-3">
              <div>
                <div className="eyebrow mb-2">إضافة جهاز</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PALETTE.map((kind) => {
                    const meta = DEVICE_META[kind];
                    return (
                      <button
                        key={kind}
                        onClick={() => add(kind)}
                        className="group relative flex flex-col items-start gap-1.5 rounded-xl border border-line bg-ink-900/50 p-2.5 text-start transition-all hover:-translate-y-px hover:border-[#2d4052] hover:bg-ink-750/60"
                      >
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
                          style={{
                            color: meta.color,
                            borderColor: `${meta.color}30`,
                            background: `${meta.color}10`,
                          }}
                        >
                          <DeviceGlyph kind={kind} size={16} />
                        </div>
                        <div className="leading-tight">
                          <div className="text-[11px] font-medium text-mist">{meta.label}</div>
                          <div className="mono mt-0.5 text-[8.5px] text-faint">
                            {meta.en} · {meta.ports} ports
                          </div>
                        </div>
                        <Plus
                          size={12}
                          className="absolute end-2 top-2 text-faint opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 rounded-lg border border-line-soft bg-ink-900/40 px-2.5 py-2 text-[10px] leading-relaxed text-faint">
                  اضغط على الجهاز لإضافته في منتصف مساحة العمل. بعدها اسحب من{" "}
                  <span className="text-dim">المقبض الجانبي</span> للجهاز وصولًا إلى جهاز آخر للتوصيل.
                </div>
              </div>

              <div className="divider" />

              <div>
                <div className="eyebrow mb-2">أدوات مساعدة</div>
                <div className="space-y-1">
                  <WideTool
                    icon={<Calculator size={14} />}
                    title="حاسبة الشبكات الفرعية"
                    desc="احسب Network / Broadcast / Hosts"
                    onClick={() => openModal({ kind: "subnet" })}
                  />
                  <WideTool
                    icon={<CircleHelp size={14} />}
                    title="المرجع السريع"
                    desc="OSI والبروتوكولات وDORA"
                    onClick={() => openModal({ kind: "reference" })}
                  />
                  <WideTool
                    icon={<Command size={14} />}
                    title="اختصارات لوحة المفاتيح"
                    desc="تنقل أسرع داخل المعمل"
                    onClick={() => openModal({ kind: "shortcuts" })}
                  />
                </div>
              </div>

              <div className="divider" />

              <div className="rounded-xl border border-line-soft bg-ink-900/40 p-2.5">
                <div className="eyebrow mb-2">الأجهزة في الشبكة</div>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(devices.map((d) => d.kind))).map((kind) => (
                    <KindChip key={kind} kind={kind} />
                  ))}
                </div>
                <div className="mt-2 text-[9.5px] text-faint">
                  اختر جهازًا على اللوحة لعرض إعداداته وجداوله.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-line px-3 py-2.5">
          <div className="flex items-center justify-between text-[9.5px] text-faint">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-mint-400 shadow-[0_0_8px_rgba(45,212,191,.8)]" />
              المحاكي جاهز
            </span>
            <span className="mono">v1.0 · offline</span>
          </div>
        </div>
      </aside>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 items-center justify-center gap-1.5 rounded-md text-[10.5px] font-medium transition-all",
        active
          ? "bg-ink-700/90 text-mist shadow-[0_1px_0_rgba(255,255,255,.04)_inset]"
          : "text-faint hover:text-dim"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-line-soft bg-ink-900/40 px-2 py-1.5 text-[9.5px] text-dim transition-colors hover:border-line hover:text-mist"
    >
      <span className="text-faint">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function WideTool({
  icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-start transition-colors hover:border-line-soft hover:bg-ink-900/50"
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line bg-ink-900 text-mint-300/80">
        {icon}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="text-[10.5px] text-mist">{title}</div>
        <div className="truncate text-[9px] text-faint">{desc}</div>
      </div>
    </button>
  );
}
