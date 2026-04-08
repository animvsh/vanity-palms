import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  User,
  ShieldCheck,
  Camera,
  DollarSign,
  Instagram,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { updateProviderProfile } from "@/lib/api";

interface ProviderOnboardingProps {
  providerId: string;
  initialData?: {
    name?: string;
    specialty?: string[];
    bio?: string;
    yearsExperience?: number;
    certifications?: string[];
    instagramUrl?: string;
  };
  onComplete: () => void;
  onSkip: () => void;
}

const STEPS = [
  { id: "welcome", label: "Welcome", icon: Sparkles },
  { id: "basic", label: "Basic Info", icon: User },
  { id: "credentials", label: "Credentials", icon: ShieldCheck },
  { id: "photo", label: "Profile Photo", icon: Camera },
  { id: "procedures", label: "Procedures", icon: DollarSign },
  { id: "instagram", label: "Instagram", icon: Instagram },
] as const;

export default function ProviderOnboarding({ providerId, initialData, onComplete, onSkip }: ProviderOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: initialData?.name ?? "",
    specialty: initialData?.specialty?.[0] ?? "",
    bio: initialData?.bio ?? "",
    experience: initialData?.yearsExperience?.toString() ?? "",
    certifications: initialData?.certifications?.join("\n") ?? "",
    instagramUrl: initialData?.instagramUrl ?? "",
  });

  const handleComplete = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await updateProviderProfile(providerId, {
        name: formData.name || undefined,
        specialty: formData.specialty ? [formData.specialty] : undefined,
        bio: formData.bio || undefined,
        years_experience: formData.experience ? parseInt(formData.experience, 10) : undefined,
        certifications: formData.certifications
          ? formData.certifications.split("\n").map((c) => c.trim()).filter(Boolean)
          : undefined,
        instagram_url: formData.instagramUrl || undefined,
      });
      onComplete();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const step = STEPS[currentStep];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {/* Progress */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                i < currentStep
                  ? "bg-primary text-primary-foreground"
                  : i === currentStep
                    ? "bg-primary/10 text-primary ring-2 ring-primary/30"
                    : "bg-secondary text-muted-foreground",
              )}
            >
              {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("h-px w-6", i < currentStep ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-border/50 bg-background p-8">
        {step.id === "welcome" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Welcome to Vanity Palms</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Let's set up your provider profile. This takes about 3 minutes and helps patients
              find and trust you. You can always edit these details later.
            </p>
          </div>
        )}

        {step.id === "basic" && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-foreground">Basic Information</h2>
            <p className="text-sm text-muted-foreground">Tell patients about yourself.</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="Dr. Jane Smith"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Specialty</label>
              <select
                value={formData.specialty}
                onChange={(e) => updateField("specialty", e.target.value)}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              >
                <option value="">Select specialty</option>
                <option value="Facial Plastic Surgery">Facial Plastic Surgery</option>
                <option value="Plastic Surgery">Plastic Surgery</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Oculoplastic Surgery">Oculoplastic Surgery</option>
                <option value="Cosmetic Dermatology">Cosmetic Dermatology</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Years of Experience</label>
              <input
                type="number"
                value={formData.experience}
                onChange={(e) => updateField("experience", e.target.value)}
                placeholder="15"
                min="0"
                max="60"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => updateField("bio", e.target.value)}
                placeholder="Tell patients about your practice, philosophy, and what sets you apart..."
                rows={4}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 resize-y"
              />
            </div>
          </div>
        )}

        {step.id === "credentials" && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-foreground">Credentials & Certifications</h2>
            <p className="text-sm text-muted-foreground">Verified credentials build patient trust.</p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Board Certifications</label>
              <textarea
                value={formData.certifications}
                onChange={(e) => updateField("certifications", e.target.value)}
                placeholder={"American Board of Plastic Surgery\nAmerican Board of Facial Plastic and Reconstructive Surgery"}
                rows={3}
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 resize-y"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">One certification per line</p>
            </div>
          </div>
        )}

        {step.id === "photo" && (
          <div className="space-y-5 text-center">
            <h2 className="text-xl font-semibold text-foreground">Profile Photo</h2>
            <p className="text-sm text-muted-foreground">A professional headshot helps patients connect with you.</p>
            <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl border-2 border-dashed border-border/40 bg-secondary/20">
              <Camera className="h-10 w-10 text-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground">You can upload a photo from your dashboard later.</p>
          </div>
        )}

        {step.id === "procedures" && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-foreground">Procedures Offered</h2>
            <p className="text-sm text-muted-foreground">
              Select the procedures you offer. You can add pricing later from your dashboard.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "Rhinoplasty", "Facelift", "Blepharoplasty", "Lip Augmentation",
                "Botox", "Dermal Fillers", "Chemical Peel", "Chin Augmentation",
                "Brow Lift", "Thread Lift", "Neck Lift", "Otoplasty",
              ].map((proc) => (
                <label
                  key={proc}
                  className="flex items-center gap-2 rounded-lg border border-border/40 bg-secondary/10 px-3 py-2.5 text-sm cursor-pointer transition-colors hover:bg-secondary/30"
                >
                  <input type="checkbox" className="rounded" />
                  {proc}
                </label>
              ))}
            </div>
          </div>
        )}

        {step.id === "instagram" && (
          <div className="space-y-5">
            <h2 className="text-xl font-semibold text-foreground">Connect Instagram</h2>
            <p className="text-sm text-muted-foreground">
              Your Instagram feed will appear on your profile page, showcasing your latest work to patients.
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Instagram Profile URL</label>
              <input
                type="url"
                value={formData.instagramUrl}
                onChange={(e) => updateField("instagramUrl", e.target.value)}
                placeholder="https://instagram.com/yourusername"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2.5 text-sm focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This shows your top 9 posts on your Vanity Palms profile. You can skip this for now.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <div>
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="rounded-full"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onSkip}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
            <Button
              onClick={() => {
                if (currentStep < STEPS.length - 1) {
                  setCurrentStep(currentStep + 1);
                } else {
                  handleComplete();
                }
              }}
              disabled={saving}
              className="gap-1.5 rounded-full px-6"
            >
              {currentStep === STEPS.length - 1 ? (
                saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Complete Setup"
                )
              ) : (
                <>
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {saveError && (
          <p className="mt-3 text-center text-sm text-destructive">{saveError}</p>
        )}
      </div>
    </div>
  );
}
