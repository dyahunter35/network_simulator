"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calculator,
  Check,
  CircleHelp,
  Command,
  Cpu,
  FlaskConical,
  Lightbulb,
  ListChecks,
  MousePointer2,
  Network,
  Play,
  Rocket,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  Waypoints,
  X,
} from "lucide-react";
import { DeviceGlyph, PrefixSelect } from "@/components/common";
import {
  binaryIp,
  broadcastOf,
  firstUsableOf,
  ipToInt,
  isPrivateIp,
  isValidIp,
  lastUsableOf,
  networkOf,
  prefixToMask,
  usableHosts,
} from "@/lib/ip";
import { getLab } from "@/lib/labs";
import { cn } from "@/lib/format";
import { useLabChecks, useLabProgress } from "@/lib/useLab";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";

export const WELCOME_KEY = "netlab-welcome-seen-v1";

export function DialogHost() {
  const modal = useUIStore((s) => s.modal);
  const closeModal = useUIStore((s) => s.closeModal);

  useEffect(() => {
    if (!modal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, closeModal]);

  if (!modal) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-3 backdrop-blur-[3px] sm:p-6"
      dir="rtl"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal();
      }}
    >
      {modal.kind === "welcome" && <WelcomeDialog />}
      {modal.kind === "guide" && <GuideDialog />}
      {modal.kind === "subnet" && <SubnetDialog />}
      {modal.kind === "reference" && <ReferenceDialog tab={modal.tab} />}
      {modal.kind === "lab" && <LabDialog labId={modal.labId} />}
      {modal.kind === "shortcuts" && <ShortcutsDialog />}
      {modal.kind === "reset" && <ResetDialog />}
    </div>
  );
}

function ModalShell({
  icon,
  eyebrow,
  title,
  subtitle,
  width = "max-w-[640px]",
  footer,
  children,
}: {
  icon?: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  width?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const closeModal = useUIStore((s) => s.closeModal);
  return (
    <div
      className={cn("panel animate-modal flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl", width)}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <header className="flex shrink-0 items-start gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        {icon && (
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-mint-400/25 bg-mint-400/10 text-mint-300">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
          <h2 className="text-[14px] font-semibold leading-snug text-mist">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[10.5px] leading-relaxed text-faint">{subtitle}</p>}
        </div>
        <button className="icon-btn -me-1 -mt-1" onClick={closeModal} aria-label="إغلاق">
          <X size={16} />
        </button>
      </header>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && (
        <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-ink-950/40 px-4 py-3">
          {footer}
        </footer>
      )}
    </div>
  );
}

/* -------------------------------- welcome --------------------------------- */

