"use client";

import { useState } from "react";
import { X, CheckCircle, XCircle, RotateCcw, Award, HelpCircle } from "lucide-react";
import type { QuizQuestion } from "./types";

interface StudentQuizProps {
  title: string;
  questions: QuizQuestion[];
  theme?: "dark" | "light";
  onClose: () => void;
}

export function StudentQuiz({ title, questions, theme = "dark", onClose }: StudentQuizProps) {
  const isLight = theme === "light";
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const currentQ = questions[currentIdx];

  const handleSelect = (idx: number) => {
    if (hasAnswered) return;
    setSelectedOpt(idx);
    setHasAnswered(true);

    if (idx === currentQ.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1);
      setSelectedOpt(null);
      setHasAnswered(false);
    } else {
      setIsFinished(true);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOpt(null);
    setHasAnswered(false);
    setScore(0);
    setIsFinished(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`relative w-full max-w-md rounded-2xl border p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 ${
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

        {/* Title */}
        <div className={`flex items-center gap-2 border-b pb-3 ${isLight ? "border-slate-200" : "border-line"}`}>
          <HelpCircle size={18} className={isLight ? "text-sky-600" : "text-sky-300"} />
          <h3 className={`text-base font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>{title}</h3>
        </div>

        {/* Quiz Body */}
        {!isFinished ? (
          <div className="mt-4">
            <div className={`flex items-center justify-between text-[11px] mb-2 ${isLight ? "text-slate-500" : "text-faint"}`}>
              <span>السؤال {currentIdx + 1} من {questions.length}</span>
              <span>النقاط: {score}</span>
            </div>

            {/* Question Text */}
            <p className={`text-[13.5px] font-semibold leading-relaxed min-h-[48px] ${isLight ? "text-slate-900" : "text-mist"}`}>
              {currentQ.question}
            </p>

            {/* Options */}
            <div className="mt-3 space-y-2">
              {currentQ.options.map((option, idx) => {
                const isCorrect = idx === currentQ.correctIndex;
                const isSelected = idx === selectedOpt;

                let btnStyle = isLight
                  ? "border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:border-slate-300"
                  : "border-line bg-ink-900/60 text-mist hover:border-slate-600";
                if (hasAnswered) {
                  if (isCorrect) {
                    btnStyle = isLight
                      ? "border-teal-400 bg-teal-50 text-teal-900 font-semibold"
                      : "border-mint-500 bg-mint-950/40 text-mint-300 font-semibold";
                  } else if (isSelected) {
                    btnStyle = isLight
                      ? "border-rose-400 bg-rose-50 text-rose-900 font-semibold"
                      : "border-rose-500 bg-rose-950/40 text-rose-300";
                  } else {
                    btnStyle = isLight
                      ? "border-slate-100 bg-slate-50/50 text-slate-400 opacity-60"
                      : "border-line/40 bg-ink-950 opacity-40";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={hasAnswered}
                    onClick={() => handleSelect(idx)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-right text-[12.5px] transition-all ${btnStyle}`}
                  >
                    <span>{option}</span>
                    {hasAnswered && isCorrect && <CheckCircle size={15} className="text-teal-600 shrink-0" />}
                    {hasAnswered && isSelected && !isCorrect && (
                      <XCircle size={15} className="text-rose-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation card upon answering */}
            {hasAnswered && (
              <div className={`mt-3 rounded-xl border p-2.5 text-[11.5px] animate-fadeIn ${
                isLight ? "border-slate-200 bg-slate-50 text-slate-700" : "border-line-soft bg-ink-900/50 text-dim"
              }`}>
                <strong className={isLight ? "text-slate-900" : "text-mist"}>التوضيح: </strong>
                {currentQ.explanation}
              </div>
            )}

            {/* Next / Submit Button */}
            <div className="mt-4 flex justify-end">
              {hasAnswered && (
                <button
                  onClick={handleNext}
                  className={`rounded-xl border px-4 py-1.5 text-[12px] font-semibold transition ${
                    isLight
                      ? "border-teal-300 bg-teal-100 text-teal-900 hover:bg-teal-200"
                      : "border-mint-500/30 bg-mint-500/20 text-mint-300 hover:bg-mint-500/30"
                  }`}
                >
                  {currentIdx < questions.length - 1 ? "السؤال التالي ←" : "عرض النتيجة النهائية 🎉"}
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Result Card */
          <div className="mt-6 flex flex-col items-center py-4 text-center">
            <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border shadow-lg mb-3 ${
              isLight ? "border-teal-300 bg-teal-50 text-teal-700" : "border-mint-500/40 bg-mint-500/10 text-mint-300"
            }`}>
              <Award size={32} />
            </div>
            <h4 className={`text-lg font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
              {score === questions.length
                ? "ممتاز جداً! إجابات مثالية 🎉"
                : score >= 2
                ? "أحسنت! فهم رائع 👏"
                : "جيد! جرّب مرة أخرى لتعزيز فهمك 💪"}
            </h4>
            <p className={`mt-1 text-[13px] ${isLight ? "text-slate-600" : "text-faint"}`}>
              لقد أجبت على <strong className={`font-bold ${isLight ? "text-teal-700" : "text-mint-300"}`}>{score}</strong> من أصل{" "}
              <strong>{questions.length}</strong> أسئلة بشكل صحيح.
            </p>

            <div className="mt-6 flex gap-2">
              <button
                onClick={handleRestart}
                className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-[12px] font-medium transition ${
                  isLight ? "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200" : "border-line bg-ink-900 text-mist hover:bg-ink-850"
                }`}
              >
                <RotateCcw size={14} />
                <span>إعادة الاختبار</span>
              </button>

              <button
                onClick={onClose}
                className={`rounded-xl border px-4 py-2 text-[12px] font-semibold transition ${
                  isLight
                    ? "border-teal-300 bg-teal-100 text-teal-900 hover:bg-teal-200"
                    : "border-mint-500/40 bg-mint-500/20 text-mint-300 hover:bg-mint-500/30"
                }`}
              >
                العودة للمحاكاة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
