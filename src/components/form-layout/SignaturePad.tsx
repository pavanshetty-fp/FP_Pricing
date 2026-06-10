import * as React from "react";
import { Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  "Signature" (Figma 27593:15012). Empty state: a dashed-free dark pad reading
  "Click or draw signature here". Drawn state: the captured strokes with a clear
  (×) control. Pointer-drawn on a <canvas>.
*/
export function SignaturePad() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const drawing = React.useRef(false);
  const [hasInk, setHasInk] = React.useState(false);

  // Size the bitmap to the element (accounting for DPR) so strokes stay crisp.
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#e5e7eb";
    }
  }, []);

  const pos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    drawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    drawing.current = false;
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
  };

  return (
    <div
      className={cn(
        "relative h-32 w-full overflow-hidden rounded-md border border-border bg-fp-surface-1a",
        !hasInk && "cursor-crosshair"
      )}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="absolute inset-0 size-full touch-none"
      />
      {!hasInk && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Pencil className="size-4" />
          Click or draw signature here
        </div>
      )}
      {hasInk && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear signature"
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
