"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Sparkles,
  Layers,
  HelpCircle,
  BookOpen,
  ArrowDown,
  ArrowUp,
  Monitor,
  Server,
  Volume2,
  VolumeX,
} from "lucide-react";
import { ModelHeader } from "@/components/network-models/ModelHeader";
import { WireVisualizer } from "@/components/network-models/WireVisualizer";
import { PduVisualizer } from "@/components/network-models/PduVisualizer";
import { LayerCard } from "@/components/network-models/LayerCard";
import { LayerDetailModal } from "@/components/network-models/LayerDetailModal";
import { StudentQuiz } from "@/components/network-models/StudentQuiz";
import { ComparisonModal } from "@/components/network-models/ComparisonModal";
import { OSI_LAYERS, SCENARIOS, OSI_QUIZ } from "@/components/network-models/data";
import type { MediumKind, Scenario, LayerInfo, ThemeMode } from "@/components/network-models/types";

// Animation steps:
// 0: Sender L7 (Application)
// 1: Sender L6 (Presentation)
// 2: Sender L5 (Session)
// 3: Sender L4 (Transport)
// 4: Sender L3 (Network)
// 5: Sender L2 (Data Link)
// 6: Sender L1 (Physical)
// 7: Wire (Traveling across cable as bits)
// 8: Receiver L1 (Physical)
// 9: Receiver L2 (Data Link)
// 10: Receiver L3 (Network)
// 11: Receiver L4 (Transport)
// 12: Receiver L5 (Session)
// 13: Receiver L6 (Presentation)
// 14: Receiver L7 (Application - Delivered!)
const TOTAL_STEPS = 15;

