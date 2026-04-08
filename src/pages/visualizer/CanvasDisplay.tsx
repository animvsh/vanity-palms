import { ChevronRight } from "lucide-react";
import type { CanvasDisplayProps } from "./types";

function Disclaimer() {
  return (
    <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-2 pointer-events-none select-none backdrop-blur-sm">
      <span className="h-4 w-4 shrink-0 text-amber-500/70 inline-flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
      </span>
      <p className="text-[11px] leading-tight text-amber-700/80 dark:text-amber-400/80">
        <span className="font-semibold">AI Prediction Only</span> — Results shown are simulated previews, not actual surgical outcomes. Consult a board-certified provider.
      </p>
    </div>
  );
}

export default function CanvasDisplay({
  sourceImage,
  meshLoading,
  meshError,
  landmarks,
  aiResultUrl,
  aiGenerating,
  showBeforeAfter,
  comparePosition,
  outputCanvasRef,
  beforeCanvasRef,
  compareRef,
  onComparePointerDown,
  onComparePointerMove,
  onComparePointerUp,
}: CanvasDisplayProps) {
  if (!sourceImage) return null;

  return (
    <div className="relative flex h-full w-full items-center justify-center p-4">
      {/* Loading overlay */}
      {meshLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm text-muted-foreground">
              Detecting face landmarks...
            </span>
          </div>
        </div>
      )}

      {/* Error display */}
      {meshError && (
        <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {meshError}
        </div>
      )}

      {/* Before/After compare mode */}
      {showBeforeAfter ? (
        <div
          ref={compareRef}
          className="relative h-full w-full cursor-col-resize select-none overflow-hidden touch-none"
          onPointerDown={onComparePointerDown}
          onPointerMove={onComparePointerMove}
          onPointerUp={onComparePointerUp}
          onPointerCancel={onComparePointerUp}
        >
          {/* Before (original) -- full width behind */}
          <canvas
            ref={beforeCanvasRef}
            className="absolute inset-0 h-full w-full object-contain"
            style={{ objectFit: "contain" }}
          />

          {/* After (warped) -- clipped from left */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${comparePosition}%` }}
          >
            <canvas
              ref={outputCanvasRef}
              className="h-full object-contain"
              style={{
                objectFit: "contain",
                width: compareRef.current
                  ? `${compareRef.current.offsetWidth}px`
                  : "100%",
                height: "100%",
              }}
            />
          </div>

          {/* Divider line */}
          <div
            className="absolute top-0 bottom-0 z-10 w-0.5 bg-white/90 shadow-[0_0_8px_rgba(255,255,255,0.4)]"
            style={{ left: `${comparePosition}%` }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-0.5 rounded-full bg-white px-2 py-1.5 shadow-lg ring-1 ring-black/10">
              <ChevronRight className="h-3.5 w-3.5 text-black/70 rotate-180" />
              <div className="h-4 w-px bg-black/20" />
              <ChevronRight className="h-3.5 w-3.5 text-black/70" />
            </div>
          </div>

          {/* Labels */}
          <div className="absolute bottom-4 left-4 rounded-full bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground shadow-lg backdrop-blur-sm">
            After
          </div>
          <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white shadow-lg backdrop-blur-sm">
            Before
          </div>
        </div>
      ) : (
        /* Normal view -- just the warped output */
        <canvas
          ref={outputCanvasRef}
          className="max-h-full max-w-full object-contain"
        />
      )}

      {/* AI generating overlay */}
      {aiGenerating && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-primary/20 bg-background/90 px-4 py-2 shadow-lg backdrop-blur-md">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm font-medium text-foreground">Generating AI preview...</span>
        </div>
      )}

      {/* Disclaimer -- always visible when image is loaded */}
      {(landmarks || aiResultUrl) && <Disclaimer />}
    </div>
  );
}
