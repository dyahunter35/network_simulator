"use client";

import { X, Sparkles, ArrowLeftRight, CheckCircle2 } from "lucide-react";

interface ComparisonModalProps {
  onClose: () => void;
}

export function ComparisonModal({ onClose }: ComparisonModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-ink-950 p-5 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-900 text-faint transition hover:bg-ink-800 hover:text-mist"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 border-b border-line pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-300">
            <ArrowLeftRight size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-mist">
              المقارنة المباشرة: نموذج OSI مقابل نموذج TCP/IP
            </h3>
            <p className="text-[11.5px] text-faint">
              كيف تندمج طبقات OSI السبع داخل طبقات TCP/IP الأربع
            </p>
          </div>
        </div>

        {/* Comparison Diagram */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
          {/* OSI Column */}
          <div className="flex flex-col space-y-2">
            <div className="rounded-xl border border-mint-500/30 bg-mint-950/20 p-2 text-center text-[12.5px] font-bold text-mint-300">
              نموذج OSI (7 طبقات نظري)
            </div>

            {/* Application */}
            <div className="rounded-lg border border-pink-500/40 bg-pink-950/20 p-2 text-center text-[11px] text-pink-300">
              7. التطبيقات (Application)
            </div>
            {/* Presentation */}
            <div className="rounded-lg border border-orange-500/40 bg-orange-950/20 p-2 text-center text-[11px] text-orange-300">
              6. التقديم (Presentation)
            </div>
            {/* Session */}
            <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-2 text-center text-[11px] text-amber-300">
              5. الجلسة (Session)
            </div>
            {/* Transport */}
            <div className="rounded-lg border border-sky-500/40 bg-sky-950/20 p-2 text-center text-[11px] text-sky-300">
              4. النقل (Transport)
            </div>
            {/* Network */}
            <div className="rounded-lg border border-mint-500/40 bg-mint-950/20 p-2 text-center text-[11px] text-mint-300">
              3. الشبكة (Network)
            </div>
            {/* Data Link */}
            <div className="rounded-lg border border-violet-500/40 bg-violet-950/20 p-2 text-center text-[11px] text-violet-300">
              2. ربط البيانات (Data Link)
            </div>
            {/* Physical */}
            <div className="rounded-lg border border-slate-500/40 bg-slate-950/20 p-2 text-center text-[11px] text-slate-300">
              1. الفيزيائية (Physical)
            </div>
          </div>

          {/* TCP/IP Column */}
          <div className="flex flex-col space-y-2">
            <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-2 text-center text-[12.5px] font-bold text-sky-300">
              نموذج TCP/IP (4 طبقات عملي)
            </div>

            {/* Merged Application (maps to 7, 6, 5) */}
            <div className="flex flex-1 min-h-[105px] flex-col items-center justify-center rounded-lg border border-pink-500/60 bg-gradient-to-b from-pink-950/40 to-amber-950/30 p-2 text-center shadow">
              <span className="text-[12px] font-bold text-pink-300">
                4. طبقة التطبيقات (Application)
              </span>
              <span className="text-[10px] text-faint mt-1">
                تدمج (التطبيقات + التقديم + الجلسة)
              </span>
            </div>

            {/* Transport (maps to 4) */}
            <div className="rounded-lg border border-sky-500/60 bg-sky-950/30 p-2.5 text-center text-[12px] font-bold text-sky-300 shadow">
              3. طبقة النقل (Transport)
              <div className="text-[10px] text-faint font-normal">نفس طبقة النقل (TCP / UDP)</div>
            </div>

            {/* Internet (maps to 3) */}
            <div className="rounded-lg border border-mint-500/60 bg-mint-950/30 p-2.5 text-center text-[12px] font-bold text-mint-300 shadow">
              2. طبقة الإنترنت (Internet)
              <div className="text-[10px] text-faint font-normal">تعادل طبقة الشبكة (IP)</div>
            </div>

            {/* Network Access (maps to 2, 1) */}
            <div className="flex flex-1 min-h-[70px] flex-col items-center justify-center rounded-lg border border-violet-500/60 bg-gradient-to-b from-violet-950/40 to-slate-950/30 p-2 text-center shadow">
              <span className="text-[12px] font-bold text-violet-300">
                1. النفاذ للشبكة (Network Access)
              </span>
              <span className="text-[10px] text-faint mt-1">
                تدمج (ربط البيانات + الفيزيائية)
              </span>
            </div>
          </div>
        </div>

        {/* High school explanation summary */}
        <div className="mt-5 rounded-xl border border-line-soft bg-ink-900/60 p-3.5 text-[12px] leading-relaxed text-dim">
          <h4 className="text-mist font-bold flex items-center gap-1.5 mb-2">
            <CheckCircle2 size={15} className="text-mint-400" />
            لماذا ندرس النموذجين معاً في الثانوية؟
          </h4>
          <ul className="space-y-1.5 list-disc list-inside">
            <li>
              <strong className="text-mist">نموذج OSI:</strong> نموذج نظري تعليمي وضعته منظمة ISO العالمية لفهم شبكات الحاسوب خطوة بخطوة وبدقة عالية.
            </li>
            <li>
              <strong className="text-mist">نموذج TCP/IP:</strong> هو النموذج العملي الحقيقي الذي بُنيت عليه شبكة الإنترنت اليوم ويستخدمه كل هاتف وحاسوب في العالم.
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
            className="rounded-xl border border-line bg-ink-900 px-4 py-2 text-[12px] font-medium text-mist hover:bg-ink-850"
          >
            إغلاق المقارنة
          </button>
        </div>
      </div>
    </div>
  );
}
