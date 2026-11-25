"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Sparkles,
  Network,
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
import { TCP_LAYERS, SCENARIOS, TCP_QUIZ } from "@/components/network-models/data";
import type { MediumKind, Scenario, TcpLayerInfo, ThemeMode } from "@/components/network-models/types";

// Animation steps for TCP/IP (4 layers):
// 0: Sender L4 (Application)
// 1: Sender L3 (Transport)
// 2: Sender L2 (Internet)
// 3: Sender L1 (Network Access / Link)
// 4: Wire (Physical transmission)
// 5: Receiver L1 (Network Access / Link)
// 6: Receiver L2 (Internet)
// 7: Receiver L3 (Transport)
// 8: Receiver L4 (Application - Done!)
const TOTAL_STEPS = 9;

export default function TcpModelPage() {
  // Starts PAUSED so teacher or student can examine the page calmly
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState<number>(0.75); // Calm default speed
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
      // ignore
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
  const [selectedLayer, setSelectedLayer] = useState<TcpLayerInfo | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Audio effects synthesized
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
      // Audio fallback
    }
  };

  // Continuous animation loop with relaxed timings
  useEffect(() => {
    if (!isPlaying) return;

    const baseDuration = currentStep === 4 ? 4800 : 3400;
    const duration = baseDuration / speed;

    const timer = window.setTimeout(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % TOTAL_STEPS;
        playBlip(next === 4 ? 300 : 450 + next * 50);
        return next;
      });
    }, duration);

    return () => window.clearTimeout(timer);
  }, [isPlaying, currentStep, speed, soundEnabled]);

  // Determine active layer and direction
  let direction: "down" | "wire" | "up" | "idle" = "down";
  let activeLayerNumber = 4;
  let activeSide: "sender" | "wire" | "receiver" = "sender";

  if (currentStep <= 3) {
    // Sender side: 4 down to 1
    direction = "down";
    activeSide = "sender";
    activeLayerNumber = 4 - currentStep;
  } else if (currentStep === 4) {
    // Wire
    direction = "wire";
    activeSide = "wire";
    activeLayerNumber = 1;
  } else {
    // Receiver side: 1 up to 4
    direction = "up";
    activeSide = "receiver";
    activeLayerNumber = currentStep - 4;
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
        currentModel="tcp"
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenGuide={() => setShowGuide(true)}
        onOpenQuiz={() => setShowQuiz(true)}
        onOpenComparison={() => setShowComparison(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-3 sm:p-5 lg:gap-6">
        {/* Banner / Title & Intro */}
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 backdrop-blur-xl shadow-xs ${
          isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/80"
        }`}>
          <div>
            <div className="flex items-center gap-2">
              <span className={`flex h-6 items-center gap-1 rounded-md px-2 text-[11px] font-bold ${
                isLight ? "bg-sky-100 text-sky-800" : "bg-sky-500/20 text-sky-300"
              }`}>
                <Sparkles size={12} />
                النموذج الفعلي للإنترنت
              </span>
              <h1 className={`text-base font-bold sm:text-lg ${isLight ? "text-slate-900" : "text-mist"}`}>
                نموذج TCP/IP المعياري (4 طبقات)
              </h1>
            </div>
            <p className={`mt-1 text-[12px] max-w-2xl ${isLight ? "text-slate-600" : "text-faint"}`}>
              النموذج العملي الذي بنيت عليه شبكة الإنترنت العالمية. شاهد كيف تنتقل البيانات عبر طبقات التطبيقات، النقل، الإنترنت، والنفاذ للشبكة.
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
                        ? "bg-white text-sky-900 font-bold shadow-xs border border-sky-300"
                        : "bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium"
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
                  ? "border-sky-400 bg-sky-600 text-white hover:bg-sky-700 ring-2 ring-sky-400/30"
                  : "border-sky-500/50 bg-sky-500/30 text-sky-200 hover:bg-sky-500/40"
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
              title="الخطوة التالية"
            >
              <SkipForward size={14} />
              <span className="hidden sm:inline">التالي</span>
            </button>

            <button
              onClick={handleReset}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                isLight ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200" : "border-line bg-ink-850 text-faint hover:bg-ink-800 hover:text-mist"
              }`}
              title="إعادة البدء"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          {/* Current Step Status Badge */}
          <div className="flex items-center gap-2 text-[12px]">
            <span className={isLight ? "text-slate-500 font-medium" : "text-faint"}>المرحلة:</span>
            <span className={`mono rounded-lg border px-3 py-1 font-bold ${
              isLight ? "border-sky-300 bg-sky-50 text-sky-900" : "border-line bg-ink-950 text-sky-300"
            }`}>
              {currentStep <= 3 && `إرسال: الطبقة ${activeLayerNumber} (${TCP_LAYERS.find((l) => l.number === activeLayerNumber)?.nameAr})`}
              {currentStep === 4 && "سريان البيانات داخل السلك (إشارات وبتات)"}
              {currentStep >= 5 && `استقبال: الطبقة ${activeLayerNumber} (${TCP_LAYERS.find((l) => l.number === activeLayerNumber)?.nameAr})`}
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
                          ? "bg-white text-sky-900 font-bold shadow-xs border border-sky-300"
                          : "bg-sky-500/20 text-sky-300 font-bold"
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
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-sky-500/40 bg-sky-500/20 text-sky-300"
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

        {/* Live PDU Inspector */}
        <PduVisualizer
          modelType="tcp"
          currentLayer={activeLayerNumber}
          direction={direction}
          scenario={scenario}
          theme={theme}
        />

        {/* The Two Stacks (Sender Computer vs Receiver Computer) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Sender Stack */}
          <div className={`flex flex-col rounded-2xl border p-4 sm:p-5 shadow-sm transition-colors ${
            isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/70"
          }`}>
            <div className={`mb-3 flex items-center justify-between border-b pb-3 ${
              isLight ? "border-slate-200" : "border-line"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                  isLight ? "border-sky-300 bg-sky-50 text-sky-700" : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                }`}>
                  <Monitor size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
                      جهاز المرسل (Sender)
                    </span>
                    <span className={`rounded px-1.5 py-0.2 text-[9.5px] border font-mono ${
                      isLight ? "bg-sky-50 text-sky-800 border-sky-200" : "bg-sky-950/60 text-sky-300 border border-sky-500/30"
                    }`}>
                      192.168.1.10
                    </span>
                  </div>
                  <p className={`text-[10.5px] ${isLight ? "text-slate-500" : "text-faint"}`}>
                    تغليف الحزمة من أعلى لأسفل (من 4 إلى 1)
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-1 text-[11px] font-mono font-bold ${
                isLight ? "text-sky-700" : "text-sky-400"
              }`}>
                <ArrowDown size={14} className={activeSide === "sender" && isPlaying ? "animate-bounce" : ""} />
                <span>Encapsulation</span>
              </div>
            </div>

            {/* 4 TCP Layers on Sender */}
            <div className="space-y-2.5">
              {TCP_LAYERS.map((layer) => {
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

          {/* Receiver Stack */}
          <div className={`flex flex-col rounded-2xl border p-4 sm:p-5 shadow-sm transition-colors ${
            isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/70"
          }`}>
            <div className={`mb-3 flex items-center justify-between border-b pb-3 ${
              isLight ? "border-slate-200" : "border-line"
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                  isLight ? "border-teal-300 bg-teal-50 text-teal-700" : "border-mint-500/40 bg-mint-500/10 text-mint-300"
                }`}>
                  <Server size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
                      جهاز المستقبل (Receiver)
                    </span>
                    <span className={`rounded px-1.5 py-0.2 text-[9.5px] border font-mono ${
                      isLight ? "bg-teal-50 text-teal-800 border-teal-200" : "bg-mint-950/60 text-mint-300 border border-mint-500/30"
                    }`}>
                      142.250.190.46
                    </span>
                  </div>
                  <p className={`text-[10.5px] ${isLight ? "text-slate-500" : "text-faint"}`}>
                    فك التغليف من أسفل لأعلى (من 1 إلى 4)
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-1 text-[11px] font-mono font-bold ${
                isLight ? "text-teal-700" : "text-mint-400"
              }`}>
                <ArrowUp size={14} className={activeSide === "receiver" && isPlaying ? "animate-bounce" : ""} />
                <span>Decapsulation</span>
              </div>
            </div>

            {/* 4 TCP Layers on Receiver */}
            <div className="space-y-2.5">
              {TCP_LAYERS.map((layer) => {
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
            <BookOpen size={16} className={isLight ? "text-sky-700" : "text-sky-300"} />
            نقاط ذهبية لطلاب الثانوي عن نموذج TCP/IP:
          </h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-3">
            <div className={`rounded-xl border p-3 ${
              isLight ? "border-pink-300 bg-pink-50 text-pink-950" : "border-pink-500/30 bg-pink-950/20"
            }`}>
              <span className={`text-[11px] font-bold ${isLight ? "text-pink-700" : "text-pink-300"}`}>1. طبقة التطبيقات</span>
              <p className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-dim"}`}>
                تدمج 3 طبقات من OSI لتسهيل العمل مباشرة مع برامجك مثل متصفح الويب (HTTP) والبريد.
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${
              isLight ? "border-sky-300 bg-sky-50 text-sky-950" : "border-sky-500/30 bg-sky-950/20"
            }`}>
              <span className={`text-[11px] font-bold ${isLight ? "text-sky-700" : "text-sky-300"}`}>2. طبقة النقل</span>
              <p className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-dim"}`}>
                مسؤولة عن بروتوكولين شهيرين: <strong>TCP</strong> الموثوق و <strong>UDP</strong> السريع للألعاب والفيديو.
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${
              isLight ? "border-teal-300 bg-teal-50 text-teal-950" : "border-mint-500/30 bg-mint-950/20"
            }`}>
              <span className={`text-[11px] font-bold ${isLight ? "text-teal-700" : "text-mint-300"}`}>3. طبقة الإنترنت</span>
              <p className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-dim"}`}>
                هي عصب الإنترنت، وتستخدم عناوين <strong>IP</strong> وتعمل بها أجهزة الراوتر لنقل الحزم حول العالم.
              </p>
            </div>
            <div className={`rounded-xl border p-3 ${
              isLight ? "border-violet-300 bg-violet-50 text-violet-950" : "border-violet-500/30 bg-violet-950/20"
            }`}>
              <span className={`text-[11px] font-bold ${isLight ? "text-violet-700" : "text-violet-300"}`}>4. النفاذ للشبكة</span>
              <p className={`text-[11px] mt-1 ${isLight ? "text-slate-600" : "text-dim"}`}>
                تجمع كروت الشبكة وعناوين MAC والأسلاك والواي فاي، وتحول البيانات لنبضات تسير فعلياً.
              </p>
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
          title="اختبر فهمك لنموذج TCP/IP (3 أسئلة)"
          questions={TCP_QUIZ}
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
              <BookOpen size={18} className={isLight ? "text-sky-700" : "text-sky-300"} />
              دليل مبسط: ما هو الفرق بين TCP/IP و OSI؟
            </h3>
            <p className={`text-[12.5px] leading-relaxed mb-3 ${isLight ? "text-slate-700" : "text-dim"}`}>
              في الامتحانات والمذاكرة لطلاب الثانوي، تذكر دائماً:
            </p>
            <ul className={`list-disc list-inside space-y-2 text-[12px] leading-relaxed ${isLight ? "text-slate-700" : "text-dim"}`}>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>نموذج OSI (7 طبقات):</strong> نموذج نظري تعليمي مرجعي لفهم كل خطوة بدقة.</li>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>نموذج TCP/IP (4 طبقات):</strong> هو النموذج العملي الحقيقي الذي صُمم به الإنترنت الفعلي ويستخدمه العالم كله.</li>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>وحدات البيانات (PDU):</strong> بيانات (Data) في التطبيقات، قطعة (Segment) في النقل، حزمة (Packet) في الإنترنت، وإطار (Frame) وبتات في النفاذ للشبكة.</li>
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className={`rounded-xl border px-4 py-1.5 text-[12px] font-semibold transition ${
                  isLight ? "border-sky-300 bg-sky-100 text-sky-900 hover:bg-sky-200" : "border-sky-500/40 bg-sky-500/20 text-sky-300"
                }`}
              >
                فهمت، شكراً!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
