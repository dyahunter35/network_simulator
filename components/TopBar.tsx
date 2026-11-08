"use client";

import {
  BookOpen,
  Calculator,
  CircleHelp,
  PanelLeft,
  PanelRight,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
} from "lucide-react";
import { Brand, DeviceGlyph, ProgressRing, Tooltip } from "@/components/common";
import { useLabChecks, useLabProgress } from "@/lib/useLab";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";

export function TopBar() {
  const { lab, done, total } = useLabProgress();
  const { running, run } = useLabChecks();
  const devices = useLabStore((s) => s.devices);
  const links = useLabStore((s) => s.links);
  const openModal = useUIStore((s) => s.openModal);
  const setLeftOpen = useUIStore((s) => s.setLeftOpen);
  const setRightOpen = useUIStore((s) => s.setRightOpen);
  const setBottomOpen = useUIStore((s) => s.setBottomOpen);
  const bottomOpen = useUIStore((s) => s.bottomOpen);

  const configured = devices.filter((d) => d.interfaces.some((i) => i.ip)).length;

  return (
    <header className="relative z-30 flex h-[58px] shrink-0 items-center gap-3 border-b border-line bg-ink-950/85 px-3 backdrop-blur-xl sm:px-4">
      <div className="mobile-only">
        <button
          className="icon-btn"
          aria-label="لوحة المعامل"
          onClick={() => setLeftOpen(true)}
        >
          <PanelLeft size={17} />
        </button>
      </div>

      <Brand />

      <div className="mx-1 hidden h-7 w-px bg-line sm:block" />

      <div className="hidden min-w-0 items-center gap-2.5 sm:flex">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
          style={{
            color: lab.accent,
            borderColor: `${lab.accent}35`,
            background: `${lab.accent}12`,
          }}
        >
          <DeviceGlyph kind={lab.icon} size={16} />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13px] font-semibold text-mist">{lab.title}</span>
            <span className="eyebrow hidden lg:inline">LAB / {lab.id.toUpperCase()}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[10px] text-faint">
            <span className="truncate">{lab.subtitle}</span>
            <span className="hidden items-center gap-1 text-mint-300/80 xl:flex">
              <Sparkles size={9} />
              {doingText(done, total)}
            </span>
          </div>
        </div>
      </div>

      <div className="ms-auto flex items-center gap-1.5">
        <div className="me-1 hidden items-center gap-3 rounded-lg border border-line bg-ink-900/60 px-3 py-1.5 xl:flex">
          <Stat label="أجهزة" value={devices.length} />
          <span className="h-3 w-px bg-line" />
          <Stat label="مُهيّأة" value={configured} accent />
          <span className="h-3 w-px bg-line" />
          <Stat label="وصلات" value={links.length} />
        </div>

        <Tooltip text="تشغيل اختبارات الاتصال للمعمل">
          <button
            className="btn btn-primary h-8 px-3 text-[11.5px]"
            onClick={run}
            disabled={running}
          >
            <Play size={13} fill="currentColor" />
            <span className="hidden sm:inline">{running ? "جارٍ الفحص…" : "فحص المعمل"}</span>
          </button>
        </Tooltip>

        <div className="hidden items-center gap-0.5 md:flex">
          <Tooltip text="دليل المعمل والحلول">
            <button className="icon-btn" aria-label="دليل المعمل" onClick={() => openModal({ kind: "guide" })}>
              <BookOpen size={16} />
            </button>
          </Tooltip>
          <Tooltip text="حاسبة الشبكات الفرعية">
            <button className="icon-btn" aria-label="حاسبة الشبكات" onClick={() => openModal({ kind: "subnet" })}>
              <Calculator size={16} />
            </button>
          </Tooltip>
          <Tooltip text="المرجع السريع">
            <button className="icon-btn" aria-label="المرجع السريع" onClick={() => openModal({ kind: "reference" })}>
              <CircleHelp size={16} />
            </button>
          </Tooltip>
          <Tooltip text="إعادة تهيئة المعمل">
            <button
              className="icon-btn"
              aria-label="إعادة تهيئة المعمل"
              onClick={() => openModal({ kind: "reset" })}
            >
              <RotateCcw size={15} />
            </button>
          </Tooltip>
        </div>

        <button
          className="icon-btn hidden md:inline-flex"
          aria-label="الطرفية"
          onClick={() => setBottomOpen(!bottomOpen)}
        >
          <Terminal size={16} />
        </button>

        <div className="flex items-center gap-1.5 ps-1">
          <div className="hidden sm:block">
            <ProgressRing done={done} total={total} />
          </div>
          <div className="mobile-only">
            <button className="icon-btn" aria-label="خصائص الجهاز" onClick={() => setRightOpen(true)}>
              <PanelRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`mono text-[12px] font-semibold ${accent ? "text-mint-300" : "text-mist"}`}>
        {value}
      </span>
      <span className="text-[9.5px] text-faint">{label}</span>
    </div>
  );
}

function doingText(done: number, total: number) {
  if (!total) return "جاهز";
  if (done === total) return "مكتمل";
  return `${done} من ${total} أهداف`;
}
