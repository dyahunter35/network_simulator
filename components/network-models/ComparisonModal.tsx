"use client";

import { X, Sparkles, ArrowLeftRight, CheckCircle2 } from "lucide-react";

interface ComparisonModalProps {
  theme?: "dark" | "light";
  onClose: () => void;
}

export function ComparisonModal({ theme = "dark", onClose }: ComparisonModalProps) {
  const isLight = theme === "light";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`relative w-full max-w-2xl rounded-2xl border p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto ${
        isLight ? "border-slate-200 bg-white text-slate-800" : "border-line bg-ink-950 text-mist"
      }`}>
        <button
          onClick={onClose}
          className={`absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-lg border transition ${
            isLight ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200" : "border-line bg-ink-900 text-faint hover:bg-ink-800 hover:text-mist"
          }`}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className={`flex items-center gap-2.5 border-b pb-4 ${isLight ? "border-slate-200" : "border-line"}`}>
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
            isLight ? "border-amber-300 bg-amber-50 text-amber-700" : "border-amber-500/40 bg-amber-500/10 text-amber-300"
          }`}>
            <ArrowLeftRight size={18} />
          </div>
          <div>
            <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
              المقارنة المباشرة: نموذج OSI مقابل نموذج TCP/IP
            </h3>
            <p className={`text-[11.5px] ${isLight ? "text-slate-500" : "text-faint"}`}>
              كيف تندمج طبقات OSI السبع داخل طبقات TCP/IP الأربع
            </p>
          </div>
        </div>

        {/* Comparison Diagram */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
          {/* OSI Column */}
          <div className="flex flex-col space-y-2">
            <div className={`rounded-xl border p-2 text-center text-[12.5px] font-bold ${
              isLight ? "border-teal-300 bg-teal-50 text-teal-900" : "border-mint-500/30 bg-mint-950/20 text-mint-300"
            }`}>
              نموذج OSI (7 طبقات نظري)
            </div>

            {/* Application */}
            <div className={`rounded-lg border p-2 text-center text-[11px] font-medium ${
              isLight ? "border-pink-300 bg-pink-50 text-pink-900" : "border-pink-500/40 bg-pink-950/20 text-pink-300"
            }`}>
              7. التطبيقات (Application)
            </div>
            {/* Presentation */}
            <div className={`rounded-lg border p-2 text-center text-[11px] font-medium ${
              isLight ? "border-orange-300 bg-orange-50 text-orange-900" : "border-orange-500/40 bg-orange-950/20 text-orange-300"
            }`}>
              6. التقديم (Presentation)
            </div>
            {/* Session */}
            <div className={`rounded-lg border p-2 text-center text-[11px] font-medium ${
              isLight ? "border-amber-300 bg-amber-50 text-amber-900" : "border-amber-500/40 bg-amber-950/20 text-amber-300"
            }`}>
              5. الجلسة (Session)
            </div>
            {/* Transport */}
            <div className={`rounded-lg border p-2 text-center text-[11px] font-medium ${
              isLight ? "border-sky-300 bg-sky-50 text-sky-900" : "border-sky-500/40 bg-sky-950/20 text-sky-300"
            }`}>
              4. النقل (Transport)
            </div>
            {/* Network */}
            <div className={`rounded-lg border p-2 text-center text-[11px] font-medium ${
              isLight ? "border-teal-300 bg-teal-50 text-teal-900" : "border-mint-500/40 bg-mint-950/20 text-mint-300"
            }`}>
              3. الشبكة (Network)
            </div>
            {/* Data Link */}
            <div className={`rounded-lg border p-2 text-center text-[11px] font-medium ${
              isLight ? "border-violet-300 bg-violet-50 text-violet-900" : "border-violet-500/40 bg-violet-950/20 text-violet-300"
            }`}>
              2. ربط البيانات (Data Link)
            </div>
            {/* Physical */}
            <div className={`rounded-lg border p-2 text-center text-[11px] font-medium ${
              isLight ? "border-slate-300 bg-slate-100 text-slate-800" : "border-slate-500/40 bg-slate-950/20 text-slate-300"
            }`}>
              1. الفيزيائية (Physical)
            </div>
          </div>

          {/* TCP/IP Column */}
          <div className="flex flex-col space-y-2">
            <div className={`rounded-xl border p-2 text-center text-[12.5px] font-bold ${
              isLight ? "border-sky-300 bg-sky-50 text-sky-900" : "border-sky-500/30 bg-sky-950/20 text-sky-300"
            }`}>
              نموذج TCP/IP (4 طبقات عملي)
            </div>

            {/* Merged Application (maps to 7, 6, 5) */}
            <div className={`flex flex-1 min-h-[105px] flex-col items-center justify-center rounded-lg border p-2 text-center shadow-xs ${
              isLight
                ? "border-pink-300 bg-gradient-to-b from-pink-50 to-amber-50 text-pink-950"
                : "border-pink-500/60 bg-gradient-to-b from-pink-950/40 to-amber-950/30 text-pink-300"
            }`}>
              <span className="text-[12px] font-bold">
                4. طبقة التطبيقات (Application)
              </span>
              <span className={`text-[10px] mt-1 ${isLight ? "text-slate-600" : "text-faint"}`}>
                تدمج (التطبيقات + التقديم + الجلسة)
              </span>
            </div>

            {/* Transport (maps to 4) */}
            <div className={`rounded-lg border p-2.5 text-center text-[12px] font-bold shadow-xs ${
              isLight ? "border-sky-300 bg-sky-50 text-sky-900" : "border-sky-500/60 bg-sky-950/30 text-sky-300"
            }`}>
              3. طبقة النقل (Transport)
              <div className={`text-[10px] font-normal ${isLight ? "text-slate-600" : "text-faint"}`}>نفس طبقة النقل (TCP / UDP)</div>
            </div>

            {/* Internet (maps to 3) */}
            <div className={`rounded-lg border p-2.5 text-center text-[12px] font-bold shadow-xs ${
              isLight ? "border-teal-300 bg-teal-50 text-teal-900" : "border-mint-500/60 bg-mint-950/30 text-mint-300"
            }`}>
              2. طبقة الإنترنت (Internet)
              <div className={`text-[10px] font-normal ${isLight ? "text-slate-600" : "text-faint"}`}>تعادل طبقة الشبكة (IP)</div>
            </div>

            {/* Network Access (maps to 2, 1) */}
            <div className={`flex flex-1 min-h-[70px] flex-col items-center justify-center rounded-lg border p-2 text-center shadow-xs ${
              isLight
                ? "border-violet-300 bg-gradient-to-b from-violet-50 to-slate-100 text-violet-950"
                : "border-violet-500/60 bg-gradient-to-b from-violet-950/40 to-slate-950/30 text-violet-300"
            }`}>
              <span className="text-[12px] font-bold">
                1. النفاذ للشبكة (Network Access)
              </span>
              <span className={`text-[10px] mt-1 ${isLight ? "text-slate-600" : "text-faint"}`}>
                تدمج (ربط البيانات + الفيزيائية)
              </span>
            </div>
          </div>
        </div>

        {/* High school explanation summary */}
        <div className={`mt-5 rounded-xl border p-3.5 text-[12px] leading-relaxed ${
          isLight ? "border-slate-200 bg-slate-50 text-slate-700" : "border-line-soft bg-ink-900/60 text-dim"
        }`}>
          <h4 className={`font-bold flex items-center gap-1.5 mb-2 ${isLight ? "text-slate-900" : "text-mist"}`}>
            <CheckCircle2 size={15} className={isLight ? "text-teal-600" : "text-mint-400"} />
            لماذا ندرس النموذجين معاً في الثانوية؟
          </h4>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              <strong className={isLight ? "text-slate-900" : "text-mist"}>نموذج OSI:</strong> نموذج نظري تعليمي وضعته منظمة ISO العالمية لفهم شبكات الحاسوب خطوة بخطوة وبدقة عالية.
            </li>
            <li>
              <strong className={isLight ? "text-slate-900" : "text-mist"}>نموذج TCP/IP:</strong> هو النموذج العملي الحقيقي الذي بُنيت عليه شبكة الإنترنت اليوم ويستخدمه كل هاتف وحاسوب في العالم.
            </li>
            <li>
              لاحظ كيف بسّط TCP/IP الأمور بدمج الطبقات العليا (7، 6، 5) في طبقة واحدة، ودمج الطبقات السفلية (2، 1) في طبقة واحدة.
            </li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className={`rounded-xl border px-4 py-2 text-[12px] font-medium transition ${
              isLight ? "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200" : "border-line bg-ink-900 text-mist hover:bg-ink-850"
            }`}
          >
            إغلاق المقارنة
          </button>
        </div>
      </div>
    </div>
  );
}
