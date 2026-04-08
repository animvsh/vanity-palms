import { publicSupabase, supabaseConfigured } from "./client";
import { concerns as mockConcerns } from "@/data/mockData";
import type { Concern } from "@/data/mockData";

export async function fetchConcerns(): Promise<Concern[]> {
  if (!supabaseConfigured) return mockConcerns;
  try {
    const { data, error } = await publicSupabase
      .from("concerns")
      .select("*")
      .order("name");

    if (error) throw error;
    return (data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      procedureCount: c.procedure_count,
      description: c.description,
      image: c.image ?? "",
    }));
  } catch {
    return mockConcerns;
  }
}
