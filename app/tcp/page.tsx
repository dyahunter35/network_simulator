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
  Presentation,
  LayoutGrid,
} from "lucide-react";
import { ModelHeader } from "@/components/network-models/ModelHeader";
import { WireVisualizer } from "@/components/network-models/WireVisualizer";
import { PduVisualizer } from "@/components/network-models/PduVisualizer";
import { LayerCard } from "@/components/network-models/LayerCard";
import { TeacherBoard } from "@/components/network-models/TeacherBoard";
import { LayerDetailModal } from "@/components/network-models/LayerDetailModal";
import { StudentQuiz } from "@/components/network-models/StudentQuiz";
import { ComparisonModal } from "@/components/network-models/ComparisonModal";
import { TCP_LAYERS, SCENARIOS, TCP_QUIZ } from "@/components/network-models/data";
import type { MediumKind, Scenario, TcpLayerInfo, ThemeMode, ViewMode } from "@/components/network-models/types";

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
  // Starts PAUSED by default
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState<number>(0.75); // Calm default speed
  const [medium, setMedium] = useState<MediumKind>("copper");
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [viewMode, setViewMode] = useState<ViewMode>("presentation"); // Defaults to Teaching Mode

  // Load saved preferences
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("netlab_model_theme") as ThemeMode | null;
      if (savedTheme === "light" || savedTheme === "dark") {
        setTheme(savedTheme);
      }
      const savedMode = localStorage.getItem("netlab_model_view_mode") as ViewMode | null;
      if (savedMode === "presentation" || savedMode === "lab") {
        setViewMode(savedMode);
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
      } catch {}
      return next;
    });
  };

  const toggleViewMode = () => {
    setViewMode((curr) => {
      const next = curr === "presentation" ? "lab" : "presentation";
      try {
        localStorage.setItem("netlab_model_view_mode", next);
      } catch {}
      return next;
    });
  };

  const isLight = theme === "light";
  const isPresentation = viewMode === "presentation";

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

    const baseDuration = currentStep === 4 ? 4600 : 3200;
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

  const activeLayerData = TCP_LAYERS.find((l) => l.number === activeLayerNumber) || TCP_LAYERS[0];

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

  const handleSelectLayerDirect = (num: number) => {
    setIsPlaying(false);
    setCurrentStep(4 - num);
  };

  return (
    <div className={`min-h-screen w-full flex flex-col transition-colors duration-200 pb-16 overflow-x-hidden ${
      isLight ? "theme-light bg-slate-50 text-slate-900" : "app-bg bg-ink-950 text-mist"
    }`}>
      {/* Header with Navigation & Mode Toggles */}
      <ModelHeader
        currentModel="tcp"
        theme={theme}
        viewMode={viewMode}
        onToggleTheme={toggleTheme}
        onToggleViewMode={toggleViewMode}
        onOpenGuide={() => setShowGuide(true)}
        onOpenQuiz={() => setShowQuiz(true)}
        onOpenComparison={() => setShowComparison(true)}
      />

      {/* Main Content Area - Compacted Spacing */}
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-2.5 p-2 sm:p-3 sm:gap-3">
        {/* Compact Banner */}
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 shadow-xs transition-colors ${
          isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/80"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`flex h-6 items-center gap-1 rounded-md px-2 text-[10.5px] font-bold ${
              isLight ? "bg-sky-100 text-sky-800" : "bg-sky-500/20 text-sky-300"
            }`}>
              <Sparkles size={11} />
              {isPresentation ? "وضع الشرح الصفي للمعلم" : "وضع المعمل المزدوج"}
            </span>
            <h1 className={`text-sm sm:text-base font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
              نموذج TCP/IP المعياري (4 طبقات)
            </h1>
          </div>

          {/* Scenario & Mode Switch */}
          <div className="flex items-center gap-2">
            <div className={`flex rounded-lg border p-0.5 text-[11px] ${
              isLight ? "border-slate-200 bg-slate-100" : "border-line bg-ink-900"
            }`}>
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s)}
                  className={`rounded-md px-2 py-0.5 transition ${
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

            <button
              onClick={toggleViewMode}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                isLight ? "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200" : "border-line bg-ink-900 text-mist hover:bg-ink-850"
              }`}
              title="تبديل الترتيب بين وضع الشرح الصفي ووضع المعمل"
            >
              {isPresentation ? <LayoutGrid size={13} /> : <Presentation size={13} />}
              <span className="hidden sm:inline">{isPresentation ? "تحويل للمعمل 💻" : "تحويل للشرح 🎓"}</span>
            </button>
          </div>
        </div>

        {/* Compact Control Bar */}
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 shadow-xs transition-colors ${
          isLight ? "border-slate-200 bg-white" : "border-line bg-ink-900/70"
        }`}>
          {/* Playback Controls */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-bold transition shadow-xs ${
                isPlaying
                  ? isLight
                    ? "border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
                    : "border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
                  : isLight
                  ? "border-sky-400 bg-sky-600 text-white hover:bg-sky-700"
                  : "border-sky-500/50 bg-sky-500/30 text-sky-200 hover:bg-sky-500/40"
              }`}
            >
              {isPlaying ? <Pause size={13} /> : <Play size={13} fill="currentColor" />}
              <span>{isPlaying ? "إيقاف مؤقت ⏸" : "ابدأ المحاكاة ▶"}</span>
            </button>

            <button
              onClick={handleStepPrev}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                isLight ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200" : "border-line bg-ink-850 text-faint hover:bg-ink-800 hover:text-mist"
              }`}
              title="الخطوة السابقة"
            >
              <SkipBack size={13} />
              <span className="hidden sm:inline">السابق</span>
            </button>

            <button
              onClick={handleStepNext}
              className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition ${
                isLight ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200" : "border-line bg-ink-850 text-faint hover:bg-ink-800 hover:text-mist"
              }`}
              title="الخطوة التالية"
            >
              <SkipForward size={13} />
              <span className="hidden sm:inline">التالي</span>
            </button>

            <button
              onClick={handleReset}
              className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
                isLight ? "border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200" : "border-line bg-ink-850 text-faint hover:bg-ink-800 hover:text-mist"
              }`}
              title="إعادة البدء"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Current Step Status */}
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className={isLight ? "text-slate-500" : "text-faint"}>المرحلة:</span>
            <span className={`mono rounded-md border px-2 py-0.5 font-bold ${
              isLight ? "border-sky-300 bg-sky-50 text-sky-900" : "border-line bg-ink-950 text-sky-300"
            }`}>
              {currentStep <= 3 && `إرسال: الطبقة ${activeLayerNumber} (${activeLayerData.nameAr})`}
              {currentStep === 4 && "سريان البيانات داخل السلك (إشارات وبتات) ⚡"}
              {currentStep >= 5 && `استقبال: الطبقة ${activeLayerNumber} (${activeLayerData.nameAr})`}
            </span>
          </div>

          {/* Speed & Sound */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 text-[11px] ${isLight ? "text-slate-600" : "text-faint"}`}>
              <span>السرعة:</span>
              <div className={`flex rounded-md border p-0.5 ${isLight ? "border-slate-200 bg-slate-100" : "border-line bg-ink-950"}`}>
                {[
                  { val: 0.5, label: "0.5x" },
                  { val: 0.75, label: "0.75x" },
                  { val: 1, label: "1x" },
                ].map((s) => (
                  <button
                    key={s.val}
                    onClick={() => setSpeed(s.val)}
                    className={`rounded px-1.5 py-0.2 text-[10px] transition ${
                      speed === s.val
                        ? isLight
                          ? "bg-white text-sky-900 font-bold shadow-xs border border-sky-300"
                          : "bg-sky-500/20 text-sky-300 font-bold"
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
              className={`rounded-lg border px-1.5 py-1 text-[10px] transition ${
                soundEnabled
                  ? isLight
                    ? "border-sky-300 bg-sky-50 text-sky-800"
                    : "border-sky-500/40 bg-sky-500/20 text-sky-300"
                  : isLight
                  ? "border-slate-200 bg-slate-100 text-slate-500"
                  : "border-line bg-ink-950 text-faint hover:text-mist"
              }`}
              title="الصوت الرقمي"
            >
              {soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            </button>
          </div>
        </div>

        {/* ----------------- MODE 1: TEACHER PRESENTATION MODE (وضع الشرح الصفي) ----------------- */}
        {isPresentation ? (
          <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-12">
            {/* Right Side: The Rich Teacher's Board (سبورة الشرح المباشرة للمعلم والطلاب) */}
            <div className="lg:col-span-7 flex flex-col gap-2.5">
              <TeacherBoard
                layer={activeLayerData}
                direction={direction}
                activeSide={activeSide}
                theme={theme}
                allLayers={TCP_LAYERS}
                onSelectLayer={handleSelectLayerDirect}
              />

              {/* Wire Visualizer integrated right under the teacher board */}
              <WireVisualizer
                isTransmitting={direction === "wire"}
                medium={medium}
                onMediumChange={setMedium}
                speed={speed}
                theme={theme}
              />
            </div>

            {/* Left Side: Live Packet Anatomy (PDU) & Compact TCP Stack */}
            <div className="lg:col-span-5 flex flex-col gap-2.5">
              {/* Live PDU Block Inspector */}
              <PduVisualizer
                modelType="tcp"
                currentLayer={activeLayerNumber}
                direction={direction}
                scenario={scenario}
                theme={theme}
              />

              {/* Compact Journey Tracker */}
              <div className={`rounded-2xl border p-3 shadow-xs ${
                isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/80"
              }`}>
                <div className="flex items-center justify-between border-b pb-2 mb-2">
                  <div className="flex items-center gap-1.5 text-[11.5px] font-bold">
                    <Network size={14} className={isLight ? "text-sky-700" : "text-sky-300"} />
                    <span className={isLight ? "text-slate-900" : "text-mist"}>خريطة طبقات TCP/IP الأربع:</span>
                  </div>
                  <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-faint"}`}>
                    انقر على أي طبقة لشرحها
                  </span>
                </div>

                <div className="space-y-1.5">
                  {TCP_LAYERS.map((layer) => {
                    const isActive = !direction.includes("wire") && activeLayerNumber === layer.number;
                    const isPassed = activeSide === "sender" ? activeLayerNumber < layer.number : activeSide === "receiver" ? activeLayerNumber > layer.number : true;

                    return (
                      <div
                        key={layer.number}
                        onClick={() => handleSelectLayerDirect(layer.number)}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-2.5 py-1.5 text-[11.5px] transition-all ${
                          isActive
                            ? isLight
                              ? "border-sky-500 bg-sky-50 text-sky-900 font-bold ring-1 ring-sky-400"
                              : "border-sky-400 bg-sky-950/40 text-sky-200 font-bold shadow-xs scale-[1.01]"
                            : isPassed
                            ? isLight
                              ? "border-slate-200 bg-slate-50/80 text-slate-700 hover:bg-slate-100"
                              : "border-line/60 bg-ink-900/40 text-mist opacity-80"
                            : isLight
                            ? "border-slate-100 bg-white text-slate-400"
                            : "border-line/40 bg-ink-950/50 text-faint opacity-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="flex h-5 w-5 items-center justify-center rounded font-mono text-[10px] font-bold"
                            style={{
                              color: layer.color,
                              backgroundColor: isLight ? `${layer.color}15` : layer.bgLight,
                            }}
                          >
                            {layer.number}
                          </span>
                          <div>
                            <span className="font-semibold">{layer.nameAr}</span>
                            <span className={`block font-mono text-[9px] ${isLight ? "text-slate-500" : "text-faint"}`}>
                              {layer.osiLayersMapped}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className={`font-mono text-[10px] ${isLight ? "text-slate-500" : "text-faint"}`}>
                            {layer.pduNameAr}
                          </span>
                          {isActive && (
                            <span className="flex h-2 w-2 rounded-full bg-sky-400 animate-ping" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ----------------- MODE 2: FULL LAB DUAL TOWER MODE (وضع المعمل المزدوج) ----------------- */
          <div className="flex flex-col gap-2.5">
            {/* Live PDU Inspector */}
            <PduVisualizer
              modelType="tcp"
              currentLayer={activeLayerNumber}
              direction={direction}
              scenario={scenario}
              theme={theme}
            />

            {/* The Two Stacks (Sender Computer vs Receiver Computer) */}
            <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
              {/* Left Column: Sending Device (الحاسوب أ) */}
              <div className={`flex flex-col rounded-2xl border p-3 shadow-xs transition-colors ${
                isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/70"
              }`}>
                <div className={`mb-2 flex items-center justify-between border-b pb-2 ${
                  isLight ? "border-slate-200" : "border-line"
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                      isLight ? "border-sky-300 bg-sky-50 text-sky-700" : "border-sky-500/40 bg-sky-500/10 text-sky-300"
                    }`}>
                      <Monitor size={16} />
                    </div>
                    <div>
                      <span className={`text-[12.5px] font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
                        جهاز المرسل (Sender)
                      </span>
                      <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-faint"}`}>
                        تغليف الحزمة من أعلى لأسفل (4 إلى 1)
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1 text-[10.5px] font-mono font-bold ${
                    isLight ? "text-sky-700" : "text-sky-400"
                  }`}>
                    <ArrowDown size={13} className={activeSide === "sender" && isPlaying ? "animate-bounce" : ""} />
                    <span>Encapsulation</span>
                  </div>
                </div>

                {/* 4 TCP Layers on Sender */}
                <div className="space-y-2">
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

              {/* Right Column: Receiving Device (الخادم ب) */}
              <div className={`flex flex-col rounded-2xl border p-3 shadow-xs transition-colors ${
                isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/70"
              }`}>
                <div className={`mb-2 flex items-center justify-between border-b pb-2 ${
                  isLight ? "border-slate-200" : "border-line"
                }`}>
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                      isLight ? "border-teal-300 bg-teal-50 text-teal-700" : "border-mint-500/40 bg-mint-500/10 text-mint-300"
                    }`}>
                      <Server size={16} />
                    </div>
                    <div>
                      <span className={`text-[12.5px] font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
                        جهاز المستقبل (Receiver)
                      </span>
                      <p className={`text-[10px] ${isLight ? "text-slate-500" : "text-faint"}`}>
                        فك التغليف من أسفل لأعلى (1 إلى 4)
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1 text-[10.5px] font-mono font-bold ${
                    isLight ? "text-teal-700" : "text-mint-400"
                  }`}>
                    <ArrowUp size={13} className={activeSide === "receiver" && isPlaying ? "animate-bounce" : ""} />
                    <span>Decapsulation</span>
                  </div>
                </div>

                {/* 4 TCP Layers on Receiver */}
                <div className="space-y-2">
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
          </div>
        )}

        {/* Educational Summary Section for High Schoolers */}
        <section className={`rounded-xl border p-3 text-[12px] leading-relaxed transition-colors ${
          isLight ? "border-slate-200 bg-white" : "border-line bg-ink-950/60"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-[12.5px] font-bold flex items-center gap-1.5 ${isLight ? "text-slate-900" : "text-mist"}`}>
              <BookOpen size={14} className={isLight ? "text-sky-700" : "text-sky-300"} />
              نقاط ذهبية لطلاب الثانوي عن نموذج TCP/IP:
            </h3>
            <button
              onClick={() => setShowQuiz(true)}
              className={`rounded-md border px-2 py-0.5 text-[10.5px] font-semibold transition ${
                isLight ? "border-sky-300 bg-sky-50 text-sky-800" : "border-sky-500/40 bg-sky-500/10 text-sky-300"
              }`}
            >
              اختبر فهمك في دقيقة ✍️
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`rounded-lg border p-2.5 ${
              isLight ? "border-pink-200 bg-pink-50 text-pink-950" : "border-pink-500/30 bg-pink-950/20"
            }`}>
              <span className={`text-[10.5px] font-bold ${isLight ? "text-pink-700" : "text-pink-300"}`}>1. طبقة التطبيقات</span>
              <p className={`text-[10px] mt-0.5 ${isLight ? "text-slate-600" : "text-dim"}`}>
                تدمج 3 طبقات من OSI لتسهيل العمل مباشرة مع برامجك مثل متصفح الويب (HTTP) والبريد.
              </p>
            </div>
            <div className={`rounded-lg border p-2.5 ${
              isLight ? "border-sky-200 bg-sky-50 text-sky-950" : "border-sky-500/30 bg-sky-950/20"
            }`}>
              <span className={`text-[10.5px] font-bold ${isLight ? "text-sky-700" : "text-sky-300"}`}>2. طبقة النقل</span>
              <p className={`text-[10px] mt-0.5 ${isLight ? "text-slate-600" : "text-dim"}`}>
                مسؤولة عن بروتوكولين شهيرين: <strong>TCP</strong> الموثوق و <strong>UDP</strong> السريع للألعاب والفيديو.
              </p>
            </div>
            <div className={`rounded-lg border p-2.5 ${
              isLight ? "border-teal-200 bg-teal-50 text-teal-950" : "border-mint-500/30 bg-mint-950/20"
            }`}>
              <span className={`text-[10.5px] font-bold ${isLight ? "text-teal-700" : "text-mint-300"}`}>3. طبقة الإنترنت</span>
              <p className={`text-[10px] mt-0.5 ${isLight ? "text-slate-600" : "text-dim"}`}>
                هي عصب الإنترنت، وتستخدم عناوين <strong>IP</strong> وتعمل بها أجهزة الراوتر لنقل الحزم حول العالم.
              </p>
            </div>
            <div className={`rounded-lg border p-2.5 ${
              isLight ? "border-violet-200 bg-violet-50 text-violet-950" : "border-violet-500/30 bg-violet-950/20"
            }`}>
              <span className={`text-[10.5px] font-bold ${isLight ? "text-violet-700" : "text-violet-300"}`}>4. النفاذ للشبكة</span>
              <p className={`text-[10px] mt-0.5 ${isLight ? "text-slate-600" : "text-dim"}`}>
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
          <div className={`relative w-full max-w-lg rounded-2xl border p-4 shadow-2xl ${
            isLight ? "border-slate-200 bg-white text-slate-800" : "border-line bg-ink-950 text-mist"
          }`}>
            <h3 className={`text-base font-bold flex items-center gap-2 mb-2 ${isLight ? "text-slate-900" : "text-mist"}`}>
              <BookOpen size={16} className={isLight ? "text-sky-700" : "text-sky-300"} />
              دليل مبسط: ما هو الفرق بين TCP/IP و OSI؟
            </h3>
            <p className={`text-[12px] leading-relaxed mb-2.5 ${isLight ? "text-slate-700" : "text-dim"}`}>
              في الامتحانات والمذاكرة لطلاب الثانوي، تذكر دائماً:
            </p>
            <ul className={`list-disc list-inside space-y-1.5 text-[11.5px] leading-relaxed ${isLight ? "text-slate-700" : "text-dim"}`}>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>نموذج OSI (7 طبقات):</strong> نموذج نظري تعليمي مرجعي لفهم كل خطوة بدقة.</li>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>نموذج TCP/IP (4 طبقات):</strong> هو النموذج العملي الحقيقي الذي صُمم به الإنترنت الفعلي ويستخدمه العالم كله.</li>
              <li><strong className={isLight ? "text-slate-900" : "text-mist"}>وحدات البيانات (PDU):</strong> بيانات (Data) في التطبيقات، قطعة (Segment) في النقل، حزمة (Packet) في الإنترنت، وإطار (Frame) وبتات في النفاذ للشبكة.</li>
            </ul>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className={`rounded-xl border px-3.5 py-1.5 text-[11.5px] font-semibold transition ${
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
