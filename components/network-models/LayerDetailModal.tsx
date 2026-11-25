"use client";

import { X, Sparkles, Cpu, Layers, HelpCircle, CheckCircle2 } from "lucide-react";
import type { LayerInfo, TcpLayerInfo } from "./types";

interface LayerDetailModalProps {
  layer: (LayerInfo | TcpLayerInfo) | null;
  theme?: "dark" | "light";
  onClose: () => void;
}

export function LayerDetailModal({ layer, theme = "dark", onClose }: LayerDetailModalProps) {
  if (!layer) return null;
  const isLight = theme === "light";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`relative w-full max-w-lg rounded-2xl border p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
        isLight ? "border-slate-200 bg-white text-slate-800" : "border-line bg-ink-950 text-mist"
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-lg border transition ${
            isLight ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200" : "border-line bg-ink-900 text-faint hover:bg-ink-800 hover:text-mist"
          }`}
          title="إغلاق"
        >
          <X size={16} />
        </button>

        {/* Header with layer color and badges */}
        <div className={`flex items-center gap-3 border-b pb-4 ${isLight ? "border-slate-200" : "border-line"}`}>
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl border text-lg font-mono font-bold shadow-md"
            style={{
              color: layer.color,
              borderColor: `${layer.color}60`,
              backgroundColor: isLight ? `${layer.color}18` : layer.bgLight,
            }}
          >
            {layer.number}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>{layer.nameAr}</h3>
              <span
                className="rounded-md border px-2 py-0.5 text-[11px] font-bold"
                style={{
                  color: layer.color,
                  borderColor: `${layer.color}50`,
                  backgroundColor: isLight ? `${layer.color}15` : layer.bgLight,
                }}
              >
                PDU: {layer.pduNameAr}
              </span>
            </div>
            <div className={`font-mono text-[11px] ${isLight ? "text-slate-500" : "text-faint"}`}>
              Layer {layer.number} · {layer.nameEn}
            </div>
          </div>
        </div>

        {/* Content sections */}
        <div className="mt-4 space-y-3.5 text-[12.5px] leading-relaxed">
          {/* Simple Explanation */}
          <div className={`rounded-xl border p-3 ${
            isLight ? "border-slate-200 bg-slate-50 text-slate-700" : "border-line-soft bg-ink-900/60 text-dim"
          }`}>
            <span className={`font-semibold flex items-center gap-1.5 mb-1 ${isLight ? "text-slate-900" : "text-mist"}`}>
              <CheckCircle2 size={14} className={isLight ? "text-teal-600" : "text-mint-400"} />
              ماذا تفعل هذه الطبقة ببساطة؟
            </span>
            <p className={isLight ? "text-slate-700" : "text-dim"}>{layer.simpleExplanation}</p>
          </div>

          {/* Real World Analogy */}
          <div className={`rounded-xl border p-3 ${
            isLight ? "border-amber-200 bg-amber-50/80 text-amber-950" : "border-amber-500/30 bg-amber-950/20 text-amber-200"
          }`}>
            <span className={`font-semibold flex items-center gap-1.5 mb-1 ${isLight ? "text-amber-900" : "text-amber-300"}`}>
              <Sparkles size={14} className="text-amber-500" />
              التشبيه الواقعي السهل:
            </span>
            <p className={isLight ? "text-amber-900" : "text-amber-100/90"}>{layer.realWorldAnalogy}</p>
          </div>

          {/* Associated Device (if applicable) */}
          {layer.associatedDevice && (
            <div className={`rounded-xl border p-3 ${
              isLight ? "border-slate-200 bg-slate-50" : "border-line-soft bg-ink-900/40"
            }`}>
              <span className={`font-semibold flex items-center gap-1.5 mb-1 ${isLight ? "text-slate-900" : "text-mist"}`}>
                <Cpu size={14} className="text-sky-500" />
                جهاز الشبكة الأساسي المرتبط بها:
              </span>
              <p className={`font-medium ${isLight ? "text-teal-700" : "text-mint-300"}`}>{layer.associatedDevice}</p>
            </div>
          )}

          {/* Common Protocols */}
          <div className={`rounded-xl border p-3 ${
            isLight ? "border-slate-200 bg-slate-50" : "border-line-soft bg-ink-900/40"
          }`}>
            <span className={`font-semibold flex items-center gap-1.5 mb-2 ${isLight ? "text-slate-900" : "text-mist"}`}>
              <Layers size={14} className="text-violet-500" />
              أشهر البروتوكولات والتقنيات:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {layer.commonProtocols.map((proto, i) => (
                <span
                  key={i}
                  className={`rounded-lg border px-2 py-0.5 font-mono text-[11px] ${
                    isLight ? "border-slate-200 bg-white text-slate-800" : "border-line bg-ink-850 text-mist"
                  }`}
                >
                  {proto}
                </span>
              ))}
            </div>
          </div>

          {"osiLayersMapped" in layer && (
            <div className={`rounded-xl border p-2.5 text-[11.5px] ${
              isLight ? "border-sky-200 bg-sky-50 text-sky-900" : "border-sky-500/30 bg-sky-950/20 text-sky-200"
            }`}>
              <strong className={isLight ? "text-sky-800" : "text-sky-300"}>في نموذج OSI: </strong>
              {layer.osiLayersMapped}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className={`rounded-xl border px-4 py-1.5 text-[12px] font-medium transition ${
              isLight ? "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200" : "border-line bg-ink-900 text-mist hover:bg-ink-850"
            }`}
          >
            حسناً، فهمت!
          </button>
        </div>
      </div>
    </div>
  );
}
