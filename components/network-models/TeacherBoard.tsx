"use client";

import { useState } from "react";
import {
  Sparkles,
  HelpCircle,
  Award,
  Layers,
  ArrowDown,
  ArrowUp,
  Cpu,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Cable,
} from "lucide-react";
import type { LayerInfo, TcpLayerInfo, ThemeMode } from "./types";

interface TeacherBoardProps {
  layer: LayerInfo | TcpLayerInfo;
  direction: "down" | "wire" | "up" | "idle";
  activeSide: "sender" | "wire" | "receiver";
  theme?: ThemeMode;
  allLayers: (LayerInfo | TcpLayerInfo)[];
  onSelectLayer: (layerNumber: number) => void;
}

export function TeacherBoard({
  layer,
  direction,
  activeSide,
  theme = "dark",
  allLayers,
  onSelectLayer,
}: TeacherBoardProps) {
  const isLight = theme === "light";
  const [showQuestionAnswer, setShowQuestionAnswer] = useState(false);

  const isWire = direction === "wire";

  return (
    <div
      className={`flex flex-col rounded-2xl border p-3.5 sm:p-4 shadow-sm transition-all duration-200 ${
        isLight ? "border-slate-200 bg-white text-slate-800" : "border-line bg-ink-950/90 text-mist"
      }`}
    >
      {/* Quick Layer Switcher Numbers for Teacher */}
      <div className={`mb-3 flex items-center justify-between border-b pb-2.5 ${isLight ? "border-slate-200" : "border-line"}`}>
        <div className="flex items-center gap-1.5">
          <span className={`text-[11px] font-bold ${isLight ? "text-slate-600" : "text-faint"}`}>
            انتقال سريع للطبقة:
          </span>
          <div className="flex items-center gap-1">
            {allLayers.map((l) => {
              const isSelected = !isWire && l.number === layer.number;
              return (
                <button
                  key={l.number}
                  onClick={() => onSelectLayer(l.number)}
                  className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-lg font-mono text-[11px] font-bold transition-all ${
                    isSelected
                      ? "ring-2 ring-teal-400 scale-105 shadow-xs"
                      : isLight
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      : "bg-ink-900 text-faint hover:bg-ink-800 hover:text-mist"
                  }`}
                  style={{
                    backgroundColor: isSelected ? l.bgLight : undefined,
                    color: isSelected ? l.color : undefined,
                    borderColor: isSelected ? l.borderColor : undefined,
                  }}
                  title={`الانتقال إلى الطبقة ${l.number}: ${l.nameAr}`}
                >
                  {l.number}
                </button>
              );
            })}
          </div>
        </div>

        {/* Transmission Phase Badge */}
        <div className="flex items-center gap-1 text-[11px]">
          {activeSide === "sender" ? (
            <span className={`flex items-center gap-1 font-bold ${isLight ? "text-teal-700" : "text-mint-300"}`}>
              <ArrowDown size={13} className="animate-bounce" />
              <span>إرسال وتغليف (Encapsulation)</span>
            </span>
          ) : activeSide === "receiver" ? (
            <span className={`flex items-center gap-1 font-bold ${isLight ? "text-sky-700" : "text-sky-300"}`}>
              <ArrowUp size={13} className="animate-bounce" />
              <span>استقبال وفك (Decapsulation)</span>
            </span>
          ) : (
            <span className={`flex items-center gap-1 font-bold ${isLight ? "text-amber-800" : "text-amber-300"}`}>
              <Cable size={13} />
              <span>سريان النبضات في السلك</span>
            </span>
          )}
        </div>
      </div>

      {/* Layer Header Card */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border text-base sm:text-lg font-mono font-bold shadow-xs"
            style={{
              color: isWire ? "#f59e0b" : layer.color,
              borderColor: isWire ? "rgba(245, 158, 11, 0.5)" : `${layer.color}60`,
              backgroundColor: isWire
                ? isLight
                  ? "#fef3c7"
                  : "rgba(245, 158, 11, 0.15)"
                : isLight
                ? `${layer.color}15`
                : layer.bgLight,
            }}
          >
            {isWire ? "⚡" : layer.number}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-sm sm:text-base font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
                {isWire ? "الوسط الفيزيائي الناقل (السلك / الألياف)" : layer.nameAr}
              </h2>
              <span
                className="rounded-md border px-2 py-0.5 text-[10.5px] font-bold"
                style={{
                  color: isWire ? "#d97706" : layer.color,
                  borderColor: isWire ? "#f59e0b" : `${layer.color}50`,
                  backgroundColor: isLight ? "#f1f5f9" : "rgba(10, 16, 23, 0.7)",
                }}
              >
                PDU: {isWire ? "بتات وإشارات (Bits)" : layer.pduNameAr}
              </span>
            </div>
            <p className={`font-mono text-[10.5px] ${isLight ? "text-slate-500" : "text-faint"}`}>
              {isWire ? "Physical Transmission Medium" : `Layer ${layer.number} · ${layer.nameEn}`}
            </p>
          </div>
        </div>

        {/* Device Associated if exists */}
        {layer.associatedDevice && !isWire && (
          <div className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] ${
            isLight ? "border-slate-200 bg-slate-50 text-slate-700" : "border-line bg-ink-900 text-mist"
          }`}>
            <Cpu size={13} className={isLight ? "text-teal-600" : "text-mint-400"} />
            <span>الجهاز: <strong className={isLight ? "text-slate-900" : "text-mint-300"}>{layer.associatedDevice}</strong></span>
          </div>
        )}
      </div>

      {/* Main Educational Paragraph for Teachers */}
      <div className={`mt-3 rounded-xl border p-3 text-[12.5px] leading-relaxed ${
        isLight ? "border-teal-200/80 bg-teal-50/50 text-slate-800" : "border-line bg-ink-900/60 text-mist"
      }`}>
        <div className="flex items-center gap-1.5 mb-1.5 font-bold text-[12px]">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-white text-[10px]">✓</span>
          <span className={isLight ? "text-teal-900" : "text-mint-300"}>فقرة الشرح الصفي للمعلم والطلاب:</span>
        </div>
        <p className={`${isLight ? "text-slate-700" : "text-dim"} leading-normal`}>
          {isWire
            ? "في هذه اللحظة، تعبر البيانات السلك الفيزيائي بسرعة هائلة كشحنات كهربائية (في الكابل النحاسي) أو نبضات ضوئية (في الألياف الزجاجية). السلك لا يعلم شيئاً عن الصور أو النصوص؛ إنه يرى فقط تدفقاً متواصلاً من الأصفار والواحدات (0 و 1) حتى تصل إلى كرت شبكة الطرف المستقبل."
            : layer.teachingParagraph}
        </p>
      </div>

      {/* Grid: Analogy & Packaging Step */}
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {/* Real-World Analogy */}
        <div className={`rounded-xl border p-2.5 text-[11.5px] ${
          isLight ? "border-amber-200 bg-amber-50/70 text-amber-950" : "border-amber-500/30 bg-amber-950/20 text-amber-200"
        }`}>
          <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px]">
            <Sparkles size={13} className="text-amber-500" />
            <span className={isLight ? "text-amber-900" : "text-amber-300"}>التشبيه اليومي البسيط:</span>
          </div>
          <p className={isLight ? "text-amber-900/90" : "text-amber-100/90"}>
            {isWire
              ? "مثل شاحنة الشحن العملاقة التي تسير على الطريق الإسفلتي الدولي لتوصيل الطرود بين المدن."
              : layer.realWorldAnalogy}
          </p>
        </div>

        {/* What is added/removed right now */}
        <div className={`rounded-xl border p-2.5 text-[11.5px] ${
          isLight ? "border-sky-200 bg-sky-50/70 text-sky-950" : "border-sky-500/30 bg-sky-950/20 text-sky-200"
        }`}>
          <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px]">
            <CheckCircle2 size={13} className="text-sky-500" />
            <span className={isLight ? "text-sky-900" : "text-sky-300"}>
              {activeSide === "receiver" ? "ماذا يُفك ويُفحص الآن؟" : "ماذا يُضاف للبيانات الآن؟"}
            </span>
          </div>
          <p className={isLight ? "text-sky-900/90" : "text-sky-100/90"}>
            {isWire
              ? "تتحول كافة الرؤوس (Headers) والبيانات إلى بتات ثنائية 0 و 1 تنتقل كإشارات."
              : activeSide === "receiver"
              ? layer.decapsulationStep
              : layer.encapsulationStep}
          </p>
        </div>
      </div>

      {/* Classroom Discussion Question (Interactive for high schoolers) */}
      <div className={`mt-2.5 rounded-xl border p-2.5 text-[11.5px] ${
        isLight ? "border-violet-200 bg-violet-50/60 text-violet-950" : "border-violet-500/30 bg-violet-950/20 text-violet-200"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-[11.5px]">
            <HelpCircle size={14} className="text-violet-500" />
            <span className={isLight ? "text-violet-900" : "text-violet-300"}>سؤال لنقاش الطلاب في الفصل:</span>
          </div>

          <button
            onClick={() => setShowQuestionAnswer(!showQuestionAnswer)}
            className={`flex items-center gap-0.5 rounded px-2 py-0.5 text-[10px] font-semibold transition ${
              isLight ? "bg-violet-200/70 text-violet-900 hover:bg-violet-200" : "bg-violet-900/40 text-violet-300 hover:bg-violet-900/60"
            }`}
          >
            <span>{showQuestionAnswer ? "إخفاء الإجابة" : "عرض الإجابة"}</span>
            {showQuestionAnswer ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>

        <p className={`mt-1 font-medium ${isLight ? "text-violet-950" : "text-violet-100"}`}>
          {isWire
            ? "سؤال للطلاب: لماذا تكون كابلات الألياف الضوئية أسرع بكثير من الأسلاك النحاسية؟"
            : layer.classroomQuestion}
        </p>

        {showQuestionAnswer && (
          <div className={`mt-2 rounded-lg border p-2 text-[11px] animate-fadeIn ${
            isLight ? "border-violet-300 bg-white text-slate-800" : "border-violet-500/40 bg-ink-950 text-mist"
          }`}>
            <strong className={isLight ? "text-teal-800 font-bold" : "text-mint-300 font-bold"}>الإجابة النموذجية: </strong>
            {isWire
              ? "لأن الألياف الضوئية تنقل ومضات ضوء ليزرية داخل زجاج نقي بسرعة تقارب سرعة الضوء وبدون أي تأثر بالتشويش الكهرومغناطيسي، بينما النحاس يعتمد على إلكترونات الكهرباء التي تتعرض للمقاومة والحرارة."
              : layer.simpleExplanation}
          </div>
        )}
      </div>

      {/* Exam Tip for High Schoolers */}
      <div className={`mt-2.5 flex items-center justify-between rounded-xl border px-3 py-1.5 text-[11px] ${
        isLight ? "border-slate-200 bg-slate-50 text-slate-700" : "border-line bg-ink-900/40 text-dim"
      }`}>
        <div className="flex items-center gap-1.5">
          <Award size={13} className="text-amber-500 shrink-0" />
          <span>
            <strong className={isLight ? "text-slate-900 font-bold" : "text-mist font-bold"}>تنبيه للاختبار: </strong>
            {isWire
              ? "تذكر في الاختبار: وحدة بيانات الطبقة الفيزيائية هي البتات (Bits)، وأهم أجهزتها الكابلات والمكررات (Repeaters)."
              : layer.examTip}
          </span>
        </div>
      </div>
    </div>
  );
}