export default function OsiModelPage() {
  // Starts PAUSED by default so user can read calmly before starting
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState<number>(0.75); // Calm, teacher-friendly default
  const [medium, setMedium] = useState<MediumKind>("copper");
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [theme, setTheme] = useState<ThemeMode>("dark");

  // Load saved theme preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("netlab_model_theme") as ThemeMode | null;
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
      }
    } catch {
      // localStorage may fail in restricted sandboxes
    }
  }, []);

  const toggleTheme = () => {
    setTheme((curr) => {
      const next = curr === "dark" ? "light" : "dark";
      try {
        localStorage.setItem("netlab_model_theme", next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const isLight = theme === "light";

  // Modals state
  const [selectedLayer, setSelectedLayer] = useState<LayerInfo | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Audio effects synthesized (optional subtle tick)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const playBlip = (freq: number) => {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch {
      // Audio not permitted
    }
  };

  // Relaxed, calm animation timings (3.5s per layer, 4.8s on wire)
  useEffect(() => {
    if (!isPlaying) return;

    const baseDuration = currentStep === 7 ? 4800 : 3400;
    const duration = baseDuration / speed;

    const timer = window.setTimeout(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % TOTAL_STEPS;
        playBlip(next === 7 ? 300 : 500 + next * 40);
        return next;
      });
    }, duration);

    return () => window.clearTimeout(timer);
  }, [isPlaying, currentStep, speed, soundEnabled]);

  // Determine current active position and direction
  let direction: "down" | "wire" | "up" | "idle" = "down";
  let activeLayerNumber = 7;
  let activeSide: "sender" | "wire" | "receiver" = "sender";

  if (currentStep <= 6) {
    // Sender side: 7 down to 1
    direction = "down";
    activeSide = "sender";
    activeLayerNumber = 7 - currentStep;
  } else if (currentStep === 7) {
    // Wire
    direction = "wire";
    activeSide = "wire";
    activeLayerNumber = 1;
  } else {
    // Receiver side: 1 up to 7
    direction = "up";
    activeSide = "receiver";
    activeLayerNumber = currentStep - 7;
  }

  const handleStepNext = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => (prev + 1) % TOTAL_STEPS);
  };

  const handleStepPrev = () => {
    setIsPlaying(false);
    setCurrentStep((prev) => (prev - 1 + TOTAL_STEPS) % TOTAL_STEPS);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(0);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-200 pb-24 overflow-x-hidden ${
      isLight ? "theme-light bg-slate-50 text-slate-900" : "app-bg bg-ink-950 text-mist"
    }`}>
      {/* Header with Navigation & Theme Toggle */}
      <ModelHeader
        currentModel="osi"
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenGuide={() => setShowGuide(true)}
        onOpenQuiz={() => setShowQuiz(true)}
        onOpenComparison={() => setShowComparison(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-3 sm:p-5 lg:gap-6">
        {/* Banner / Title & Intro for Secondary Students */}
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 backdrop-blur-xl shadow-xs ${
          isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/80"
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-bold ${
                isLight ? "bg-teal-100 text-teal-800" : "bg-mint-500/20 text-mint-300"
              }`}>
                <Sparkles size={12} />
                محاكاة تفاعلية هادئة
              </span>
              <h1 className={`text-base font-bold sm:text-lg ${isLight ? "text-slate-900" : "text-mist"}`}>
                نموذج OSI المرجعي (7 طبقات)
              </h1>
            </div>
            <p className={`mt-1 text-[12px] max-w-2xl ${isLight ? "text-slate-600" : "text-faint"}`}>
              شاهد كيف تتحول رسالتك من تطبيق الحاسوب خطوة بخطوة إلى بتات وإشارات كهربائية تسير في السلك، ثم يعاد تجميعها في جهاز المستقبل.
            </p>
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center gap-2">
            <span className={`text-[11.5px] hidden sm:inline ${isLight ? "text-slate-500" : "text-faint"}`}>نوع الرسالة:</span>
            <div className={`flex rounded-xl border p-1 text-[11.5px] ${
              isLight ? "border-slate-200 bg-slate-100" : "border-line bg-ink-900/90"
            }`}>
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s)}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    scenario.id === s.id
                      ? isLight
                        ? "bg-white text-teal-900 font-bold shadow-xs border border-teal-300"
                        : "bg-mint-500/20 text-mint-300 border border-mint-500/30 font-medium"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-dim hover:text-mist"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Control Bar: Play / Pause, Step-by-Step, Speed */}
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 backdrop-blur-md shadow-xs ${
          isLight ? "border-slate-200 bg-white" : "border-line bg-ink-900/70"
        }`}>
          {/* Playback Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-[12.5px] font-bold transition shadow-sm ${
                isPlaying
                  ? isLight
                    ? "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : "border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                  : isLight
                  ? "border-teal-400 bg-teal-600 text-white hover:bg-teal-700 ring-2 ring-teal-400/30"
                  : "border-mint-500/50 bg-mint-500/30 text-mint-200 hover:bg-mint-500/40"
              }`}
            >
              {isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
              <span>{isPlaying ? "إيقاف مؤقت ⏸" : "ابدأ المحاكاة ▶"}</span>
            </button>

            <button
              onClick={handleStepPrev}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-2 text-[12px] font-medium transition ${
                isLight ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200" : "border-line bg-ink-850 text-faint hover:bg-ink-800 hover:text-mist"
              }`}
              title="الخطوة السابقة"
            >
              <SkipBack size={14} />
              <span className="hidden sm:inline">السابق</span>
            </button>

            <button
              onClick={handleStepNext}
              className={`flex items-center gap-1 rounded-xl border px-2.5 py-2 text-[12px] font-medium transition ${
                isLight ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200" : "border-line bg-ink-850 text-faint hover:bg-ink-800 hover:text-mist"
              }`}
              title="الخطوة التالية (خطوة بخطوة)"
            >
              <SkipForward size={14} />
              <span className="hidden sm:inline">التالي</span>
            </button>

            <button
              onClick={handleReset}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                isLight ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200" : "border-line bg-ink-850 text-faint hover:bg-ink-800 hover:text-mist"
              }`}
              title="إعادة البدء من البداية"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Current Step Status Badge */}
          <div className="flex items-center gap-2 text-[12px]">
            <span className={isLight ? "text-slate-500 font-medium" : "text-faint"}>المرحلة:</span>
            <span className={`mono rounded-lg border px-3 py-1 font-bold ${
              isLight ? "border-teal-300 bg-teal-50 text-teal-900" : "border-line bg-ink-950 text-mint-300"
            }`}>
              {currentStep <= 6 && `إرسال: الطبقة ${activeLayerNumber} (${OSI_LAYERS.find((l) => l.number === activeLayerNumber)?.nameAr})`}
              {currentStep === 7 && "سريان البيانات داخل السلك (الطبقة الفيزيائية)"}
              {currentStep >= 8 && `استقبال: الطبقة ${activeLayerNumber} (${OSI_LAYERS.find((l) => l.number === activeLayerNumber)?.nameAr})`}
            </span>
          </div>

          {/* Speed & Sound Controls */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-[11.5px] ${isLight ? "text-slate-600" : "text-faint"}`}>
              <span>سرعة الشرح:</span>
              <div className={`flex rounded-lg border p-0.5 ${isLight ? "border-slate-200 bg-slate-100" : "border-line bg-ink-950"}`}>
                {[
                  { val: 0.5, label: "0.5x بطيء" },
                  { val: 0.75, label: "0.75x مريح" },
                  { val: 1, label: "1x عادي" },
                  { val: 1.5, label: "1.5x سريع" },
                ].map((s) => (
                  <button
                    key={s.val}
                    onClick={() => setSpeed(s.val)}
                    className={`rounded px-2 py-0.5 text-[10.5px] transition ${
                      speed === s.val
                        ? isLight
                          ? "bg-white text-teal-900 font-bold shadow-xs border border-teal-300"
                          : "bg-mint-500/20 text-mint-300 font-bold"
                        : isLight
                        ? "text-slate-600 hover:text-slate-900"
                        : "text-dim hover:text-mist"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition ${
                soundEnabled
                  ? isLight
                    ? "border-teal-300 bg-teal-50 text-teal-800"
                    : "border-mint-500/40 bg-mint-500/20 text-mint-300"
                  : isLight
                  ? "border-slate-200 bg-slate-100 text-slate-500"
                  : "border-line bg-ink-950 text-faint hover:text-mist"
              }`}
              title="تفعيل/كتم الصوت الرقمي"
            >
              {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span className="hidden sm:inline">{soundEnabled ? "الصوت مفعّل" : "الصوت مكتوم"}</span>
            </button>
          </div>
        </div>

        {/* Live PDU Inspector (How data looks at this layer) */}
        <PduVisualizer
          modelType="osi"
          currentLayer={activeLayerNumber}
          direction={direction}
          scenario={scenario}
          theme={theme}
        />

        {/* The Two Stacks (Sender Computer vs Receiver Computer) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Left Column: Sending Device (الحاسوب المرسل أ) */}
          <div className={`flex flex-col rounded-2xl border p-4 sm:p-5 shadow-sm transition-colors ${
            isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/70"
          }`}>
            {/* Device Header */}
            <div className={`mb-3 flex items-center justify-between border-b pb-3 ${
              isLight ? "border-slate-200" : "border-line"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                  isLight ? "border-teal-300 bg-teal-50 text-teal-700" : "border-mint-500/40 bg-mint-500/10 text-mint-300"
                }`}>
                  <Monitor size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
                      جهاز المرسل (Sender - الحاسوب أ)
                    </span>
                    <span className={`rounded px-1.5 py-0.2 text-[9.5px] border font-mono ${
                      isLight ? "bg-teal-50 text-teal-800 border-teal-200" : "bg-mint-950/60 text-mint-400 border-mint-500/30"
                    }`}>
                      192.168.1.5
                    </span>
                  </div>
                  <p className={`text-[10.5px] ${isLight ? "text-slate-500" : "text-faint"}`}>
                    تغليف البيانات من أعلى لأسفل (من الطبقة 7 إلى الطبقة 1)
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-1 text-[11px] font-mono font-bold ${
                isLight ? "text-teal-700" : "text-mint-400"
              }`}>
                <ArrowDown size={14} className={activeSide === "sender" && isPlaying ? "animate-bounce" : ""} />
                <span>Encapsulation</span>
              </div>
            </div>

            {/* 7 OSI Layers on Sender (7 down to 1) */}
            <div className="space-y-2">
              {OSI_LAYERS.map((layer) => {
                const isActive = activeSide === "sender" && activeLayerNumber === layer.number;
                const isPassed = activeSide !== "sender" || activeLayerNumber < layer.number;

                return (
                  <LayerCard
                    key={`sender-${layer.number}`}
                    layer={layer}
                    isActive={isActive}
                    isCompleted={isPassed}
                    side="sender"
                    theme={theme}
                    onClick={() => setSelectedLayer(layer)}
                  />
                );
              })}
            </div>
          </div>

          {/* Right Column: Receiving Device (الحاسوب المستقبل ب) */}
          <div className={`flex flex-col rounded-2xl border p-4 sm:p-5 shadow-sm transition-colors ${
            isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/70"
          }`}>
            {/* Device Header */}
            <div className={`mb-3 flex items-center justify-between border-b pb-3 ${
              isLight ? "border-slate-200" : "border-line"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                  isLight ? "border-sky-300 bg-sky-50 text-sky-700" : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                }`}>
                  <Server size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
                      جهاز المستقبل (Receiver - الخادم ب)
                    </span>
                    <span className={`rounded px-1.5 py-0.2 text-[9.5px] border font-mono ${
                      isLight ? "bg-sky-50 text-sky-800 border-sky-200" : "bg-sky-950/60 text-sky-300 border border-sky-500/30"
                    }`}>
                      10.0.0.1
                    </span>
                  </div>
                  <p className={`text-[10.5px] ${isLight ? "text-slate-500" : "text-faint"}`}>
                    فك التغليف من أسفل لأعلى (من الطبقة 1 إلى الطبقة 7)
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-1 text-[11px] font-mono font-bold ${
                isLight ? "text-sky-700" : "text-sky-400"
              }`}>
                <ArrowUp size={14} className={activeSide === "receiver" && isPlaying ? "animate-bounce" : ""} />
                <span>Decapsulation</span>
              </div>
            </div>

            {/* 7 OSI Layers on Receiver */}
            <div className="space-y-2">
              {OSI_LAYERS.map((layer) => {
                const isActive = activeSide === "receiver" && activeLayerNumber === layer.number;
                const isPassed = activeSide === "receiver" && activeLayerNumber > layer.number;

                return (
                  <LayerCard
                    key={`receiver-${layer.number}`}
                    layer={layer}
                    isActive={isActive}
                    isCompleted={isPassed}
                    side="receiver"
                    theme={theme}
                    onClick={() => setSelectedLayer(layer)}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Physical Wire Transmission Component */}
        <WireVisualizer
          isTransmitting={direction === "wire"}
          medium={medium}
          onMediumChange={setMedium}
          speed={speed}
          theme={theme}
        />

        {/* Educational Summary Section for High Schoolers */}
        <section className={`rounded-2xl border p-4 sm:p-5 text-[12.5px] leading-relaxed transition-colors ${
          isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/60"
        }`}>
          <h2 className={`text-sm font-bold flex items-center gap-2 mb-2 ${isLight ? "text-slate-900" : "text-mist"}`}>
            <BookOpen size={16} className={isLight ? "text-teal-600" : "text-mint-400"} />
            ملخص سريع لطلاب الثانوي لحفظ وحدات البيانات (PDU):
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 text-center">
            <div className={`rounded-xl border p-2.5 ${
              isLight ? "border-pink-300 bg-pink-50 text-pink-950" : "border-pink-500/30 bg-pink-950/20"
            }`}>
              <span className={`text-[11px] font-bold ${isLight ? "text-pink-700" : "text-pink-300"}`}>الطبقات 7، 6، 5</span>
              <div className="mono text-[13px] font-bold mt-0.5">بيانات (Data)</div>
              <span className={`text-[10px] ${isLight ? "text-slate-600" : "text-faint"}`}>الرسالة أو الملف المباشر</span>
            </div>
            <div className={`rounded-xl border p-2.5 ${
              isLight ? "border-sky-300 bg-sky-50 text-sky-950" : "border-sky-500/30 bg-sky-950/20"
            }`}>
              <span className={`text-[11px] font-bold ${isLight ? "text-sky-700" : "text-sky-300"}`}>الطبقة 4 (النقل)</span>
              <div className="mono text-[13px] font-bold mt-0.5">قطعة (Segment)</div>
              <span className={`text-[10px] ${isLight ? "text-slate-600" : "text-faint"}`}>مع أرقام المنافذ TCP/UDP</span>
            </div>
            <div className={`rounded-xl border p-2.5 ${
              isLight ? "border-teal-300 bg-teal-50 text-teal-950" : "border-mint-500/30 bg-mint-950/20"
            }`}>
              <span className={`text-[11px] font-bold ${isLight ? "text-teal-700" : "text-mint-300"}`}>الطبقة 3 (الشبكة)</span>
              <div className="mono text-[13px] font-bold mt-0.5">حزمة (Packet)</div>
              <span className={`text-[10px] ${isLight ? "text-slate-600" : "text-faint"}`}>مع عناوين IP والراوتر</span>
            </div>
            <div className={`rounded-xl border p-2.5 ${
              isLight ? "border-violet-300 bg-violet-50 text-violet-950" : "border-violet-500/30 bg-violet-950/20"
            }`}>
              <span className={`text-[11px] font-bold ${isLight ? "text-violet-700" : "text-violet-300"}`}>الطبقة 2 و 1</span>
              <div className="mono text-[13px] font-bold mt-0.5">إطار (Frame) وبتات</div>
              <span className={`text-[10px] ${isLight ? "text-slate-600" : "text-faint"}`}>عناوين MAC ونبضات السلك</span>
            </div>
          </div>
        </section>
      </main>

      {/* Layer Detail Modal */}
      <LayerDetailModal
        layer={selectedLayer}
        theme={theme}
        onClose={() => setSelectedLayer(null)}
      />

      {/* Student Quiz Modal */}
      {showQuiz && (
        <StudentQuiz
          title="اختبر فهمك لنموذج OSI (3 أسئلة)"
          questions={OSI_QUIZ}
          theme={theme}
          onClose={() => setShowQuiz(false)}
        />
      )}

      {/* Comparison Modal */}
      {showComparison && (
        <ComparisonModal theme={theme} onClose={() => setShowComparison(false)} />
      )}

      {/* Guide Dialog */}
      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5"
          dir="rtl"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowGuide(false);
          }}
        >
          <div className={`relative w-full max-w-lg rounded-2xl border p-5 shadow-2xl ${
            isLight ? "border-slate-200 bg-white text-slate-800" : "border-line bg-ink-950 text-mist"
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 mb-3 ${isLight ? "text-slate-900" : "text-mist"}`}>
              <BookOpen size={18} className={isLight ? "text-teal-600" : "text-mint-400"} />
              دليل الشرح السريع لطلاب الثانوي
            </h3>
            <p className={`text-[12.5px] leading-relaxed mb-3 ${isLight ? "text-slate-700" : "text-dim"}`}>
              تخيل أنك تريد إرسال رسالة ورقية لصديق في دولة أخرى:
            </p>
            <ol className={`list-decimal list-inside space-y-2 text-[12px] leading-relaxed ${isLight ? "text-slate-700" : "text-dim"}`}>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>التطبيقات (7):</strong> كتابة الرسالة على الورقة.</li>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>التقديم (6):</strong> ترجمة الرسالة للغة يفهمها وتشفيرها.</li>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>الجلسة (5):</strong> الاتصال للتأكد أنه مستعد للاستلام.</li>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>النقل (4):</strong> تقطيع الرسالة إلى مظاريف صغيرة وتحديد رقم الشقة (Port).</li>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>الشبكة (3):</strong> كتابة عنوان الدولة والمدينة والشارع (عنوان IP).</li>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>ربط البيانات (2):</strong> تسليمها لساعي البريد المحلي وفحص سلامة الختم (عنوان MAC).</li>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>الفيزيائية (1):</strong> شاحنة الشحن تسير على الطريق الإسفلتي (الأسلاك والكهرباء).</li>
            </ol>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className={`rounded-xl border px-4 py-1.5 text-[12px] font-semibold transition ${
                  isLight ? "border-teal-300 bg-teal-100 text-teal-900 hover:bg-teal-200" : "border-mint-500/40 bg-mint-500/20 text-mint-300"
                }`}
              >
                فهمت الفكرة!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
