"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Layers, Network, Sparkles, HelpCircle, Sun, Moon, Presentation, LayoutGrid } from "lucide-react";
import { Brand } from "@/components/common";
import type { ThemeMode, ViewMode } from "./types";

interface ModelHeaderProps {
  currentModel: "osi" | "tcp";
  theme?: ThemeMode;
  viewMode?: ViewMode;
  onToggleTheme?: () => void;
  onToggleViewMode?: () => void;
  onOpenGuide?: () => void;
  onOpenQuiz?: () => void;
  onOpenComparison?: () => void;
}

export function ModelHeader({
  currentModel,
  theme = "dark",
  viewMode = "presentation",
  onToggleTheme,
  onToggleViewMode,
  onOpenGuide,
  onOpenQuiz,
  onOpenComparison,
}: ModelHeaderProps) {
  const isLight = theme === "light";
  const isPresentation = viewMode === "presentation";

  return (
    <header className={`relative z-30 flex h-[56px] shrink-0 items-center justify-between border-b px-2.5 sm:px-4 backdrop-blur-xl transition-colors ${
      isLight ? "border-slate-200 bg-white/95 text-slate-800" : "border-line bg-ink-950/95 text-mist"
    }`}>
      {/* Right side (RTL start): Brand & Model Switcher */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        <Link href="/" className="transition-opacity hover:opacity-90" title="العودة لمعمل الشبكات الرئيسي">
          <Brand />
        </Link>

        <div className={`hidden h-6 w-px sm:block ${isLight ? "bg-slate-200" : "bg-line"}`} />

        {/* Model navigation switcher tabs */}
        <nav className={`flex items-center rounded-xl border p-0.5 text-[11.5px] sm:text-[12px] ${
          isLight ? "border-slate-200 bg-slate-100/90" : "border-line bg-ink-900/90"
        }`}>
          <Link
            href="/osi"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all ${
              currentModel === "osi"
                ? isLight
                  ? "bg-mint-500/20 text-teal-800 border border-mint-500/40 shadow-xs"
                  : "bg-mint-500/20 text-mint-300 shadow-[inset_0_1px_0_rgba(94,234,212,0.3)] border border-mint-500/30"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                : "text-dim hover:text-mist hover:bg-ink-800/60"
            }`}
          >
            <Layers size={13} className={currentModel === "osi" ? (isLight ? "text-teal-700" : "text-mint-300") : "text-slate-400"} />
            <span>OSI</span>
            <span className={`hidden rounded px-1 py-0.2 text-[9.5px] sm:inline ${
              isLight ? "bg-teal-100 text-teal-800 font-bold" : "bg-ink-950/70 text-mint-400"
            }`}>
              7 طبقات
            </span>
          </Link>

          <Link
            href="/tcp"
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-medium transition-all ${
              currentModel === "tcp"
                ? isLight
                  ? "bg-sky-500/20 text-sky-800 border border-sky-500/40 shadow-xs"
                  : "bg-sky-500/20 text-sky-300 shadow-[inset_0_1px_0_rgba(125,211,252,0.3)] border border-sky-500/30"
                : isLight
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                : "text-dim hover:text-mist hover:bg-ink-800/60"
            }`}
          >
            <Network size={13} className={currentModel === "tcp" ? (isLight ? "text-sky-700" : "text-sky-300") : "text-slate-400"} />
            <span>TCP/IP</span>
            <span className={`hidden rounded px-1 py-0.2 text-[9.5px] sm:inline ${
              isLight ? "bg-sky-100 text-sky-800 font-bold" : "bg-ink-950/70 text-sky-400"
            }`}>
              4 طبقات
            </span>
          </Link>
        </nav>
      </div>

      {/* Left side (RTL end): View Mode Toggle, Theme Toggle, Actions & Main Simulator link */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Layout View Mode Switcher (Teaching vs Lab) */}
        {onToggleViewMode && (
          <button
            onClick={onToggleViewMode}
            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[11.5px] font-bold transition shadow-xs ${
              isPresentation
                ? isLight
                  ? "border-teal-400 bg-teal-50 text-teal-800 ring-1 ring-teal-300"
                  : "border-mint-500/40 bg-mint-500/20 text-mint-300 ring-1 ring-mint-500/30"
                : isLight
                ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                : "border-line bg-ink-900 text-mist hover:bg-ink-850"
            }`}
            title={isPresentation ? "التبديل إلى وضع المعمل المزدوج (الأجهزة)" : "التبديل إلى وضع الشرح الصفي المساعد"}
          >
            {isPresentation ? (
              <>
                <Presentation size={14} className={isLight ? "text-teal-700" : "text-mint-300"} />
                <span>وضع الشرح</span>
              </>
            ) : (
              <>
                <LayoutGrid size={14} className={isLight ? "text-slate-600" : "text-slate-400"} />
                <span>وضع المعمل</span>
              </>
            )}
          </button>
        )}

        {/* Light / Dark Mode Toggle Button */}
        {onToggleTheme && (
          <button
            onClick={onToggleTheme}
            className={`flex items-center gap-1.5 rounded-xl border px-2 py-1 text-[11px] font-medium transition shadow-xs ${
              isLight
                ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                : "border-line bg-ink-900 text-amber-300 hover:border-amber-400/40 hover:bg-ink-850"
            }`}
            title={isLight ? "التبديل إلى الوضع الليلي (Dark Mode)" : "التبديل إلى الوضع النهاري (Light Mode)"}
          >
            {isLight ? <Moon size={13} className="text-indigo-600" /> : <Sun size={13} className="text-amber-400" />}
            <span className="hidden md:inline">{isLight ? "ليلي" : "نهاري"}</span>
          </button>
        )}

        {onOpenComparison && (
          <button
            onClick={onOpenComparison}
            className={`hidden items-center gap-1 rounded-xl border px-2.5 py-1 text-[11.5px] transition lg:flex ${
              isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-line bg-ink-900/60 text-mist hover:border-mint-400/40 hover:bg-ink-850"
            }`}
            title="مقارنة سريعة بين نموذج OSI ونموذج TCP/IP"
          >
            <Sparkles size={12} className="text-amber-500" />
            <span>المقارنة</span>
          </button>
        )}

        {onOpenQuiz && (
          <button
            onClick={onOpenQuiz}
            className={`flex items-center gap-1 rounded-xl border px-2 py-1 text-[11px] transition ${
              isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-line bg-ink-900/60 text-mist hover:border-sky-400/40 hover:bg-ink-850"
            }`}
            title="اختبر فهمك في دقيقة (أسئلة لطلاب الثانوي)"
          >
            <HelpCircle size={13} className={isLight ? "text-sky-600" : "text-sky-300"} />
            <span className="hidden sm:inline">اختبار سريع</span>
          </button>
        )}

        {onOpenGuide && (
          <button
            onClick={onOpenGuide}
            className={`flex items-center gap-1 rounded-xl border px-2 py-1 text-[11px] transition ${
              isLight
                ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                : "border-line bg-ink-900/60 text-mist hover:border-mint-400/40 hover:bg-ink-850"
            }`}
            title="دليل الشرح لطلاب الثانوي"
          >
            <BookOpen size={13} className={isLight ? "text-teal-600" : "text-mint-300"} />
            <span className="hidden sm:inline">الدليل</span>
          </button>
        )}

        <div className={`h-4 w-px ${isLight ? "bg-slate-200" : "bg-line"}`} />

        <Link
          href="/"
          className={`flex items-center gap-1 rounded-xl border px-2.5 py-1 text-[11.5px] font-medium transition ${
            isLight
              ? "border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100"
              : "border-mint-500/30 bg-mint-500/10 text-mint-300 hover:bg-mint-500/20"
          }`}
        >
          <span>المحاكي</span>
          <ArrowLeft size={12} />
        </Link>
      </div>
    </header>
  );
}
