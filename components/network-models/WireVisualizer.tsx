"use client";

import { useEffect, useState } from "react";
import { Zap, Radio, Sparkles, Cable } from "lucide-react";
import type { MediumKind } from "./types";

interface WireVisualizerProps {
  isTransmitting: boolean;
  medium: MediumKind;
  onMediumChange: (medium: MediumKind) => void;
  speed: number;
  theme?: "dark" | "light";
}

export function WireVisualizer({
  isTransmitting,
  medium,
  onMediumChange,
  speed,
  theme = "dark",
}: WireVisualizerProps) {
  const isLight = theme === "light";
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
    <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 shadow-xl transition-colors ${
      isLight ? "border-slate-200 bg-white shadow-sm text-slate-800" : "border-line bg-gradient-to-b from-ink-900/90 to-ink-950/95 text-mist"
    }`}>
      {/* Top bar with medium selector and indicator */}
      <div className={`flex flex-wrap items-center justify-between gap-3 border-b pb-3 ${
        isLight ? "border-slate-200" : "border-line/70"
      }`}>
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
            isLight ? "border-slate-200 bg-slate-100 text-slate-700" : "border-slate-700 bg-ink-800 text-slate-300"
          }`}>
            <Cable size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[13px] font-semibold ${isLight ? "text-slate-900" : "text-mist"}`}>
                الوسط الناقل الحقيقي (الأسلاك والموجات)
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  isTransmitting
                    ? isLight
                      ? "bg-teal-100 text-teal-800 border border-teal-300 animate-pulse"
                      : "bg-mint-500/20 text-mint-300 border border-mint-500/40 animate-pulse"
                    : isLight
                    ? "bg-slate-100 text-slate-500 border border-slate-200"
                    : "bg-ink-800 text-faint border border-line"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isTransmitting
                      ? isLight
                        ? "bg-teal-600 shadow-[0_0_8px_#0d9488]"
                        : "bg-mint-400 shadow-[0_0_8px_#2dd4bf]"
                      : "bg-slate-400"
                  }`}
                />
                {isTransmitting ? "البيانات تمر عبر السلك الآن ⚡" : "السلك بانتظار البتات"}
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-faint"}`}>
              كيف تتحول البيانات داخل السلك إلى نبضات كهربائية وضوئية
            </p>
          </div>
        </div>

        {/* Medium Selector tabs */}
        <div className={`flex items-center gap-1 rounded-xl border p-1 text-[11.5px] ${
          isLight ? "border-slate-200 bg-slate-100/90" : "border-line bg-ink-950/80"
        }`}>
          <button
            onClick={() => onMediumChange("copper")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
              medium === "copper"
                ? isLight
                  ? "bg-amber-100 text-amber-900 border border-amber-300 font-semibold shadow-xs"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-dim hover:text-mist"
            }`}
            title="كابل شبكة نحاسي (إشارات كهربائية)"
          >
            <Zap size={13} className="text-amber-500" />
            <span>نحاسي UTP</span>
          </button>

          <button
            onClick={() => onMediumChange("fiber")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
              medium === "fiber"
                ? isLight
                  ? "bg-sky-100 text-sky-900 border border-sky-300 font-semibold shadow-xs"
                  : "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-dim hover:text-mist"
            }`}
            title="ألياف ضوئية فائقة السرعة (ومضات ضوء)"
          >
            <Sparkles size={13} className="text-sky-500" />
            <span>ألياف ضوئية</span>
          </button>

          <button
            onClick={() => onMediumChange("wifi")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition ${
              medium === "wifi"
                ? isLight
                  ? "bg-violet-100 text-violet-900 border border-violet-300 font-semibold shadow-xs"
                  : "bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium"
                : isLight
                ? "text-slate-600 hover:text-slate-900"
                : "text-dim hover:text-mist"
            }`}
            title="شبكة لاسلكية (موجات كهرومغناطيسية)"
          >
            <Radio size={13} className="text-violet-500" />
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
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[11px] font-mono font-bold shadow-md ${
              isLight ? "border-slate-300 bg-slate-100 text-teal-700" : "border-line bg-ink-800 text-mint-300"
            }`}>
              TX
            </div>
            <span className={`mt-1 text-[9.5px] ${isLight ? "text-slate-500" : "text-faint"}`}>منفذ المرسل</span>
          </div>

          {/* Cable Track */}
          <div className="relative mx-3 flex-1">
            {/* Base cable background */}
            <div
              className={`h-5 w-full rounded-full border transition-all duration-300 ${
                medium === "copper"
                  ? isLight
                    ? "border-amber-400 bg-gradient-to-r from-amber-200 via-amber-300 to-amber-200"
                    : "border-amber-700/60 bg-gradient-to-r from-amber-950 via-amber-900/50 to-amber-950"
                  : medium === "fiber"
                  ? isLight
                    ? "border-sky-400 bg-gradient-to-r from-sky-200 via-cyan-200 to-sky-200"
                    : "border-sky-500/50 bg-gradient-to-r from-sky-950 via-cyan-950 to-sky-950"
                  : isLight
                  ? "border-dashed border-violet-400 bg-gradient-to-r from-violet-100 via-purple-100 to-violet-100"
                  : "border-dashed border-violet-500/50 bg-gradient-to-r from-violet-950/40 via-purple-900/30 to-violet-950/40"
              }`}
            >
              {/* Inner core line */}
              <div
                className={`mx-auto my-1.5 h-1.5 w-[98%] rounded-full opacity-70 ${
                  medium === "copper"
                    ? "bg-amber-500"
                    : medium === "fiber"
                    ? "bg-cyan-500 shadow-[0_0_12px_#38bdf8]"
                    : "bg-violet-500 shadow-[0_0_8px_#a78bfa]"
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
                            ? "bg-amber-400 shadow-[0_0_14px_#fbbf24]"
                            : medium === "fiber"
                            ? "bg-cyan-300 shadow-[0_0_16px_#67e8f9]"
                            : "bg-violet-400 shadow-[0_0_12px_#c084fc]"
                        }`}
                      />
                      <span className={`mono rounded px-1 py-0.5 text-[9px] font-bold shadow ${
                        isLight ? "bg-white text-slate-900 border border-slate-200" : "bg-ink-950/90 text-mint-200"
                      }`}>
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
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border text-[11px] font-mono font-bold shadow-md ${
              isLight ? "border-slate-300 bg-slate-100 text-sky-700" : "border-line bg-ink-800 text-sky-300"
            }`}>
              RX
            </div>
            <span className={`mt-1 text-[9.5px] ${isLight ? "text-slate-500" : "text-faint"}`}>منفذ المستقبل</span>
          </div>
        </div>

        {/* Digital Waveform (Oscilloscope representation of 0 & 1) */}
        <div className={`mt-4 w-full rounded-xl border p-3 ${
          isLight ? "border-slate-200 bg-slate-50" : "border-line-soft bg-ink-950/80"
        }`}>
          <div className="mb-2 flex items-center justify-between text-[11px]">
            <span className={`flex items-center gap-1.5 font-medium ${isLight ? "text-slate-700" : "text-dim"}`}>
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              تمثيل الإشارة الرقمية في السلك (الجهد الكهربائي: High = 1 ، Low = 0)
            </span>
            <span className={`mono text-[10px] ${isLight ? "text-slate-500" : "text-faint"}`}>
              {medium === "copper"
                ? "+5V / 0V Electric"
                : medium === "fiber"
                ? "Laser Light Pulse"
                : "2.4GHz / 5GHz RF"}
            </span>
          </div>

          {/* Oscilloscope Square Wave Graphic */}
          <div className={`relative flex h-14 items-end overflow-hidden rounded-lg border px-3 py-1 ${
            isLight ? "border-slate-200 bg-white" : "border-line/60 bg-ink-900/60"
          }`}>
            <div className="flex w-full items-end justify-between gap-1">
              {bitsSequence.map((bit, index) => {
                const isHigh = bit === 1;
                const activeBit = isTransmitting && (index + Math.floor(pulseOffset / 6)) % bitsSequence.length === index;

                return (
                  <div key={index} className="flex flex-1 flex-col items-center justify-end">
                    <span
                      className={`mono text-[9px] font-bold transition-colors ${
                        activeBit
                          ? isLight ? "text-teal-700 scale-125 font-black" : "text-mint-300 scale-125"
                          : isHigh
                          ? isLight ? "text-sky-700 font-bold" : "text-sky-300"
                          : isLight ? "text-slate-400" : "text-slate-500"
                      }`}
                    >
                      {bit}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all ${
                        isHigh ? "h-8" : "h-2"
                      } ${
                        activeBit
                          ? "bg-teal-500 shadow-[0_0_10px_#2dd4bf]"
                          : isHigh
                          ? medium === "copper"
                            ? isLight ? "bg-amber-500" : "bg-amber-400/80"
                            : medium === "fiber"
                            ? isLight ? "bg-sky-500" : "bg-sky-400/80"
                            : isLight ? "bg-violet-500" : "bg-violet-400/80"
                          : isLight ? "bg-slate-200" : "bg-slate-700/60"
                      }`}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* High school explanation note */}
        <div className={`mt-3 flex items-start gap-2 rounded-lg border p-2.5 text-[11px] ${
          isLight ? "border-amber-200 bg-amber-50/70 text-slate-700" : "border-line-soft bg-ink-900/40 text-dim"
        }`}>
          <span className="text-amber-500 text-sm">💡</span>
          <div>
            <strong className={`font-semibold ${isLight ? "text-slate-900" : "text-mist"}`}>ملاحظة للطلاب:</strong> لا يوجد إنترنت أو رسائل أو صور تمر عبر الأسلاك بالشكل الذي نراه على الشاشة، بل تسير فقط كـ{" "}
            <span className={`font-bold ${isLight ? "text-teal-700" : "text-mint-300"}`}>نبضات سريعة جداً (بتات Bits 0 و 1)</span>. ومهمة الطبقة الفيزيائية هي تحويل هذه النبضات إلى إشارات تسير عبر{" "}
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
