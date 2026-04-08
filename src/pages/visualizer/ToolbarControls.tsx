import { Button } from "@/components/ui/button";
import {
  Wand2,
  Eye,
  Undo2,
  RotateCcw,
  Download,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolbarControlsProps } from "./types";

export default function ToolbarControls({
  aiMode,
  showBeforeAfter,
  historyIndex,
  hasChanges,
  landmarks,
  aiResultUrl,
  onToggleAiMode,
  onToggleCompare,
  onUndo,
  onReset,
  onDownload,
  onNewPhoto,
}: ToolbarControlsProps) {
  return (
    <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/40 bg-background/80 px-2 py-1.5 shadow-lg backdrop-blur-md">
      {/* AI Mode Toggle */}
      <Button
        variant={aiMode ? "default" : "ghost"}
        size="icon"
        className={cn(
          "h-8 w-8 rounded-full transition-all",
          aiMode && "bg-primary text-primary-foreground shadow-sm",
        )}
        onClick={onToggleAiMode}
        title={aiMode ? "AI mode ON — photorealistic" : "AI mode OFF — instant warp"}
        aria-label={aiMode ? "AI mode ON" : "AI mode OFF"}
      >
        <Wand2 className="h-4 w-4" />
      </Button>
      <div className="mx-1 h-4 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onToggleCompare}
        title={showBeforeAfter ? "Exit compare" : "Compare before/after"}
        aria-label={showBeforeAfter ? "Exit compare" : "Compare before/after"}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onUndo}
        disabled={historyIndex <= 0}
        title="Undo"
        aria-label="Undo"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onReset}
        disabled={!hasChanges}
        title="Reset all"
        aria-label="Reset all"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      <div className="mx-1 h-4 w-px bg-border" />
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onDownload}
        disabled={!landmarks && !aiResultUrl}
        title="Download result"
        aria-label="Download result"
      >
        <Download className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full"
        onClick={onNewPhoto}
        title="New photo"
        aria-label="New photo"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
