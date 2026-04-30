import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Undo2,
  RotateCcw,
  Download,
  Image as ImageIcon,
  Wand2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useVisualizerState } from "../visualizer/useVisualizerState";
import CanvasDisplay from "../visualizer/CanvasDisplay";
import PhotoUploadPanel from "../visualizer/PhotoUploadPanel";
import SliderPanel from "../visualizer/SliderPanel";
import ChatPanel from "../visualizer/ChatPanel";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Admin Visualizer — chat-first face manipulation test bench.
 *
 * The user's primary interaction is the natural-language chat on the right.
 * The chat drives all 16 face controls via the LLM bridge (MiniMax in production,
 * regex fallback otherwise). Advanced sliders are tucked into a collapsible
 * panel underneath.
 */
export default function VisualizerAdminView() {
  const state = useVisualizerState();
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="max-w-7xl animate-fade-up">
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-display-sm text-foreground">Visualizer Test Bench</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Upload a face. Describe what you want changed. The AI controls every parameter.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {state.landmarks && (
            <>
              <Button
                size="sm"
                variant={state.aiMode ? "default" : "outline"}
                className="rounded-full gap-1.5"
                onClick={() => state.setAiMode(!state.aiMode)}
                title="Toggle photorealistic AI image mode"
              >
                <Wand2 className="h-3.5 w-3.5" />
                {state.aiMode ? "AI image: ON" : "AI image: off"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full gap-1.5"
                onClick={() => state.setShowBeforeAfter(!state.showBeforeAfter)}
                disabled={!state.hasChanges && !state.aiResultUrl}
              >
                {state.showBeforeAfter ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
                Compare
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full gap-1.5"
                onClick={state.handleUndo}
                disabled={state.historyIndex <= 0}
              >
                <Undo2 className="h-3.5 w-3.5" />
                Undo
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full gap-1.5"
                onClick={state.handleReset}
                disabled={!state.hasChanges}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="rounded-full gap-1.5"
                onClick={state.handleDownload}
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full text-muted-foreground"
                onClick={state.handleNewPhoto}
              >
                New photo
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Canvas / upload */}
        <div className="apple-card relative overflow-hidden bg-black/[0.02] dark:bg-white/[0.02] min-h-[480px] flex items-center justify-center">
          {!state.sourceImage ? (
            <PhotoUploadPanel
              isDragging={state.isDragging}
              fileInputRef={state.fileInputRef}
              onDragOver={(e) => {
                e.preventDefault();
                state.setIsDragging(true);
              }}
              onDragLeave={() => state.setIsDragging(false)}
              onDrop={state.handleDrop}
              onFileChange={(e) => {
                const file = e.target.files?.[0];
                if (file) state.handleImageUpload(file);
              }}
            />
          ) : (
            <CanvasDisplay
              sourceImage={state.sourceImage}
              meshLoading={state.meshLoading}
              meshError={state.meshError}
              landmarks={state.landmarks}
              aiResultUrl={state.aiResultUrl}
              aiGenerating={state.aiGenerating}
              showBeforeAfter={state.showBeforeAfter}
              comparePosition={state.comparePosition}
              outputCanvasRef={state.outputCanvasRef}
              beforeCanvasRef={state.beforeCanvasRef}
              compareRef={state.compareRef}
              onComparePointerDown={state.handleComparePointerDown}
              onComparePointerMove={state.handleComparePointerMove}
              onComparePointerUp={state.handleComparePointerUp}
            />
          )}
        </div>

        {/* Chat-first interaction */}
        <div className="apple-card flex flex-col overflow-hidden min-h-[480px]">
          <div className="flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[12px] font-semibold uppercase tracking-wider text-foreground">
              Chat — primary interaction
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel
              chatMessages={state.chatMessages}
              chatInput={state.chatInput}
              showTyping={state.showTyping}
              aiGenerating={state.aiGenerating}
              landmarks={state.landmarks}
              suggestions={state.suggestions}
              chatEndRef={state.chatEndRef}
              onChatInputChange={state.handleChatInputChange}
              onInputKeyDown={state.handleInputKeyDown}
              onSendMessage={state.handleSendMessage}
            />
          </div>
        </div>
      </div>

      {/* Collapsible advanced controls */}
      <div className="mt-4">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-xl border border-border/40 bg-surface/30 px-4 py-3 text-[13px] font-medium text-foreground transition-colors hover:bg-surface/60",
            showAdvanced && "rounded-b-none border-b-0",
          )}
        >
          <span className="flex items-center gap-2">
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
            Advanced sliders
            <span className="text-[11px] text-muted-foreground font-normal">
              (the chat controls all of these — open only for manual override / debugging)
            </span>
          </span>
          {showAdvanced ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {showAdvanced && (
          <div className="rounded-b-xl border border-border/40 bg-surface/10">
            <SliderPanel
              featureValues={state.featureValues}
              landmarks={state.landmarks}
              aiMode={state.aiMode}
              aiStrength={state.aiStrength}
              onFeatureChange={state.handleFeatureChange}
              onFeatureCommit={state.handleFeatureCommit}
              onAiStrengthChange={state.setAiStrength}
            />
          </div>
        )}
      </div>
    </div>
  );
}
