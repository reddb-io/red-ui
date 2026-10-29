/** Pointer navigation shared by the native SVG adapters; canvas uses its own camera. */
export interface GraphViewport {
  ratio: number;
  x: number;
  y: number;
}
export function graphZoomRatio(value: number): number {
  return Number.isFinite(value) ? Math.max(0.125, Math.min(2, value)) : 1;
}
export function graphViewBox(
  width: number,
  height: number,
  view: GraphViewport,
): string {
  return `${(width * (1 - view.ratio)) / 2 + view.x} ${(height * (1 - view.ratio)) / 2 + view.y} ${width * view.ratio} ${height * view.ratio}`;
}
export function attachGraphViewport(
  svg: SVGSVGElement,
  read: () => { width: number; height: number; view: GraphViewport },
  write: (view: GraphViewport) => void,
): () => void {
  let drag:
    { id: number; x: number; y: number; view: GraphViewport } | undefined;
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    const { view } = read();
    write({
      ...view,
      ratio: graphZoomRatio(view.ratio * (event.deltaY > 0 ? 1.15 : 1 / 1.15)),
    });
  };
  const down = (event: PointerEvent) => {
    if (
      event.button !== 0 ||
      (event.target as Element).closest('[role="button"]')
    )
      return;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      view: read().view,
    };
    svg.setPointerCapture?.(event.pointerId);
  };
  const move = (event: PointerEvent) => {
    if (!drag || event.pointerId !== drag.id) return;
    const { width, height } = read(),
      box = svg.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const scale = Math.min(box.width / width, box.height / height);
    write({
      ratio: drag.view.ratio,
      x: drag.view.x - ((event.clientX - drag.x) * drag.view.ratio) / scale,
      y: drag.view.y - ((event.clientY - drag.y) * drag.view.ratio) / scale,
    });
  };
  const up = (event: PointerEvent) => {
    if (drag?.id !== event.pointerId) return;
    if (svg.hasPointerCapture?.(event.pointerId))
      svg.releasePointerCapture(event.pointerId);
    drag = undefined;
  };
  svg.addEventListener("wheel", wheel, { passive: false });
  svg.addEventListener("pointerdown", down);
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerup", up);
  svg.addEventListener("pointercancel", up);
  return () => {
    svg.removeEventListener("wheel", wheel);
    svg.removeEventListener("pointerdown", down);
    svg.removeEventListener("pointermove", move);
    svg.removeEventListener("pointerup", up);
    svg.removeEventListener("pointercancel", up);
    drag = undefined;
  };
}
