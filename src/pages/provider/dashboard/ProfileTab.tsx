import { useState, useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  fetchProcedures,
  updateProviderProfile,
  updateProviderProcedurePricing,
  addProviderProcedure,
  removeProviderProcedure,
  uploadProviderImage,
  deleteProviderImage,
  listProviderImages,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Provider, Procedure } from "@/data/mockData";
import type { ProcedureRow } from "./types";

const COMMON_LANGUAGES = [
  "English", "Spanish", "Korean", "Mandarin", "Japanese",
  "Farsi", "Arabic", "French", "Portuguese", "Vietnamese",
  "Tagalog", "Hindi", "Russian", "German", "Italian",
];

const COMMON_SPECIALTIES = [
  "Rhinoplasty",
  "Facelift",
  "Blepharoplasty",
  "Botox",
  "Lip Filler",
  "Chemical Peel",
  "Liposuction",
  "Non-Surgical Nose Job",
];

interface ProfileTabProps {
  provider: Provider;
  onSave: (p: Provider) => void;
}

export const ProfileTab = ({ provider, onSave }: ProfileTabProps) => {
  const [practiceName, setPracticeName] = useState(provider.practiceName || "");
  const [fullName, setFullName] = useState(provider.name);
  const [bio, setBio] = useState(provider.bio);
  const [address, setAddress] = useState("");
  const [cityState, setCityState] = useState(provider.location);
  const [phone, setPhone] = useState("");
  const [instagramUrl, setInstagramUrl] = useState(provider.instagramUrl ?? "");
  const [languages, setLanguages] = useState<string[]>(provider.languages ?? []);
  const [specialties, setSpecialties] = useState<string[]>(provider.specialty ?? []);
  const [certifications, setCertifications] = useState<string[]>(provider.certifications ?? []);
  const [languageInput, setLanguageInput] = useState("");
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [certificationInput, setCertificationInput] = useState("");
  const [showLanguageSuggestions, setShowLanguageSuggestions] = useState(false);
  const [procedureRows, setProcedureRows] = useState<ProcedureRow[]>([]);
  const [allProcedures, setAllProcedures] = useState<Procedure[]>([]);
  const [selectedProcedureId, setSelectedProcedureId] = useState("");
  const [newProcedurePrice, setNewProcedurePrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const languageInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const fieldsRef = useRef({
    fullName,
    bio,
    practiceName,
    phone,
    address,
    cityState,
    instagramUrl,
    languages,
    specialties,
    certifications,
  });

  // Gallery state
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [subscriptionTier, setSubscriptionTier] = useState<"free" | "premium">("free");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep fieldsRef in sync with latest state
  useEffect(() => {
    fieldsRef.current = {
      fullName,
      bio,
      practiceName,
      phone,
      address,
      cityState,
      instagramUrl,
      languages,
      specialties,
      certifications,
    };
  }, [fullName, bio, practiceName, phone, address, cityState, instagramUrl, languages, specialties, certifications]);

  // Load gallery images and subscription tier on mount
  useEffect(() => {
    const loadGallery = async () => {
      try {
        const images = await listProviderImages(provider.id);
        setGalleryImages(images);
      } catch {
        // Gallery may be empty initially
      } finally {
        setGalleryLoading(false);
      }
    };
    const loadTier = async () => {
      const { data } = await supabase
        .from("providers")
        .select("subscription_tier")
        .eq("id", provider.id)
        .single();
      if (data?.subscription_tier) {
        setSubscriptionTier(data.subscription_tier as "free" | "premium");
      }
    };
    loadGallery();
    loadTier();
  }, [provider.id]);

  const maxImages = subscriptionTier === "premium" ? 20 : 5;

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (galleryImages.length >= maxImages) return;
      setGalleryUploading(true);
      try {
        const publicUrl = await uploadProviderImage(provider.id, file);
        setGalleryImages((prev) => [...prev, publicUrl]);
      } catch {
        toast("Image upload failed. Please try again.");
      } finally {
        setGalleryUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [galleryImages.length, maxImages, provider.id],
  );

  const handleImageDelete = useCallback(async (url: string) => {
    const pathMatch = url.match(/\/provider-images\/(.+)$/);
    try {
      const storagePath = pathMatch ? decodeURIComponent(pathMatch[1]) : url;
      await deleteProviderImage(storagePath);
      setGalleryImages((prev) => prev.filter((img) => img !== url));
    } catch {
      toast("Failed to delete image. Please try again.");
    }
  }, []);

  // Load procedures for pricing editor
  useEffect(() => {
    const loadProcedures = async () => {
      const procedures = await fetchProcedures();
      setAllProcedures(procedures);
      const nameMap = new Map(procedures.map((entry) => [entry.id, entry.name]));
      setProcedureRows(
        provider.procedures.map((procedure) => ({
          procedureId: procedure.procedureId,
          procedureName: nameMap.get(procedure.procedureId) ?? procedure.procedureId,
          price: procedure.price,
        })),
      );
    };
    loadProcedures().catch(() => undefined);
  }, [provider.procedures]);

  // Debounced auto-save: triggers 3 seconds after last edit
  const performAutoSave = useCallback(async () => {
    const f = fieldsRef.current;
    setAutoSaveStatus("saving");
    try {
      await updateProviderProfile(provider.id, {
        name: f.fullName,
        bio: f.bio,
        practice_name: f.practiceName,
        phone: f.phone,
        address: f.address,
        city_state: f.cityState,
        location: f.cityState,
        instagram_url: f.instagramUrl,
        specialty: f.specialties,
        certifications: f.certifications,
        languages: f.languages,
      });
      const now = new Date();
      setLastSavedAt(now);
      setAutoSaveStatus("saved");
      onSave({
        ...provider,
        name: f.fullName,
        practiceName: f.practiceName,
        bio: f.bio,
        location: f.cityState,
        instagramUrl: f.instagramUrl,
        specialty: f.specialties,
        certifications: f.certifications,
        languages: f.languages,
      });
    } catch {
      setAutoSaveStatus("idle");
    }
  }, [provider, onSave]);

  const scheduleAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave();
    }, 3000);
  }, [performAutoSave]);

  // Trigger auto-save on field changes (skip initial mount)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    scheduleAutoSave();
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [fullName, bio, practiceName, phone, address, cityState, instagramUrl, languages, specialties, certifications, scheduleAutoSave]);

  const handleSave = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    setSaving(true);
    setSaveError(null);

    try {
      await updateProviderProfile(provider.id, {
        name: fullName,
        bio,
        practice_name: practiceName,
        phone,
        address,
        city_state: cityState,
        location: cityState,
        instagram_url: instagramUrl,
        specialty: specialties,
        certifications: certifications,
        languages,
      });
      onSave({
        ...provider,
        name: fullName,
        practiceName,
        bio,
        location: cityState,
        instagramUrl,
        specialty: specialties,
        certifications,
        languages,
      });
      const now = new Date();
      setLastSavedAt(now);
      setAutoSaveStatus("saved");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addLanguage = (lang: string) => {
    const trimmed = lang.trim();
    if (trimmed && !languages.includes(trimmed)) {
      setLanguages([...languages, trimmed]);
    }
    setLanguageInput("");
    setShowLanguageSuggestions(false);
  };

  const removeLanguage = (lang: string) => {
    setLanguages(languages.filter((l) => l !== lang));
  };

  const filteredSuggestions = COMMON_LANGUAGES.filter(
    (l) => !languages.includes(l) && l.toLowerCase().includes(languageInput.toLowerCase())
  );

  const filteredSpecialtySuggestions = COMMON_SPECIALTIES.filter(
    (specialty) =>
      !specialties.includes(specialty) &&
      specialty.toLowerCase().includes(specialtyInput.toLowerCase()),
  );

  const addSpecialty = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || specialties.includes(trimmed)) return;
    setSpecialties((prev) => [...prev, trimmed]);
    setSpecialtyInput("");
  };

  const removeSpecialty = (value: string) => {
    setSpecialties((prev) => prev.filter((entry) => entry !== value));
  };

  const addCertification = () => {
    const trimmed = certificationInput.trim();
    if (!trimmed || certifications.includes(trimmed)) return;
    setCertifications((prev) => [...prev, trimmed]);
    setCertificationInput("");
  };

  const removeCertification = (value: string) => {
    setCertifications((prev) => prev.filter((entry) => entry !== value));
  };

  const handleProcedurePriceChange = async (procedureId: string, newPrice: number) => {
    setProcedureRows((prev) =>
      prev.map((r) => (r.procedureId === procedureId ? { ...r, price: newPrice } : r))
    );
  };

  const saveProcedurePrice = async (procedureId: string, price: number) => {
    try {
      await updateProviderProcedurePricing(provider.id, procedureId, price);
      const now = new Date();
      setLastSavedAt(now);
      setAutoSaveStatus("saved");
      onSave({
        ...provider,
        specialty: specialties,
        certifications,
        procedures: procedureRows.map((row) =>
          row.procedureId === procedureId ? { procedureId: row.procedureId, price } : { procedureId: row.procedureId, price: row.price },
        ),
      });
    } catch {
      setSaveError("Failed to save procedure price.");
    }
  };

  const handleAddProcedure = async () => {
    const price = Number(newProcedurePrice);
    if (!selectedProcedureId || !Number.isFinite(price) || price <= 0) return;

    const selectedProcedure = allProcedures.find((procedure) => procedure.id === selectedProcedureId);
    if (!selectedProcedure) return;

    try {
      await addProviderProcedure(provider.id, selectedProcedureId, price);
      const nextRows = [
        ...procedureRows,
        { procedureId: selectedProcedureId, procedureName: selectedProcedure.name, price },
      ];
      setProcedureRows(nextRows);
      onSave({
        ...provider,
        specialty: specialties,
        certifications,
        procedures: nextRows.map((row) => ({ procedureId: row.procedureId, price: row.price })),
      });
      setSelectedProcedureId("");
      setNewProcedurePrice("");
      setLastSavedAt(new Date());
      setAutoSaveStatus("saved");
    } catch {
      setSaveError("Failed to add procedure.");
    }
  };

  const handleRemoveProcedure = async (procedureId: string) => {
    try {
      await removeProviderProcedure(provider.id, procedureId);
      const nextRows = procedureRows.filter((row) => row.procedureId !== procedureId);
      setProcedureRows(nextRows);
      onSave({
        ...provider,
        specialty: specialties,
        certifications,
        procedures: nextRows.map((row) => ({ procedureId: row.procedureId, price: row.price })),
      });
      setLastSavedAt(new Date());
      setAutoSaveStatus("saved");
    } catch {
      setSaveError("Failed to remove procedure.");
    }
  };

  const availableProcedures = allProcedures.filter(
    (procedure) => !procedureRows.some((row) => row.procedureId === procedure.id),
  );

  const formatLastSaved = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="max-w-2xl animate-fade-up">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-display-sm text-foreground">Edit Profile</h1>
          <p className="mt-2 text-muted-foreground">Update your public-facing profile information.</p>
        </div>
        <div className="text-right text-[12px] text-muted-foreground mt-1">
          {autoSaveStatus === "saving" && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Saving...
            </span>
          )}
          {autoSaveStatus === "saved" && lastSavedAt && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />
              Last saved {formatLastSaved(lastSavedAt)}
            </span>
          )}
          {autoSaveStatus === "idle" && lastSavedAt && (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
              Last saved {formatLastSaved(lastSavedAt)}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {saveError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
            {saveError}
          </div>
        )}

        <div className="apple-card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Practice Name</Label>
              <Input value={practiceName} onChange={(e) => setPracticeName(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Full Name</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="rounded-xl h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Bio</Label>
            <Textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4} className="rounded-xl resize-none"
            />
            <p className="text-[11px] text-muted-foreground">{bio.length}/500 characters</p>
          </div>
        </div>

        <div className="apple-card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Location & Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">City, State</Label>
              <Input value={cityState} onChange={(e) => setCityState(e.target.value)} className="rounded-xl h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl h-11" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Instagram Profile URL</Label>
            <Input
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              placeholder="https://instagram.com/yourpractice"
              className="rounded-xl h-11"
            />
            <p className="text-[11px] text-muted-foreground">
              Add your public Instagram profile link so patients can view your latest social presence.
            </p>
          </div>
        </div>

        <div className="apple-card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Specialties & Certifications</h3>
          <div className="flex flex-wrap gap-2">
            {specialties.map(s => (
              <span key={s} className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-[12px] font-medium text-foreground">
                {s} <button onClick={() => removeSpecialty(s)} className="hover:text-muted-foreground">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-3">
            <Input
              value={specialtyInput}
              onChange={(e) => setSpecialtyInput(e.target.value)}
              placeholder="Add specialty"
              className="rounded-xl h-11"
              list="specialty-suggestions"
            />
            <datalist id="specialty-suggestions">
              {filteredSpecialtySuggestions.map((specialty) => (
                <option key={specialty} value={specialty} />
              ))}
            </datalist>
            <Button type="button" className="rounded-xl" onClick={() => addSpecialty(specialtyInput)}>Add</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {certifications.map(c => (
              <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-foreground/5 border border-foreground/10 px-3 py-1.5 text-[12px] font-medium text-foreground">
                {c} <button onClick={() => removeCertification(c)} className="hover:text-muted-foreground">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-3">
            <Input
              value={certificationInput}
              onChange={(e) => setCertificationInput(e.target.value)}
              placeholder="Add certification"
              className="rounded-xl h-11"
            />
            <Button type="button" className="rounded-xl" onClick={addCertification}>Add</Button>
          </div>
        </div>

        <div className="apple-card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {languages.map((lang) => (
              <span key={lang} className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1.5 text-[12px] font-medium text-foreground">
                {lang}
                <button onClick={() => removeLanguage(lang)} className="hover:text-muted-foreground">×</button>
              </span>
            ))}
          </div>
          <div className="relative">
            <Input
              ref={languageInputRef}
              value={languageInput}
              onChange={(e) => {
                setLanguageInput(e.target.value);
                setShowLanguageSuggestions(true);
              }}
              onFocus={() => setShowLanguageSuggestions(true)}
              onBlur={() => setTimeout(() => setShowLanguageSuggestions(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (languageInput.trim()) addLanguage(languageInput);
                }
              }}
              placeholder="Type a language and press Enter..."
              className="rounded-xl h-11"
            />
            {showLanguageSuggestions && languageInput.length > 0 && filteredSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-xl border border-border bg-background shadow-lg overflow-hidden">
                {filteredSuggestions.slice(0, 6).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => addLanguage(lang)}
                    className="w-full text-left px-4 py-2.5 text-[13px] text-foreground hover:bg-foreground/5 transition-colors"
                  >
                    {lang}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="apple-card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Procedure Pricing</h3>
          <p className="text-[13px] text-muted-foreground">Add procedures to your profile and set pricing. Price changes are saved when you click out of the field.</p>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_auto]">
            <select
              value={selectedProcedureId}
              onChange={(e) => setSelectedProcedureId(e.target.value)}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select a procedure</option>
              {availableProcedures.map((procedure) => (
                <option key={procedure.id} value={procedure.id}>{procedure.name}</option>
              ))}
            </select>
            <Input
              type="number"
              min={0}
              placeholder="Price"
              value={newProcedurePrice}
              onChange={(e) => setNewProcedurePrice(e.target.value)}
              className="rounded-xl h-11"
            />
            <Button type="button" className="rounded-xl" onClick={handleAddProcedure} disabled={!selectedProcedureId || !newProcedurePrice}>
              Add Procedure
            </Button>
          </div>
          <div className="space-y-3">
            {procedureRows.length === 0 ? (
              <div className="rounded-xl border border-border/60 bg-surface/40 p-4 text-[13px] text-muted-foreground">
                No procedures added yet. Add at least one procedure so your profile can accept reviews and pricing comparisons.
              </div>
            ) : (
              procedureRows.map((proc) => (
                <div key={proc.procedureId} className="flex items-center gap-4 rounded-xl bg-surface/50 p-4">
                  <div className="flex-1 text-[13px] font-medium text-foreground">{proc.procedureName}</div>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min={0}
                      value={proc.price}
                      onChange={(e) => handleProcedurePriceChange(proc.procedureId, Number(e.target.value))}
                      onBlur={() => saveProcedurePrice(proc.procedureId, proc.price)}
                      className="rounded-xl h-10 pl-7 text-right"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => handleRemoveProcedure(proc.procedureId)}
                  >
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="apple-card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Gallery</h3>
          <p className="text-[13px] text-muted-foreground">
            Upload up to {maxImages} images{subscriptionTier === "free" ? " (20 with Premium)" : ""}
            {" "}&middot; {galleryImages.length}/{maxImages} used
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />
          {galleryLoading ? (
            <div className="flex items-center justify-center py-8 text-[13px] text-muted-foreground">
              Loading gallery...
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {galleryImages.map((url) => (
                <div key={url} className="group relative aspect-square rounded-xl overflow-hidden bg-surface">
                  <img
                    src={url}
                    alt="Gallery"
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={() => handleImageDelete(url)}
                    className="absolute top-1.5 right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-[11px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                    aria-label="Delete image"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {galleryUploading && (
                <div className="aspect-square rounded-xl bg-surface flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
                </div>
              )}
              {galleryImages.length < maxImages && !galleryUploading && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
                >
                  <span className="text-2xl leading-none">+</span>
                  <span className="text-[10px]">Upload</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => navigate(`/providers/${provider.id}`)}
          >
            Preview Profile
          </Button>
          <Button className="rounded-xl" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Publish Changes"}
          </Button>
          {lastSavedAt && (
            <span className="text-[12px] text-muted-foreground ml-auto">
              All changes auto-saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
