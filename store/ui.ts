"use client";

import { create } from "zustand";

export type ModalState =
  | { kind: "welcome" }
  | { kind: "guide" }
  | { kind: "subnet" }
  | { kind: "reference"; tab?: "osi" | "protocols" | "commands" }
  | { kind: "lab"; labId: string }
  | { kind: "shortcuts" }
  | { kind: "reset" }
  | null;

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: "info" | "success" | "warning" | "error";
}

interface UIStore {
  modal: ModalState;
  toasts: Toast[];
  bottomTab: "terminal" | "events" | "packet";
  bottomOpen: boolean;
  selectedEventId: string | null;
  leftOpen: boolean;
  rightOpen: boolean;
  openModal: (modal: Exclude<ModalState, null>) => void;
  closeModal: () => void;
  toast: (title: string, description?: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  setBottomTab: (tab: "terminal" | "events" | "packet") => void;
  setBottomOpen: (open: boolean) => void;
  openEvent: (eventId: string) => void;
  setSelectedEventId: (id: string | null) => void;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (open: boolean) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  modal: null,
  toasts: [],
  bottomTab: "terminal",
  bottomOpen: true,
  selectedEventId: null,
  leftOpen: false,
  rightOpen: false,

  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),

  toast: (title, description, tone = "info") => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { id, title, description, tone }],
    }));
    setTimeout(() => get().dismissToast(id), 3800);
  },

  dismissToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  setBottomTab: (tab) => set({ bottomTab: tab, bottomOpen: true }),
  setBottomOpen: (open) => set({ bottomOpen: open }),
  openEvent: (eventId) =>
    set({ selectedEventId: eventId, bottomTab: "packet", bottomOpen: true }),
  setSelectedEventId: (id) => set({ selectedEventId: id }),
  setLeftOpen: (open) => set({ leftOpen: open }),
  setRightOpen: (open) => set({ rightOpen: open }),
}));
