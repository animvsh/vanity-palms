export interface Consultation {
  id: string;
  patient_name: string;
  email: string;
  phone: string;
  preferred_date: string;
  message: string;
  status: string;
  scheduled_at: string | null;
  meeting_mode: "" | "virtual" | "in_person" | "phone";
  meeting_location: string;
  booking_notes: string;
  created_at: string;
}

export interface AnalyticsEvent {
  id: string;
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface ProcedureRow {
  procedureId: string;
  procedureName: string;
  price: number;
}
