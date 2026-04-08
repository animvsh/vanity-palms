import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Camera,
  ChevronRight,
  ChevronLeft,
  Check,
  RotateCcw,
  AlertCircle,
  Loader2,
  User,
} from "lucide-react";
import type { Landmark } from "@/visualizer/landmarks";

// ── Types ──────────────────────────────────────────────────

export type PhotoAngle = "frontal" | "left_profile" | "right_profile";

export interface PhotoEntry {
  file: File;
  objectUrl: string;
  image: HTMLImageElement;
  landmarks: Landmark[] | null;
}

export type PhotoSet = Partial<Record<PhotoAngle, PhotoEntry>>;

interface PhotoUploadWizardProps {
  detect: (
    image: HTMLImageElement | HTMLCanvasElement,
  ) => Promise<Landmark[] | null>;
  meshLoading: boolean;
  onComplete: (photos: PhotoSet) => void;
}

// ── Step configuration ─────────────────────────────────────

interface StepConfig {
  angle: PhotoAngle;
  title: string;
  subtitle: string;
  required: boolean;
  instructions: string[];
  silhouetteRotation: string;
}

const STEPS: StepConfig[] = [
  {
    angle: "frontal",
    title: "Front-facing photo",
    subtitle: "This is your primary photo for visualization",
    required: true,
    instructions: [
      "Look straight at the camera",
      "Pull hair back from your face",
      "Remove glasses and avoid heavy makeup",
      "Use even, natural lighting — no harsh shadows",
      "Hold the camera at arm's length, centered on your face",
      "Keep a neutral expression",
    ],
    silhouetteRotation: "",
  },
  {
    angle: "left_profile",
    title: "Left side profile",
    subtitle: "Helps us read your features more accurately",
    required: false,
    instructions: [
      "Turn your head 90° to the right (camera sees your left side)",
      "Keep your chin level — don't tilt up or down",
      "Same lighting as your frontal photo",
      "Keep the same distance from the camera",
    ],
    silhouetteRotation: "rotate-y-[-90deg]",
  },
  {
    angle: "right_profile",
    title: "Right side profile",
    subtitle: "Completes the full picture of your face",
    required: false,
    instructions: [
      "Turn your head 90° to the left (camera sees your right side)",
      "Keep your chin level — don't tilt up or down",
      "Same lighting as your frontal photo",
      "Keep the same distance from the camera",
    ],
    silhouetteRotation: "rotate-y-[90deg]",
  },
];

// ── Max file size / types (match Visualizer) ───────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ── Silhouette SVG (simplified face outline) ───────────────

function FaceSilhouette({ angle }: { angle: PhotoAngle }) {
  if (angle === "left_profile") {
    return (
      <svg viewBox="0 0 100 120" className="h-full w-full" fill="none">
        <ellipse cx="55" cy="55" rx="28" ry="35" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <path d="M 35 35 Q 30 45 32 55 Q 30 60 27 58 Q 24 56 26 50 Q 28 45 35 35" stroke="currentColor" strokeWidth="1.5" opacity="0.3" fill="none" />
        <line x1="55" y1="90" x2="55" y2="110" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
        <text x="50" y="118" textAnchor="middle" className="fill-current text-[6px] opacity-30">Left Profile</text>
      </svg>
    );
  }
  if (angle === "right_profile") {
    return (
      <svg viewBox="0 0 100 120" className="h-full w-full" fill="none">
        <ellipse cx="45" cy="55" rx="28" ry="35" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
        <path d="M 65 35 Q 70 45 68 55 Q 70 60 73 58 Q 76 56 74 50 Q 72 45 65 35" stroke="currentColor" strokeWidth="1.5" opacity="0.3" fill="none" />
        <line x1="45" y1="90" x2="45" y2="110" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
        <text x="50" y="118" textAnchor="middle" className="fill-current text-[6px] opacity-30">Right Profile</text>
      </svg>
    );
  }
  // Frontal
  return (
    <svg viewBox="0 0 100 120" className="h-full w-full" fill="none">
      <ellipse cx="50" cy="50" rx="28" ry="35" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <circle cx="38" cy="42" r="3" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <circle cx="62" cy="42" r="3" stroke="currentColor" strokeWidth="1" opacity="0.2" />
      <path d="M 44 55 Q 50 60 56 55" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" />
      <path d="M 42 65 Q 50 70 58 65" stroke="currentColor" strokeWidth="1" opacity="0.2" fill="none" />
      <line x1="50" y1="85" x2="50" y2="110" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <text x="50" y="118" textAnchor="middle" className="fill-current text-[6px] opacity-30">Front Facing</text>
    </svg>
  );
}

