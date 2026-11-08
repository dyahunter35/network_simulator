"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Cable,
  Crosshair,
  Hand,
  Layers,
  Link2,
  LocateFixed,
  Maximize2,
  MousePointer2,
  Plus,
  Trash2,
  Wifi,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { DEVICE_META, findDevice, freeIfaces, usedIfaceIds } from "@/lib/devices";
import { cn } from "@/lib/format";
import { setCanvasCenter, setCanvasZoom } from "@/lib/canvasBus";
import { useLabStore } from "@/store/lab";
import { useUIStore } from "@/store/ui";
import { DeviceGlyph } from "@/components/common";
import type { Device, NetLink } from "@/lib/types";

const NODE_W = 190;
const NODE_H = 104;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.8;

interface Viewport {
  x: number;
  y: number;
  k: number;
}

interface Point {
  x: number;
  y: number;
}

interface DragState {
  id: string;
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  moved: boolean;
}

interface PanState {
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

interface ConnectState {
  sourceId: string;
  ifaceId: string;
  x: number;
  y: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function centerOf(device: { x: number; y: number }): Point {
  return { x: device.x + NODE_W / 2, y: device.y + NODE_H / 2 };
}

function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function curveBetween(a: Point, b: Point, seed: string) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const dir = hashString(seed) % 2 === 0 ? 1 : -1;
  const bend = Math.min(34, dist * 0.11) * dir;
  const c1 = { x: a.x + dx / 3 + nx * bend, y: a.y + dy / 3 + ny * bend };
  const c2 = { x: a.x + (2 * dx) / 3 + nx * bend, y: a.y + (2 * dy) / 3 + ny * bend };
  const d = `M ${a.x} ${a.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${b.x} ${b.y}`;
  return { d, c1, c2, bend };
}

function buildMotionPath(
  devices: Device[],
  pathIds: string[],
  links: NetLink[]
): { d: string; segments: number } {
  const map = new Map(devices.map((d) => [d.id, d]));
  const points = pathIds.map((id) => map.get(id)).filter(Boolean) as Device[];
  if (points.length < 2) return { d: "", segments: 0 };
  let d = `M ${centerOf(points[0]).x} ${centerOf(points[0]).y}`;
  let segments = 0;
  for (let i = 1; i < points.length; i++) {
    const from = points[i - 1];
    const to = points[i];
    const a = centerOf(from);
    const b = centerOf(to);
    const link = links.find(
      (l) =>
        (l.a.deviceId === from.id && l.b.deviceId === to.id) ||
        (l.b.deviceId === from.id && l.a.deviceId === to.id)
    );
    if (link) {
      const geo = curveBetween(a, b, link.id);
      d += ` C ${geo.c1.x} ${geo.c1.y} ${geo.c2.x} ${geo.c2.y} ${b.x} ${b.y}`;
    } else {
      d += ` L ${b.x} ${b.y}`;
    }
    segments += 1;
  }
  return { d, segments };
}

export function TopologyCanvas() {
  const devices = useLabStore((s) => s.devices);
  const links = useLabStore((s) => s.links);
  const runtime = useLabStore((s) => s.runtime);
  const selected = useLabStore((s) => s.selected);
  const animation = useLabStore((s) => s.animation);
  const activeLabId = useLabStore((s) => s.activeLabId);
  const setSelected = useLabStore((s) => s.setSelected);
  const addLinkBetween = useLabStore((s) => s.addLinkBetween);
  const removeLink = useLabStore((s) => s.removeLink);
  const updateDevice = useLabStore((s) => s.updateDevice);
  const deleteSelected = useLabStore((s) => s.deleteSelected);
  const setAnimation = useLabStore((s) => s.setAnimation);
  const addDevice = useLabStore((s) => s.addDevice);
  const toast = useUIStore((s) => s.toast);
  const setBottomTab = useUIStore((s) => s.setBottomTab);
  const setRightOpen = useUIStore((s) => s.setRightOpen);

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, k: 1 });
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [panning, setPanning] = useState<PanState | null>(null);
  const [connecting, setConnecting] = useState<ConnectState | null>(null);
  const [hoverLink, setHoverLink] = useState<string | null>(null);
  const vpRef = useRef(viewport);
  vpRef.current = viewport;

  const fitRef = useRef<() => void>(() => {});

  const fit = () => {
    if (!size.w || !size.h) return;
    if (!devices.length) {
      setViewport({ x: 0, y: 0, k: 1 });
      return;
    }
    const minX = Math.min(...devices.map((d) => d.x));
    const minY = Math.min(...devices.map((d) => d.y));
    const maxX = Math.max(...devices.map((d) => d.x + NODE_W));
    const maxY = Math.max(...devices.map((d) => d.y + NODE_H));
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const pad = 72;
    const k = clamp(
      Math.min((size.w - pad * 2) / bw, (size.h - pad * 2) / bh, 1.05),
      MIN_ZOOM,
      1.05
    );
    setViewport({
      k,
      x: (size.w - bw * k) / 2 - minX * k,
      y: (size.h - bh * k) / 2 - minY * k,
    });
  };
  fitRef.current = fit;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ w: rect.width, h: rect.height });
    });
    observer.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => observer.disconnect();
  }, []);

  // Keep the topology framed while the viewport settles, but stop once the
  // user pans, zooms or drags so we never fight their manual view.
  const manualView = useRef(false);
  useEffect(() => {
    if (size.w > 0 && size.h > 0 && !manualView.current) {
      fitRef.current();
    }
  }, [size.w, size.h]);

  const lastLab = useRef(activeLabId);
  useEffect(() => {
    if (lastLab.current !== activeLabId) {
      lastLab.current = activeLabId;
      manualView.current = false;
      requestAnimationFrame(() => fitRef.current());
    }
  }, [activeLabId]);

  useEffect(() => {
    if (!size.w || !size.h) return;
    setCanvasCenter(
      (size.w / 2 - viewport.x) / viewport.k,
      (size.h / 2 - viewport.y) / viewport.k
    );
    setCanvasZoom(viewport.k);
  }, [size.w, size.h, viewport]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (event: WheelEvent) => {
      event.preventDefault();
      manualView.current = true;
      const rect = el.getBoundingClientRect();
      const mx = event.clientX - rect.left;
      const my = event.clientY - rect.top;
      const vp = vpRef.current;
      const factor = event.deltaY < 0 ? 1.12 : 0.89;
      const k = clamp(vp.k * factor, MIN_ZOOM, MAX_ZOOM);
      const wx = (mx - vp.x) / vp.k;
      const wy = (my - vp.y) / vp.k;
      setViewport({ k, x: mx - wx * k, y: my - wy * k });
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable ||
        useUIStore.getState().modal
      ) {
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
        setConnecting(null);
      }
      if (event.key === "Escape") {
        setConnecting(null);
        setDragging(null);
        setPanning(null);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, setSelected]);

  useEffect(() => {
    if (!animation) return;
    const reqDur = Math.min(4, Math.max(1, requestDuration(animation.requestPath)));
    const replyDur = animation.replyPath.length > 1 ? requestDuration(animation.replyPath) : 0;
    const total = (reqDur + replyDur + 1.4) * 1000;
    const timer = setTimeout(() => {
      if (useLabStore.getState().animation?.id === animation.id) setAnimation(null);
    }, total);
    return () => clearTimeout(timer);
  }, [animation, setAnimation]);

  const positions = useMemo(() => {
    const map = new Map<string, { x: number; y: number }>();
    for (const d of devices) map.set(d.id, { x: d.x, y: d.y });
    if (dragging) map.set(dragging.id, { x: dragging.x, y: dragging.y });
    return map;
  }, [devices, dragging]);

  const deviceById = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);

  const screenToWorld = (clientX: number, clientY: number): Point => {
    const rect = containerRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewport.x) / viewport.k,
      y: (clientY - rect.top - viewport.y) / viewport.k,
    };
  };

  const beginNodeDrag = (event: ReactPointerEvent<HTMLDivElement>, device: Device) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    setSelected({ type: "device", id: device.id });
    const world = screenToWorld(event.clientX, event.clientY);
    setDragging({
      id: device.id,
      offsetX: world.x - device.x,
      offsetY: world.y - device.y,
      x: device.x,
      y: device.y,
      moved: false,
    });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const beginConnect = (
    event: ReactPointerEvent<HTMLButtonElement>,
    device: Device
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const free = freeIfaces({ devices, links, runtime }, device.id);
    if (!free.length) {
      toast("لا توجد منافذ شاغرة", `كل منافذ ${device.name} مستخدمة. احذف وصلة أولًا.`, "warning");
      return;
    }
    const world = screenToWorld(event.clientX, event.clientY);
    setConnecting({ sourceId: device.id, ifaceId: free[0].id, x: world.x, y: world.y });
    setSelected({ type: "device", id: device.id });
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging) {
      manualView.current = true;
      const world = screenToWorld(event.clientX, event.clientY);
      setDragging((prev) =>
        prev
          ? {
              ...prev,
              x: Math.round(world.x - prev.offsetX),
              y: Math.round(world.y - prev.offsetY),
              moved: true,
            }
          : prev
      );
      return;
    }
    if (panning) {
      manualView.current = true;
      setViewport((vp) => ({
        ...vp,
        x: panning.originX + (event.clientX - panning.startX),
        y: panning.originY + (event.clientY - panning.startY),
      }));
      return;
    }
    if (connecting) {
      const world = screenToWorld(event.clientX, event.clientY);
      setConnecting((prev) => (prev ? { ...prev, x: world.x, y: world.y } : prev));
    }
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragging) {
      if (dragging.moved) {
        updateDevice(dragging.id, { x: dragging.x, y: dragging.y });
      } else if (window.matchMedia("(max-width: 1180px)").matches) {
        // On narrow screens the inspector is a drawer; open it on tap.
        setRightOpen(true);
      }
      setDragging(null);
    }
    if (panning) setPanning(null);
    if (connecting) {
      const targetEl = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-node-id]") as HTMLElement | null;
      const targetId = targetEl?.dataset.nodeId;
      const source = deviceById.get(connecting.sourceId);
      if (targetId && targetId !== connecting.sourceId) {
        const target = deviceById.get(targetId);
        const success = addLinkBetween(connecting.sourceId, targetId, connecting.ifaceId);
        if (!success && source && target) {
          const already = links.some(
            (l) =>
              (l.a.deviceId === source.id && l.b.deviceId === target.id) ||
              (l.b.deviceId === source.id && l.a.deviceId === target.id)
          );
          if (already) {
            toast("الجهازان موصولان بالفعل", "لا يمكن إنشاء وصلة مكررة بين نفس الجهازين.", "info");
          } else if (!freeIfaces({ devices, links, runtime }, target.id).length) {
            toast("لا توجد منافذ شاغرة", `كل منافذ ${target.name} مستخدمة.`, "warning");
          } else {
            toast("تعذر إنشاء الوصلة", "تحقق من المنافذ المتاحة.", "warning");
          }
        } else if (success && source) {
          toast("تم إنشاء الوصلة", `${source.name} أصبح متصلًا بالشبكة.`, "success");
        }
      }
      setConnecting(null);
    }
  };

  const zoomBy = (factor: number) => {
    manualView.current = true;
    setViewport((vp) => {
      const k = clamp(vp.k * factor, MIN_ZOOM, MAX_ZOOM);
      const cx = size.w / 2;
      const cy = size.h / 2;
      const wx = (cx - vp.x) / vp.k;
      const wy = (cy - vp.y) / vp.k;
      return { k, x: cx - wx * k, y: cy - wy * k };
    });
  };

  const empty = devices.length === 0;

  return (
    <div
      ref={containerRef}
      className="canvas-shell relative min-h-0 flex-1 touch-none select-none"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        if (target.closest("[data-node-id]") || target.closest("[data-no-pan]")) return;
        setSelected(null);
        setPanning({
          startX: event.clientX,
          startY: event.clientY,
          originX: viewport.x,
          originY: viewport.y,
        });
        containerRef.current?.setPointerCapture(event.pointerId);
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={(event) => {
        const target = event.target as HTMLElement;
        if (!target.closest("[data-node-id]") && !target.closest("[data-no-pan]")) {
          fitRef.current();
        }
      }}
    >
      <div
        className="canvas-grid"
        style={{
          backgroundSize: `${24 * viewport.k}px ${24 * viewport.k}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
      />
      <div className="canvas-vignette" />
      <div className="sweep-line" />

      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.k})`}>
          {links.map((link) => {
            const a = deviceById.get(link.a.deviceId);
            const b = deviceById.get(link.b.deviceId);
            if (!a || !b) return null;
            const pa = positions.get(a.id) ?? { x: a.x, y: a.y };
            const pb = positions.get(b.id) ?? { x: b.x, y: b.y };
            const geo = curveBetween(
              { x: pa.x + NODE_W / 2, y: pa.y + NODE_H / 2 },
              { x: pb.x + NODE_W / 2, y: pb.y + NODE_H / 2 },
              link.id
            );
            const isSelected = selected?.type === "link" && selected.id === link.id;
            const isHover = hoverLink === link.id;
            const wireless = link.type === "wireless";
            return (
              <g key={link.id}>
                <path
                  d={geo.d}
                  fill="none"
                  stroke="#03070b"
                  strokeWidth={6}
                  strokeLinecap="round"
                  opacity={0.9}
                />
                <path
                  d={geo.d}
                  className="net-link"
                  data-selected={isSelected}
                  stroke={
                    isSelected
                      ? "#5eead4"
                      : isHover
                        ? wireless
                          ? "#5eead4"
                          : "#3d5a72"
                        : wireless
                          ? "rgba(45,212,191,.42)"
                          : "#2a4154"
                  }
                  strokeWidth={isSelected ? 2.4 : wireless ? 1.7 : 2}
                  strokeLinecap="round"
                  strokeDasharray={wireless ? "3 6" : undefined}
                />
                <path
                  d={geo.d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ pointerEvents: "stroke", cursor: "pointer" }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setSelected({ type: "link", id: link.id });
                  }}
                  onPointerEnter={() => setHoverLink(link.id)}
                  onPointerLeave={() => setHoverLink(null)}
                />
              </g>
            );
          })}

          {connecting && (() => {
            const source = deviceById.get(connecting.sourceId);
            if (!source) return null;
            const pos = positions.get(source.id) ?? { x: source.x, y: source.y };
            return (
              <path
                d={`M ${pos.x + NODE_W / 2} ${pos.y + NODE_H / 2} L ${connecting.x} ${connecting.y}`}
                fill="none"
                stroke="#5eead4"
                strokeWidth={1.6}
                strokeDasharray="5 5"
                opacity={0.8}
              />
            );
          })()}

          {animation && (() => {
            const color = animation.ok
              ? animation.kind === "http"
                ? "#7dd3fc"
                : animation.kind === "trace"
                  ? "#fcd34d"
                  : "#5eead4"
              : "#fb7185";
            const req = buildMotionPath(devices, animation.requestPath, links);
            const reply = buildMotionPath(devices, animation.replyPath, links);
            const reqDur = Math.min(4, Math.max(0.9, req.segments * 0.55 + 0.2));
            const replyDur = Math.min(4, Math.max(0.9, reply.segments * 0.55 + 0.2));
            return (
              <g key={animation.id}>
                {req.d && (
                  <path
                    d={req.d}
                    className="packet-trail"
                    stroke={color}
                    opacity={0.55}
                  />
                )}
                {reply.d && (
                  <path
                    d={reply.d}
                    className="packet-trail"
                    stroke="#7dd3fc"
                    opacity={0.35}
                    style={{ animationDelay: ".25s" }}
                  />
                )}
                {req.d && (
                  <g opacity={0}>
                    <animateMotion
                      dur={`${reqDur}s`}
                      begin="0.1s"
                      fill="freeze"
                      {...({ path: req.d } as Record<string, string>)}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      keyTimes="0;.06;.88;1"
                      dur={`${reqDur}s`}
                      begin="0.1s"
                      fill="freeze"
                    />
                    <circle r={10} fill={color} opacity={0.14} />
                    <circle r={4.4} fill={color} />
                    <circle r={1.6} fill="#04110f" />
                  </g>
                )}
                {reply.d && (
                  <g opacity={0}>
                    <animateMotion
                      dur={`${replyDur}s`}
                      begin={`${0.1 + reqDur + 0.15}s`}
                      fill="freeze"
                      {...({ path: reply.d } as Record<string, string>)}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      keyTimes="0;.06;.88;1"
                      dur={`${replyDur}s`}
                      begin={`${0.1 + reqDur + 0.15}s`}
                      fill="freeze"
                    />
                    <circle r={9} fill="#7dd3fc" opacity={0.14} />
                    <circle r={3.8} fill="#7dd3fc" />
                  </g>
                )}
              </g>
            );
          })()}

          {selected?.type === "link" && (() => {
            const link = links.find((l) => l.id === selected.id);
            if (!link) return null;
            const a = deviceById.get(link.a.deviceId);
            const b = deviceById.get(link.b.deviceId);
            if (!a || !b) return null;
            const pa = positions.get(a.id) ?? { x: a.x, y: a.y };
            const pb = positions.get(b.id) ?? { x: b.x, y: b.y };
            const geo = curveBetween(
              { x: pa.x + NODE_W / 2, y: pa.y + NODE_H / 2 },
              { x: pb.x + NODE_W / 2, y: pb.y + NODE_H / 2 },
              link.id
            );
            const mid = {
              x: (pa.x + pb.x) / 2 + NODE_W / 2 + geo.bend * 0.6,
              y: (pa.y + pb.y) / 2 + NODE_H / 2 + geo.bend * 0.2,
            };
            return (
              <g transform={`translate(${mid.x} ${mid.y})`}>
                <rect x={-10} y={-10} width={20} height={20} rx={10} fill="#0b1219" stroke="#5eead4" strokeWidth={1} />
                <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke="#fb7185" strokeWidth={1.4} strokeLinecap="round" />
                <rect
                  x={-10}
                  y={-10}
                  width={20}
                  height={20}
                  rx={10}
                  fill="transparent"
                  style={{ pointerEvents: "all", cursor: "pointer" }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    removeLink(link.id);
                  }}
                />
              </g>
            );
          })()}
        </g>
      </svg>

      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.k})`,
          transformOrigin: "0 0",
        }}
      >
        {devices.map((device) => {
          const pos = positions.get(device.id) ?? { x: device.x, y: device.y };
          const meta = DEVICE_META[device.kind];
          const used = usedIfaceIds({ devices, links, runtime }, device.id);
          const ip = device.interfaces.find((i) => i.ip)?.ip;
          const prefix = device.interfaces.find((i) => i.ip)?.prefix;
          const waitingDhcp = !ip && device.interfaces.some((i) => i.dhcp);
          const isSelected = selected?.type === "device" && selected.id === device.id;
          const portCount = device.interfaces.length;
          const extraIps = device.interfaces.filter((i) => i.ip).length - 1;
          return (
            <div
              key={device.id}
              data-node-id={device.id}
              className="net-node pointer-events-auto"
              data-selected={isSelected}
              data-target={Boolean(connecting) && connecting!.sourceId !== device.id && freeIfaces({ devices, links, runtime }, device.id).length > 0}
              style={{
                left: pos.x,
                top: pos.y,
                ["--node-accent" as string]: meta.color,
              }}
              onPointerDown={(event) => {
                if ((event.target as HTMLElement).closest("[data-handle]")) return;
                beginNodeDrag(event, device);
              }}
              onDoubleClick={(event) => {
                event.stopPropagation();
                setSelected({ type: "device", id: device.id });
                setBottomTab("terminal");
              }}
            >
              <div className="node-glow" />
              <div className="p-2.5">
                <div className="flex items-start gap-2">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border"
                    style={{
                      color: meta.color,
                      borderColor: `${meta.color}38`,
                      background: `${meta.color}12`,
                    }}
                  >
                    <DeviceGlyph kind={device.kind} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-[12px] font-semibold text-mist">
                        {device.name}
                      </span>
                      <span
                        className="status-dot"
                        data-on={Boolean(ip) || device.kind === "switch" || device.kind === "hub" || device.kind === "ap"}
                      />
                    </div>
                    <div className="mt-0.5 flex items-center gap-1 text-[9px] text-faint">
                      <span>{meta.label}</span>
                      <span className="opacity-40">/</span>
                      <span className="mono">{meta.en}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-1 rounded-md border border-line-soft bg-ink-950/55 px-1.5 py-[3px]">
                  <span
                    dir="ltr"
                    className={cn(
                      "mono truncate text-[10px]",
                      ip ? "text-mist/90" : waitingDhcp ? "text-amber-300/90" : "text-faint"
                    )}
                  >
                    {ip ? `${ip}${prefix !== undefined ? `/${prefix}` : ""}` : waitingDhcp ? "DHCP pending…" : "no ip address"}
                  </span>
                  {extraIps > 0 && (
                    <span className="mono shrink-0 text-[8px] text-mint-300/80">+{extraIps}</span>
                  )}
                </div>

                <div className="mt-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-[3px]">
                    {device.interfaces.slice(0, 8).map((iface) => (
                      <span
                        key={iface.id}
                        className="node-port"
                        data-used={used.has(iface.id)}
                        title={`${iface.name}${iface.vlan ? ` · VLAN ${iface.vlan}` : ""}${used.has(iface.id) ? " · متصل" : " · شاغر"}`}
                      />
                    ))}
                    {portCount > 8 && (
                      <span className="mono ms-1 text-[8px] text-faint">+{portCount - 8}</span>
                    )}
                  </div>
                  <span className="mono text-[8px] text-faint">
                    {used.size}/{portCount}
                  </span>
                </div>
              </div>

              <button
                data-handle
                type="button"
                aria-label={`توصيل ${device.name}`}
                className="connect-handle"
                data-active={connecting?.sourceId === device.id}
                onPointerDown={(event) => beginConnect(event, device)}
                title="اسحب للتوصيل بجهاز آخر"
              >
                <Link2 size={9} />
              </button>
            </div>
          );
        })}
      </div>

      {empty && (
        <div data-no-pan className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-line bg-ink-900/85 p-6 text-center shadow-2xl backdrop-blur">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-mint-400/25 bg-mint-400/10 text-mint-300">
              <Layers size={22} />
            </div>
            <h2 className="mt-3 text-[15px] font-semibold text-mist">مساحة العمل فارغة</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-dim">
              ابدأ بإضافة جهازين ومبدّل، ثم اسحب من مقبض الجهاز للتوصيل. أو حمّل معملًا جاهزًا.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                className="btn btn-primary"
                onClick={() => {
                  addDevice("switch", screenToWorld(size.w / 2, size.h / 2));
                }}
              >
                <Plus size={13} /> أضف مبدّلًا
              </button>
              <button
                className="btn"
                onClick={() => useUIStore.getState().setLeftOpen(true)}
              >
                المعامل
              </button>
            </div>
          </div>
        </div>
      )}

      <div data-no-pan className="absolute bottom-3 start-3 z-20 flex items-center gap-0.5 rounded-lg border border-line bg-ink-900/85 p-1 shadow-xl backdrop-blur">
        <button className="icon-btn h-7 w-7" aria-label="تصغير" onClick={() => zoomBy(0.88)}>
          <ZoomOut size={14} />
        </button>
        <button
          className="mono h-7 min-w-[44px] rounded-md px-1 text-[10px] text-dim hover:bg-ink-700 hover:text-mist"
          onClick={() => fitRef.current()}
          title="ملاءمة الشاشة"
        >
          {Math.round(viewport.k * 100)}%
        </button>
        <button className="icon-btn h-7 w-7" aria-label="تكبير" onClick={() => zoomBy(1.14)}>
          <ZoomIn size={14} />
        </button>
        <span className="mx-0.5 h-4 w-px bg-line" />
        <button className="icon-btn h-7 w-7" aria-label="ملاءمة الشاشة" onClick={() => fitRef.current()}>
          <Maximize2 size={13} />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-3 end-3 z-20 hidden items-center gap-3 rounded-lg border border-line bg-ink-900/70 px-2.5 py-1.5 backdrop-blur md:flex">
        <span className="flex items-center gap-1.5 text-[9px] text-faint">
          <span className="inline-block h-px w-5 bg-[#2a4154]" /> كابل
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-faint">
          <span className="inline-block h-px w-5 border-t border-dashed border-mint-400/60" /> لاسلكي
        </span>
        <span className="h-3 w-px bg-line" />
        <span className="flex items-center gap-1 text-[9px] text-faint">
          <MousePointer2 size={10} /> اسحب للتوصيل
        </span>
      </div>

      {!empty && (
        <div className="pointer-events-none absolute inset-x-0 bottom-14 hidden justify-center md:flex">
          <div className="flex items-center gap-2 rounded-full border border-line-soft bg-ink-950/55 px-3 py-1 text-[9.5px] text-faint backdrop-blur">
            <Hand size={11} />
            اسحب مساحة العمل للتنقل · عجلة الفأرة للتكبير · Delete للحذف
          </div>
        </div>
      )}
    </div>
  );
}

function requestDuration(path: string[]) {
  return Math.min(4, Math.max(0.9, path.length * 0.45 + 0.2));
}
