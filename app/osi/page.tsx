"use client";

import { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  SkipBack,
  Sliders,
  Sparkles,
  Layers,
  HelpCircle,
  BookOpen,
  ArrowDown,
  ArrowUp,
  Monitor,
  Server,
  Zap,
} from "lucide-react";
import { ModelHeader } from "@/components/network-models/ModelHeader";
import { WireVisualizer } from "@/components/network-models/WireVisualizer";
import { PduVisualizer } from "@/components/network-models/PduVisualizer";
import { LayerCard } from "@/components/network-models/LayerCard";
import { LayerDetailModal } from "@/components/network-models/LayerDetailModal";
import { StudentQuiz } from "@/components/network-models/StudentQuiz";
import { ComparisonModal } from "@/components/network-models/ComparisonModal";
import { OSI_LAYERS, SCENARIOS, OSI_QUIZ } from "@/components/network-models/data";
import type { MediumKind, Scenario, LayerInfo } from "@/components/network-models/types";

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
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [medium, setMedium] = useState<MediumKind>("copper");
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);

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
      // Audio not permitted or supported
    }
  };

  // Continuous animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const baseDuration = currentStep === 7 ? 2200 : 1200; // Wire step takes slightly longer to see bits
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
    setCurrentStep(0);
  };

  return (
    <div className="app-bg flex min-h-screen flex-col text-mist">
      {/* Header with Navigation */}
      <ModelHeader
        currentModel="osi"
        onOpenGuide={() => setShowGuide(true)}
        onOpenQuiz={() => setShowQuiz(true)}
        onOpenComparison={() => setShowComparison(true)}
      />

      {/* Main Content Area */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-3 sm:p-5 lg:gap-6">
        {/* Banner / Title & Intro for Secondary Students */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ink-950/80 p-4 backdrop-blur-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 items-center gap-1 rounded-md bg-mint-500/20 px-2 text-[11px] font-bold text-mint-300">
                <Sparkles size={12} />
                محاكاة تفاعلية مستمرة
              </span>
              <h1 className="text-base font-bold text-mist sm:text-lg">
                نموذج OSI المرجعي (7 طبقات)
              </h1>
            </div>
            <p className="mt-1 text-[12px] text-faint max-w-2xl">
              شاهد كيف تتحول رسالتك من تطبيق الحاسوب خطوة بخطوة إلى بتات وإشارات كهربائية تسير في السلك، ثم يعاد تجميعها في جهاز المستقبل.
            </p>
          </div>

          {/* Scenario Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] text-faint hidden sm:inline">نوع الرسالة:</span>
            <div className="flex rounded-xl border border-line bg-ink-900/90 p-1 text-[11.5px]">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s)}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    scenario.id === s.id
                      ? "bg-mint-500/20 text-mint-300 border border-mint-500/30 font-medium"
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-ink-900/70 px-4 py-2.5 backdrop-blur-md">
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 rounded-xl border border-mint-500/40 bg-mint-500/20 px-3.5 py-1.5 text-[12px] font-semibold text-mint-300 transition hover:bg-mint-500/30"
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} fill="currentColor" />}
              <span>{isPlaying ? "إيقاف مؤقت" : "تشغيل مستمر"}</span>
            </button>

            <button
              onClick={handleStepPrev}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-ink-850 text-faint transition hover:bg-ink-800 hover:text-mist"
              title="الخطوة السابقة"
            >
              <SkipBack size={14} />
            </button>

            <button
              onClick={handleStepNext}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-ink-850 text-faint transition hover:bg-ink-800 hover:text-mist"
              title="الخطوة التالية"
            >
              <SkipForward size={14} />
            </button>

            <button
              onClick={handleReset}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-ink-850 text-faint transition hover:bg-ink-800 hover:text-mist"
              title="إعادة البدء من البداية"
            >
              <RotateCcw size={13} />
            </button>
          </div>

          {/* Current Step Status Badge */}
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-faint">المرحلة الحالية:</span>
            <span className="mono rounded-lg border border-line bg-ink-950 px-2.5 py-1 font-semibold text-mint-300">
              {currentStep <= 6 && `إرسال: الطبقة ${activeLayerNumber} (${OSI_LAYERS.find((l) => l.number === activeLayerNumber)?.nameAr})`}
              {currentStep === 7 && "سريان البيانات داخل السلك (الطبقة الفيزيائية)"}
              {currentStep >= 8 && `استقبال: الطبقة ${activeLayerNumber} (${OSI_LAYERS.find((l) => l.number === activeLayerNumber)?.nameAr})`}
            </span>
          </div>

          {/* Speed & Sound Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-faint">
              <span>السرعة:</span>
              <div className="flex rounded-lg border border-line bg-ink-950 p-0.5">
                {[0.5, 1, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`rounded px-2 py-0.5 text-[10.5px] transition ${
                      speed === s
                        ? "bg-mint-500/20 text-mint-300 font-bold"
                        : "text-dim hover:text-mist"
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`rounded-lg border px-2 py-1 text-[10.5px] transition ${
                soundEnabled
                  ? "border-mint-500/40 bg-mint-500/20 text-mint-300"
                  : "border-line bg-ink-950 text-faint hover:text-mist"
              }`}
            >
              {soundEnabled ? "الصوت 🔊" : "الصوت 🔇"}
            </button>
          </div>
        </div>

        {/* Live PDU Inspector (How data looks at this layer) */}
        <PduVisualizer
          modelType="osi"
          currentLayer={activeLayerNumber}
          direction={direction}
          scenario={scenario}
        />

        {/* The Two Stacks (Sender Computer vs Receiver Computer) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {/* Left Column: Sending Device (الحاسوب المرسل أ) */}
          <div className="flex flex-col rounded-2xl border border-line bg-ink-950/70 p-4 sm:p-5 shadow-lg">
            {/* Device Header */}
            <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-mint-500/40 bg-mint-500/10 text-mint-300">
                  <Monitor size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-mist">جهاز المرسل (Sender - الحاسوب أ)</span>
                    <span className="rounded bg-mint-950/60 px-1.5 py-0.2 text-[9.5px] text-mint-400 border border-mint-500/30">
                      IP: 192.168.1.5
                    </span>
                  </div>
                  <p className="text-[10.5px] text-faint">
                    تغليف البيانات من أعلى لأسفل (من الطبقة 7 إلى الطبقة 1)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-mint-400 font-mono">
                <ArrowDown size={14} className="animate-bounce" />
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
                    onClick={() => setSelectedLayer(layer)}
                  />
                );
              })}
            </div>
          </div>

          {/* Right Column: Receiving Device (الحاسوب المستقبل ب) */}
          <div className="flex flex-col rounded-2xl border border-line bg-ink-950/70 p-4 sm:p-5 shadow-lg">
            {/* Device Header */}
            <div className="mb-3 flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-300">
                  <Server size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-mist">جهاز المستقبل (Receiver - الخادم ب)</span>
                    <span className="rounded bg-sky-950/60 px-1.5 py-0.2 text-[9.5px] text-sky-300 border border-sky-500/30">
                      IP: 10.0.0.1
                    </span>
                  </div>
                  <p className="text-[10.5px] text-faint">
                    فك التغليف من أسفل لأعلى (من الطبقة 1 إلى الطبقة 7)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 text-[11px] text-sky-400 font-mono">
                <ArrowUp size={14} className={activeSide === "receiver" ? "animate-bounce" : ""} />
                <span>Decapsulation</span>
              </div>
            </div>

            {/* 7 OSI Layers on Receiver (7 down to 1 visual order, but processed bottom to top!) */}
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
        />

        {/* Educational Summary Section for High Schoolers */}
        <section className="rounded-2xl border border-line bg-ink-950/60 p-4 sm:p-5 text-[12.5px] leading-relaxed">
          <h2 className="text-sm font-bold text-mist flex items-center gap-2 mb-2">
            <BookOpen size={16} className="text-mint-400" />
            ملخص سريع لطلاب الثانوي لحفظ وحدات البيانات (PDU):
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 text-center">
            <div className="rounded-xl border border-pink-500/30 bg-pink-950/20 p-2.5">
              <span className="text-[11px] text-pink-300 font-bold">الطبقات 7، 6، 5</span>
              <div className="mono text-[13px] font-bold text-mist mt-0.5">بيانات (Data)</div>
              <span className="text-[10px] text-faint">الرسالة أو الملف المباشر</span>
            </div>
            <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-2.5">
              <span className="text-[11px] text-sky-300 font-bold">الطبقة 4 (النقل)</span>
              <div className="mono text-[13px] font-bold text-mist mt-0.5">قطعة (Segment)</div>
              <span className="text-[10px] text-faint">مع أرقام المنافذ TCP/UDP</span>
            </div>
            <div className="rounded-xl border border-mint-500/30 bg-mint-950/20 p-2.5">
              <span className="text-[11px] text-mint-300 font-bold">الطبقة 3 (الشبكة)</span>
              <div className="mono text-[13px] font-bold text-mist mt-0.5">حزمة (Packet)</div>
              <span className="text-[10px] text-faint">مع عناوين IP والراوتر</span>
            </div>
            <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-2.5">
              <span className="text-[11px] text-violet-300 font-bold">الطبقة 2 و 1</span>
              <div className="mono text-[13px] font-bold text-mist mt-0.5">إطار (Frame) وبتات</div>
              <span className="text-[10px] text-faint">عناوين MAC ونبضات السلك</span>
            </div>
          </div>
        </section>
      </main>

      {/* Layer Detail Modal */}
      <LayerDetailModal
        layer={selectedLayer}
        onClose={() => setSelectedLayer(null)}
      />

      {/* Student Quiz Modal */}
      {showQuiz && (
        <StudentQuiz
          title="اختبر فهمك لنموذج OSI (3 أسئلة)"
          questions={OSI_QUIZ}
          onClose={() => setShowQuiz(false)}
        />
      )}

      {/* Comparison Modal */}
      {showComparison && (
        <ComparisonModal onClose={() => setShowComparison(false)} />
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
          <div className="relative w-full max-w-lg rounded-2xl border border-line bg-ink-950 p-5 shadow-2xl">
            <h3 className="text-base font-bold text-mist flex items-center gap-2 mb-3">
              <BookOpen size={18} className="text-mint-400" />
              دليل الشرح السريع لطلاب الثانوي
            </h3>
            <p className="text-[12.5px] text-dim leading-relaxed mb-3">
              تخيل أنك تريد إرسال رسالة ورقية لصديق في دولة أخرى:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-[12px] text-dim leading-relaxed">
              <li><strong className="text-mist">التطبيقات (7):</strong> كتابة الرسالة على الورقة.</li>
              <li><strong className="text-mist">التقديم (6):</strong> ترجمة الرسالة للغة يفهمها وتشفيرها.</li>
              <li><strong className="text-mist">الجلسة (5):</strong> الاتصال للتأكد أنه مستعد للاستلام.</li>
              <li><strong className="text-mist">النقل (4):</strong> تقطيع الرسالة إلى مظاريف صغيرة وتحديد رقم الشقة (Port).</li>
              <li><strong className="text-mist">الشبكة (3):</strong> كتابة عنوان الدولة والمدينة والشارع (عنوان IP).</li>
              <li><strong className="text-mist">ربط البيانات (2):</strong> تسليمها لساعي البريد المحلي وفحص سلامة الختم (عنوان MAC).</li>
              <li><strong className="text-mist">الفيزيائية (1):</strong> شاحنة الشحن تسير على الطريق الإسفلتي (الأسلاك والكهرباء).</li>
            </ol>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="rounded-xl border border-mint-500/40 bg-mint-500/20 px-4 py-1.5 text-[12px] font-semibold text-mint-300"
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
