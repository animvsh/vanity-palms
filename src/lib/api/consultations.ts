import { publicSupabase, supabase, supabaseConfigured } from "./client";

// ── Types ────────────────────────────────────────────────

export interface PatientConsultation {
  id: string;
  accessToken: string;
  providerName: string;
  status: string;
  createdAt: string;
  scheduledAt: string | null;
}

export interface ConsultationRecord {
  id: string;
  provider_id: string;
  patient_name: string;
  email: string;
  phone: string;
  preferred_date: string | null;
  message: string;
  status: "new" | "replied" | "booked" | "cancelled";
  scheduled_at: string | null;
  meeting_mode: "" | "virtual" | "in_person" | "phone";
  meeting_location: string;
  booking_notes: string;
  created_at: string;
}

export interface ConsultationMessage {
  id: string;
  consultationId: string;
  senderType: "patient" | "provider";
  senderName: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

// ── Helpers ──────────────────────────────────────────────

function mapMessage(row: Record<string, unknown>): ConsultationMessage {
  return {
    id: row.id as string,
    consultationId: row.consultation_id as string,
    senderType: row.sender_type as "patient" | "provider",
    senderName: row.sender_name as string,
    body: row.body as string,
    readAt: (row.read_at as string) ?? null,
    createdAt: row.created_at as string,
  };
}

// ── Public consultation submission ───────────────────────

export async function submitConsultation(data: {
  providerId: string;
  patientName: string;
  phone: string;
  email: string;
  preferredDate: string;
  message: string;
}): Promise<{ id: string; accessToken: string }> {
  const id = crypto.randomUUID();
  const accessToken = crypto.randomUUID();

  if (!supabaseConfigured) {
    return { id, accessToken };
  }

  const { error } = await publicSupabase.from("consultations").insert({
    id,
    access_token: accessToken,
    provider_id: data.providerId,
    patient_name: data.patientName,
    phone: data.phone,
    email: data.email,
    preferred_date: data.preferredDate || null,
    message: data.message,
  });

  if (error) throw error;
  return { id, accessToken };
}

export async function fetchConsultationsByEmail(email: string): Promise<PatientConsultation[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await publicSupabase
      .from("consultations")
      .select("id, access_token, status, created_at, scheduled_at, providers(name)")
      .eq("email", email)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      accessToken: row.access_token as string,
      providerName: (row.providers as Record<string, unknown>)?.name as string ?? "Provider",
      status: row.status as string,
      createdAt: row.created_at as string,
      scheduledAt: row.scheduled_at as string | null,
    }));
  } catch {
    return [];
  }
}

// ── Provider-facing consultations ────────────────────────

export async function fetchProviderConsultations(providerId: string): Promise<ConsultationRecord[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from("consultations")
      .select("*")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data ?? []) as ConsultationRecord[];
  } catch {
    return [];
  }
}

export async function updateConsultationStatus(
  id: string,
  status: "new" | "replied" | "booked" | "cancelled"
) {
  if (!supabaseConfigured) return;
  const { error } = await supabase
    .from("consultations")
    .update({ status })
    .eq("id", id);

  if (error) throw error;
}

export async function cancelConsultation(
  consultationId: string,
  senderType: "patient" | "provider",
  senderName: string,
) {
  if (!supabaseConfigured) return;
  const client = senderType === "patient" ? publicSupabase : supabase;
  const { error } = await client
    .from("consultations")
    .update({ status: "cancelled", scheduled_at: null })
    .eq("id", consultationId);

  if (error) throw error;

  // Send cancellation message
  await client
    .from("consultation_messages")
    .insert({
      consultation_id: consultationId,
      sender_type: senderType,
      sender_name: senderName,
      body: `This consultation has been cancelled by the ${senderType}.`,
    });
}

export async function cancelConsultationByToken(
  token: string,
  patientName: string,
) {
  if (!supabaseConfigured) return;

  // Look up the consultation by access token, then cancel it
  const { data: consultation, error: lookupError } = await publicSupabase
    .from("consultations")
    .select("id")
    .eq("access_token", token)
    .single();

  if (lookupError || !consultation) throw new Error("Consultation not found");

  const { error: updateError } = await publicSupabase
    .from("consultations")
    .update({ status: "cancelled", scheduled_at: null })
    .eq("access_token", token);

  if (updateError) throw updateError;

  // Send cancellation message
  await publicSupabase.from("consultation_messages").insert({
    consultation_id: consultation.id,
    sender_type: "patient",
    sender_name: patientName,
    body: "This consultation has been cancelled by the patient.",
  });
}

