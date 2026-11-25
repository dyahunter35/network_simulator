"use client";

import { X, Sparkles, Cpu, Layers, HelpCircle, CheckCircle2 } from "lucide-react";
import type { LayerInfo, TcpLayerInfo } from "./types";

interface LayerDetailModalProps {
  layer: (LayerInfo | TcpLayerInfo) | null;
  onClose: () => void;
}

export function LayerDetailModal({ layer, onClose }: LayerDetailModalProps) {
  if (!layer) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-ink-950 p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-900 text-faint transition hover:bg-ink-800 hover:text-mist"
          title="إغلاق"
        >
          <X size={16} />
        </button>

        {/* Header with layer color and badges */}
        <div className="flex items-center gap-3 border-b border-line pb-4">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-mono font-bold shadow-md"
            style={{
              color: layer.color,
              borderColor: `${layer.color}60`,
              backgroundColor: layer.bgLight,
            }}
          >
            {layer.number}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-mist">{layer.nameAr}</h3>
              <span
                className="rounded-md border px-2 py-0.5 text-[11px] font-bold"
                style={{
                  color: layer.color,
                  borderColor: `${layer.color}50`,
                  backgroundColor: layer.bgLight,
                }}
              >
                PDU: {layer.pduNameAr}
              </span>
            </div>
            <div className="font-mono text-[11px] text-faint">
              Layer {layer.number} · {layer.nameEn}
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="mt-4 space-y-3.5 text-[12.5px] leading-relaxed">
          {/* Simple Explanation */}
          <div className="rounded-xl border border-line-soft bg-ink-900/60 p-3">
            <span className="font-semibold text-mist flex items-center gap-1.5 mb-1">
              <CheckCircle2 size={14} className="text-mint-400" />
              ماذا تفعل هذه الطبقة ببساطة؟
            </span>
            <p className="text-dim">{layer.simpleExplanation}</p>
          </div>

          {/* Real World Analogy */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-amber-200">
            <span className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1">
              <Sparkles size={14} className="text-amber-400" />
              التشبيه الواقعي السهل:
            </span>
            <p className="text-amber-100/90">{layer.realWorldAnalogy}</p>
          </div>

          {/* Associated Device (if applicable) */}
          {layer.associatedDevice && (
            <div className="rounded-xl border border-line-soft bg-ink-900/40 p-3">
              <span className="font-semibold text-mist flex items-center gap-1.5 mb-1">
                <Cpu size={14} className="text-sky-400" />
                جهاز الشبكة الأساسي المرتبط بها:
              </span>
              <p className="text-mint-300 font-medium">{layer.associatedDevice}</p>
            </div>
          )}

          {/* Common Protocols */}
          <div className="rounded-xl border border-line-soft bg-ink-900/40 p-3">
            <span className="font-semibold text-mist flex items-center gap-1.5 mb-2">
              <Layers size={14} className="text-violet-400" />
              أشهر البروتوكولات والتقنيات:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {layer.commonProtocols.map((proto, i) => (
                <span
                  key={i}
                  className="rounded-lg border border-line bg-ink-850 px-2 py-0.5 font-mono text-[11px] text-mist"
                >
                  {proto}
                </span>
              ))}
            </div>
          </div>

          {"osiLayersMapped" in layer && (
            <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-2.5 text-[11.5px] text-sky-200">
              <strong className="text-sky-300">في نموذج OSI: </strong>
              {layer.osiLayersMapped}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-line bg-ink-900 px-4 py-1.5 text-[12px] font-medium text-mist hover:bg-ink-850"
          >
            حسناً، فهمت!
          </button>
        </div>
      </div>
    </div>
  );
}
