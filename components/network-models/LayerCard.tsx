"use client";

import { DeviceGlyph } from "@/components/common";
import { Sparkles, Info } from "lucide-react";
import type { LayerInfo, TcpLayerInfo } from "./types";

interface LayerCardProps {
  layer: LayerInfo | TcpLayerInfo;
  isActive: boolean;
  isCompleted: boolean;
  side: "sender" | "receiver";
  theme?: "dark" | "light";
  onClick?: () => void;
}

export function LayerCard({
  layer,
  isActive,
  isCompleted,
  side,
  theme = "dark",
  onClick,
}: LayerCardProps) {
  const isLight = theme === "light";

  let cardClasses = "";
  if (isLight) {
    if (isActive) {
      cardClasses = "border-mint-500 bg-white shadow-md ring-2 ring-teal-400/40 scale-[1.02] z-10";
    } else if (isCompleted) {
      cardClasses = "border-slate-200 bg-slate-50/90 text-slate-700 hover:border-slate-400";
    } else {
      cardClasses = "border-slate-200/80 bg-white/70 text-slate-600 hover:bg-slate-50";
    }
  } else {
    if (isActive) {
      cardClasses = "border-mint-400 bg-gradient-to-r from-mint-950/40 via-ink-900 to-mint-950/30 shadow-[0_0_20px_rgba(45,212,191,0.25)] scale-[1.02] z-10";
    } else if (isCompleted) {
      cardClasses = "border-line bg-ink-900/60 opacity-85 hover:border-slate-500 hover:opacity-100";
    } else {
      cardClasses = "border-line/70 bg-ink-950/60 opacity-60 hover:opacity-90";
    }
  }

  return (
    <div
      onClick={onClick}
      className={`group relative flex cursor-pointer items-center justify-between rounded-xl border p-2.5 sm:p-3 transition-all duration-300 ${cardClasses}`}
      style={{
        borderColor: isActive ? layer.color : undefined,
      }}
    >
      {/* Left / Start Info: Layer Number & Names */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Layer Number circle */}
        <div
          className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg border font-mono text-[12px] sm:text-[13px] font-bold transition-transform group-hover:scale-105"
          style={{
            color: layer.color,
            borderColor: `${layer.color}60`,
            backgroundColor: isLight ? `${layer.color}18` : layer.bgLight,
          }}
        >
          {layer.number}
        </div>

        {/* Title & English name */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[12px] sm:text-[13px] font-semibold transition-colors ${
              isLight ? "text-slate-900 group-hover:text-black font-bold" : "text-mist group-hover:text-white"
            }`}>
              {layer.nameAr}
            </span>
            {isActive && (
              <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.2 text-[9.5px] font-medium animate-pulse ${
                isLight ? "bg-teal-100 text-teal-800 border border-teal-300" : "bg-mint-500/20 text-mint-300"
              }`}>
                <Sparkles size={10} />
                البيانات هنا!
              </span>
            )}
          </div>
          <div className={`text-[10px] sm:text-[11px] font-mono ${isLight ? "text-slate-500" : "text-faint"}`}>
            Layer {layer.number} · {layer.nameEn}
          </div>
        </div>
      </div>

      {/* Right / End Info: PDU Badge & Info button */}
      <div className="flex items-center gap-2">
        {/* Prominent PDU Badge for Secondary Schoolers */}
        <div
          className="rounded-lg border px-2 py-0.5 text-center text-[10px] sm:text-[11px] font-bold shadow-sm"
          style={{
            color: layer.color,
            borderColor: `${layer.color}60`,
            backgroundColor: isLight ? `${layer.color}15` : layer.bgLight,
          }}
        >
          {layer.pduNameAr}
        </div>

        <button
          className={`flex h-6 w-6 items-center justify-center rounded-md transition ${
            isLight ? "text-slate-400 hover:bg-slate-200 hover:text-slate-800" : "text-faint hover:bg-ink-800 hover:text-mist"
          }`}
          title="عرض تفاصيل وشرح هذه الطبقة"
        >
          <Info size={13} />
        </button>
      </div>
    </div>
  );
}
