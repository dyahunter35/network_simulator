"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  Cable,
  Check,
  ChevronDown,
  CircleDot,
  Clock,
  Crosshair,
  Database,
  Globe2,
  Link2,
  ListTree,
  Network,
  Play,
  Plus,
  Radio,
  Route as RouteIcon,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  Wifi,
  X,
} from "lucide-react";
import { connectedRoutes, ifaceOf } from "@/lib/devices";
import { cn, clockTime } from "@/lib/format";
import { isValidIp } from "@/lib/ip";
import type { ArpEntry, Device, DeviceKind, Iface, MacEntry, NetLink } from "@/lib/types";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";
import {
  DeviceGlyph,
  IpField,
  KindChip,
  PrefixSelect,
  SectionTitle,
  Toggle,
  Tooltip,
} from "@/components/common";

const HOST_KINDS: DeviceKind[] = ["pc", "laptop", "server"];
const EMPTY_ARP: ArpEntry[] = [];
const EMPTY_MAC: MacEntry[] = [];

export function Inspector() {
  const selected = useLabStore((s) => s.selected);
  const devices = useLabStore((s) => s.devices);
  const links = useLabStore((s) => s.links);
  const rightOpen = useUIStore((s) => s.rightOpen);
  const setRightOpen = useUIStore((s) => s.setRightOpen);

  const device =
    selected?.type === "device" ? devices.find((d) => d.id === selected.id) : undefined;
  const link = selected?.type === "link" ? links.find((l) => l.id === selected.id) : undefined;

  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
        onClick={() => setRightOpen(false)}
        style={{ display: rightOpen ? "block" : "none" }}
      />
      <aside
        className="sidebar-right panel relative z-40 flex w-[336px] shrink-0 flex-col border-s border-line"
        data-open={rightOpen}
      >
        <div className="flex h-[46px] shrink-0 items-center justify-between border-b border-line px-3.5">
          <div className="flex items-center gap-2">
            <span className="eyebrow">Inspector</span>
            <span className="h-3 w-px bg-line" />
            <span className="text-[11px] text-dim">
              {device ? "خصائص الجهاز" : link ? "تفاصيل الوصلة" : "لوحة التحكم"}
            </span>
          </div>
          <button
            className="icon-btn mobile-only"
            aria-label="إغلاق"
            onClick={() => setRightOpen(false)}
          >
            <X size={16} />
          </button>
        </div>

        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          {device ? (
            <DeviceInspector device={device} key={device.id} />
          ) : link ? (
            <LinkInspector link={link} />
          ) : (
            <EmptyInspector />
          )}
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ header */

function DeviceHeader({ device }: { device: Device }) {
  const removeDevice = useLabStore((s) => s.removeDevice);
  const setBottomTab = useUIStore((s) => s.setBottomTab);

  return (
    <div className="border-b border-line px-3.5 py-3">
      <div className="flex items-start gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
          style={{
            color: kindColor(device.kind),
            borderColor: `${kindColor(device.kind)}38`,
            background: `${kindColor(device.kind)}12`,
          }}
        >
          <DeviceGlyph kind={device.kind} size={17} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate px-1 text-[13px] font-semibold text-mist">{device.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5 px-1">
            <KindChip kind={device.kind} />
            <span className="mono text-[9px] text-faint">{device.id.split("-").slice(-1)[0]}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip text="فتح الطرفية">
            <button
              className="icon-btn"
              aria-label="فتح الطرفية"
              onClick={() => setBottomTab("terminal")}
            >
              <Terminal size={14} />
            </button>
          </Tooltip>
          <Tooltip text="حذف الجهاز">
            <button
              className="icon-btn hover:!text-rose-300"
              aria-label="حذف الجهاز"
              onClick={() => removeDevice(device.id)}
            >
              <Trash2 size={14} />
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- inspector */

function DeviceInspector({ device }: { device: Device }) {
  const [tab, setTab] = useState<"config" | "tables">("config");
  const arpEntry = useLabStore((s) => s.runtime.arp[device.id]);
  const macEntry = useLabStore((s) => s.runtime.mac[device.id]);
  const leases = useLabStore((s) => s.runtime.leases);
  const nat = useLabStore((s) => s.runtime.nat);
  const links = useLabStore((s) => s.links);
  const devices = useLabStore((s) => s.devices);
  const arp = arpEntry ?? EMPTY_ARP;
  const mac = macEntry ?? EMPTY_MAC;

  const arpCount = arp.length;
  const macCount = mac.length;
  const extra = (device.kind === "switch" ? macCount : 0) + (device.kind === "server" ? leases.length : 0);

  return (
    <div>
      <DeviceHeader device={device} />

      <div className="sticky top-0 z-10 flex gap-1 border-b border-line bg-ink-900/95 px-3 py-2 backdrop-blur">
        <Tab active={tab === "config"} onClick={() => setTab("config")}>
          الإعدادات
        </Tab>
        <Tab active={tab === "tables"} onClick={() => setTab("tables")}>
          الجداول
          {(arpCount + extra) > 0 && (
            <span className="mono ms-1 rounded bg-ink-950 px-1 text-[8px] text-mint-300">
              {arpCount + extra}
            </span>
          )}
        </Tab>
      </div>

      {tab === "config" ? (
        <ConfigTab device={device} links={links} devices={devices} />
      ) : (
        <TablesTab
          device={device}
          arp={arp}
          mac={mac}
          leases={leases.filter((l) => l.serverId === device.id)}
          nat={nat}
        />
      )}
    </div>
  );
}

function Tab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 flex-1 items-center justify-center gap-1 rounded-md text-[10.5px] font-medium transition-colors",
        active ? "bg-ink-700 text-mist" : "text-faint hover:text-dim"
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------- config tab */

function ConfigTab({
  device,
  links,
  devices,
}: {
  device: Device;
  links: NetLink[];
  devices: Device[];
}) {
  const isSwitch = device.kind === "switch";
  const isRouter = device.kind === "router" || device.kind === "firewall";
  const isFirewall = device.kind === "firewall";
  const isServer = device.kind === "server";
  const isHost = HOST_KINDS.includes(device.kind);

  return (
    <div className="space-y-4 p-3.5">
      <section>
        <SectionTitle hint={`${device.interfaces.length} منفذ · ${links.filter((l) => l.a.deviceId === device.id || l.b.deviceId === device.id).length} متصل`}>
          الواجهات
        </SectionTitle>
        <div className="space-y-2">
          {device.interfaces.map((iface) => (
            <InterfaceCard
              key={iface.id}
              device={device}
              iface={iface}
              links={links}
              devices={devices}
            />
          ))}
        </div>
      </section>

      {isHost && (
        <section>
          <SectionTitle hint="تُستخدم للوصول إلى الشبكات خارج الشبكة المحلية">إعدادات الطرفية</SectionTitle>
          <div className="space-y-2 rounded-lg border border-line-soft bg-ink-950/35 p-2.5">
            <FieldRow label="البوابة الافتراضية">
              <IpField
                value={device.gateway}
                onChange={(v) => useLabStore.getState().setGateway(device.id, v)}
                placeholder="192.168.1.1"
                className="h-8"
              />
            </FieldRow>
            <FieldRow label="خادم DNS">
              <IpField
                value={device.dns}
                onChange={(v) => useLabStore.getState().setDns(device.id, v)}
                placeholder="8.8.8.8"
                className="h-8"
              />
            </FieldRow>
            <p className="text-[9.5px] leading-relaxed text-faint">
              البوابة ضرورية فقط عند التواصل مع شبكة أخرى. داخل نفس الشبكة يتم الاتصال مباشرة عبر ARP.
            </p>
          </div>
        </section>
      )}

      {isRouter && <RoutingSection device={device} />}
      {isRouter && (
        <section>
          <SectionTitle hint="ترجمة عنوان المصدر الخاص إلى عنوان عام">NAT</SectionTitle>
          <div className="flex items-start justify-between gap-3 rounded-lg border border-line-soft bg-ink-950/35 p-2.5">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] text-mist">
                <Globe2 size={13} className="text-mint-300" />
                تفعيل NAT Overload
              </div>
              <p className="mt-1 text-[9.5px] leading-relaxed text-faint">
                يسمح لأجهزة الشبكة الداخلية بالخروج بعنوان الواجهة الخارجية مع الاحتفاظ بجدول ترجمة.
              </p>
            </div>
            <Toggle
              checked={Boolean(device.nat)}
              onChange={(v) => useLabStore.getState().setNat(device.id, v)}
              label="NAT"
            />
          </div>
        </section>
      )}

      {isFirewall && <FirewallSection device={device} />}

      {isSwitch && (
        <section>
          <SectionTitle hint="كل VLAN نطاق بث مستقل">تقسيم الشبكة</SectionTitle>
          <div className="rounded-lg border border-line-soft bg-ink-950/35 p-2.5 text-[9.5px] leading-relaxed text-faint">
            عيّن VLAN لكل منفذ من بطاقات الواجهات أعلاه. المنافذ في VLAN مختلفة لا تتبادل الإطارات، حتى لو
            كانت عناوين IP في نفس الشبكة. لربط VLANs لاحقًا استخدم موجّهًا أو مبدّل طبقة ثالثة.
          </div>
        </section>
      )}

      {isServer && <ServerServices device={device} />}
    </div>
  );
}

function InterfaceCard({
  device,
  iface,
  links,
  devices,
}: {
  device: Device;
  iface: Iface;
  links: NetLink[];
  devices: Device[];
}) {
  const updateIface = useLabStore((s) => s.updateIface);
  const runDhcp = useLabStore((s) => s.runDhcp);
  const toast = useUIStore((s) => s.toast);

  const link = links.find(
    (l) =>
      (l.a.deviceId === device.id && l.a.ifaceId === iface.id) ||
      (l.b.deviceId === device.id && l.b.ifaceId === iface.id)
  );
  const peerEnd = link
    ? link.a.deviceId === device.id && link.a.ifaceId === iface.id
      ? link.b
      : link.a
    : undefined;
  const peerDevice = peerEnd ? devices.find((d) => d.id === peerEnd.deviceId) : undefined;
  const peerIface = peerDevice && peerEnd ? ifaceOf(peerDevice, peerEnd.ifaceId) : undefined;
  const isSwitch = device.kind === "switch" || device.kind === "ap";
  const isHost = HOST_KINDS.includes(device.kind);
  const vlan = iface.vlan ?? 1;
  const vlanOptions = Array.from(new Set([1, 10, 20, 30, 40, 50, 99, vlan])).sort((a, b) => a - b);

  const requestDhcp = () => {
    const result = runDhcp(device.id);
    if (result.ok) {
      toast(
        "تم الحصول على عنوان DHCP",
        `${result.assignedIp}/${result.prefix} · البوابة ${result.gateway}`,
        "success"
      );
    } else {
      toast("فشل طلب DHCP", result.error, "error");
    }
  };

  return (
    <div className="rounded-lg border border-line-soft bg-ink-950/35 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={cn("status-dot", link ? "" : "opacity-40")} data-on={Boolean(link)} />
          <span dir="ltr" className="mono text-[10px] font-medium text-mist">
            {iface.name}
          </span>
          <span className="truncate text-[9px] text-faint">
            {peerDevice ? `→ ${peerDevice.name} ${peerIface?.name ?? ""}` : "غير موصول"}
          </span>
        </div>
        <span dir="ltr" className="mono shrink-0 text-[8px] text-faint" title={iface.mac}>
          {iface.mac.slice(-8)}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5">
        <IpField
          value={iface.ip}
          onChange={(value) =>
            updateIface(device.id, iface.id, {
              ip: value || undefined,
              prefix: value ? iface.prefix ?? 24 : undefined,
            })
          }
          className="h-7 flex-1 text-[11px]"
          placeholder={iface.dhcp && !iface.ip ? "DHCP auto" : "بدون عنوان"}
        />
        <PrefixSelect
          value={iface.prefix ?? 24}
          onChange={(prefix) => {
            if (iface.ip) updateIface(device.id, iface.id, { prefix });
          }}
          className="h-7 w-[62px] text-[10px]"
        />
        {iface.ip && (
          <button
            className="icon-btn h-7 w-6"
            aria-label="مسح العنوان"
            title="مسح العنوان"
            onClick={() => updateIface(device.id, iface.id, { ip: undefined, prefix: undefined })}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {isSwitch && (
        <div className="mt-2 flex items-center justify-between gap-1.5">
          <label className="flex items-center gap-1 text-[9px] text-faint">
            VLAN
            <select
              value={vlan}
              onChange={(e) =>
                updateIface(device.id, iface.id, { vlan: Number(e.target.value) })
              }
              className="field h-6 w-[62px] rounded px-1 text-center text-[10px]"
            >
              {vlanOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {device.kind === "switch" && (
            <button
              onClick={() => updateIface(device.id, iface.id, { trunk: !iface.trunk })}
              className={cn(
                "mono rounded border px-1.5 py-0.5 text-[8.5px] transition-colors",
                iface.trunk
                  ? "border-mint-400/40 bg-mint-400/10 text-mint-300"
                  : "border-line text-faint hover:text-dim"
              )}
              title="Trunk ينقل كل VLANs"
            >
              TRUNK
            </button>
          )}
        </div>
      )}

      {isHost && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[9px] text-faint">
            <span>الحصول التلقائي (DHCP)</span>
            {iface.dhcp && !iface.ip && (
              <span className="mono rounded bg-amber-400/10 px-1 text-[8px] text-amber-300">
                pending
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {iface.dhcp && (
              <button
                className="rounded border border-amber-400/25 bg-amber-400/[0.07] px-1.5 py-0.5 text-[8.5px] text-amber-200 hover:bg-amber-400/15"
                onClick={requestDhcp}
              >
                طلب DHCP
              </button>
            )}
            <Toggle
              checked={Boolean(iface.dhcp)}
              onChange={(value) => updateIface(device.id, iface.id, { dhcp: value })}
              label="DHCP"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[92px] shrink-0 text-[9.5px] text-faint">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

/* --------------------------------------------------------------- routing */

function RoutingSection({ device }: { device: Device }) {
  const addRoute = useLabStore((s) => s.addRoute);
  const removeRoute = useLabStore((s) => s.removeRoute);
  const toast = useUIStore((s) => s.toast);
  const [dest, setDest] = useState("");
  const [prefix, setPrefix] = useState(24);
  const [via, setVia] = useState("");

  const connected = connectedRoutes(device);
  const canAdd = isValidIp(dest) && isValidIp(via);

  return (
    <section>
      <SectionTitle
        hint="اختر الشبكة البعيدة وعنوان القفزة التالية"
        action={
          <button
            className="mono text-[8.5px] text-mint-300/80 hover:text-mint-200"
            onClick={() => {
              setDest("0.0.0.0");
              setPrefix(0);
            }}
          >
            مسار افتراضي
          </button>
        }
      >
        جدول التوجيه
      </SectionTitle>

      <div className="space-y-1 rounded-lg border border-line-soft bg-ink-950/35 p-2">
        {connected.map((route) => (
          <div
            key={route.id}
            className="flex items-center gap-2 rounded-md px-1 py-1 text-[9.5px]"
          >
            <span className="w-[38px] shrink-0 rounded bg-mint-400/10 px-1 text-center text-[8px] text-mint-300">
              متصل
            </span>
            <span dir="ltr" className="mono min-w-0 flex-1 truncate text-mist">
              {route.dest}/{route.prefix}
            </span>
            <span className="mono text-[8.5px] text-faint">{route.ifaceName}</span>
          </div>
        ))}
        {device.routes.map((route) => (
          <div
            key={route.id}
            className="flex items-center gap-2 rounded-md px-1 py-1 text-[9.5px]"
          >
            <span className="w-[38px] shrink-0 rounded bg-sky-400/10 px-1 text-center text-[8px] text-sky-300">
              ثابت
            </span>
            <span dir="ltr" className="mono min-w-0 flex-1 truncate text-mist">
              {route.dest}/{route.prefix}
            </span>
            <span dir="ltr" className="mono text-[8.5px] text-faint">
              via {route.via}
            </span>
            <button
              className="icon-btn h-5 w-5 hover:!text-rose-300"
              aria-label="حذف المسار"
              onClick={() => removeRoute(device.id, route.id)}
            >
              <Trash2 size={10} />
            </button>
          </div>
        ))}
        {!connected.length && !device.routes.length && (
          <div className="py-2 text-center text-[9.5px] text-faint">لا توجد مسارات — أضف عنوان IP أولًا.</div>
        )}
      </div>

      <div className="mt-2 rounded-lg border border-line-soft bg-ink-950/35 p-2">
        <div className="mb-1.5 text-[9px] text-faint">إضافة مسار ثابت</div>
        <div className="flex items-center gap-1">
          <IpField value={dest} onChange={setDest} placeholder="192.168.20.0" className="h-7 flex-1 text-[10px]" />
          <PrefixSelect value={prefix} onChange={setPrefix} className="h-7 w-[58px] text-[9px]" />
        </div>
        <div className="mt-1 flex items-center gap-1">
          <span className="mono shrink-0 text-[8px] text-faint">via</span>
          <IpField value={via} onChange={setVia} placeholder="10.0.0.2" className="h-7 flex-1 text-[10px]" />
          <button
            className="btn h-7 px-2 text-[9px]"
            disabled={!canAdd}
            onClick={() => {
              addRoute(device.id, { dest, prefix, via });
              toast("تمت إضافة المسار", `${dest}/${prefix} عبر ${via}`, "success");
              setDest("");
              setVia("");
            }}
          >
            <Plus size={10} /> إضافة
          </button>
        </div>
        <p className="mt-1.5 text-[8.5px] leading-relaxed text-faint">
          القفزة التالية يجب أن تكون في شبكة متصلة مباشرة بأحد منافذ الموجّه.
        </p>
      </div>
    </section>
  );
}

/* -------------------------------------------------------------- firewall */

function FirewallSection({ device }: { device: Device }) {
  const setFirewallDefault = useLabStore((s) => s.setFirewallDefault);
  const addRule = useLabStore((s) => s.addFirewallRule);
  const removeRule = useLabStore((s) => s.removeFirewallRule);
  const toast = useUIStore((s) => s.toast);
  const [action, setAction] = useState<"allow" | "deny">("deny");
  const [protocol, setProtocol] = useState<"any" | "icmp" | "tcp" | "udp">("icmp");
  const [src, setSrc] = useState("any");
  const [dst, setDst] = useState("any");
  const [port, setPort] = useState("");

  return (
    <section>
      <SectionTitle hint="تُطبق القواعد بالترتيب (First Match)">جدار الحماية</SectionTitle>

      <div className="rounded-lg border border-line-soft bg-ink-950/35 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] text-mist">السياسة الافتراضية</div>
            <div className="mt-0.5 text-[8.5px] text-faint">تُطبق عند عدم تطابق أي قاعدة</div>
          </div>
          <div className="flex rounded-md border border-line bg-ink-950 p-0.5">
            {(["allow", "deny"] as const).map((policy) => (
              <button
                key={policy}
                onClick={() => setFirewallDefault(device.id, policy)}
                className={cn(
                  "rounded px-2 py-1 text-[9px] transition-colors",
                  (device.firewallDefault ?? "allow") === policy
                    ? policy === "allow"
                      ? "bg-mint-400/15 text-mint-300"
                      : "bg-rose-400/15 text-rose-300"
                    : "text-faint hover:text-dim"
                )}
              >
                {policy === "allow" ? "سماح" : "حظر"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-2.5 space-y-1">
          {(device.firewallRules ?? []).map((rule, index) => (
            <div
              key={rule.id}
              className="flex items-center gap-1.5 rounded-md border border-line-soft bg-ink-900/40 px-1.5 py-1 text-[9px]"
            >
              <span className="mono w-3 shrink-0 text-[8px] text-faint">{index + 1}</span>
              <span
                className={cn(
                  "w-[34px] shrink-0 rounded px-1 text-center text-[8px]",
                  rule.action === "allow"
                    ? "bg-mint-400/10 text-mint-300"
                    : "bg-rose-400/10 text-rose-300"
                )}
              >
                {rule.action === "allow" ? "سماح" : "حظر"}
              </span>
              <span dir="ltr" className="mono flex-1 truncate text-mist/90">
                {rule.protocol.toUpperCase()}
                {rule.port ? `:${rule.port}` : ""} · {rule.src} → {rule.dst}
              </span>
              <button
                className="icon-btn h-5 w-5 hover:!text-rose-300"
                aria-label="حذف القاعدة"
                onClick={() => removeRule(device.id, rule.id)}
              >
                <Trash2 size={10} />
              </button>
            </div>
          ))}
          {!(device.firewallRules ?? []).length && (
            <div className="py-2 text-center text-[9px] text-faint">لا توجد قواعد مخصصة بعد.</div>
          )}
        </div>

        <div className="mt-2.5 border-t border-line-soft pt-2">
          <div className="mb-1.5 text-[9px] text-faint">قاعدة جديدة</div>
          <div className="grid grid-cols-2 gap-1">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as "allow" | "deny")}
              className="field h-7 px-1.5 text-[9px]"
            >
              <option value="deny">حظر</option>
              <option value="allow">سماح</option>
            </select>
            <select
              value={protocol}
              onChange={(e) => setProtocol(e.target.value as typeof protocol)}
              className="field h-7 px-1.5 text-[9px]"
            >
              <option value="icmp">ICMP</option>
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="any">أي بروتوكول</option>
            </select>
            <input
              dir="ltr"
              value={src}
              onChange={(e) => setSrc(e.target.value)}
              placeholder="src any"
              className="field h-7 px-1.5 text-[9px]"
              aria-label="المصدر"
            />
            <input
              dir="ltr"
              value={dst}
              onChange={(e) => setDst(e.target.value)}
              placeholder="dst any"
              className="field h-7 px-1.5 text-[9px]"
              aria-label="الوجهة"
            />
            {protocol === "tcp" && (
              <input
                dir="ltr"
                value={port}
                onChange={(e) => setPort(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="port 80"
                className="field h-7 px-1.5 text-[9px]"
                aria-label="المنفذ"
              />
            )}
            <button
              className="btn h-7 px-2 text-[9px]"
              onClick={() => {
                addRule(device.id, {
                  action,
                  protocol,
                  src: src.trim() || "any",
                  dst: dst.trim() || "any",
                  port: protocol === "tcp" && port ? Number(port) : undefined,
                });
                toast("تمت إضافة القاعدة", `${action === "allow" ? "سماح" : "حظر"} ${protocol.toUpperCase()}`, "success");
              }}
            >
              <Plus size={10} /> إضافة
            </button>
          </div>
          <p className="mt-1.5 text-[8.5px] leading-relaxed text-faint">
            استخدم <span className="code-inline">any</span> أو شبكة مثل{" "}
            <span className="code-inline">192.168.1.0/24</span>. تُعرض القاعدة الأولى المطابقة.
          </p>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- servers */

function ServerServices({ device }: { device: Device }) {
  const setService = useLabStore((s) => s.setService);
  const updatePool = useLabStore((s) => s.updatePool);
  const addDnsRecord = useLabStore((s) => s.addDnsRecord);
  const removeDnsRecord = useLabStore((s) => s.removeDnsRecord);
  const toast = useUIStore((s) => s.toast);
  const [recordName, setRecordName] = useState("");
  const [recordIp, setRecordIp] = useState("");

  return (
    <section>
      <SectionTitle hint="خدمات التطبيقات التي يقدمها الخادم">الخدمات</SectionTitle>
      <div className="space-y-1.5">
        <ServiceRow
          icon={<ServerCog size={14} />}
          title="DHCP Server"
          desc="توزيع العناوين تلقائيًا"
          checked={Boolean(device.services?.dhcp)}
          onChange={(v) => setService(device.id, "dhcp", v)}
        />
        <ServiceRow
          icon={<Database size={14} />}
          title="DNS Server"
          desc="تحويل الأسماء إلى عناوين"
          checked={Boolean(device.services?.dns)}
          onChange={(v) => setService(device.id, "dns", v)}
        />
        <ServiceRow
          icon={<Globe2 size={14} />}
          title="Web Server"
          desc="استضافة صفحات HTTP"
          checked={Boolean(device.services?.web)}
          onChange={(v) => setService(device.id, "web", v)}
        />
      </div>

      {device.services?.dhcp && device.dhcpPool && (
        <div className="mt-2.5 rounded-lg border border-amber-400/20 bg-amber-400/[0.035] p-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] text-amber-200">
            <ServerCog size={12} /> نطاق DHCP
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-1">
              <IpField
                value={device.dhcpPool.start}
                onChange={(v) => updatePool(device.id, { start: v })}
                placeholder="البداية"
                className="h-7 flex-1 text-[10px]"
              />
              <span className="text-[9px] text-faint">→</span>
              <IpField
                value={device.dhcpPool.end}
                onChange={(v) => updatePool(device.id, { end: v })}
                placeholder="النهاية"
                className="h-7 flex-1 text-[10px]"
              />
              <PrefixSelect
                value={device.dhcpPool.prefix}
                onChange={(p) => updatePool(device.id, { prefix: p })}
                className="h-7 w-[58px] text-[9px]"
              />
            </div>
            <FieldRow label="البوابة">
              <IpField
                value={device.dhcpPool.gateway}
                onChange={(v) => updatePool(device.id, { gateway: v })}
                className="h-7 text-[10px]"
              />
            </FieldRow>
            <FieldRow label="DNS">
              <IpField
                value={device.dhcpPool.dns}
                onChange={(v) => updatePool(device.id, { dns: v })}
                className="h-7 text-[10px]"
              />
            </FieldRow>
          </div>
        </div>
      )}

      {device.services?.dns && (
        <div className="mt-2.5 rounded-lg border border-line-soft bg-ink-950/35 p-2.5">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] text-mist">
            <Database size={12} /> سجلات DNS (A)
          </div>
          <div className="space-y-1">
            {(device.dnsRecords ?? []).map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-1.5 rounded-md border border-line-soft bg-ink-900/40 px-1.5 py-1"
              >
                <span dir="ltr" className="mono min-w-0 flex-1 truncate text-[9.5px] text-mist">
                  {record.name}
                </span>
                <span dir="ltr" className="mono text-[9px] text-mint-300/90">
                  {record.ip}
                </span>
                <button
                  className="icon-btn h-5 w-5 hover:!text-rose-300"
                  aria-label="حذف السجل"
                  onClick={() => removeDnsRecord(device.id, record.id)}
                >
                  <Trash2 size={9} />
                </button>
              </div>
            ))}
            {!(device.dnsRecords ?? []).length && (
              <div className="py-1.5 text-center text-[9px] text-faint">لا توجد سجلات بعد.</div>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1">
            <input
              dir="ltr"
              value={recordName}
              onChange={(e) => setRecordName(e.target.value)}
              placeholder="intranet.lab"
              className="field h-7 flex-1 px-1.5 text-[9.5px]"
            />
            <IpField value={recordIp} onChange={setRecordIp} placeholder="IP" className="h-7 w-[104px] text-[9.5px]" />
            <button
              className="btn h-7 px-1.5"
              disabled={!recordName.trim() || !isValidIp(recordIp)}
              onClick={() => {
                addDnsRecord(device.id, { name: recordName.trim(), ip: recordIp });
                toast("تمت إضافة سجل DNS", `${recordName} → ${recordIp}`, "success");
                setRecordName("");
                setRecordIp("");
              }}
              aria-label="إضافة سجل"
            >
              <Plus size={10} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ServiceRow({
  icon,
  title,
  desc,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-line-soft bg-ink-950/35 px-2 py-1.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-ink-900 text-mint-300/80">
        {icon}
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="mono text-[9.5px] text-mist">{title}</div>
        <div className="text-[8.5px] text-faint">{desc}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

/* ---------------------------------------------------------------- tables */

function TablesTab({
  device,
  arp,
  mac,
  leases,
  nat,
}: {
  device: Device;
  arp: { ip: string; mac: string; ifaceId: string; at: number }[];
  mac: { mac: string; ifaceId: string; vlan: number; learnedAt: number }[];
  leases: { deviceId: string; ifaceId: string; ip: string; prefix: number; at: number }[];
  nat: { id: string; insideIp: string; outsideIp: string; destIp: string; at: number }[];
}) {
  const clearArp = useLabStore((s) => s.clearArp);
  const devices = useLabStore((s) => s.devices);
  const ifaceName = (id: string) =>
    device.interfaces.find((i) => i.id === id)?.name ?? id;
  const isSwitch = device.kind === "switch";
  const isServer = device.kind === "server";
  const isRouter = device.kind === "router" || device.kind === "firewall";
  const routes = [
    ...connectedRoutes(device).map((r) => ({
      id: r.id,
      dest: r.dest,
      prefix: r.prefix,
      kind: "connected" as const,
      detail: r.ifaceName,
    })),
    ...device.routes.map((r) => ({
      id: r.id,
      dest: r.dest,
      prefix: r.prefix,
      kind: "static" as const,
      detail: r.via ? `via ${r.via}` : "",
    })),
  ];

  return (
    <div className="space-y-4 p-3.5">
      <TableBlock
        title="جدول ARP"
        hint={`${arp.length} مدخل`}
        icon={<ListTree size={13} />}
        action={
          arp.length ? (
            <button className="text-[8.5px] text-rose-300/80 hover:text-rose-200" onClick={() => clearArp(device.id)}>
              مسح
            </button>
          ) : undefined
        }
      >
        {arp.length ? (
          <div>
            <div className="table-row table-head" style={{ gridTemplateColumns: "1.1fr 1.4fr .7fr" }}>
              <span>IP</span>
              <span>MAC</span>
              <span>Port</span>
            </div>
            {arp.map((entry) => (
              <div key={`${entry.ip}-${entry.mac}`} className="table-row" style={{ gridTemplateColumns: "1.1fr 1.4fr .7fr" }} dir="ltr">
                <span className="truncate text-mist">{entry.ip}</span>
                <span className="truncate text-mint-200/80">{entry.mac}</span>
                <span className="truncate text-faint">{ifaceName(entry.ifaceId)}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyTable text="لا توجد مدخلات ARP. نفّذ ping لإطلاق طلب ARP." />
        )}
      </TableBlock>

      {isSwitch && (
        <TableBlock title="جدول MAC" hint={`${mac.length} مدخل`} icon={<Network size={13} />}>
          {mac.length ? (
            <div>
              <div className="table-row table-head" style={{ gridTemplateColumns: "1.3fr .7fr .4fr" }}>
                <span>MAC</span>
                <span>Port</span>
                <span>VLAN</span>
              </div>
              {mac.map((entry) => (
                <div key={`${entry.mac}-${entry.ifaceId}`} className="table-row" style={{ gridTemplateColumns: "1.3fr .7fr .4fr" }} dir="ltr">
                  <span className="truncate text-mist">{entry.mac}</span>
                  <span className="text-faint">{ifaceName(entry.ifaceId)}</span>
                  <span className="text-violet-300">{entry.vlan}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyTable text="يتعلم المبدّل عناوين MAC تلقائيًا من الإطارات الواردة." />
          )}
        </TableBlock>
      )}

      {isServer && (
        <TableBlock title="إيجارات DHCP" hint={`${leases.length} lease`} icon={<Clock size={13} />}>
          {leases.length ? (
            <div>
              <div className="table-row table-head" style={{ gridTemplateColumns: "1fr 1fr .7fr" }}>
                <span>Client</span>
                <span>IP</span>
                <span>Expires</span>
              </div>
              {leases.map((lease) => {
                const client = devices.find((d) => d.id === lease.deviceId);
                return (
                  <div key={lease.ip} className="table-row" style={{ gridTemplateColumns: "1fr 1fr .7fr" }} dir="ltr">
                    <span className="truncate text-mist">{client?.name ?? lease.deviceId}</span>
                    <span className="text-mint-200/80">{lease.ip}</span>
                    <span className="text-faint">{clockTime(lease.at + 86400000)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyTable text="لم يحصل أي عميل على عنوان بعد." />
          )}
        </TableBlock>
      )}

      {isRouter && (
        <TableBlock
          title="جدول NAT"
          hint={`${nat.length} جلسة`}
          icon={<Globe2 size={13} />}
          action={
            nat.length ? (
              <button className="text-[8.5px] text-rose-300/80 hover:text-rose-200" onClick={() => useLabStore.getState().clearNat()}>
                مسح
              </button>
            ) : undefined
          }
        >
          {nat.length ? (
            <div>
              <div className="table-row table-head" style={{ gridTemplateColumns: "1.3fr 1.3fr 1.1fr" }}>
                <span>Inside</span>
                <span>Outside</span>
                <span>Dest</span>
              </div>
              {nat.map((entry) => (
                <div key={entry.id} className="table-row" style={{ gridTemplateColumns: "1.3fr 1.3fr 1.1fr" }} dir="ltr">
                  <span className="truncate text-mist">{entry.insideIp}</span>
                  <span className="truncate text-mint-200/80">{entry.outsideIp}</span>
                  <span className="truncate text-faint">{entry.destIp}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyTable text="لم تُسجّل أي ترجمة NAT بعد. اختبر اتصالًا من الشبكة الداخلية." />
          )}
        </TableBlock>
      )}

      <TableBlock title="المسارات" hint={`${routes.length}`} icon={<RouteIcon size={13} />}>
        <div className="space-y-1">
          {routes.map((r) => (
            <div key={r.id} className="flex items-center gap-1.5 rounded-md px-1 py-1">
              <span
                className={cn(
                  "w-[36px] shrink-0 rounded px-1 text-center text-[8px]",
                  r.kind === "connected"
                    ? "bg-mint-400/10 text-mint-300"
                    : "bg-sky-400/10 text-sky-300"
                )}
              >
                {r.kind === "connected" ? "متصل" : "ثابت"}
              </span>
              <span dir="ltr" className="mono flex-1 truncate text-[9.5px] text-mist">
                {r.dest}/{r.prefix}
              </span>
              <span dir="ltr" className="mono truncate text-[8.5px] text-faint">
                {r.detail}
              </span>
            </div>
          ))}
          {!routes.length && <EmptyTable text="لا توجد مسارات. اضبط عناوين IP أولًا." />}
        </div>
      </TableBlock>

      <div className="rounded-lg border border-line-soft bg-ink-900/30 p-2.5 text-[9px] leading-relaxed text-faint">
        <span className="text-dim">ملاحظة:</span> هذه الجداول حقيقية وتتحدث أثناء المحاكاة. جرّب مسح ARP ثم
        إعادة ping لترى طلب ARP جديدًا.
      </div>
    </div>
  );
}

function TableBlock({
  title,
  hint,
  icon,
  action,
  children,
}: {
  title: string;
  hint?: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-dim">
          <span className="text-faint">{icon}</span>
          {title}
          {hint && <span className="mono text-[8px] text-faint">({hint})</span>}
        </div>
        {action}
      </div>
      <div className="overflow-hidden rounded-lg border border-line-soft bg-ink-950/35 p-1">{children}</div>
    </section>
  );
}

function EmptyTable({ text }: { text: string }) {
  return <div className="py-2.5 text-center text-[9px] leading-relaxed text-faint">{text}</div>;
}

/* ------------------------------------------------------------------- link */

function LinkInspector({ link }: { link: NetLink }) {
  const devices = useLabStore((s) => s.devices);
  const removeLink = useLabStore((s) => s.removeLink);
  const setSelected = useLabStore((s) => s.setSelected);
  const a = devices.find((d) => d.id === link.a.deviceId);
  const b = devices.find((d) => d.id === link.b.deviceId);
  const ai = a?.interfaces.find((i) => i.id === link.a.ifaceId);
  const bi = b?.interfaces.find((i) => i.id === link.b.ifaceId);

  return (
    <div>
      <div className="border-b border-line px-3.5 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-mint-400/25 bg-mint-400/10 text-mint-300">
            {link.type === "wireless" ? <Wifi size={17} /> : <Cable size={17} />}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-mist">وصلة {link.type === "wireless" ? "لاسلكية" : "سلكية"}</div>
            <div className="mono mt-0.5 text-[9px] text-faint">{link.id}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3 p-3.5">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1.5">
          <EndpointCard
            name={a?.name ?? "?"}
            iface={ai?.name ?? "?"}
            mac={ai?.mac}
            color="#5eead4"
            onClick={() => a && setSelected({ type: "device", id: a.id })}
          />
          <ArrowLeftRight size={14} className="text-faint" />
          <EndpointCard
            name={b?.name ?? "?"}
            iface={bi?.name ?? "?"}
            mac={bi?.mac}
            color="#7dd3fc"
            onClick={() => b && setSelected({ type: "device", id: b.id })}
          />
        </div>

        <div className="rounded-lg border border-line-soft bg-ink-950/35 p-2.5 text-[9.5px] leading-relaxed text-faint">
          Ethernet هو duplex كامل: يمكن للإرسال والاستقبال أن يحدثا في نفس الوقت. عند تعطّل الوصلة ستتوقف
          شبكة البث الفرعية المرتبطة بها.
        </div>

        <div className="rounded-lg border border-line-soft bg-ink-950/35 p-2.5">
          <div className="flex items-center justify-between text-[9.5px]">
            <span className="text-faint">الحالة</span>
            <span className="flex items-center gap-1 text-mint-300">
              <span className="status-dot" data-on="true" /> متصلة
            </span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[9.5px]">
            <span className="text-faint">النوع</span>
            <span className="mono text-dim">{link.type === "wireless" ? "802.11" : "copper 1G"}</span>
          </div>
        </div>

        <button className="btn btn-danger w-full" onClick={() => removeLink(link.id)}>
          <Trash2 size={13} /> حذف الوصلة
        </button>
      </div>
    </div>
  );
}

function EndpointCard({
  name,
  iface,
  mac,
  color,
  onClick,
}: {
  name: string;
  iface: string;
  mac?: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-line-soft bg-ink-950/40 p-2 text-start transition-colors hover:border-line"
    >
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        <span className="truncate text-[10.5px] text-mist">{name}</span>
      </div>
      <div dir="ltr" className="mono mt-1 text-[8.5px] text-faint">
        {iface}
      </div>
      {mac && (
        <div dir="ltr" className="mono truncate text-[7.5px] text-faint/70">
          {mac}
        </div>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ empty */

function EmptyInspector() {
  const devices = useLabStore((s) => s.devices);
  const links = useLabStore((s) => s.links);
  const openModal = useUIStore((s) => s.openModal);
  const configured = devices.filter((d) => d.interfaces.some((i) => i.ip)).length;
  const vlans = new Set<number>();
  devices.forEach((d) => d.interfaces.forEach((i) => i.vlan && vlans.add(i.vlan)));

  return (
    <div className="space-y-3 p-3.5">
      <div className="relative overflow-hidden rounded-xl border border-line bg-gradient-to-br from-ink-750/80 to-ink-900/60 p-4">
        <div className="absolute -end-8 -top-8 h-24 w-24 rounded-full bg-mint-400/10 blur-2xl" />
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-mint-400/25 bg-mint-400/10 text-mint-300">
          <Crosshair size={18} />
        </div>
        <h3 className="mt-3 text-[13px] font-semibold text-mist">اختر جهازًا للبدء</h3>
        <p className="mt-1 text-[10px] leading-relaxed text-dim">
          انقر على أي جهاز في اللوحة لعرض إعداداته، جداوله، وفتح طرفيته. انقر على وصلة لعرض تفاصيلها.
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          <span className="chip"><CircleDot size={8} /> {devices.length} أجهزة</span>
          <span className="chip"><Link2 size={8} /> {links.length} وصلات</span>
          <span className="chip"><Check size={8} /> {configured} مهيأة</span>
        </div>
      </div>

      <div className="rounded-xl border border-line-soft bg-ink-900/40 p-3">
        <div className="eyebrow mb-2">ملخص الشبكة</div>
        <div className="space-y-2">
          <SummaryRow label="الأجهزة المهيأة" value={`${configured} / ${devices.length}`} />
          <SummaryRow label="وصلات الشبكة" value={String(links.length)} />
          <SummaryRow label="VLANs مستخدمة" value={vlans.size ? Array.from(vlans).sort((a, b) => a - b).join(", ") : "—"} />
          <SummaryRow label="أجهزة L2" value={String(devices.filter((d) => ["switch", "hub", "ap"].includes(d.kind)).length)} />
        </div>
      </div>

      <div className="rounded-xl border border-line-soft bg-ink-900/40 p-3">
        <div className="eyebrow mb-2">اختصارات سريعة</div>
        <div className="space-y-1">
          <QuickAction icon={<Terminal size={13} />} title="افتح طرفية جهاز" desc="اختر جهازًا ثم اضغط Terminal" />
          <QuickAction icon={<Play />} title="فحص الاتصال" desc="من شريط الأعلى لتشغيل اختبارات المعمل" />
          <QuickAction icon={<Link2 size={13} />} title="اسحب للتوصيل" desc="من مقبض الجهاز الجانبي إلى جهاز آخر" />
          <QuickAction icon={<Trash2 size={13} />} title="Delete" desc="لحذف الجهاز أو الوصلة المحددة" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <button className="btn h-8 text-[10px]" onClick={() => openModal({ kind: "subnet" })}>
          حاسبة Subnet
        </button>
        <button className="btn h-8 text-[10px]" onClick={() => openModal({ kind: "reference" })}>
          المرجع السريع
        </button>
      </div>

      <div className="rounded-xl border border-amber-400/15 bg-amber-400/[0.035] p-3">
        <div className="flex items-center gap-1.5 text-[10px] text-amber-200">
          <ShieldAlert size={12} /> نصيحة
        </div>
        <p className="mt-1 text-[9.5px] leading-relaxed text-amber-100/60">
          قبل اختبار أي اتصال، تأكد من أن الواجهات تحمل عناوين IP صحيحة وأن البوابات مضبوطة على الأجهزة
          الطرفية. استخدم ping ثم tracert لتحديد مكان التوقف.
        </p>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-faint">{label}</span>
      <span dir="ltr" className="mono text-mist/90">{value}</span>
    </div>
  );
}

function QuickAction({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md px-1 py-1">
      <span className="flex h-6 w-6 items-center justify-center rounded-md border border-line bg-ink-950 text-faint">
        {icon}
      </span>
      <div className="min-w-0 leading-tight">
        <div className="text-[9.5px] text-mist/90">{title}</div>
        <div className="truncate text-[8.5px] text-faint">{desc}</div>
      </div>
    </div>
  );
}

function kindColor(kind: DeviceKind): string {
  const colors: Record<DeviceKind, string> = {
    pc: "#38bdf8",
    laptop: "#7dd3fc",
    server: "#fbbf24",
    switch: "#a78bfa",
    router: "#2dd4bf",
    firewall: "#fb7185",
    ap: "#34d399",
    hub: "#94a3b8",
  };
  return colors[kind];
}
