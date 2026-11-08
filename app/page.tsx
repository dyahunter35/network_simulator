"use client";

import { useEffect } from "react";
import { TopBar } from "@/components/TopBar";
import { LeftSidebar } from "@/components/LeftSidebar";
import { TopologyCanvas } from "@/components/Canvas";
import { Inspector } from "@/components/Inspector";
import { BottomDock } from "@/components/BottomDock";
import { DialogHost, WELCOME_KEY } from "@/components/Dialogs";
import { Toasts } from "@/components/Toasts";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";

export default function Page() {
  const openModal = useUIStore((s) => s.openModal);

  useEffect(() => {
    useLabStore.persist.rehydrate();

    let timer: number | undefined;
    try {
      if (!localStorage.getItem(WELCOME_KEY)) {
        timer = window.setTimeout(() => openModal({ kind: "welcome" }), 500);
      }
    } catch {
      // localStorage may be unavailable (private mode); skip the welcome dialog.
    }
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [openModal]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) {
        return;
      }
      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        const state = useUIStore.getState();
        if (!state.modal) {
          event.preventDefault();
          state.openModal({ kind: "shortcuts" });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app-bg flex h-dvh flex-col overflow-hidden">
      <TopBar />

      <main className="flex min-h-0 flex-1">
        <LeftSidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col">
            <TopologyCanvas />
          </div>
          <BottomDock />
        </div>

        <Inspector />
      </main>

      <DialogHost />
      <Toasts />
    </div>
  );
}