export async function scheduleConsultationMeeting(data: {
  consultationId: string;
  scheduledAt: string;
  meetingMode: "virtual" | "in_person" | "phone";
  meetingLocation?: string;
  bookingNotes?: string;
}) {
  if (!supabaseConfigured) return;
  const { error } = await supabase
    .from("consultations")
    .update({
      status: "booked",
      scheduled_at: data.scheduledAt,
      meeting_mode: data.meetingMode,
      meeting_location: data.meetingLocation ?? "",
      booking_notes: data.bookingNotes ?? "",
    })
    .eq("id", data.consultationId);

  if (error) throw error;
}

// ── Public consultation by token ─────────────────────────

export async function fetchPublicConsultationByToken(token: string): Promise<{
  id: string;
  patientName: string;
  email: string;
  providerName: string;
  status: string;
  scheduledAt: string | null;
  meetingMode: "" | "virtual" | "in_person" | "phone";
  meetingLocation: string;
  bookingNotes: string;
} | null> {
  if (!supabaseConfigured) {
    // Return mock consultation so the chat page works without Supabase
    return {
      id: token,
      patientName: "Test Patient",
      email: "test@example.com",
      providerName: "Dr. Sarah Chen",
      status: "new",
      scheduledAt: null,
      meetingMode: "",
      meetingLocation: "",
      bookingNotes: "",
    };
  }
  try {
    const { data, error } = await publicSupabase.rpc("get_public_consultation", {
      public_token: token,
    });

    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      id: row.id as string,
      patientName: row.patient_name as string,
      email: row.email as string,
      providerName: (row.provider_name as string) ?? "Provider",
      status: row.status as string,
      scheduledAt: (row.scheduled_at as string) ?? null,
      meetingMode: (row.meeting_mode as "" | "virtual" | "in_person" | "phone") ?? "",
      meetingLocation: (row.meeting_location as string) ?? "",
      bookingNotes: (row.booking_notes as string) ?? "",
    };
  } catch {
    return null;
  }
}

// ── Consultation Messages ────────────────────────────────

export async function fetchConsultationMessages(
  consultationId: string,
): Promise<ConsultationMessage[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await publicSupabase
      .from("consultation_messages")
      .select("*")
      .eq("consultation_id", consultationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []).map(mapMessage);
  } catch {
    return [];
  }
}

export async function fetchPublicConsultationMessages(
  token: string,
): Promise<ConsultationMessage[]> {
  if (!supabaseConfigured) return [];
  try {
    const { data, error } = await publicSupabase.rpc("get_public_consultation_messages", {
      public_token: token,
    });

    if (error) throw error;
    return (data ?? []).map((row: Record<string, unknown>) => mapMessage(row));
  } catch {
    return [];
  }
}

export async function sendConsultationMessage(data: {
  consultationId: string;
  senderType: "patient" | "provider";
  senderName: string;
  body: string;
}): Promise<ConsultationMessage> {
  if (!supabaseConfigured) {
    return {
      id: crypto.randomUUID(),
      consultationId: data.consultationId,
      senderType: data.senderType,
      senderName: data.senderName,
      body: data.body,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
  }
  const client = data.senderType === "patient" ? publicSupabase : supabase;
  const { data: row, error } = await client
    .from("consultation_messages")
    .insert({
      consultation_id: data.consultationId,
      sender_type: data.senderType,
      sender_name: data.senderName,
      body: data.body,
    })
    .select()
    .single();

  if (error) throw error;
  return mapMessage(row);
}

export async function sendPublicConsultationMessage(data: {
  consultationToken: string;
  senderName: string;
  body: string;
}): Promise<ConsultationMessage> {
  if (!supabaseConfigured) {
    return {
      id: crypto.randomUUID(),
      consultationId: "mock",
      senderType: "patient",
      senderName: data.senderName,
      body: data.body,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
  }
  const { data: row, error } = await publicSupabase.rpc("send_public_consultation_message", {
    public_token: data.consultationToken,
    patient_name: data.senderName,
    message_body: data.body,
  });

  if (error) throw error;
  const payload = Array.isArray(row) ? row[0] : row;
  return mapMessage(payload as Record<string, unknown>);
}

export async function markMessagesAsRead(
  consultationId: string,
): Promise<void> {
  if (!supabaseConfigured) return;
  const { error } = await supabase
    .from("consultation_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("consultation_id", consultationId)
    .eq("sender_type", "patient")
    .is("read_at", null);

  if (error) throw error;
}

export async function getUnreadMessageCount(
  providerId: string,
): Promise<number> {
  if (!supabaseConfigured) return 0;
  try {
    const { data, error } = await supabase.rpc("get_unread_message_count", {
      target_provider_id: providerId,
    });
    if (error) throw error;
    return Number(data) || 0;
  } catch {
    return 0;
  }
}
