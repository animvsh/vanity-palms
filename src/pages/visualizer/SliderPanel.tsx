import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wand2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/visualizer/landmarks";
import type { SliderPanelProps } from "./types";

const FEATURE_GROUPS = [
  { label: "Nose", features: FEATURES.filter((f) => f.category === "Nose") },
  { label: "Eyes", features: FEATURES.filter((f) => f.category === "Eyes") },
  { label: "Lips", features: FEATURES.filter((f) => f.category === "Lips") },
  { label: "Face", features: FEATURES.filter((f) => f.category === "Face") },
  { label: "Skin", features: FEATURES.filter((f) => f.category === "Skin") },
];

export default function SliderPanel({
  featureValues,
  landmarks,
  aiMode,
  aiStrength,
  onFeatureChange,
  onFeatureCommit,
  onAiStrengthChange,
}: SliderPanelProps) {
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-5 p-4">
        {FEATURE_GROUPS.map((group) => (
          <div key={group.label}>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </h3>
            <div className="flex flex-col gap-4">
              {group.features.map((feature) => (
                <div key={feature.id} className="group">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm text-foreground">
                      {feature.label}
                    </label>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {featureValues[feature.id] > 0 && "+"}
                      {Math.round(featureValues[feature.id] * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[featureValues[feature.id]]}
                    min={-1}
                    max={1}
                    step={0.01}
                    onValueChange={([v]) =>
                      onFeatureChange(feature.id, v)
                    }
                    onValueCommit={([v]) =>
                      onFeatureCommit(feature.id, v)
                    }
                    disabled={!landmarks}
                    className="[&_[data-disabled]]:opacity-30"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* AI Strength control */}
        {landmarks && (
          <div className="rounded-xl border border-primary/20 bg-primary/[0.02] p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary/70">
              <Wand2 className="h-3.5 w-3.5" />
              AI Generation
            </h3>
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm text-foreground">
                    Transformation Strength
                  </label>
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {Math.round(aiStrength * 100)}%
                  </span>
                </div>
                <Slider
                  value={[aiStrength]}
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  onValueChange={([v]) => onAiStrengthChange(v)}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Lower = subtle, natural. Higher = more dramatic change.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full",
                    aiMode ? "bg-green-500" : "bg-muted-foreground/30",
                  )}
                />
                <span className="text-xs text-muted-foreground">
                  {aiMode ? "AI mode active" : "AI mode off — toggle with wand button"}
                </span>
              </div>
            </div>
          </div>
        )}

        {!landmarks && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Upload a photo to enable sliders
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
