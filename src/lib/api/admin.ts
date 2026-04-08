import { supabase, mapProvider } from "./client";
import type { Provider } from "@/data/mockData";

export interface WhitelistEntry {
  email: string;
  note: string;
  created_at: string;
}

/** Lightweight provider fetch for admin — skips the provider_procedures join. */
export async function fetchAdminProviders(): Promise<
  (Provider & { status: string; subscription_tier: string; email: string; practice_name: string })[]
> {
  const { data, error } = await supabase
    .from("providers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...mapProvider(row),
    status: row.status as string,
    subscription_tier: row.subscription_tier as string,
    email: (row.email as string) ?? "",
    practice_name: (row.practice_name as string) ?? "",
  }));
}

/** Fetch only the consultation count and unique patient count for admin overview. */
export async function fetchAdminConsultationStats(): Promise<{
  totalConsultations: number;
  totalPatients: number;
}> {
  const { data, error } = await supabase
    .from("consultations")
    .select("email");

  if (error) throw error;
  const rows = data ?? [];
  const uniqueEmails = new Set(
    rows.map((c) => (c.email as string)?.toLowerCase()).filter(Boolean)
  );
  return {
    totalConsultations: rows.length,
    totalPatients: uniqueEmails.size,
  };
}

export async function fetchProviderWhitelist(): Promise<WhitelistEntry[]> {
  const { data, error } = await supabase
    .from("provider_whitelist")
    .select("email, note, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as WhitelistEntry[];
}

export async function addProviderWhitelistEntry(email: string, note: string) {
  const { error } = await supabase.rpc("admin_add_provider_whitelist", {
    target_email: email,
    target_note: note || null,
  });
  if (error) throw error;
}

export async function removeProviderWhitelistEntry(email: string) {
  const { error } = await supabase.rpc("admin_remove_provider_whitelist", {
    target_email: email,
  });
  if (error) throw error;
}

export async function updateProviderStatus(
  id: string,
  status: "pending" | "approved" | "rejected",
  reason?: string
) {
  const { error } = await supabase.rpc("admin_update_provider_status", {
    provider_id: id,
    new_status: status,
    ...(reason ? { rejection_reason: reason } : {}),
  });
  if (error) throw error;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.rpc("admin_delete_review", {
    review_id: id,
  });
  if (error) throw error;
}

export async function updateProviderSubscription(
  id: string,
  tier: "free" | "premium"
) {
  const { error } = await supabase.rpc("admin_update_provider_subscription", {
    provider_id: id,
    new_tier: tier,
  });
  if (error) throw error;
}
