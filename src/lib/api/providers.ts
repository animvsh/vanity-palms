import { publicSupabase, supabase, supabaseConfigured, mapProvider, PROVIDER_SELECT } from "./client";
import { providers as mockProviders } from "@/data/mockData";
import type { Provider } from "@/data/mockData";

export async function fetchProviders(): Promise<Provider[]> {
  if (!supabaseConfigured) return mockProviders;
  try {
    const { data, error } = await publicSupabase
      .from("providers")
      .select(
        "id, name, photo, specialty, rating, review_count, distance, response_time, years_experience, gender, certifications, bio, location, consultation_type, languages, subscription_tier, provider_procedures(procedure_id, price)",
      )
      .order("rating", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapProvider);
  } catch {
    return mockProviders;
  }
}

export async function fetchProviderById(
  id: string
): Promise<Provider | null> {
  if (!supabaseConfigured) {
    return mockProviders.find((p) => p.id === id) ?? null;
  }
  try {
    const { data, error } = await publicSupabase
      .from("providers")
      .select(
        "id, name, photo, specialty, rating, review_count, distance, response_time, years_experience, gender, certifications, bio, location, consultation_type, languages, subscription_tier, provider_procedures(procedure_id, price)",
      )
      .eq("id", id)
      .single();

    if (error) return null;
    return mapProvider(data);
  } catch {
    return mockProviders.find((p) => p.id === id) ?? null;
  }
}

export async function fetchProvidersByIds(
  ids: string[]
): Promise<Provider[]> {
  if (!supabaseConfigured) {
    return mockProviders.filter((p) => ids.includes(p.id));
  }
  try {
    const { data, error } = await publicSupabase
      .from("providers")
      .select(
        "id, name, photo, specialty, rating, review_count, distance, response_time, years_experience, gender, certifications, bio, location, consultation_type, languages, subscription_tier, provider_procedures(procedure_id, price)",
      )
      .in("id", ids);

    if (error) throw error;
    return (data ?? []).map(mapProvider);
  } catch {
    return mockProviders.filter((p) => ids.includes(p.id));
  }
}

export async function fetchProvidersByLocation(
  location: string
): Promise<Provider[]> {
  if (!supabaseConfigured) {
    const lower = location.toLowerCase();
    return mockProviders.filter((p) =>
      p.location.toLowerCase().includes(lower),
    );
  }
  try {
    const { data, error } = await publicSupabase
      .from("providers")
      .select(PROVIDER_SELECT)
      .ilike("location", `%${location}%`)
      .order("rating", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapProvider);
  } catch {
    const lower = location.toLowerCase();
    return mockProviders.filter((p) =>
      p.location.toLowerCase().includes(lower),
    );
  }
}

export async function fetchProvidersByProcedure(
  procedureId: string
): Promise<Provider[]> {
  if (!supabaseConfigured) {
    return mockProviders.filter((p) =>
      p.procedures.some((pp) => pp.procedureId === procedureId),
    );
  }
  try {
    const { data, error } = await publicSupabase
      .from("providers")
      .select(PROVIDER_SELECT)
      .filter("provider_procedures.procedure_id", "eq", procedureId)
      .not("provider_procedures", "is", null);

    if (error) throw error;
    return (data ?? []).map(mapProvider);
  } catch {
    return mockProviders.filter((p) =>
      p.procedures.some((pp) => pp.procedureId === procedureId),
    );
  }
}

export async function getProviderByUserId(
  userId: string
): Promise<(Provider & { status: string }) | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from("providers")
      .select("*, provider_procedures(*)")
      .eq("user_id", userId)
      .single();

    if (error) return null;
    return { ...mapProvider(data), status: data.status as string };
  } catch {
    return null;
  }
}

export async function updateProviderProfile(
  id: string,
  updates: Partial<{
    name: string;
    bio: string;
    practice_name: string;
    phone: string;
    address: string;
    city_state: string;
    specialty: string[];
    certifications: string[];
    languages: string[];
    location: string;
    instagram_url: string;
    years_experience: number;
    composio_connection_status: { calendar?: "not_connected" | "connected" | "error"; email?: "not_connected" | "connected" | "error"; provider?: string };
  }>
) {
  if (!supabaseConfigured) return;
  const nextUpdates = {
    ...updates,
    location: updates.city_state ?? updates.location,
  };

  const { error } = await supabase
    .from("providers")
    .update(nextUpdates)
    .eq("id", id);

  if (error) throw error;
}

export async function updateProviderProcedurePricing(
  providerId: string,
  procedureId: string,
  price: number
) {
  if (!supabaseConfigured) return;
  const { error } = await supabase
    .from("provider_procedures")
    .update({ price })
    .eq("provider_id", providerId)
    .eq("procedure_id", procedureId);

  if (error) throw error;
}

