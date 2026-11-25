"use client";

import { Sparkles, Shield, Tag, Box, Binary, ArrowDown, ArrowUp } from "lucide-react";
import type { Scenario } from "./types";

interface PduVisualizerProps {
  modelType: "osi" | "tcp";
  currentLayer: number; // 7 down to 1 (or 4 down to 1)
  direction: "down" | "wire" | "up" | "idle";
  scenario: Scenario;
}

export function PduVisualizer({
  modelType,
  currentLayer,
  direction,
  scenario,
}: PduVisualizerProps) {
  // Determine PDU details according to active layer and model
  let pduTitle = "بيانات (Data)";
  let pduSub = "البيانات الأصلية التي كتبها المستخدم";
  let pduColor = "text-pink-400";
  let pduBorder = "border-pink-500/40";
  let pduBg = "bg-pink-500/10";

  if (direction === "wire") {
    pduTitle = "بتات كهربائية أو ضوئية (Bits 0 & 1)";
    pduSub = "شحنات كهربائية وضوئية تسير على السلك الفعلي";
    pduColor = "text-amber-300";
    pduBorder = "border-amber-500/50";
    pduBg = "bg-amber-500/10";
  } else if (modelType === "osi") {
    if (currentLayer === 1) {
      pduTitle = "بتات (Bits: 0 و 1)";
      pduSub = "الطبقة الفيزيائية: تحويل الإطار إلى أصفار وواحدات";
      pduColor = "text-slate-300";
      pduBorder = "border-slate-500/40";
      pduBg = "bg-slate-500/10";
    } else if (currentLayer === 2) {
      pduTitle = "إطار (Frame)";
      pduSub = "طبقة ربط البيانات: إضافة عنوان MAC وفحص الخطأ FCS";
      pduColor = "text-violet-300";
      pduBorder = "border-violet-500/40";
      pduBg = "bg-violet-500/10";
    } else if (currentLayer === 3) {
      pduTitle = "حزمة (Packet)";
      pduSub = "طبقة الشبكة: إضافة عناوين IP للمرسل والوجهة";
      pduColor = "text-mint-300";
      pduBorder = "border-mint-500/40";
      pduBg = "bg-mint-500/10";
    } else if (currentLayer === 4) {
      pduTitle = "قطعة (Segment)";
      pduSub = "طبقة النقل: تقسيم البيانات وإضافة أرقام المنافذ Ports";
      pduColor = "text-sky-300";
      pduBorder = "border-sky-500/40";
      pduBg = "bg-sky-500/10";
    } else {
      pduTitle = "بيانات (Data)";
      pduSub = currentLayer === 7 ? "طبقة التطبيقات: البيانات المباشرة" : currentLayer === 6 ? "طبقة التقديم: تشفير وضغط" : "طبقة الجلسة: بدء الاتصال";
      pduColor = "text-pink-300";
      pduBorder = "border-pink-500/40";
      pduBg = "bg-pink-500/10";
    }
  } else {
    // TCP/IP Model (4 layers)
    if (currentLayer === 1) {
      pduTitle = "إطار وبتات (Frame & Bits)";
      pduSub = "طبقة النفاذ للشبكة: عناوين MAC والإشارات في الكابل";
      pduColor = "text-violet-300";
      pduBorder = "border-violet-500/40";
      pduBg = "bg-violet-500/10";
    } else if (currentLayer === 2) {
      pduTitle = "حزمة (Packet)";
      pduSub = "طبقة الإنترنت: عناوين IP وتوجيه الحزم";
      pduColor = "text-mint-300";
      pduBorder = "border-mint-500/40";
      pduBg = "bg-mint-500/10";
    } else if (currentLayer === 3) {
      pduTitle = "قطعة (Segment)";
      pduSub = "طبقة النقل: TCP/UDP وأرقام المنافذ";
      pduColor = "text-sky-300";
      pduBorder = "border-sky-500/40";
      pduBg = "bg-sky-500/10";
    } else {
      pduTitle = "بيانات (Data)";
      pduSub = "طبقة التطبيقات: الرسالة المباشرة من البرنامج";
      pduColor = "text-pink-300";
      pduBorder = "border-pink-500/40";
      pduBg = "bg-pink-500/10";
    }
  }

  // Header inclusion state according to active layer
  const hasMac = direction === "wire" || (modelType === "osi" ? currentLayer <= 2 : currentLayer === 1);
  const hasIp = direction === "wire" || (modelType === "osi" ? currentLayer <= 3 : currentLayer <= 2);
  const hasTcp = direction === "wire" || (modelType === "osi" ? currentLayer <= 4 : currentLayer <= 3);

  return (
    <div className="rounded-2xl border border-line bg-ink-950/90 p-4 sm:p-5 shadow-xl">
      {/* Header with active PDU indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-ink-900 text-mist">
            <Box size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-mist">
                شكل نوع البيانات (PDU) في هذه المرحلة
              </span>
              <span className="flex items-center gap-1 text-[11px] text-faint">
                {direction === "down" ? (
                  <span className="flex items-center gap-1 text-mint-400 font-medium">
                    <ArrowDown size={13} />
                    تغليف البيانات (Encapsulation)
                  </span>
                ) : direction === "up" ? (
                  <span className="flex items-center gap-1 text-sky-400 font-medium">
                    <ArrowUp size={13} />
                    فك التغليف (Decapsulation)
                  </span>
                ) : direction === "wire" ? (
                  <span className="flex items-center gap-1 text-amber-300 font-medium">
                    <Sparkles size={13} />
                    عبور السلك الفيزيائي
                  </span>
                ) : (
                  <span>جاهز للإرسال</span>
                )}
              </span>
            </div>
            <p className="text-[11px] text-faint">{pduSub}</p>
          </div>
        </div>

        {/* PDU Type Badge */}
        <div className={`flex items-center gap-2 rounded-xl border ${pduBorder} ${pduBg} px-3 py-1.5`}>
          <span className="text-[10px] text-faint">وحدة البيانات:</span>
          <span className={`text-[13px] font-bold ${pduColor}`}>{pduTitle}</span>
        </div>
      </div>

      {/* Visual Envelope / Packet Block Anatomy */}
      <div className="mt-4">
        <div className="mb-2 text-[11.5px] font-medium text-dim">
          كيف تبدو الحزمة الآن؟ (الألوان تبيّن كل رأس يُضاف عند الطبقة الخاصة به):
        </div>

        {direction === "wire" ? (
          /* Wire bit stream view */
          <div className="flex flex-col items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-ink-900 to-amber-950/30 p-4">
            <div className="flex items-center gap-2 text-amber-300 text-[12px] font-bold mb-1.5">
              <Binary size={16} />
              <span>البيانات تتحول إلى سيل من البتات (Bits) داخل السلك:</span>
            </div>
            <div className="mono break-all text-center text-[13px] font-semibold tracking-widest text-mint-300 bg-ink-950/90 border border-line rounded-lg px-4 py-2 shadow-inner" dir="ltr">
              {scenario.bytesPreview} 01100010 01101111 01110011 00100001
            </div>
            <span className="mt-2 text-[10.5px] text-faint">
              كل حرف وصورة وعنوان يتحول في النهاية إلى أصفار وواحدات
            </span>
          </div>
        ) : (
          /* Segmented Packet Blocks */
          <div className="flex flex-wrap items-stretch justify-center gap-1.5 rounded-xl border border-line-soft bg-ink-900/50 p-3 sm:p-4 text-center">
            {/* L2 Header: MAC (Violet) */}
            {hasMac && (
              <div className="flex flex-col justify-center rounded-lg border border-violet-500/50 bg-violet-950/40 px-3 py-2 text-violet-200 shadow transition-all animate-fadeIn">
                <span className="mono text-[9px] uppercase tracking-wider text-violet-400 font-bold">
                  L2 · MAC Header
                </span>
                <span className="text-[11px] font-bold">رأس الماك MAC</span>
                <span className="mono text-[9.5px] text-violet-300/80">AA:BB:CC → 11:22:33</span>
              </div>
            )}

            {/* L3 Header: IP (Mint) */}
            {hasIp && (
              <div className="flex flex-col justify-center rounded-lg border border-mint-500/50 bg-mint-950/40 px-3 py-2 text-mint-200 shadow transition-all animate-fadeIn">
                <span className="mono text-[9px] uppercase tracking-wider text-mint-400 font-bold">
                  L3 · IP Header
                </span>
                <span className="text-[11px] font-bold">رأس الإنترنت IP</span>
                <span className="mono text-[9.5px] text-mint-300/80">192.168.1.5 → 10.0.0.1</span>
              </div>
            )}

            {/* L4 Header: TCP / UDP (Sky) */}
            {hasTcp && (
              <div className="flex flex-col justify-center rounded-lg border border-sky-500/50 bg-sky-950/40 px-3 py-2 text-sky-200 shadow transition-all animate-fadeIn">
                <span className="mono text-[9px] uppercase tracking-wider text-sky-400 font-bold">
                  L4 · TCP Header
                </span>
                <span className="text-[11px] font-bold">رأس النقل (المنفذ)</span>
                <span className="mono text-[9.5px] text-sky-300/80">Port: 54321 → 80</span>
              </div>
            )}

            {/* Application Data (Pink) - Always present */}
            <div className="flex flex-1 min-w-[200px] flex-col justify-center rounded-lg border border-pink-500/50 bg-pink-950/40 px-4 py-2 text-pink-200 shadow">
              <span className="mono text-[9px] uppercase tracking-wider text-pink-400 font-bold">
                Payload · محتوى الرسالة
              </span>
              <span className="text-[12px] font-bold text-mist">
                {scenario.payloadText}
              </span>
              <span className="text-[9.5px] text-pink-300/70">
                من برنامج: {scenario.sourceApp}
              </span>
            </div>

            {/* L2 Trailer: CRC / FCS (Gray) */}
            {hasMac && (
              <div className="flex flex-col justify-center rounded-lg border border-slate-600/50 bg-slate-900/50 px-2.5 py-2 text-slate-300 shadow transition-all animate-fadeIn">
                <span className="mono text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                  FCS / CRC
                </span>
                <span className="text-[10px] font-bold">فحص الأخطاء</span>
                <span className="mono text-[9px] text-slate-400">0x4F8A</span>
              </div>
            )}
          </div>
        )}

        {/* Real-world analogy helper for high schoolers */}
        <div className="mt-3 flex items-center justify-between rounded-xl border border-line-soft bg-ink-900/30 px-3 py-2 text-[11px] text-dim">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-mint-500/20 p-1 text-mint-400">
              <Sparkles size={12} />
            </span>
            <span>
              <strong className="text-mist font-semibold">تشبيه ساعي البريد:</strong>{" "}
              {direction === "down"
                ? "مثل وضع الرسالة داخل مظروف، ثم لصق عنوان المنزل، ثم وضعها في شاحنة الشحن."
                : direction === "up"
                ? "المستقبل يفتح المظروف الخارجي أولاً، ثم يفحص العنوان، ثم يقرأ الرسالة المكتوبة."
                : "الشاحنة تسير على الطريق الإسفلتي للوصول إلى وجهتها."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
