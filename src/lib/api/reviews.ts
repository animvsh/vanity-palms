import { publicSupabase, supabase, supabaseConfigured, mapReview } from "./client";
import { reviews as mockReviews } from "@/data/mockData";
import type { Review } from "@/data/mockData";

export async function fetchReviews(): Promise<Review[]> {
  if (!supabaseConfigured) return mockReviews;
  try {
    const { data, error } = await publicSupabase
      .from("reviews")
      .select("*")
      .order("date", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapReview);
  } catch {
    return mockReviews;
  }
}

export async function fetchReviewsByProvider(
  providerId: string
): Promise<Review[]> {
  if (!supabaseConfigured) {
    return mockReviews.filter((r) => r.providerId === providerId);
  }
  try {
    const { data, error } = await publicSupabase
      .from("reviews")
      .select("*")
      .eq("provider_id", providerId)
      .order("date", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapReview);
  } catch {
    return mockReviews.filter((r) => r.providerId === providerId);
  }
}

export async function fetchReviewsByProcedure(
  procedureId: string
): Promise<Review[]> {
  if (!supabaseConfigured) {
    return mockReviews.filter((r) => r.procedureId === procedureId);
  }
  try {
    const { data, error } = await publicSupabase
      .from("reviews")
      .select("*")
      .eq("procedure_id", procedureId)
      .order("date", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapReview);
  } catch {
    return mockReviews.filter((r) => r.procedureId === procedureId);
  }
}

// ── Review Requests ───────────────────────────────────────

export interface ReviewRequest {
  providerId: string;
  providerName: string;
  procedureId: string;
  procedureName: string;
  patientName: string;
  stage: Review["stage"];
}

export async function createReviewRequest(
  consultationId: string,
  procedureId: string,
  stage: Review["stage"] = "consultation",
) {
  if (!supabaseConfigured) return "mock-review-token";
  const { data, error } = await supabase.rpc("create_review_request", {
    target_consultation_id: consultationId,
    target_procedure_id: procedureId,
    target_stage: stage,
  });

  if (error) throw error;
  return String(data);
}

export async function fetchReviewRequest(token: string): Promise<ReviewRequest | null> {
  if (!supabaseConfigured) return null;
  try {
    const { data, error } = await publicSupabase.rpc("get_review_request", {
      public_token: token,
    });

    if (error) throw error;
    const request = Array.isArray(data) ? data[0] : data;
    if (!request) return null;

    return {
      providerId: request.provider_id as string,
      providerName: request.provider_name as string,
      procedureId: request.procedure_id as string,
      procedureName: request.procedure_name as string,
      patientName: request.patient_name as string,
      stage: request.stage as Review["stage"],
    };
  } catch {
    return null;
  }
}

export async function submitReviewRequest(data: {
  token: string;
  rating: number;
  body: string;
  consultRating?: number;
  resultsRating?: number;
  recoveryRating?: number;
  worthIt?: boolean;
  wouldChooseAgain?: boolean;
  wouldRecommend?: boolean;
  structuredAnswers?: Record<string, unknown>;
}) {
  if (!supabaseConfigured) return;
  const { error } = await publicSupabase.rpc("submit_review_request", {
    public_token: data.token,
    review_rating: data.rating,
    review_body: data.body,
    review_consult_rating: data.consultRating ?? null,
    review_results_rating: data.resultsRating ?? null,
    review_recovery_rating: data.recoveryRating ?? null,
    review_worth_it: data.worthIt ?? null,
    review_would_choose_again: data.wouldChooseAgain ?? null,
    review_would_recommend: data.wouldRecommend ?? null,
    review_structured_answers: data.structuredAnswers ?? null,
  });

  if (error) throw error;
}
