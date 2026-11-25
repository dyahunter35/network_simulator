"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Layers, Network, Sparkles, HelpCircle, Sun, Moon } from "lucide-react";
import { Brand } from "@/components/common";
import type { ThemeMode } from "./types";

interface ModelHeaderProps {
  currentModel: "osi" | "tcp";
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  onOpenGuide?: () => void;
  onOpenQuiz?: () => void;
  onOpenComparison?: () => void;
}

export function ModelHeader({
  currentModel,
  theme = "dark",
  onToggleTheme,
  onOpenGuide,
  onOpenQuiz,
  onOpenComparison,
}: ModelHeaderProps) {
  const isLight = theme === "light";

  return (
    <header className={`relative z-30 flex h-[62px] shrink-0 items-center justify-between border-b px-3 backdrop-blur-xl sm:px-5 transition-colors ${
      isLight ? "border-slate-200 bg-white/90 text-slate-800" : "border-line bg-ink-950/90 text-mist"
    }`}>
      {/* Right side (RTL start): Brand & Model Switcher */}
      <div className="flex items-center gap-3 sm:gap-5">
        <Link href="/" className="transition-opacity hover:opacity-90" title="العودة لمعمل الشبكات الرئيسي">
          <Brand />
        </Link>

        <div className={`hidden h-7 w-px sm:block ${isLight ? "bg-slate-200" : "bg-line"}`} />

        {/* Model navigation switcher tabs */}
        <nav className={`flex items-center rounded-xl border p-1 text-[12px] sm:text-[13px] ${
          isLight ? "border-slate-200 bg-slate-100/80" : "border-line bg-ink-900/80"
        }`}>
          <Link
            href="/osi"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              currentModel === "osi"
                ? isLight
                  ? "bg-mint-500/20 text-teal-800 border border-mint-500/40 shadow-sm"
                  : "bg-mint-500/20 text-mint-300 shadow-[inset_0_1px_0_rgba(94,234,212,0.3)] border border-mint-500/30"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                : "text-dim hover:text-mist hover:bg-ink-800/60"
            }`}
          >
            <Layers size={14} className={currentModel === "osi" ? (isLight ? "text-teal-700" : "text-mint-300") : "text-slate-400"} />
            <span>نموذج OSI</span>
            <span className={`hidden rounded px-1.5 py-0.2 text-[10px] sm:inline ${
              isLight ? "bg-teal-100 text-teal-800 font-bold" : "bg-ink-950/70 text-mint-400"
            }`}>
              7 طبقات
            </span>
          </Link>

          <Link
            href="/tcp"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
              currentModel === "tcp"
                ? isLight
                  ? "bg-sky-500/20 text-sky-800 border border-sky-500/40 shadow-sm"
                  : "bg-sky-500/20 text-sky-300 shadow-[inset_0_1px_0_rgba(125,211,252,0.3)] border border-sky-500/30"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                : "text-dim hover:text-mist hover:bg-ink-800/60"
            }`}
          >
            <Network size={14} className={currentModel === "tcp" ? (isLight ? "text-sky-700" : "text-sky-300") : "text-slate-400"} />
            <span>نموذج TCP/IP</span>
            <span className={`hidden rounded px-1.5 py-0.2 text-[10px] sm:inline ${
              isLight ? "bg-sky-100 text-sky-800 font-bold" : "bg-ink-950/70 text-sky-400"
            }`}>
              4 طبقات
            </span>
          </Link>
        </nav>
      </div>

      {/* Left side (RTL end): Theme Toggle, Actions & Main Simulator link */}
      <div className="flex items-center gap-2">
        {/* Light / Dark Mode Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition shadow-sm ${
              isLight
                ? "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                : "border-line bg-ink-900/60 text-amber-300 hover:border-amber-400/40 hover:bg-ink-850"
            }`}
            title={isLight ? "التبديل إلى الوضع الليلي (Dark Mode)" : "التبديل إلى الوضع النهاري (Light Mode)"}
          >
            {isLight ? <Moon size={14} className="text-indigo-600" /> : <Sun size={14} className="text-amber-400" />}
            <span className="hidden sm:inline">{isLight ? "الوضع الليلي" : "الوضع النهاري"}</span>
          </button>
        )}

        {onOpenComparison && (
          <button
            onClick={onOpenComparison}
            className={`hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] transition md:flex ${
              isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-line bg-ink-900/60 text-mist hover:border-mint-400/40 hover:bg-ink-850"
            }`}
            title="مقارنة سريعة بين نموذج OSI ونموذج TCP/IP"
          >
            <Sparkles size={13} className="text-amber-500" />
            <span>مقارنة النموذجين</span>
          </button>
        )}

        {onOpenQuiz && (
          <button
            onClick={onOpenQuiz}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition ${
              isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-line bg-ink-900/60 text-mist hover:border-sky-400/40 hover:bg-ink-850"
            }`}
            title="اختبر فهمك في دقيقة (أسئلة لطلاب الثانوي)"
          >
            <HelpCircle size={14} className={isLight ? "text-sky-600" : "text-sky-300"} />
            <span className="hidden sm:inline">اختبر معلوماتك</span>
          </button>
        )}

        {onOpenGuide && (
          <button
            onClick={onOpenGuide}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition ${
              isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-line bg-ink-900/60 text-mist hover:border-mint-400/40 hover:bg-ink-850"
            }`}
            title="دليل الشرح لطلاب الثانوي"
          >
            <BookOpen size={14} className={isLight ? "text-teal-600" : "text-mint-300"} />
            <span className="hidden sm:inline">دليل الشرح</span>
          </button>
        )}

        <div className={`h-5 w-px ${isLight ? "bg-slate-200" : "bg-line"}`} />

        <Link
          href="/"
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
            isLight
              ? "border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100"
              : "border-mint-500/30 bg-mint-500/10 text-mint-300 hover:bg-mint-500/20"
          }`}
        >
          <span>المحاكي الكامل</span>
          <ArrowLeft size={13} />
        </Link>
      </div>
    </header>
  );
}
