"use client";

import { DeviceGlyph } from "@/components/common";
import { Sparkles, Info } from "lucide-react";
import type { LayerInfo, TcpLayerInfo } from "./types";

interface LayerCardProps {
  layer: LayerInfo | TcpLayerInfo;
  isActive: boolean;
  isCompleted: boolean;
  side: "sender" | "receiver";
  onClick?: () => void;
}

export function LayerCard({
  layer,
  isActive,
  isCompleted,
  side,
  onClick,
}: LayerCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative flex cursor-pointer items-center justify-between rounded-xl border p-2.5 sm:p-3 transition-all duration-300 ${
        isActive
          ? "border-mint-400 bg-gradient-to-r from-mint-950/40 via-ink-900 to-mint-950/30 shadow-[0_0_20px_rgba(45,212,191,0.25)] scale-[1.02] z-10"
          : isCompleted
          ? "border-line bg-ink-900/60 opacity-85 hover:border-slate-500 hover:opacity-100"
          : "border-line/70 bg-ink-950/60 opacity-60 hover:opacity-90"
      }`}
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
            backgroundColor: layer.bgLight,
          }}
        >
          {layer.number}
        </div>

        {/* Title & English name */}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] sm:text-[13px] font-semibold text-mist group-hover:text-white">
              {layer.nameAr}
            </span>
            {isActive && (
              <span className="flex items-center gap-1 rounded-full bg-mint-500/20 px-1.5 py-0.2 text-[9.5px] font-medium text-mint-300 animate-pulse">
                <Sparkles size={10} />
                البيانات هنا!
              </span>
            )}
          </div>
          <div className="text-[10px] sm:text-[11px] font-mono text-faint">
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
            borderColor: `${layer.color}50`,
            backgroundColor: layer.bgLight,
          }}
        >
          {layer.pduNameAr}
        </div>

        <button
          className="flex h-6 w-6 items-center justify-center rounded-md text-faint transition hover:bg-ink-800 hover:text-mist"
          title="عرض تفاصيل وشرح هذه الطبقة"
        >
          <Info size={13} />
        </button>
      </div>
    </div>
  );
}
