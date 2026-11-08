"use client";

import { useMemo, useState } from "react";
import { findDeviceByName } from "@/lib/devices";
import { getLab, validateObjectives } from "@/lib/labs";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";

export function useLabProgress() {
  const devices = useLabStore((s) => s.devices);
  const links = useLabStore((s) => s.links);
  const runtime = useLabStore((s) => s.runtime);
  const tests = useLabStore((s) => s.tests);
  const activeLabId = useLabStore((s) => s.activeLabId);

  const lab = useMemo(() => getLab(activeLabId), [activeLabId]);
  const results = useMemo(
    () => validateObjectives(lab, { devices, links, runtime }, tests),
    [lab, devices, links, runtime, tests]
  );
  const done = results.filter((r) => r.done).length;
  const total = results.length;
  return { lab, results, done, total, pct: total ? done / total : 0 };
}

export function useLabChecks() {
  const [running, setRunning] = useState(false);
  const devices = useLabStore((s) => s.devices);
  const links = useLabStore((s) => s.links);
  const tests = useLabStore((s) => s.tests);
  const runtime = useLabStore((s) => s.runtime);
  const activeLabId = useLabStore((s) => s.activeLabId);
  const runPing = useLabStore((s) => s.runPing);
  const runHttp = useLabStore((s) => s.runHttp);
  const toast = useUIStore((s) => s.toast);
  const setBottomTab = useUIStore((s) => s.setBottomTab);

  const lab = useMemo(() => getLab(activeLabId), [activeLabId]);
  const results = useMemo(
    () => validateObjectives(lab, { devices, links, runtime }, tests),
    [lab, devices, links, runtime, tests]
  );

  const run = async () => {
    if (running) return;
    if (!lab.checks.length) {
      toast("لا توجد اختبارات اتصال لهذا المعمل", "يمكنك التجربة يدويًا من الطرفية.", "info");
      return;
    }
    setRunning(true);
    let pass = 0;
    const lines: string[] = [];
    for (const check of lab.checks) {
      const from = findDeviceByName({ devices, links, runtime }, check.from);
      if (!from) continue;
      const res =
        check.expect === "http"
          ? runHttp(from.id, check.target)
          : runPing(from.id, check.target, 1);
      const ok = check.expect === "fail" ? !res.ok : res.ok;
      if (ok) pass++;
      lines.push(`${ok ? "✓" : "✗"} ${check.label}`);
      await new Promise((r) => setTimeout(r, 620));
    }
    setBottomTab("events");
    if (pass === lab.checks.length) {
      toast(
        "اكتملت اختبارات الاتصال بنجاح",
        `${pass}/${lab.checks.length} — ${lines.join(" · ")}`,
        "success"
      );
    } else {
      toast(
        `نجح ${pass} من ${lab.checks.length} اختبارات`,
        lines.join(" · "),
        "warning"
      );
    }
    setRunning(false);
  };

  return { running, run, results, lab };
}
