"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import type { Toast } from "@/store/ui";

const TONE = {
  info: { icon: Info, color: "#7dd3fc" },
  success: { icon: CheckCircle2, color: "#5eead4" },
  warning: { icon: AlertTriangle, color: "#fcd34d" },
  error: { icon: XCircle, color: "#fb7185" },
} as const;

export function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  const dismiss = useUIStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[90] flex w-[330px] max-w-[calc(100vw-24px)] flex-col gap-2" dir="rtl">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} onClose={() => dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const tone = TONE[toast.tone];
  const Icon = tone.icon;
  return (
    <div className="toast animate-toast pointer-events-auto" data-tone={toast.tone}>
      <div
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border"
        style={{ color: tone.color, borderColor: `${tone.color}30`, background: `${tone.color}0f` }}
      >
        <Icon size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <div className={cn("text-[11.5px] font-semibold leading-snug text-mist")}>{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 line-clamp-3 text-[10px] leading-relaxed text-dim">
            {toast.description}
          </div>
        )}
      </div>
      <button
        className="icon-btn h-5 w-5 shrink-0 self-start"
        onClick={onClose}
        aria-label="إغلاق التنبيه"
      >
        <X size={11} />
      </button>
    </div>
  );
}
