import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MessageSquare,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import PhotoUploadWizard from "@/components/PhotoUploadWizard";

import { useVisualizerState } from "./visualizer/useVisualizerState";
import CanvasDisplay from "./visualizer/CanvasDisplay";
import ToolbarControls from "./visualizer/ToolbarControls";
import PhotoUploadPanel from "./visualizer/PhotoUploadPanel";
import SliderPanel from "./visualizer/SliderPanel";
import ChatPanel from "./visualizer/ChatPanel";

export default function Visualizer() {
  const state = useVisualizerState();

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      <SEOHead
        title="AI Visualization"
        description="Preview your potential cosmetic procedure results with AI-powered facial visualization. Upload a photo and see realistic predictions before booking a consultation."
        path="/visualizer"
      />
      {/* Left: Canvas / Upload Zone */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-black/[0.02] dark:bg-white/[0.02] min-h-[40vh] md:min-h-0">
        {!state.wizardComplete ? (
          <PhotoUploadWizard
            detect={state.detect}
            meshLoading={state.meshLoading}
            onComplete={state.handleWizardComplete}
          />
        ) : !state.sourceImage ? (
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
          <>
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
            <ToolbarControls
              aiMode={state.aiMode}
              showBeforeAfter={state.showBeforeAfter}
              historyIndex={state.historyIndex}
              hasChanges={state.hasChanges}
              landmarks={state.landmarks}
              aiResultUrl={state.aiResultUrl}
              onToggleAiMode={() => state.setAiMode(!state.aiMode)}
              onToggleCompare={() => state.setShowBeforeAfter(!state.showBeforeAfter)}
              onUndo={state.handleUndo}
              onReset={state.handleReset}
              onDownload={state.handleDownload}
              onNewPhoto={state.handleNewPhoto}
            />
          </>
        )}
      </div>

      {/* Right: Chat + Sliders Panel */}
      <div className="flex w-full md:w-[380px] flex-col border-t md:border-t-0 md:border-l border-border/40 bg-background lg:w-[420px] min-h-[40vh] md:min-h-0">
        <Tabs value={state.activeTab} onValueChange={state.setActiveTab} className="flex h-full flex-col">
          <div className="flex items-center border-b border-border/40 px-4 py-2">
            <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
              <TabsTrigger value="chat" className="gap-1.5 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="sliders" className="gap-1.5 text-xs">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Sliders
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex flex-1 flex-col overflow-hidden m-0">
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
          </TabsContent>

          <TabsContent value="sliders" className="flex-1 overflow-hidden m-0">
            <SliderPanel
              featureValues={state.featureValues}
              landmarks={state.landmarks}
              aiMode={state.aiMode}
              aiStrength={state.aiStrength}
              onFeatureChange={state.handleFeatureChange}
              onFeatureCommit={state.handleFeatureCommit}
              onAiStrengthChange={state.setAiStrength}
            />
          </TabsContent>
        </Tabs>

        {/* CTA: Bridge Visualize -> Compare/Book */}
        {state.landmarks && (
          <div className="mx-4 mb-4 rounded-xl border border-border/40 bg-primary/[0.03] p-4">
            <p className="text-[13px] font-semibold text-foreground mb-1">
              Ready for the next step?
            </p>
            <p className="text-[12px] text-muted-foreground mb-3">
              Find providers who specialize in the procedures you're exploring.
            </p>
            <div className="flex flex-col gap-2">
              <Link to="/providers">
                <Button size="sm" className="w-full rounded-full text-[13px] gap-1.5">
                  Find Providers
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <Link to="/providers" className="text-center text-[12px] text-muted-foreground hover:text-foreground transition-colors">
                or compare providers side-by-side
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
