"use client";

import { useEffect, useState } from "react";
import { Zap, Radio, Sparkles, Cable } from "lucide-react";
import type { MediumKind } from "./types";

interface WireVisualizerProps {
  isTransmitting: boolean;
  medium: MediumKind;
  onMediumChange: (medium: MediumKind) => void;
  speed: number;
}

export function WireVisualizer({
  isTransmitting,
  medium,
  onMediumChange,
  speed,
}: WireVisualizerProps) {
  const [pulseOffset, setPulseOffset] = useState(0);

  useEffect(() => {
    if (!isTransmitting) return;
    const interval = window.setInterval(() => {
      setPulseOffset((prev) => (prev + 1) % 100);
    }, 40 / speed);
    return () => window.clearInterval(interval);
  }, [isTransmitting, speed]);

  const bitsSequence = [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 1, 0, 1];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-ink-900/90 to-ink-950/95 p-4 sm:p-5 shadow-xl">
      {/* Top bar with medium selector and indicator */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-ink-800 text-slate-300">
            <Cable size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-mist">
                الوسط الناقل الحقيقي (الأسلاك والموجات)
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isTransmitting
                    ? "bg-mint-500/20 text-mint-300 border border-mint-500/40 animate-pulse"
                    : "bg-ink-800 text-faint border border-line"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isTransmitting ? "bg-mint-400 shadow-[0_0_8px_#2dd4bf]" : "bg-faint"
                  }`}
                />
                {isTransmitting ? "البيانات تمر عبر السلك الآن ⚡" : "السلك بانتظار البتات"}
              </span>
            </div>
            <p className="text-[11px] text-faint">
              كيف تتحول البيانات داخل السلك إلى نبضات كهربائية وضوئية
            </p>
          </div>
        </div>

        {/* Medium Selector tabs */}
        <div className="flex items-center gap-1 rounded-xl border border-line bg-ink-950/80 p-1 text-[11.5px]">
          <button
            onClick={() => onMediumChange("copper")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
              medium === "copper"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium"
                : "text-dim hover:text-mist"
            }`}
            title="كابل شبكة نحاسي (إشارات كهربائية)"
          >
            <Zap size={13} className="text-amber-400" />
            <span>نحاسي UTP</span>
          </button>

          <button
            onClick={() => onMediumChange("fiber")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
              medium === "fiber"
                ? "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium"
                : "text-dim hover:text-mist"
            }`}
            title="ألياف ضوئية فائقة السرعة (ومضات ضوء)"
          >
            <Sparkles size={13} className="text-sky-300" />
            <span>ألياف ضوئية</span>
          </button>

          <button
            onClick={() => onMediumChange("wifi")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
              medium === "wifi"
                ? "bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium"
                : "text-dim hover:text-mist"
            }`}
            title="شبكة لاسلكية (موجات كهرومغناطيسية)"
          >
            <Radio size={13} className="text-violet-400" />
            <span>واي فاي (Wi-Fi)</span>
          </button>
        </div>
      </div>

      {/* Interactive Wire / Signal Visualization Area */}
      <div className="relative mt-4 flex flex-col items-center justify-center py-3">
        {/* Physical Cable Visual Body */}
        <div className="relative flex w-full items-center justify-between px-3">
          {/* Left Connector (RJ-45 / Port) */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-ink-800 text-[11px] font-mono font-bold text-mint-300 shadow-md">
              TX
            </div>
            <span className="mt-1 text-[9.5px] text-faint">منفذ المرسل</span>
          </div>

          {/* Cable Track */}
          <div className="relative mx-3 flex-1">
            {/* Base cable background */}
            <div
              className={`h-5 w-full rounded-full border transition-all duration-300 ${
                medium === "copper"
                  ? "border-amber-700/60 bg-gradient-to-r from-amber-950 via-amber-900/50 to-amber-950"
                  : medium === "fiber"
                  ? "border-sky-500/50 bg-gradient-to-r from-sky-950 via-cyan-950 to-sky-950"
                  : "border-dashed border-violet-500/50 bg-gradient-to-r from-violet-950/40 via-purple-900/30 to-violet-950/40"
              }`}
            >
              {/* Inner core line */}
              <div
                className={`mx-auto my-1.5 h-1.5 w-[98%] rounded-full opacity-60 ${
                  medium === "copper"
                    ? "bg-amber-400"
                    : medium === "fiber"
                    ? "bg-cyan-300 shadow-[0_0_12px_#38bdf8]"
                    : "bg-violet-400 shadow-[0_0_8px_#a78bfa]"
                }`}
              />
            </div>

            {/* Glowing flowing pulses when transmitting */}
            {isTransmitting && (
              <div className="absolute inset-0 flex items-center justify-between overflow-hidden px-4 pointer-events-none">
                {[...Array(6)].map((_, i) => {
                  const leftPos = (pulseOffset * 1.5 + i * 18) % 100;
                  return (
                    <div
                      key={i}
                      className="absolute flex items-center gap-1 transition-transform"
                      style={{ left: `${leftPos}%` }}
                    >
                      <div
                        className={`h-3 w-3 rounded-full animate-ping ${
                          medium === "copper"
                            ? "bg-amber-300 shadow-[0_0_14px_#fbbf24]"
                            : medium === "fiber"
                            ? "bg-cyan-200 shadow-[0_0_16px_#67e8f9]"
                            : "bg-violet-300 shadow-[0_0_12px_#c084fc]"
                        }`}
                      />
                      <span className="mono rounded bg-ink-950/90 px-1 py-0.5 text-[9px] font-bold text-mint-200 shadow">
                        {bitsSequence[(i + pulseOffset) % bitsSequence.length]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Connector (RJ-45 / Port) */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-ink-800 text-[11px] font-mono font-bold text-sky-300 shadow-md">
              RX
            </div>
            <span className="mt-1 text-[9.5px] text-faint">منفذ المستقبل</span>
          </div>
        </div>

        {/* Digital Waveform (Oscilloscope representation of 0 & 1) */}
        <div className="mt-4 w-full rounded-xl border border-line-soft bg-ink-950/80 p-3">
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-medium text-dim">
              <span className="h-2 w-2 rounded-full bg-mint-400" />
              تمثيل الإشارة الرقمية في السلك (الجهد الكهربائي: High = 1 ، Low = 0)
            </span>
            <span className="mono text-[10px] text-faint">
              {medium === "copper"
                ? "+5V / 0V Electric"
                : medium === "fiber"
                ? "Laser Light Pulse"
                : "2.4GHz / 5GHz RF"}
            </span>
          </div>

          {/* Oscilloscope Square Wave Graphic */}
          <div className="relative flex h-14 items-end overflow-hidden rounded-lg border border-line/60 bg-ink-900/60 px-3 py-1">
            <div className="flex w-full items-end justify-between gap-1">
              {bitsSequence.map((bit, index) => {
                const isHigh = bit === 1;
                const activeBit = isTransmitting && (index + Math.floor(pulseOffset / 6)) % bitsSequence.length === index;

                return (
                  <div key={index} className="flex flex-1 flex-col items-center justify-end">
                    <span
                      className={`mono text-[9px] font-bold transition-colors ${
                        activeBit
                          ? "text-mint-300 scale-125"
                          : isHigh
                          ? "text-sky-300"
                          : "text-slate-500"
                      }`}
                    >
                      {bit}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all ${
                        isHigh ? "h-8" : "h-2"
                      } ${
                        activeBit
                          ? "bg-mint-400 shadow-[0_0_10px_#2dd4bf]"
                          : isHigh
                          ? medium === "copper"
                            ? "bg-amber-400/80"
                            : medium === "fiber"
                            ? "bg-sky-400/80"
                            : "bg-violet-400/80"
                          : "bg-slate-700/60"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* High school explanation note */}
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-line-soft bg-ink-900/40 p-2.5 text-[11px] text-dim">
          <span className="text-amber-400 text-sm">💡</span>
          <div>
            <strong className="text-mist font-semibold">ملاحظة للطلاب:</strong> لا يوجد إنترنت أو رسائل أو صور تمر عبر الأسلاك بالشكل الذي نراه على الشاشة، بل تسير فقط كـ{" "}
            <span className="text-mint-300 font-bold">نبضات سريعة جداً (بتات Bits 0 و 1)</span>. ومهمة الطبقة الفيزيائية هي تحويل هذه النبضات إلى إشارات تسير عبر{" "}
            {medium === "copper"
              ? "الأسلاك النحاسية ككهرباء"
              : medium === "fiber"
              ? "خيوط الزجاج كضوء ليزري"
              : "الهواء كموجات راديو"}
            .
          </div>
        </div>
      </div>
    </div>
  );
}
