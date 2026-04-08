import { useState } from "react";
import PageTransition from "@/components/PageTransition";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, ShieldCheck, Paperclip, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { createProviderProfile, signUp, uploadProviderImage } from "@/lib/api";
import BrandMark from "@/components/BrandMark";
import CertificationBadge from "@/components/provider/CertificationBadge";
import {
  DEGREES,
  PROVIDER_TYPES,
  SPECIALTIES,
  SUBSPECIALTIES,
  BOARD_CERTIFICATIONS,
  US_STATES,
} from "@/data/constants";

interface SignupFormData {
  // Step 1: Credentials
  degree: string;
  providerType: string;
  specialty: string;
  // Step 2: Subspecialties & Certs
  subspecialties: string[];
  boardCertifications: string[];
  yearsInPractice: string;
  // Step 3: License
  licenseNumber: string;
  licenseState: string;
  licenseFile: File | null;
  // Step 4: Account
  firstName: string;
  lastName: string;
  practiceName: string;
  email: string;
  password: string;
}

const INITIAL_FORM: SignupFormData = {
  degree: "",
  providerType: "",
  specialty: "",
  subspecialties: [],
  boardCertifications: [],
  yearsInPractice: "",
  licenseNumber: "",
  licenseState: "",
  licenseFile: null,
  firstName: "",
  lastName: "",
  practiceName: "",
  email: "",
  password: "",
};

const STEP_TITLES = [
  { title: "Professional Info", desc: "Your medical credentials" },
  { title: "Subspecialties", desc: "Certifications and focus areas" },
  { title: "License", desc: "License verification required" },
  { title: "Account", desc: "Create your login" },
];

