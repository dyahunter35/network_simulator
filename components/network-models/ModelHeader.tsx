"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Layers, Network, Sparkles, HelpCircle } from "lucide-react";
import { Brand } from "@/components/common";

interface ModelHeaderProps {
  currentModel: "osi" | "tcp";
  onOpenGuide?: () => void;
  onOpenQuiz?: () => void;
  onOpenComparison?: () => void;
}

export function ModelHeader({
  currentModel,
  onOpenGuide,
  onOpenQuiz,
  onOpenComparison,
}: ModelHeaderProps) {
  return (
    <header className="relative z-30 flex h-[62px] shrink-0 items-center justify-between border-b border-line bg-ink-950/90 px-3 backdrop-blur-xl sm:px-5">
      {/* Right side (RTL start): Brand & Model Switcher */}
      <div className="flex items-center gap-3 sm:gap-5">
        <Link href="/" className="transition-opacity hover:opacity-90" title="العودة لمعمل الشبكات الرئيسي">
          <Brand />
        </Link>

        <div className="hidden h-7 w-px bg-line sm:block" />

        {/* Model navigation switcher tabs */}
        <nav className="flex items-center rounded-xl border border-line bg-ink-900/80 p-1 text-[12px] sm:text-[13px]">
          <Link
            href="/osi"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              currentModel === "osi"
                ? "bg-mint-500/20 text-mint-300 shadow-[inset_0_1px_0_rgba(94,234,212,0.3)] border border-mint-500/30"
                : "text-dim hover:text-mist hover:bg-ink-800/60"
            }`}
          >
            <Layers size={14} className={currentModel === "osi" ? "text-mint-300" : "text-faint"} />
            <span>نموذج OSI</span>
            <span className="hidden rounded bg-ink-950/70 px-1.5 py-0.2 text-[10px] text-mint-400 sm:inline">
              7 طبقات
            </span>
          </Link>

          <Link
            href="/tcp"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              currentModel === "tcp"
                ? "bg-sky-500/20 text-sky-300 shadow-[inset_0_1px_0_rgba(125,211,252,0.3)] border border-sky-500/30"
                : "text-dim hover:text-mist hover:bg-ink-800/60"
            }`}
          >
            <Network size={14} className={currentModel === "tcp" ? "text-sky-300" : "text-faint"} />
            <span>نموذج TCP/IP</span>
            <span className="hidden rounded bg-ink-950/70 px-1.5 py-0.2 text-[10px] text-sky-400 sm:inline">
              4 طبقات
            </span>
          </Link>
        </nav>
      </div>

      {/* Left side (RTL end): Actions & Main Simulator link */}
      <div className="flex items-center gap-2">
        {onOpenComparison && (
          <button
            onClick={onOpenComparison}
            className="hidden items-center gap-1.5 rounded-lg border border-line bg-ink-900/60 px-3 py-1.5 text-[12px] text-mist transition hover:border-mint-400/40 hover:bg-ink-850 md:flex"
            title="مقارنة سريعة بين نموذج OSI ونموذج TCP/IP"
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>مقارنة النموذجين</span>
          </button>
        )}

        {onOpenQuiz && (
          <button
            onClick={onOpenQuiz}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-900/60 px-2.5 py-1.5 text-[12px] text-mist transition hover:border-sky-400/40 hover:bg-ink-850"
            title="اختبر فهمك في دقيقة (أسئلة لطلاب الثانوي)"
          >
            <HelpCircle size={14} className="text-sky-300" />
            <span className="hidden sm:inline">اختبر معلوماتك</span>
          </button>
        )}

        {onOpenGuide && (
          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-ink-900/60 px-2.5 py-1.5 text-[12px] text-mist transition hover:border-mint-400/40 hover:bg-ink-850"
            title="دليل الشرح لطلاب الثانوي"
          >
            <BookOpen size={14} className="text-mint-300" />
            <span className="hidden sm:inline">دليل الشرح</span>
          </button>
        )}

        <div className="h-5 w-px bg-line" />

        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-lg border border-mint-500/30 bg-mint-500/10 px-3 py-1.5 text-[12px] font-medium text-mint-300 transition hover:bg-mint-500/20"
        >
          <span>المحاكي الكامل</span>
          <ArrowLeft size={13} />
        </Link>
      </div>
    </header>
  );
}
