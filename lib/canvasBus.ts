export const canvasView = {
  center: { x: 520, y: 340 },
  zoom: 1,
};

export function setCanvasCenter(x: number, y: number) {
  canvasView.center = { x, y };
}

export function setCanvasZoom(zoom: number) {
  canvasView.zoom = zoom;
}
