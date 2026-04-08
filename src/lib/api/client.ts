export { publicSupabase, supabase, supabaseConfigured } from "../supabase";
import type { Provider, Procedure, Review } from "@/data/mockData";

// ── Shared select string ─────────────────────────────────

export const PROVIDER_SELECT =
  "id, name, photo, specialty, rating, review_count, distance, response_time, years_experience, gender, certifications, bio, location, consultation_type, languages, subscription_tier, provider_procedures(procedure_id, price)";

// ── Row → domain mappers ─────────────────────────────────

export function mapProvider(row: Record<string, unknown>): Provider {
  const procs = (row.provider_procedures as Array<{ procedure_id: string; price: number }>) ?? [];
  return {
    id: row.id as string,
    name: row.name as string,
    practiceName: (row.practice_name as string) ?? "",
    photo: (row.photo as string) ?? "",
    specialty: (row.specialty as string[]) ?? [],
    rating: Number(row.rating),
    reviewCount: row.review_count as number,
    distance: Number(row.distance),
    responseTime: (row.response_time as string) ?? "< 24 hours",
    yearsExperience: row.years_experience as number,
    gender: (row.gender as string) ?? "",
    certifications: (row.certifications as string[]) ?? [],
    bio: (row.bio as string) ?? "",
    location: (row.location as string) ?? "",
    consultationType: (row.consultation_type as string[]) ?? [],
    procedures: procs.map((p) => ({
      procedureId: p.procedure_id,
      price: p.price,
    })),
    languages: (row.languages as string[]) ?? [],
    instagramUrl: (row.instagram_url as string) ?? "",
    composioConnectionStatus: (row.composio_connection_status as { calendar?: "not_connected" | "connected" | "error"; email?: "not_connected" | "connected" | "error"; provider?: string }) ?? { calendar: "not_connected", email: "not_connected", provider: "composio" },
    subscriptionTier: (row.subscription_tier as "free" | "premium") ?? "free",
    credentials: (row.credentials as Provider["credentials"]) ?? undefined,
    verificationStatus: (row.verification_status as Provider["verificationStatus"]) ?? undefined,
  };
}

export function mapProcedure(row: Record<string, unknown>): Procedure {
  return {
    id: row.id as string,
    concernId: row.concern_id as string,
    name: row.name as string,
    type: row.type as "surgical" | "non-surgical",
    costMin: row.cost_min as number,
    costMax: row.cost_max as number,
    recoveryDays: row.recovery_days as number,
    rating: Number(row.rating),
    popularity: row.popularity as number,
    overview: row.overview as string,
    howItWorks: row.how_it_works as string,
    recoveryTimeline: (row.recovery_timeline as { day: string; description: string }[]) ?? [],
    expectedResults: row.expected_results as string,
  };
}

export function mapReview(row: Record<string, unknown>): Review {
  return {
    id: row.id as string,
    providerId: row.provider_id as string,
    procedureId: row.procedure_id as string,
    rating: row.rating as number,
    body: row.body as string,
    patientName: row.patient_name as string,
    date: row.date as string,
    stage: (row.stage as Review["stage"]) ?? undefined,
    consultRating: row.consult_rating as number | undefined,
    resultsRating: row.results_rating as number | undefined,
    recoveryRating: row.recovery_rating as number | undefined,
    worthIt: row.worth_it as boolean | undefined,
    wouldChooseAgain: row.would_choose_again as boolean | undefined,
    wouldRecommend: row.would_recommend as boolean | undefined,
  };
}
