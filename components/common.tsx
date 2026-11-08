"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Laptop,
  Monitor,
  Network,
  Router,
  Server,
  Shield,
  Wifi,
} from "lucide-react";
import type { ComponentType } from "react";
import type { DeviceKind } from "@/lib/types";
import { DEVICE_META } from "@/lib/devices";
import { isValidIp } from "@/lib/ip";
import { cn } from "@/lib/format";

export type IconProps = { size?: number; className?: string; strokeWidth?: number };

const ICONS: Record<DeviceKind, ComponentType<IconProps>> = {
  pc: Monitor,
  laptop: Laptop,
  server: Server,
  switch: Network,
  router: Router,
  firewall: Shield,
  ap: Wifi,
  hub: Boxes,
};

export function DeviceGlyph({
  kind,
  size = 18,
  className,
  strokeWidth = 1.8,
}: { kind: DeviceKind } & IconProps) {
  const Icon = ICONS[kind];
  return <Icon size={size} className={className} strokeWidth={strokeWidth} />;
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div className="relative flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#24394a] bg-[#0a1219] shadow-[inset_0_1px_0_rgba(255,255,255,.04)]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M7 12h4m3-5 2.5 4M14 17l2.5-4" stroke="#5eead4" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="6" cy="12" r="2.4" stroke="#5eead4" strokeWidth="1.5" />
          <circle cx="17.5" cy="6.5" r="2.1" stroke="#5eead4" strokeWidth="1.5" />
          <circle cx="17.5" cy="17.5" r="2.1" stroke="#5eead4" strokeWidth="1.5" />
          <circle cx="6" cy="12" r="0.9" fill="#5eead4" />
        </svg>
        <span className="absolute inset-0 rounded-[10px] shadow-[0_0_24px_-6px_rgba(45,212,191,.6)]" />
      </div>
      {!compact && (
        <div className="leading-none">
          <div className="mono text-[15px] font-semibold tracking-[0.22em] text-mist">
            NET<span className="text-mint-300">LAB</span>
          </div>
          <div className="mt-1 text-[9.5px] font-medium tracking-[0.1em] text-faint">
            معمل الشبكات التفاعلي
          </div>
        </div>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      data-on={checked}
      onClick={() => onChange(!checked)}
      className={cn("toggle", disabled && "cursor-not-allowed opacity-50")}
    />
  );
}

export function IpField({
  value,
  onChange,
  placeholder = "0.0.0.0",
  disabled,
  className,
  onFocus,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onFocus?: () => void;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [invalid, setInvalid] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
    setInvalid(false);
    setDirty(false);
  }, [value]);

  const commit = () => {
    if (!dirty) return;
    if (draft.trim() === "") {
      setInvalid(false);
      onChange("");
      setDirty(false);
      return;
    }
    if (isValidIp(draft.trim())) {
      setInvalid(false);
      onChange(draft.trim());
      setDirty(false);
    } else {
      setInvalid(true);
    }
  };

  return (
    <input
      dir="ltr"
      value={draft}
      disabled={disabled}
      spellCheck={false}
      placeholder={placeholder}
      onFocus={onFocus}
      onChange={(e) => {
        setDraft(e.target.value);
        setDirty(true);
        setInvalid(false);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          (e.target as HTMLInputElement).blur();
        }
        if (e.key === "Escape") {
          setDraft(value ?? "");
          setDirty(false);
          setInvalid(false);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className={cn("field", invalid && "field-error", className)}
    />
  );
}

export function PrefixSelect({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <select
      dir="ltr"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn("field w-[70px] shrink-0 px-2 text-center", className)}
      aria-label="طول البادئة"
    >
      {Array.from({ length: 33 }, (_, i) => i).map((p) => (
        <option key={p} value={p}>
          /{p}
        </option>
      ))}
    </select>
  );
}

export function SectionTitle({
  children,
  hint,
  action,
}: {
  children: React.ReactNode;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <div>
        <div className="section-label">{children}</div>
        {hint && <div className="mt-0.5 text-[10px] text-faint">{hint}</div>}
      </div>
      {action}
    </div>
  );
}

export function ProgressRing({
  done,
  total,
  size = 34,
}: {
  done: number;
  total: number;
  size?: number;
}) {
  const r = (size - 5) / 2;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1c2938" strokeWidth="3" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#5eead4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset .45s ease" }}
        />
      </svg>
      <span className="mono absolute text-[9px] font-semibold text-mint-200">
        {done}/{total}
      </span>
    </div>
  );
}

export function KindChip({ kind, label }: { kind: DeviceKind; label?: string }) {
  const meta = DEVICE_META[kind];
  return (
    <span
      className="chip"
      style={{
        color: meta.color,
        borderColor: `${meta.color}30`,
        background: `${meta.color}10`,
      }}
    >
      <DeviceGlyph kind={kind} size={11} />
      {label ?? meta.en}
    </span>
  );
}

export function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute -top-8 start-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-ink-900 px-2 py-1 text-[10px] text-mist opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {text}
      </span>
    </span>
  );
}