export async function addProviderProcedure(
  providerId: string,
  procedureId: string,
  price: number,
) {
  if (!supabaseConfigured) return;
  const { error } = await supabase
    .from("provider_procedures")
    .insert({
      provider_id: providerId,
      procedure_id: procedureId,
      price,
    });

  if (error) throw error;
}

export async function removeProviderProcedure(
  providerId: string,
  procedureId: string,
) {
  if (!supabaseConfigured) return;
  const { error } = await supabase
    .from("provider_procedures")
    .delete()
    .eq("provider_id", providerId)
    .eq("procedure_id", procedureId);

  if (error) throw error;
}

export async function createProviderProfile(data: {
  userId: string;
  firstName: string;
  lastName: string;
  practiceName: string;
  email: string;
  credentials?: {
    degree: string;
    providerType: string;
    specialty: string;
    subspecialties: string[];
    boardCertifications: string[];
    yearsInPractice: number;
    licenseNumber: string;
    licenseState: string;
    licenseDocumentUrl?: string;
  };
}): Promise<void> {
  if (!supabaseConfigured) return;
  const slug = `dr-${data.firstName}-${data.lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-");

  const baseRow: Record<string, unknown> = {
    id: slug,
    user_id: data.userId,
    name: `Dr. ${data.firstName} ${data.lastName}`,
    email: data.email,
    practice_name: data.practiceName,
    status: "pending",
    subscription_tier: "premium",
    consultation_type: ["In-Person"],
    languages: ["English"],
  };

  if (data.credentials) {
    baseRow.specialty = [data.credentials.specialty];
    baseRow.certifications = data.credentials.boardCertifications;
    baseRow.years_experience = data.credentials.yearsInPractice;
  }

  // Try with credentials JSONB column first, fall back to without
  if (data.credentials) {
    const fullRow = {
      ...baseRow,
      credentials: data.credentials,
      verification_status: "pending",
    };
    const { error: fullError } = await supabase.from("providers").insert(fullRow);
    if (!fullError) return;

    // If the credentials column doesn't exist yet, try without it
    if (fullError.message.includes("credentials") || fullError.code === "PGRST204") {
      const { error: fallbackError } = await supabase.from("providers").insert(baseRow);
      if (fallbackError) throw fallbackError;
      return;
    }
    throw fullError;
  }

  const { error } = await supabase.from("providers").insert(baseRow);
  if (error) throw error;
}

export async function deactivateOwnProviderAccount(providerId: string) {
  if (!supabaseConfigured) return;
  const { error } = await supabase.rpc("deactivate_own_provider_account", {
    provider_id: providerId,
  });
  if (error) throw error;
}

export async function fetchNotificationPreferences(
  providerId: string
): Promise<{ email: boolean; sms: boolean; weekly_digest: boolean }> {
  if (!supabaseConfigured) {
    return { email: true, sms: false, weekly_digest: true };
  }
  try {
    const { data, error } = await supabase
      .from("providers")
      .select("notification_preferences")
      .eq("id", providerId)
      .single();

    if (error) throw error;
    return (data?.notification_preferences as {
      email: boolean;
      sms: boolean;
      weekly_digest: boolean;
    }) ?? { email: true, sms: false, weekly_digest: true };
  } catch {
    return { email: true, sms: false, weekly_digest: true };
  }
}

export async function updateNotificationPreferences(
  providerId: string,
  preferences: { email: boolean; sms: boolean; weekly_digest: boolean }
) {
  if (!supabaseConfigured) return;
  const { error } = await supabase
    .from("providers")
    .update({ notification_preferences: preferences })
    .eq("id", providerId);

  if (error) throw error;
}

export async function updateProviderConnectionStatus(
  providerId: string,
  connectionStatus: {
    calendar?: "not_connected" | "connected" | "error";
    email?: "not_connected" | "connected" | "error";
    provider?: string;
  },
) {
  if (!supabaseConfigured) return;
  const { error } = await supabase
    .from("providers")
    .update({ composio_connection_status: connectionStatus })
    .eq("id", providerId);

  if (error) throw error;
}

// ── Provider Image Storage ───────────────────────────────

const BUCKET = "provider-images";

export async function uploadProviderImage(
  providerId: string,
  file: File
): Promise<string> {
  if (!supabaseConfigured) return "";
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error(`Invalid file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF.`);
  }
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large. Maximum size is 10MB.");
  }
  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${providerId}/${filename}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteProviderImage(path: string): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw error;
}

export async function listProviderImages(
  providerId: string
): Promise<string[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(providerId, { sortBy: { column: "created_at", order: "asc" } });

    if (error) throw error;

    return (data ?? [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => {
        const { data: urlData } = supabase.storage
          .from(BUCKET)
          .getPublicUrl(`${providerId}/${f.name}`);
        return urlData.publicUrl;
      });
  } catch {
    return [];
  }
}