// ── Component ──────────────────────────────────────────────

export default function PhotoUploadWizard({
  detect,
  meshLoading,
  onComplete,
}: PhotoUploadWizardProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 = landing
  const [photos, setPhotos] = useState<PhotoSet>({});
  const [detecting, setDetecting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentConfig = currentStep >= 0 ? STEPS[currentStep] : null;
  const currentPhoto = currentConfig ? photos[currentConfig.angle] : null;

  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setStepError("Please upload a JPG, PNG, or WebP image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setStepError("File is too large. Maximum is 10 MB.");
        return;
      }
      if (file.size === 0) {
        setStepError("This file appears to be empty.");
        return;
      }

      setStepError(null);
      setDetecting(true);

      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = async () => {
        const angle = STEPS[currentStep].angle;
        const landmarks = await detect(img);

        // For frontal, face detection is required
        if (angle === "frontal" && !landmarks) {
          setStepError(
            "Couldn't detect a face. Please try a clearer, front-facing photo with good lighting.",
          );
          URL.revokeObjectURL(objectUrl);
          setDetecting(false);
          return;
        }

        const entry: PhotoEntry = { file, objectUrl, image: img, landmarks };
        setPhotos((prev) => {
          // Revoke old URL if replacing
          const old = prev[angle];
          if (old) URL.revokeObjectURL(old.objectUrl);
          return { ...prev, [angle]: entry };
        });
        setDetecting(false);
      };

      img.onerror = () => {
        setStepError("Could not load this image. Please try a different file.");
        URL.revokeObjectURL(objectUrl);
        setDetecting(false);
      };

      img.src = objectUrl;
    },
    [currentStep, detect],
  );

  const handleRetake = useCallback(() => {
    if (!currentConfig) return;
    const old = photos[currentConfig.angle];
    if (old) URL.revokeObjectURL(old.objectUrl);
    setPhotos((prev) => {
      const next = { ...prev };
      delete next[currentConfig.angle];
      return next;
    });
    setStepError(null);
  }, [currentConfig, photos]);

  const handleSkip = useCallback(() => {
    setStepError(null);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step — skip to review
      setCurrentStep(STEPS.length);
    }
  }, [currentStep]);

  const handleNext = useCallback(() => {
    setStepError(null);
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    setStepError(null);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      setCurrentStep(-1);
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    onComplete(photos);
  }, [photos, onComplete]);

  const photoCounts = {
    total: Object.keys(photos).length,
    hasRequired: !!photos.frontal,
  };

  // ── Landing screen ────────────────────────────────────────

  if (currentStep === -1) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/5">
          <Camera className="h-10 w-10 text-primary/40" />
        </div>
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Let's capture your face
          </h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            We'll guide you through taking photos from multiple angles for the
            most accurate visualization. The frontal photo is required — side
            profiles are optional but recommended.
          </p>
        </div>

        <div className="flex gap-6 mt-2">
          {STEPS.map((step) => (
            <div key={step.angle} className="flex flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-border/40 bg-secondary/30 text-muted-foreground">
                <div className="h-10 w-10">
                  <FaceSilhouette angle={step.angle} />
                </div>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {step.angle === "frontal" ? "Front" : step.angle === "left_profile" ? "Left" : "Right"}
                {step.required && <span className="text-destructive"> *</span>}
              </span>
            </div>
          ))}
        </div>

        <Button
          onClick={() => setCurrentStep(0)}
          className="mt-4 gap-2 rounded-full px-8"
          size="lg"
        >
          Get Started
          <ChevronRight className="h-4 w-4" />
        </Button>

        <p className="text-[11px] text-muted-foreground">
          JPG, PNG, or WebP — up to 10 MB each
        </p>
      </div>
    );
  }

  // ── Review screen ─────────────────────────────────────────

  if (currentStep >= STEPS.length) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 p-8">
        <h2 className="text-xl font-semibold text-foreground">
          Review your photos
        </h2>
        <p className="text-sm text-muted-foreground">
          {photoCounts.total} photo{photoCounts.total !== 1 ? "s" : ""} captured. You can retake any photo before starting.
        </p>

        <div className="flex gap-4 mt-2">
          {STEPS.map((step, i) => {
            const photo = photos[step.angle];
            return (
              <div key={step.angle} className="flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "relative h-28 w-28 overflow-hidden rounded-xl border-2 transition-colors",
                    photo
                      ? "border-primary/40"
                      : "border-dashed border-border/40",
                  )}
                >
                  {photo ? (
                    <>
                      <img
                        src={photo.objectUrl}
                        alt={step.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground/40">
                      <User className="h-6 w-6" />
                      <span className="mt-1 text-[10px]">Skipped</span>
                    </div>
                  )}
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {step.angle === "frontal" ? "Front" : step.angle === "left_profile" ? "Left" : "Right"}
                </span>
                {photo && (
                  <button
                    aria-label={`Retake ${step.title}`}
                    onClick={() => {
                      const angle = STEPS[i].angle;
                      const old = photos[angle];
                      if (old) URL.revokeObjectURL(old.objectUrl);
                      setPhotos((prev) => {
                        const next = { ...prev };
                        delete next[angle];
                        return next;
                      });
                      setStepError(null);
                      setCurrentStep(i);
                    }}
                    className="text-[10px] text-primary hover:underline"
                  >
                    Retake
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(STEPS.length - 1)}
            className="rounded-full"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <Button
            onClick={handleComplete}
            disabled={!photoCounts.hasRequired}
            className="gap-2 rounded-full px-8"
            size="lg"
          >
            Start Visualizing
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Photo capture step ────────────────────────────────────

  const step = STEPS[currentStep];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="flex items-center gap-2 border-b border-border/40 px-6 py-3">
        {STEPS.map((s, i) => (
          <div key={s.angle} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium transition-colors",
                i < currentStep
                  ? "bg-primary text-primary-foreground"
                  : i === currentStep
                    ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {i < currentStep && photos[s.angle] ? (
                <Check className="h-3 w-3" />
              ) : (
                i + 1
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-8 transition-colors",
                  i < currentStep ? "bg-primary" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">
          Step {currentStep + 1} of {STEPS.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-8">
        {/* Title */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">
            {step.title}
            {step.required && (
              <span className="ml-2 text-xs font-normal text-destructive">Required</span>
            )}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{step.subtitle}</p>
        </div>

        {/* Photo area */}
        {currentPhoto ? (
          /* Preview */
          <div className="relative">
            <img
              src={currentPhoto.objectUrl}
              alt={step.title}
              className="max-h-[300px] rounded-xl object-contain shadow-lg"
            />
            <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary shadow">
              <Check className="h-4 w-4 text-primary-foreground" />
            </div>
            {currentPhoto.landmarks && (
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white backdrop-blur-sm">
                <Check className="h-3 w-3 text-green-400" />
                Face detected
              </div>
            )}
          </div>
        ) : (
          /* Upload zone */
          <div
            className={cn(
              "flex h-64 w-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-secondary/20 text-muted-foreground transition-colors hover:border-primary/30 hover:bg-secondary/30 cursor-pointer",
              dragOver ? "border-primary/60 bg-primary/5" : "border-border/40",
            )}
            role="button"
            tabIndex={0}
            aria-label={`Upload ${currentConfig?.title ?? "photo"}`}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileSelect(file);
            }}
          >
            {detecting || meshLoading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm">Detecting face...</span>
              </>
            ) : (
              <>
                <div className="h-20 w-20 text-muted-foreground/30">
                  <FaceSilhouette angle={step.angle} />
                </div>
                <span className="text-sm font-medium">Click to upload</span>
                <span className="text-[11px] text-muted-foreground">
                  or drag and drop
                </span>
              </>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
            if (e.target) e.target.value = "";
          }}
        />

        {/* Error */}
        {stepError && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {stepError}
          </div>
        )}

        {/* Instructions */}
        <div className="w-full max-w-sm rounded-xl border border-border/30 bg-secondary/20 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Photo tips
          </h3>
          <ul className="space-y-1.5">
            {step.instructions.map((inst, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12px] text-muted-foreground leading-relaxed"
              >
                <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/40" />
                {inst}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="rounded-full"
            size="sm"
          >
            <ChevronLeft className="mr-1 h-3 w-3" />
            Back
          </Button>

          {currentPhoto && (
            <Button
              variant="outline"
              onClick={handleRetake}
              className="rounded-full"
              size="sm"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Retake
            </Button>
          )}

          {!step.required && !currentPhoto && (
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="rounded-full text-muted-foreground"
              size="sm"
            >
              Skip
            </Button>
          )}

          {currentPhoto && (
            <Button
              onClick={() => {
                if (currentStep === STEPS.length - 1) {
                  setCurrentStep(STEPS.length); // go to review
                } else {
                  handleNext();
                }
              }}
              className="gap-1.5 rounded-full"
              size="sm"
            >
              {currentStep === STEPS.length - 1 ? "Review" : "Next"}
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