function WelcomeDialog() {
  const closeModal = useUIStore((s) => s.closeModal);
  const setLeftOpen = useUIStore((s) => s.setLeftOpen);
  const setBottomTab = useUIStore((s) => s.setBottomTab);
  const loadLab = useLabStore((s) => s.loadLab);
  const toast = useUIStore((s) => s.toast);

  const finish = (openLabs: boolean) => {
    localStorage.setItem(WELCOME_KEY, "1");
    closeModal();
    if (openLabs) setLeftOpen(true);
  };

  return (
    <ModalShell
      width="max-w-[700px]"
      eyebrow="NETLAB · معمل الشبكات التفاعلي"
      title="مرحبًا بك في مختبرك الشبكي"
      subtitle="بيئة محاكاة كاملة داخل المتصفح — ابنِ الشبكة، اضبط الأجهزة، وشاهد الحزم تنتقل طبقة بطبقة."
      icon={<Waypoints size={17} />}
      footer={
        <>
          <button className="btn" onClick={() => finish(true)}>
            <BookOpen size={13} />
            تصفح المعامل
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              localStorage.setItem(WELCOME_KEY, "1");
              loadLab("sandbox");
              closeModal();
              setBottomTab("terminal");
              toast("تم تجهيز معمل Sandbox", "اختر جهازًا ثم استخدم الطرفية لتنفيذ أول ping.", "success");
            }}
          >
            <Rocket size={13} />
            ابدأ الآن
          </button>
        </>
      }
    >
      <div className="p-4 sm:p-5">
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              icon: <Cpu size={15} />,
              title: "طوبولوجيا تفاعلية",
              body: "أضف أجهزة، اسحبها، وصّل الواجهات، وتكبّر بحرية.",
            },
            {
              icon: <TerminalSquare size={15} />,
              title: "طرفية أوامر حقيقية",
              body: "ping وtracert وipconfig وdhcp وnslookup وcurl.",
            },
            {
              icon: <Network size={15} />,
              title: "محاكاة بروتوكولات",
              body: "ARP وDHCP وDNS وVLAN وNAT وجدار الحماية.",
            },
            {
              icon: <FlaskConical size={15} />,
              title: "٩ معامل موجّهة",
              body: "أهداف واضحة، تلميحات، وفحص اتصال تلقائي.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="flex items-start gap-2.5 rounded-xl border border-line-soft bg-ink-900/45 p-3"
            >
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-ink-950/60 text-mint-300/90">
                {item.icon}
              </div>
              <div>
                <div className="text-[11.5px] font-medium text-mist">{item.title}</div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-faint">{item.body}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-mint-400/20 bg-mint-400/[0.045] px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-mint-200">
            <Sparkles size={11} />
            أول ثلاث خطوات
          </div>
          <ol className="space-y-1 text-[10px] leading-relaxed text-dim">
            <li>1. اختر جهازًا على اللوحة لعرض إعداداته في اللوحة اليمنى.</li>
            <li>2. من الطرفية السفلية نفّذ <span className="code-inline">ipconfig</span> ثم <span className="code-inline">ping 192.168.10.50</span>.</li>
            <li>3. اضغط «فحص المعمل» لمتابعة أهداف المعمل واكتشاف الأخطاء.</li>
          </ol>
        </div>
      </div>
    </ModalShell>
  );
}

/* ---------------------------------- guide --------------------------------- */

