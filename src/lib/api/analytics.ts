import { publicSupabase, supabase, supabaseConfigured } from "./client";

export async function trackEvent(
  providerId: string,
  eventType: "profile_view" | "procedure_click" | "compare_view" | "consultation_request",
  metadata: Record<string, unknown> = {}
): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await publicSupabase.from("analytics_events").insert({
    provider_id: providerId,
    event_type: eventType,
    metadata,
  });

  if (error) {
    // Analytics failures are non-critical — silently ignore
  }
}

export async function fetchProviderAnalytics(providerId: string) {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("analytics_events")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

// ── Provider Analytics (Enhanced) ────────────────────────

export interface AnalyticsSummary {
  totalViews: number;
  totalClicks: number;
  totalConsultations: number;
  totalCompares: number;
  conversionRate: number;
  viewsByDay: { date: string; count: number }[];
  consultationsByDay: { date: string; count: number }[];
  recentEvents: {
    eventType: string;
    createdAt: string;
    metadata: Record<string, unknown>;
  }[];
}

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalViews: 0,
  totalClicks: 0,
  totalConsultations: 0,
  totalCompares: 0,
  conversionRate: 0,
  viewsByDay: [],
  consultationsByDay: [],
  recentEvents: [],
};

export async function fetchProviderAnalyticsSummary(
  providerId: string,
): Promise<AnalyticsSummary> {
  if (!supabaseConfigured) return EMPTY_SUMMARY;
  try {
    const { data, error } = await supabase
      .from("analytics_events")
      .select("event_type, created_at, metadata")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    const events = data ?? [];

    const totalViews = events.filter(
      (e) => e.event_type === "profile_view",
    ).length;
    const totalClicks = events.filter(
      (e) => e.event_type === "procedure_click",
    ).length;
    const totalConsultations = events.filter(
      (e) => e.event_type === "consultation_request",
    ).length;
    const totalCompares = events.filter(
      (e) => e.event_type === "compare_view",
    ).length;
    const conversionRate =
      totalViews > 0 ? (totalConsultations / totalViews) * 100 : 0;

    const viewsByDay = groupByDay(
      events.filter((e) => e.event_type === "profile_view"),
    );
    const consultationsByDay = groupByDay(
      events.filter((e) => e.event_type === "consultation_request"),
    );

    return {
      totalViews,
      totalClicks,
      totalConsultations,
      totalCompares,
      conversionRate,
      viewsByDay,
      consultationsByDay,
      recentEvents: events
        .slice(-20)
        .reverse()
        .map((e) => ({
          eventType: e.event_type,
          createdAt: e.created_at,
          metadata: (e.metadata as Record<string, unknown>) ?? {},
        })),
    };
  } catch {
    return EMPTY_SUMMARY;
  }
}

function groupByDay(
  events: { created_at: string }[],
): { date: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const e of events) {
    const day = new Date(e.created_at).toISOString().split("T")[0];
    counts[day] = (counts[day] ?? 0) + 1;
  }
  const result: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    result.push({ date: key, count: counts[key] ?? 0 });
  }
  return result;
}
