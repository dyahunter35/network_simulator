"use client";

import { Sparkles, Shield, Tag, Box, Binary, ArrowDown, ArrowUp } from "lucide-react";
import type { Scenario } from "./types";

interface PduVisualizerProps {
  modelType: "osi" | "tcp";
  currentLayer: number; // 7 down to 1 (or 4 down to 1)
  direction: "down" | "wire" | "up" | "idle";
  scenario: Scenario;
  theme?: "dark" | "light";
}

export function PduVisualizer({
  modelType,
  currentLayer,
  direction,
  scenario,
  theme = "dark",
}: PduVisualizerProps) {
  const isLight = theme === "light";

  // Determine PDU details according to active layer and model
  let pduTitle = "بيانات (Data)";
  let pduSub = "البيانات الأصلية التي كتبها المستخدم";
  let pduColor = isLight ? "text-pink-700" : "text-pink-400";
  let pduBorder = isLight ? "border-pink-300" : "border-pink-500/40";
  let pduBg = isLight ? "bg-pink-50" : "bg-pink-500/10";

  if (direction === "wire") {
    pduTitle = "بتات كهربائية أو ضوئية (Bits 0 & 1)";
    pduSub = "شحنات كهربائية وضوئية تسير على السلك الفعلي";
    pduColor = isLight ? "text-amber-800" : "text-amber-300";
    pduBorder = isLight ? "border-amber-300" : "border-amber-500/50";
    pduBg = isLight ? "bg-amber-50" : "bg-amber-500/10";
  } else if (modelType === "osi") {
    if (currentLayer === 1) {
      pduTitle = "بتات (Bits: 0 و 1)";
      pduSub = "الطبقة الفيزيائية: تحويل الإطار إلى أصفار وواحدات";
      pduColor = isLight ? "text-slate-800" : "text-slate-300";
      pduBorder = isLight ? "border-slate-300" : "border-slate-500/40";
      pduBg = isLight ? "bg-slate-100" : "bg-slate-500/10";
    } else if (currentLayer === 2) {
      pduTitle = "إطار (Frame)";
      pduSub = "طبقة ربط البيانات: إضافة عنوان MAC وفحص الخطأ FCS";
      pduColor = isLight ? "text-violet-800" : "text-violet-300";
      pduBorder = isLight ? "border-violet-300" : "border-violet-500/40";
      pduBg = isLight ? "bg-violet-50" : "bg-violet-500/10";
    } else if (currentLayer === 3) {
      pduTitle = "حزمة (Packet)";
      pduSub = "طبقة الشبكة: إضافة عناوين IP للمرسل والوجهة";
      pduColor = isLight ? "text-teal-800" : "text-mint-300";
      pduBorder = isLight ? "border-teal-300" : "border-mint-500/40";
      pduBg = isLight ? "bg-teal-50" : "bg-mint-500/10";
    } else if (currentLayer === 4) {
      pduTitle = "قطعة (Segment)";
      pduSub = "طبقة النقل: تقسيم البيانات وإضافة أرقام المنافذ Ports";
      pduColor = isLight ? "text-sky-800" : "text-sky-300";
      pduBorder = isLight ? "border-sky-300" : "border-sky-500/40";
      pduBg = isLight ? "bg-sky-50" : "bg-sky-500/10";
    } else {
      pduTitle = "بيانات (Data)";
      pduSub = currentLayer === 7 ? "طبقة التطبيقات: البيانات المباشرة" : currentLayer === 6 ? "طبقة التقديم: تشفير وضغط" : "طبقة الجلسة: بدء الاتصال";
      pduColor = isLight ? "text-pink-800" : "text-pink-300";
      pduBorder = isLight ? "border-pink-300" : "border-pink-500/40";
      pduBg = isLight ? "bg-pink-50" : "bg-pink-500/10";
    }
  } else {
    // TCP/IP Model (4 layers)
    if (currentLayer === 1) {
      pduTitle = "إطار وبتات (Frame & Bits)";
      pduSub = "طبقة النفاذ للشبكة: عناوين MAC والإشارات في الكابل";
      pduColor = isLight ? "text-violet-800" : "text-violet-300";
      pduBorder = isLight ? "border-violet-300" : "border-violet-500/40";
      pduBg = isLight ? "bg-violet-50" : "bg-violet-500/10";
    } else if (currentLayer === 2) {
      pduTitle = "حزمة (Packet)";
      pduSub = "طبقة الإنترنت: عناوين IP وتوجيه الحزم";
      pduColor = isLight ? "text-teal-800" : "text-mint-300";
      pduBorder = isLight ? "border-teal-300" : "border-mint-500/40";
      pduBg = isLight ? "bg-teal-50" : "bg-mint-500/10";
    } else if (currentLayer === 3) {
      pduTitle = "قطعة (Segment)";
      pduSub = "طبقة النقل: TCP/UDP وأرقام المنافذ";
      pduColor = isLight ? "text-sky-800" : "text-sky-300";
      pduBorder = isLight ? "border-sky-300" : "border-sky-500/40";
      pduBg = isLight ? "bg-sky-50" : "bg-sky-500/10";
    } else {
      pduTitle = "بيانات (Data)";
      pduSub = "طبقة التطبيقات: الرسالة المباشرة من البرنامج";
      pduColor = isLight ? "text-pink-800" : "text-pink-300";
      pduBorder = isLight ? "border-pink-300" : "border-pink-500/40";
      pduBg = isLight ? "bg-pink-50" : "bg-pink-500/10";
    }
  }

  // Header inclusion state according to active layer
  const hasMac = direction === "wire" || (modelType === "osi" ? currentLayer <= 2 : currentLayer === 1);
  const hasIp = direction === "wire" || (modelType === "osi" ? currentLayer <= 3 : currentLayer <= 2);
  const hasTcp = direction === "wire" || (modelType === "osi" ? currentLayer <= 4 : currentLayer <= 3);

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 shadow-xl transition-colors ${
      isLight ? "border-slate-200 bg-white shadow-sm text-slate-800" : "border-line bg-ink-950/90 text-mist"
    }`}>
      {/* Header with active PDU indicator */}
      <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-3 ${
        isLight ? "border-slate-200" : "border-line/70"
      }`}>
        <div className="flex items-center gap-2">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
            isLight ? "border-slate-300 bg-slate-100 text-slate-700" : "border-line bg-ink-900 text-mist"
          }`}>
            <Box size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[13px] font-semibold ${isLight ? "text-slate-900" : "text-mist"}`}>
                شكل نوع البيانات (PDU) في هذه المرحلة
              </span>
              <span className={`flex items-center gap-1 text-[11px] ${isLight ? "text-slate-500" : "text-faint"}`}>
                {direction === "down" ? (
                  <span className={`flex items-center gap-1 font-medium ${isLight ? "text-teal-700" : "text-mint-400"}`}>
                    <ArrowDown size={13} />
                    تغليف البيانات (Encapsulation)
                  </span>
                ) : direction === "up" ? (
                  <span className={`flex items-center gap-1 font-medium ${isLight ? "text-sky-700" : "text-sky-400"}`}>
                    <ArrowUp size={13} />
                    فك التغليف (Decapsulation)
                  </span>
                ) : direction === "wire" ? (
                  <span className={`flex items-center gap-1 font-medium ${isLight ? "text-amber-800" : "text-amber-300"}`}>
                    <Sparkles size={13} />
                    عبور السلك الفيزيائي
                  </span>
                ) : (
                  <span>جاهز للإرسال</span>
                )}
              </span>
            </div>
            <p className={`text-[11px] ${isLight ? "text-slate-500" : "text-faint"}`}>{pduSub}</p>
          </div>
        </div>

        {/* PDU Type Badge */}
        <div className={`flex items-center gap-2 rounded-xl border ${pduBorder} ${pduBg} px-3 py-1.5 shadow-xs`}>
          <span className={`text-[10px] ${isLight ? "text-slate-500" : "text-faint"}`}>وحدة البيانات:</span>
          <span className={`text-[13px] font-bold ${pduColor}`}>{pduTitle}</span>
        </div>
      </div>

      {/* Visual Envelope / Packet Block Anatomy */}
      <div className="mt-4">
        <div className={`mb-2 text-[11.5px] font-medium ${isLight ? "text-slate-600" : "text-dim"}`}>
          كيف تبدو الحزمة الآن؟ (الألوان تبيّن كل رأس يُضاف عند الطبقة الخاصة به):
        </div>

        {direction === "wire" ? (
          /* Wire bit stream view */
          <div className={`flex flex-col items-center justify-center rounded-xl border p-4 ${
            isLight
              ? "border-amber-300 bg-amber-50/70"
              : "border-amber-500/40 bg-gradient-to-r from-amber-950/30 via-ink-900 to-amber-950/30"
          }`}>
            <div className={`flex items-center gap-2 text-[12px] font-bold mb-1.5 ${
              isLight ? "text-amber-900" : "text-amber-300"
            }`}>
              <Binary size={16} />
              <span>البيانات تتحول إلى سيل من البتات (Bits) داخل السلك:</span>
            </div>
            <div className={`mono break-all text-center text-[13px] font-semibold tracking-widest rounded-lg px-4 py-2 border shadow-inner ${
              isLight
                ? "border-amber-300 bg-white text-teal-800"
                : "border-line bg-ink-950/90 text-mint-300"
            }`} dir="ltr">
              {scenario.bytesPreview} 01100010 01101111 01110011 00100001
            </div>
            <span className={`mt-2 text-[10.5px] ${isLight ? "text-slate-500" : "text-faint"}`}>
              كل حرف وصورة وعنوان يتحول في النهاية إلى أصفار وواحدات
            </span>
          </div>
        ) : (
          /* Segmented Packet Blocks */
          <div className={`flex flex-wrap items-stretch justify-center gap-1.5 rounded-xl border p-3 sm:p-4 text-center ${
            isLight ? "border-slate-200 bg-slate-50" : "border-line-soft bg-ink-900/50"
          }`}>
            {/* L2 Header: MAC (Violet) */}
            {hasMac && (
              <div className={`flex flex-col justify-center rounded-lg border px-3 py-2 shadow transition-all animate-fadeIn ${
                isLight
                  ? "border-violet-300 bg-violet-100/90 text-violet-900"
                  : "border-violet-500/50 bg-violet-950/40 text-violet-200"
              }`}>
                <span className={`mono text-[9px] uppercase tracking-wider font-bold ${
                  isLight ? "text-violet-700" : "text-violet-400"
                }`}>
                  L2 · MAC Header
                </span>
                <span className="text-[11px] font-bold">رأس الماك MAC</span>
                <span className={`mono text-[9.5px] ${isLight ? "text-violet-800 font-semibold" : "text-violet-300/80"}`}>
                  AA:BB:CC → 11:22:33
                </span>
              </div>
            )}

            {/* L3 Header: IP (Mint) */}
            {hasIp && (
              <div className={`flex flex-col justify-center rounded-lg border px-3 py-2 shadow transition-all animate-fadeIn ${
                isLight
                  ? "border-teal-300 bg-teal-100/90 text-teal-900"
                  : "border-mint-500/50 bg-mint-950/40 text-mint-200"
              }`}>
                <span className={`mono text-[9px] uppercase tracking-wider font-bold ${
                  isLight ? "text-teal-700" : "text-mint-400"
                }`}>
                  L3 · IP Header
                </span>
                <span className="text-[11px] font-bold">رأس الإنترنت IP</span>
                <span className={`mono text-[9.5px] ${isLight ? "text-teal-800 font-semibold" : "text-mint-300/80"}`}>
                  192.168.1.5 → 10.0.0.1
                </span>
              </div>
            )}

            {/* L4 Header: TCP / UDP (Sky) */}
            {hasTcp && (
              <div className={`flex flex-col justify-center rounded-lg border px-3 py-2 shadow transition-all animate-fadeIn ${
                isLight
                  ? "border-sky-300 bg-sky-100/90 text-sky-900"
                  : "border-sky-500/50 bg-sky-950/40 text-sky-200"
              }`}>
                <span className={`mono text-[9px] uppercase tracking-wider font-bold ${
                  isLight ? "text-sky-700" : "text-sky-400"
                }`}>
                  L4 · TCP Header
                </span>
                <span className="text-[11px] font-bold">رأس النقل (المنفذ)</span>
                <span className={`mono text-[9.5px] ${isLight ? "text-sky-800 font-semibold" : "text-sky-300/80"}`}>
                  Port: 54321 → 80
                </span>
              </div>
            )}

            {/* Application Data (Pink) - Always present */}
            <div className={`flex flex-1 min-w-[200px] flex-col justify-center rounded-lg border px-4 py-2 shadow ${
              isLight
                ? "border-pink-300 bg-pink-100/90 text-pink-950"
                : "border-pink-500/50 bg-pink-950/40 text-pink-200"
            }`}>
              <span className={`mono text-[9px] uppercase tracking-wider font-bold ${
                isLight ? "text-pink-700" : "text-pink-400"
              }`}>
                Payload · محتوى الرسالة
              </span>
              <span className={`text-[12px] font-bold ${isLight ? "text-slate-900" : "text-mist"}`}>
                {scenario.payloadText}
              </span>
              <span className={`text-[9.5px] ${isLight ? "text-pink-800 font-medium" : "text-pink-300/70"}`}>
                من برنامج: {scenario.sourceApp}
              </span>
            </div>

            {/* L2 Trailer: CRC / FCS (Gray) */}
            {hasMac && (
              <div className={`flex flex-col justify-center rounded-lg border px-2.5 py-2 shadow transition-all animate-fadeIn ${
                isLight
                  ? "border-slate-300 bg-slate-200 text-slate-800"
                  : "border-slate-600/50 bg-slate-900/50 text-slate-300"
              }`}>
                <span className={`mono text-[9px] uppercase tracking-wider font-bold ${
                  isLight ? "text-slate-600" : "text-slate-400"
                }`}>
                  FCS / CRC
                </span>
                <span className="text-[10px] font-bold">فحص الأخطاء</span>
                <span className={`mono text-[9px] ${isLight ? "text-slate-700 font-bold" : "text-slate-400"}`}>
                  0x4F8A
                </span>
              </div>
            )}
          </div>
        )}

        {/* Real-world analogy helper for high schoolers */}
        <div className={`mt-3 flex items-center justify-between rounded-xl border px-3 py-2 text-[11px] ${
          isLight ? "border-slate-200 bg-slate-50 text-slate-700" : "border-line-soft bg-ink-900/30 text-dim"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`rounded-full p-1 ${
              isLight ? "bg-teal-100 text-teal-700" : "bg-mint-500/20 text-mint-400"
            }`}>
              <Sparkles size={12} />
            </span>
            <span>
              <strong className={`font-semibold ${isLight ? "text-slate-900" : "text-mist"}`}>تشبيه ساعي البريد:</strong>{" "}
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