function GuideDialog() {
  const closeModal = useUIStore((s) => s.closeModal);
  const { lab, results, done, total } = useLabProgress();
  const { running, run } = useLabChecks();
  const [hint, setHint] = useState(0);

  return (
    <ModalShell
      width="max-w-[760px]"
      eyebrow={`LAB / ${lab.id.toUpperCase()} · ${lab.minutes} دقيقة · ${["", "مبتدئ", "متوسط", "متقدم"][lab.difficulty]}`}
      title={lab.title}
      subtitle={lab.subtitle}
      icon={<DeviceGlyph kind={lab.icon} size={17} />}
      footer={
        <>
          <button className="btn" onClick={closeModal}>
            إغلاق
          </button>
          <button className="btn btn-primary" onClick={run} disabled={running}>
            <Play size={12} fill="currentColor" />
            {running ? "جارٍ فحص الاتصال…" : "فحص الاتصال"}
          </button>
        </>
      }
    >
      <div className="space-y-4 p-4 sm:p-5">
        <p className="text-[11px] leading-relaxed text-dim">{lab.description}</p>

        <div className="flex flex-wrap gap-1.5">
          {lab.tags.map((tag) => (
            <span key={tag} className="chip h-5 text-[9px]">
              {tag}
            </span>
          ))}
          <span className="chip h-5 text-[9px] text-mint-300">
            {done}/{total} مكتمل
          </span>
        </div>

        <section>
          <div className="mb-2 flex items-center gap-1.5">
            <ListChecks size={12} className="text-mint-300" />
            <span className="section-label">الأهداف</span>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {lab.objectives.map((objective, index) => {
              const complete = results[index]?.done;
              return (
                <div
                  key={objective.id}
                  className="flex items-start gap-2 rounded-lg border border-line-soft bg-ink-900/40 px-2.5 py-2"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                      complete
                        ? "border-mint-400/60 bg-mint-400/15 text-mint-300"
                        : "border-line text-transparent"
                    )}
                  >
                    <Check size={9} strokeWidth={3} />
                  </span>
                  <span className={cn("text-[10.5px] leading-relaxed", complete ? "text-mint-200" : "text-dim")}>
                    {objective.text}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center gap-1.5">
            <MousePointer2 size={12} className="text-sky-300" />
            <span className="section-label">خطوات العمل</span>
          </div>
          <ol className="space-y-1.5">
            {lab.steps.map((step, index) => (
              <li key={step.title} className="flex gap-2.5 rounded-lg border border-line-soft bg-ink-900/35 px-2.5 py-2">
                <span className="mono mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-line bg-ink-950/70 text-[9px] text-mint-300">
                  {index + 1}
                </span>
                <div>
                  <div className="text-[10.5px] font-medium text-mist">{step.title}</div>
                  <div className="mt-0.5 text-[10px] leading-relaxed text-faint">{step.body}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Lightbulb size={12} className="text-amber-300" />
              <span className="section-label">تلميح</span>
            </div>
            <button className="btn h-6 px-2 text-[9px]" onClick={() => setHint((h) => h + 1)}>
              تلميح آخر
            </button>
          </div>
          <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.05] px-2.5 py-2 text-[10px] leading-relaxed text-amber-200/90">
            <span className="mono me-1 text-[8px] text-amber-400">
              HINT {(hint % Math.max(1, lab.hints.length)) + 1}
            </span>
            {lab.hints[hint % Math.max(1, lab.hints.length)]}
          </div>
        </section>

        {lab.checks.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-violet-300" />
              <span className="section-label">اختبارات الاتصال</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {lab.checks.map((check) => (
                <span key={check.label} className="chip h-5 text-[9px]">
                  {check.from} → {check.label}
                  <span className="text-faint"> · {check.expect === "fail" ? "يفشل" : check.expect === "http" ? "HTTP" : "ping"}</span>
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </ModalShell>
  );
}

/* --------------------------------- subnet --------------------------------- */

function SubnetDialog() {
  const [ip, setIp] = useState("192.168.10.42");
  const [prefix, setPrefix] = useState(24);

  const valid = isValidIp(ip);
  const network = valid ? networkOf(ip, prefix) : "—";
  const broadcast = valid ? broadcastOf(ip, prefix) : "—";
  const first = valid ? firstUsableOf(ip, prefix) : "—";
  const last = valid ? lastUsableOf(ip, prefix) : "—";
  const hosts = usableHosts(prefix);
  const mask = prefixToMask(prefix);
  const cls = valid ? ipClass(Number(ip.split(".")[0])) : "—";
  const bits = valid ? ipToInt(ip).toString(2).padStart(32, "0") : "";

  return (
    <ModalShell
      eyebrow="TOOL · SUBNET CALCULATOR"
      title="حاسبة الشبكات الفرعية"
      subtitle="أدخل عنوان IP وطول البادئة لحساب الشبكة والنطاق والعنوان الثنائي."
      icon={<Calculator size={17} />}
      width="max-w-[640px]"
    >
      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div>
            <label className="section-label mb-1.5 block">عنوان IPv4</label>
            <input
              dir="ltr"
              value={ip}
              onChange={(event) => setIp(event.target.value.trim())}
              spellCheck={false}
              className={cn("field mono h-10 text-[13px]", !valid && "field-error")}
              placeholder="192.168.1.10"
            />
            {!valid && <div className="mt-1 text-[9.5px] text-rose-300">أدخل عنوان IPv4 صحيحًا (0–255 لكل جزء).</div>}
          </div>
          <div>
            <label className="section-label mb-1.5 block">البادئة</label>
            <PrefixSelect value={prefix} onChange={setPrefix} className="h-10 w-[92px] text-[13px]" />
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {[8, 16, 24, 25, 26, 27, 28, 30, 32].map((value) => (
            <button
              key={value}
              onClick={() => setPrefix(value)}
              className={cn(
                "mono h-6 rounded border px-2 text-[9.5px] transition-colors",
                prefix === value
                  ? "border-mint-400/45 bg-mint-400/10 text-mint-200"
                  : "border-line text-faint hover:border-mint-400/30 hover:text-dim"
              )}
            >
              /{value}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Result label="عنوان الشبكة" value={`${network}/${prefix}`} accent />
          <Result label="عنوان البث" value={broadcast} />
          <Result label="أول عنوان متاح" value={first} />
          <Result label="آخر عنوان متاح" value={last} />
          <Result label="قناع الشبكة" value={mask} />
          <Result label="الأجهزة القابلة للاستخدام" value={hosts.toLocaleString("en-US")} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-line-soft bg-ink-900/40 px-2.5 py-2">
            <div className="text-[9px] text-faint">الفئة</div>
            <div className="mono mt-0.5 text-[11px] text-mist">
              {cls} {valid && (isPrivateIp(ip) ? "· خاص (Private)" : "· عام (Public)")}
            </div>
          </div>
          <div className="rounded-lg border border-line-soft bg-ink-900/40 px-2.5 py-2">
            <div className="text-[9px] text-faint">عنوان المضيف داخل الشبكة</div>
            <div className="mono mt-0.5 text-[11px] text-mist">
              {valid ? (ipToInt(ip) - ipToInt(networkOf(ip, prefix))).toLocaleString("en-US") : "—"}
            </div>
          </div>
        </div>

        {valid && (
          <div className="rounded-xl border border-line bg-ink-950/50 p-3">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="section-label">التمثيل الثنائي</span>
              <span className="mono text-[8.5px] text-faint">
                <span className="text-mint-300">{prefix}</span> بت شبكة ·{" "}
                <span className="text-sky-300">{32 - prefix}</span> بت مضيف
              </span>
            </div>
            <div className="mono break-all text-[11px] leading-relaxed" dir="ltr">
              {bits.split("").map((bit, index) => (
                <span
                  key={index}
                  className={cn(
                    index < prefix ? "text-mint-300" : "text-sky-300/60",
                    (index + 1) % 8 === 0 && index !== 31 && "me-1.5"
                  )}
                >
                  {bit}
                </span>
              ))}
            </div>
            <div className="mono mt-1 text-[9px] text-faint" dir="ltr">
              {binaryIp(ip)} · {mask}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function Result({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-line-soft bg-ink-900/40 px-2.5 py-2">
      <div className="text-[9px] text-faint">{label}</div>
      <div className={cn("mono mt-0.5 truncate text-[11px]", accent ? "text-mint-300" : "text-mist")} dir="ltr">
        {value}
      </div>
    </div>
  );
}

function ipClass(first: number): string {
  if (first < 128) return "Class A";
  if (first < 192) return "Class B";
  if (first < 224) return "Class C";
  if (first < 240) return "Class D";
  return "Class E";
}

/* -------------------------------- reference ------------------------------- */

const OSI = [
  { n: 7, name: "Application", ar: "التطبيقات", body: "واجهة المستخدم والبروتوكولات: HTTP، DNS، DHCP، SMTP.", color: "#f472b6" },
  { n: 6, name: "Presentation", ar: "التمثيل", body: "الترميز والتشفير والضغط (TLS، UTF-8).", color: "#fb923c" },
  { n: 5, name: "Session", ar: "الجلسة", body: "إدارة الجلسات والمصادقة واستئناف الاتصال.", color: "#fcd34d" },
  { n: 4, name: "Transport", ar: "النقل", body: "TCP موثوق وUDP سريع، مع المنافذ (Ports).", color: "#7dd3fc" },
  { n: 3, name: "Network", ar: "الشبكة", body: "عنونة IP والتوجيه بين الشبكات وICMP وARP.", color: "#5eead4" },
  { n: 2, name: "Data Link", ar: "ربط البيانات", body: "إطارات Ethernet، عناوين MAC، VLAN، والمبدلات.", color: "#a78bfa" },
  { n: 1, name: "Physical", ar: "الفيزيائي", body: "الكابلات والإشارات والمنافذ والأجهزة الفيزيائية.", color: "#94a3b8" },
];

const PROTOCOLS = [
  { name: "ARP", layer: "L2/L3", body: "يحوّل عنوان IP إلى MAC داخل نفس الشبكة عبر Broadcast." },
  { name: "DHCP", layer: "L7", body: "يمنح الأجهزة عنوان IP وقناعًا وبوابة وDNS تلقائيًا (DORA)." },
  { name: "DNS", layer: "L7", body: "يحوّل أسماء النطاقات إلى عناوين IP عبر خادم الأسماء." },
  { name: "ICMP", layer: "L3", body: "رسائل التحكم والأخطاء، ويُستخدم في ping وtraceroute." },
  { name: "TCP", layer: "L4", body: "اتصال موثوق بثلاث مصافحات (SYN، SYN-ACK، ACK)." },
  { name: "HTTP", layer: "L7", body: "بروتوكول الويب فوق TCP، يعيد الحالة والمحتوى." },
  { name: "NAT", layer: "L3", body: "يترجم العناوين الخاصة إلى عنوان عام للخروج للإنترنت." },
  { name: "VLAN", layer: "L2", body: "يقسّم المبدل إلى شبكات بث منطقية معزولة." },
];

const COMMANDS = [
  { cmd: "ipconfig", body: "عرض عناوين الواجهات والبوابة وخادم DNS." },
  { cmd: "ping <host> [n]", body: "اختبار الوصول عبر ICMP وحساب زمن الاستجابة." },
  { cmd: "tracert <host>", body: "تتبع المسار قفزة بقفزة حتى الوجهة." },
  { cmd: "arp -a", body: "عرض جدول ARP المحلي بعد توليد حركة." },
  { cmd: "dhcp", body: "بدء عملية DORA لطلب عنوان من خادم DHCP." },
  { cmd: "nslookup <name>", body: "استعلام خادم DNS عن عنوان اسم نطاق." },
  { cmd: "curl <host>[:port]", body: "إرسال طلب HTTP والتحقق من الاستجابة." },
  { cmd: "show mac | show vlan", body: "جداول تعلم MAC وVLAN على المبدل." },
];

function ReferenceDialog({ tab }: { tab?: "osi" | "protocols" | "commands" }) {
  const [active, setActive] = useState<"osi" | "protocols" | "commands">(tab ?? "osi");

  return (
    <ModalShell
      eyebrow="REFERENCE · مرجع سريع"
      title="المرجع السريع للشبكات"
      subtitle="طبقات OSI، البروتوكولات الأساسية، وأوامر الطرفية."
      icon={<CircleHelp size={17} />}
      width="max-w-[640px]"
    >
      <div className="p-4 sm:p-5">
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-line bg-ink-950/60 p-1">
          {[
            { id: "osi" as const, label: "طبقات OSI" },
            { id: "protocols" as const, label: "البروتوكولات" },
            { id: "commands" as const, label: "الأوامر" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActive(item.id)}
              className={cn(
                "h-7 rounded-md text-[10.5px] transition-colors",
                active === item.id ? "bg-mint-400/10 font-semibold text-mint-200" : "text-dim hover:text-mist"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {active === "osi" && (
          <div className="space-y-1">
            {OSI.map((layer) => (
              <div key={layer.n} className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-ink-900/35 px-2.5 py-1.5">
                <span
                  className="mono flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-semibold"
                  style={{ color: layer.color, borderColor: `${layer.color}30`, background: `${layer.color}0d` }}
                >
                  {layer.n}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[10.5px] font-medium text-mist">{layer.ar}</span>
                    <span className="mono text-[8px] text-faint">{layer.name}</span>
                  </div>
                  <div className="mt-0.5 text-[9.5px] leading-relaxed text-faint">{layer.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {active === "protocols" && (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {PROTOCOLS.map((protocol) => (
              <div key={protocol.name} className="rounded-lg border border-line-soft bg-ink-900/35 px-2.5 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="mono text-[11px] font-semibold text-mint-200">{protocol.name}</span>
                  <span className="mono rounded border border-line px-1 text-[7.5px] text-faint">{protocol.layer}</span>
                </div>
                <p className="mt-1 text-[9.5px] leading-relaxed text-dim">{protocol.body}</p>
              </div>
            ))}
          </div>
        )}

        {active === "commands" && (
          <div className="overflow-hidden rounded-lg border border-line-soft">
            <div className="mono grid grid-cols-[130px_1fr] gap-2 border-b border-line bg-ink-950/50 px-2.5 py-1.5 text-[8px] uppercase tracking-wider text-faint">
              <span>Command</span>
              <span>الوصف</span>
            </div>
            {COMMANDS.map((item) => (
              <div key={item.cmd} className="grid grid-cols-[130px_1fr] items-center gap-2 border-b border-line-soft/60 px-2.5 py-1.5 last:border-0">
                <span className="mono truncate text-[9.5px] text-mint-200/90" dir="ltr">{item.cmd}</span>
                <span className="text-[9.5px] leading-relaxed text-dim">{item.body}</span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-sky-400/20 bg-sky-400/[0.045] px-2.5 py-2">
          <Sparkles size={11} className="mt-0.5 shrink-0 text-sky-300" />
          <p className="text-[9.5px] leading-relaxed text-dim">
            كل حدث في السجل يحمل طبقة ورمزًا؛ اضغط على أي حدث لحزمة لرؤية تفكيكها الكامل من L1 إلى L7 في تبويب «فحص الحزمة».
          </p>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------- lab ---------------------------------- */

function LabDialog({ labId }: { labId: string }) {
  const closeModal = useUIStore((s) => s.closeModal);
  const toast = useUIStore((s) => s.toast);
  const setBottomTab = useUIStore((s) => s.setBottomTab);
  const loadLab = useLabStore((s) => s.loadLab);
  const activeLabId = useLabStore((s) => s.activeLabId);
  const lab = useMemo(() => getLab(labId), [labId]);
  const isActive = activeLabId === lab.id;

  const confirm = () => {
    loadLab(lab.id);
    closeModal();
    setBottomTab("terminal");
    toast(`تم تحميل «${lab.title}»`, "استخدم دليل المعمل والتلميحات إن احتجت مساعدة.", "success");
  };

  return (
    <ModalShell
      eyebrow={`LAB / ${lab.id.toUpperCase()}`}
      title={lab.title}
      subtitle={lab.subtitle}
      icon={<DeviceGlyph kind={lab.icon} size={17} />}
      width="max-w-[560px]"
      footer={
        <>
          <button className="btn" onClick={closeModal}>
            إلغاء
          </button>
          <button className="btn btn-primary" onClick={confirm}>
            <Rocket size={13} />
            {isActive ? "إعادة تحميل المعمل" : "تحميل المعمل"}
          </button>
        </>
      }
    >
      <div className="space-y-3 p-4 sm:p-5">
        <p className="text-[11px] leading-relaxed text-dim">{lab.description}</p>
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="الصعوبة" value={["", "مبتدئ", "متوسط", "متقدم"][lab.difficulty]} />
          <MiniStat label="المدة" value={`${lab.minutes} دقيقة`} />
          <MiniStat label="الأهداف" value={`${lab.objectives.length}`} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {lab.tags.map((tag) => (
            <span key={tag} className="chip h-5 text-[9px]">{tag}</span>
          ))}
        </div>
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/[0.05] px-2.5 py-2 text-[9.5px] leading-relaxed text-amber-200/85">
          تحميل المعمل يستبدل الطوبولوجيا الحالية ويصفّر السجلات. استخدم «إعادة تهيئة» داخل المعمل لاحقًا للعودة إلى نقطة البداية.
        </div>
        <div className="space-y-1">
          {lab.objectives.slice(0, 4).map((objective) => (
            <div key={objective.id} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-faint">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-mint-400/70" />
              {objective.text}
            </div>
          ))}
        </div>
      </div>
    </ModalShell>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line-soft bg-ink-900/40 px-2 py-1.5 text-center">
      <div className="text-[8.5px] text-faint">{label}</div>
      <div className="mt-0.5 text-[10.5px] font-medium text-mist">{value}</div>
    </div>
  );
}

/* --------------------------------- reset ---------------------------------- */

function ResetDialog() {
  const closeModal = useUIStore((s) => s.closeModal);
  const activeLabId = useLabStore((s) => s.activeLabId);
  const resetActiveLab = useLabStore((s) => s.resetActiveLab);
  const toast = useUIStore((s) => s.toast);
  const lab = getLab(activeLabId);

  return (
    <ModalShell
      eyebrow="RESET · إعادة تهيئة"
      title="إعادة تهيئة المعمل الحالي؟"
      subtitle={`سيُعاد «${lab.title}» إلى حالته الأصلية وتُحذف كل التعديلات والسجلات والاختبارات.`}
      icon={<RotateCcw size={17} />}
      width="max-w-[460px]"
      footer={
        <>
          <button className="btn" onClick={closeModal}>
            إلغاء
          </button>
          <button
            className="btn btn-danger"
            onClick={() => {
              resetActiveLab();
              closeModal();
              toast("تمت إعادة تهيئة المعمل", "الطوبولوجيا والإعدادات عادت إلى نقطة البداية.", "warning");
            }}
          >
            <RotateCcw size={13} />
            نعم، أعد التهيئة
          </button>
        </>
      }
    >
      <div className="flex items-start gap-2.5 p-4 sm:p-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-rose-400/25 bg-rose-400/10 text-rose-300">
          <ShieldCheck size={15} />
        </div>
        <p className="text-[10.5px] leading-relaxed text-dim">
          لا يمكن التراجع عن هذه العملية. إن كنت تريد الاحتفاظ بشيء، انسخه من سجل الأحداث أو من جداول الإعدادات قبل المتابعة.
        </p>
      </div>
    </ModalShell>
  );
}

/* -------------------------------- shortcuts ------------------------------- */

const SHORTCUTS = [
  { keys: ["Delete", "Backspace"], body: "حذف الجهاز أو الوصلة المحددة" },
  { keys: ["Esc"], body: "إلغاء التحديد أو إغلاق نافذة" },
  { keys: ["سحب"], body: "تحريك جهاز داخل مساحة العمل" },
  { keys: ["سحب المقبض"], body: "توصيل واجهة بجهاز آخر" },
  { keys: ["سحب اللوحة"], body: "تحريك مساحة العرض (Pan)" },
  { keys: ["عجلة الفأرة"], body: "تكبير وتصغير اللوحة" },
  { keys: ["دبل كليك"], body: "ملاءمة الطوبولوجيا مع الشاشة" },
  { keys: ["Enter"], body: "تنفيذ أمر الطرفية" },
  { keys: ["↑ / ↓"], body: "التنقل في تاريخ الأوامر" },
  { keys: ["Tab"], body: "إكمال الأمر تلقائيًا" },
];

function ShortcutsDialog() {
  return (
    <ModalShell
      eyebrow="KEYBOARD · اختصارات"
      title="اختصارات لوحة المفاتيح"
      subtitle="تحكم أسرع في اللوحة والطرفية أثناء العمل."
      icon={<Command size={17} />}
      width="max-w-[500px]"
    >
      <div className="p-4 sm:p-5">
        <div className="overflow-hidden rounded-lg border border-line-soft">
          {SHORTCUTS.map((item) => (
            <div key={item.body} className="flex items-center justify-between gap-3 border-b border-line-soft/60 px-2.5 py-2 last:border-0">
              <span className="text-[10px] text-dim">{item.body}</span>
              <span className="flex shrink-0 items-center gap-1">
                {item.keys.map((key) => (
                  <kbd key={key} className="kbd">{key}</kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[9px] text-faint">
          <Search size={10} />
          يمكنك أيضًا البحث داخل سجل الأحداث واختيار الأجهزة من قائمة الطرفية.
        </div>
      </div>
    </ModalShell>
  );
}
