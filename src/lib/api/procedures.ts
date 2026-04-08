import { publicSupabase, supabaseConfigured, mapProcedure } from "./client";
import { procedures as mockProcedures } from "@/data/mockData";
import type { Procedure } from "@/data/mockData";

export async function fetchProcedures(): Promise<Procedure[]> {
  if (!supabaseConfigured) return mockProcedures;
  try {
    const { data, error } = await publicSupabase
      .from("procedures")
      .select("*")
      .order("popularity", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapProcedure);
  } catch {
    return mockProcedures;
  }
}

export async function fetchProceduresByConcern(
  concernId: string
): Promise<Procedure[]> {
  if (!supabaseConfigured) {
    return mockProcedures.filter((p) => p.concernId === concernId);
  }
  try {
    const { data, error } = await publicSupabase
      .from("procedures")
      .select("*")
      .eq("concern_id", concernId)
      .order("popularity", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(mapProcedure);
  } catch {
    return mockProcedures.filter((p) => p.concernId === concernId);
  }
}

export async function fetchProcedureById(
  id: string
): Promise<Procedure | null> {
  if (!supabaseConfigured) {
    return mockProcedures.find((p) => p.id === id) ?? null;
  }
  try {
    const { data, error } = await publicSupabase
      .from("procedures")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return mapProcedure(data);
  } catch {
    return mockProcedures.find((p) => p.id === id) ?? null;
  }
}