const ProviderSignup = () => {
  const [searchParams] = useSearchParams();
  const prefilledEmail = searchParams.get("email") ?? "";

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SignupFormData>({
    ...INITIAL_FORM,
    email: prefilledEmail,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const update = <K extends keyof SignupFormData>(key: K, value: SignupFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError(null);
    setFieldErrors((prev) => { const { [key]: _, ...rest } = prev; return rest; });
  };

  const toggleArrayItem = (key: "subspecialties" | "boardCertifications", value: string) => {
    setForm((prev) => {
      const arr = prev[key];
      const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
      return { ...prev, [key]: next };
    });
  };

  const canAdvance = (): boolean => {
    switch (step) {
      case 0:
        return Boolean(form.degree && form.providerType && form.specialty);
      case 1:
        return form.boardCertifications.length > 0 && form.yearsInPractice !== "";
      case 2:
        return Boolean(form.licenseNumber && form.licenseState);
      case 3:
        return Boolean(form.firstName && form.lastName && form.practiceName && form.email && form.password.length >= 8);
      default:
        return false;
    }
  };

  const validateStep = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 3) {
      if (!form.firstName.trim()) newErrors.firstName = "First name is required";
      if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!form.practiceName.trim()) newErrors.practiceName = "Practice name is required";
      if (!form.email.trim()) newErrors.email = "Email is required";
      else if (!EMAIL_RE.test(form.email)) newErrors.email = "Invalid email format";
      if (!form.password) newErrors.password = "Password is required";
      else if (form.password.length < 8) newErrors.password = "Password must be at least 8 characters";
    }
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    setError(null);
    setFieldErrors({});
    setStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    if (!canAdvance() || !validateStep()) return;
    setError(null);
    setLoading(true);

    try {
      const { user } = await signUp(form.email, form.password);
      if (!user) throw new Error("Account creation failed. Please try again.");

      // Upload license document if provided
      let licenseDocumentUrl: string | undefined;
      if (form.licenseFile) {
        try {
          licenseDocumentUrl = await uploadProviderImage(user.id, form.licenseFile);
        } catch {
          // Non-blocking — profile still gets created
        }
      }

      await createProviderProfile({
        userId: user.id,
        firstName: form.firstName,
        lastName: form.lastName,
        practiceName: form.practiceName,
        email: form.email,
        credentials: {
          degree: form.degree,
          providerType: form.providerType,
          specialty: form.specialty,
          subspecialties: form.subspecialties,
          boardCertifications: form.boardCertifications,
          yearsInPractice: Number(form.yearsInPractice),
          licenseNumber: form.licenseNumber,
          licenseState: form.licenseState,
          licenseDocumentUrl,
        },
      });

      navigate("/provider/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-fade-up">
          {/* Header */}
          <div className="text-center mb-6">
            <BrandMark className="mx-auto mb-4" sizeClassName="h-14 w-14" textClassName="text-lg font-bold" />
            <h1 className="text-display-sm text-foreground">Provider Registration</h1>
            <p className="mt-1 text-[13px] text-muted-foreground">Access is invite-only. All fields are structured.</p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEP_TITLES.map((s, i) => (
              <div key={s.title} className="flex items-center gap-2">
                <button
                  onClick={() => { if (i < step) setStep(i); }}
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-semibold transition-all ${
                    i === step
                      ? "bg-foreground text-background"
                      : i < step
                        ? "bg-foreground/10 text-foreground cursor-pointer hover:bg-foreground/20"
                        : "bg-foreground/5 text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </button>
                {i < 3 && <div className={`h-px w-6 ${i < step ? "bg-foreground/30" : "bg-foreground/10"}`} />}
              </div>
            ))}
          </div>

          <div className="mb-4 text-center">
            <h2 className="text-lg font-semibold text-foreground">{STEP_TITLES[step].title}</h2>
            <p className="text-[13px] text-muted-foreground">{STEP_TITLES[step].desc}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
              {error}
            </div>
          )}

          {/* Step 0: Professional Info */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[13px]">Degree *</Label>
                <Select value={form.degree} onValueChange={(v) => update("degree", v)}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Select degree" />
                  </SelectTrigger>
                  <SelectContent>
                    {DEGREES.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">Provider Type *</Label>
                <Select value={form.providerType} onValueChange={(v) => update("providerType", v)}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Select provider type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">Specialty *</Label>
                <Select value={form.specialty} onValueChange={(v) => update("specialty", v)}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Select specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    {SPECIALTIES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 1: Subspecialties & Board Certs */}
          {step === 1 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[13px]">Subspecialties</Label>
                <div className="grid grid-cols-2 gap-2">
                  {SUBSPECIALTIES.map((sub) => (
                    <label
                      key={sub}
                      className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 cursor-pointer hover:bg-foreground/5 transition-colors"
                    >
                      <Checkbox
                        checked={form.subspecialties.includes(sub)}
                        onCheckedChange={() => toggleArrayItem("subspecialties", sub)}
                      />
                      <span className="text-[12px] leading-tight">{sub}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[13px]">Board Certifications *</Label>
                <div className="space-y-2">
                  {BOARD_CERTIFICATIONS.map((cert) => (
                    <label
                      key={cert.value}
                      className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 cursor-pointer hover:bg-foreground/5 transition-colors"
                    >
                      <Checkbox
                        checked={form.boardCertifications.includes(cert.value)}
                        onCheckedChange={() => toggleArrayItem("boardCertifications", cert.value)}
                      />
                      <span className="text-[12px] leading-tight">{cert.label}</span>
                    </label>
                  ))}
                </div>
                {form.boardCertifications.length > 0 && (
                  <div className="mt-2">
                    <CertificationBadge boardCertifications={form.boardCertifications} compact />
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">Years in Practice *</Label>
                <Input
                  type="number"
                  min={0}
                  max={60}
                  value={form.yearsInPractice}
                  onChange={(e) => update("yearsInPractice", e.target.value)}
                  placeholder="e.g. 15"
                  className="rounded-xl h-11 w-32"
                />
              </div>
            </div>
          )}

          {/* Step 2: License Verification */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-[12px] text-amber-700 dark:text-amber-400">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5 inline-block" />
                License verification is required. Providers cannot go live without admin verification.
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">License Number *</Label>
                <Input
                  value={form.licenseNumber}
                  onChange={(e) => update("licenseNumber", e.target.value)}
                  placeholder="e.g. A-123456"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">State *</Label>
                <Select value={form.licenseState} onValueChange={(v) => update("licenseState", v)}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">License Document (PDF or image)</Label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file && file.size > 5 * 1024 * 1024) {
                      setError("File must be under 5 MB.");
                      return;
                    }
                    update("licenseFile", file);
                  }}
                  className="block w-full text-[13px] text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-foreground/5 file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-foreground hover:file:bg-foreground/10 cursor-pointer"
                />
                {form.licenseFile && (
                  <p className="text-[12px] text-muted-foreground">
                    <Paperclip className="h-3 w-3 mr-1 inline-block" />
                    {form.licenseFile.name}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Account */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[13px]">First Name *</Label>
                  <Input
                    value={form.firstName}
                    onChange={(e) => update("firstName", e.target.value)}
                    placeholder="Sarah"
                    className="rounded-xl h-11"
                  />
                  {fieldErrors.firstName && <p className="text-sm text-destructive mt-1">{fieldErrors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Last Name *</Label>
                  <Input
                    value={form.lastName}
                    onChange={(e) => update("lastName", e.target.value)}
                    placeholder="Chen"
                    className="rounded-xl h-11"
                  />
                  {fieldErrors.lastName && <p className="text-sm text-destructive mt-1">{fieldErrors.lastName}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">Practice Name *</Label>
                <Input
                  value={form.practiceName}
                  onChange={(e) => update("practiceName", e.target.value)}
                  placeholder="Beverly Hills Aesthetics"
                  className="rounded-xl h-11"
                />
                {fieldErrors.practiceName && <p className="text-sm text-destructive mt-1">{fieldErrors.practiceName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">Email *</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  placeholder="you@practice.com"
                  className="rounded-xl h-11"
                />
                {fieldErrors.email && <p className="text-sm text-destructive mt-1">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[13px]">Password *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => update("password", e.target.value)}
                    placeholder="Min. 8 characters"
                    className="rounded-xl h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">Must be at least 8 characters</p>
                {fieldErrors.password && <p className="text-sm text-destructive mt-1">{fieldErrors.password}</p>}
              </div>

              {/* Summary */}
              <div className="rounded-xl border border-border/60 bg-surface/50 p-4 space-y-2">
                <p className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
                <div className="text-[13px] space-y-1">
                  <p><span className="text-muted-foreground">Degree:</span> {form.degree}</p>
                  <p><span className="text-muted-foreground">Type:</span> {form.providerType}</p>
                  <p><span className="text-muted-foreground">Specialty:</span> {form.specialty}</p>
                  {form.subspecialties.length > 0 && (
                    <p><span className="text-muted-foreground">Subspecialties:</span> {form.subspecialties.join(", ")}</p>
                  )}
                  <CertificationBadge boardCertifications={form.boardCertifications} />
                  <p><span className="text-muted-foreground">Years:</span> {form.yearsInPractice}</p>
                  <p><span className="text-muted-foreground">License:</span> {form.licenseState} — {form.licenseNumber}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <Button variant="outline" onClick={handleBack} className="rounded-xl h-11 flex-1">
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="rounded-xl h-11 flex-1 text-[15px]"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canAdvance() || loading}
                className="rounded-xl h-11 flex-1 text-[15px]"
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            )}
          </div>

          <p className="mt-6 text-center text-[13px] text-muted-foreground">
            Already have an account?{" "}
            <Link to="/provider/login" className="text-foreground font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default ProviderSignup;
