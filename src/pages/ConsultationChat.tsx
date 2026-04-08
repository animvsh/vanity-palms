import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fetchPublicConsultationByToken, buildGoogleCalendarUrl, downloadIcsFile, cancelConsultationByToken } from "@/lib/api";
import type { CalendarEventParams } from "@/lib/api";
import ConsultationThread from "@/components/ConsultationThread";
import { Calendar, ExternalLink, Download, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function ConsultationChat() {
  const { id } = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<{
    id: string;
    patientName: string;
    email: string;
    providerName: string;
    status: string;
    scheduledAt: string | null;
    meetingMode: "" | "virtual" | "in_person" | "phone";
    meetingLocation: string;
    bookingNotes: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const data = await fetchPublicConsultationByToken(id);

        if (!data) {
          setError(
            "Consultation not found. Please check the link and try again.",
          );
          setLoading(false);
          return;
        }

        setConsultation(data);
        setLoading(false);
      } catch {
        setError("Something went wrong. Please try again later.");
        setLoading(false);
      }
    })();
  }, [id]);

  const handleCancel = async () => {
    if (!id || !consultation) return;
    setCancelling(true);
    try {
      await cancelConsultationByToken(id, consultation.patientName);
      setConsultation({ ...consultation, status: "cancelled", scheduledAt: null });
      setShowCancelConfirm(false);
      toast.success("Consultation cancelled");
    } catch {
      toast.error("Failed to cancel. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  const calendarParams: CalendarEventParams | null =
    consultation?.scheduledAt
      ? {
          title: `Consultation — ${consultation.providerName}`,
          startIso: consultation.scheduledAt,
          durationMinutes: 30,
          description: [
            `Provider: ${consultation.providerName}`,
            consultation.meetingMode
              ? `Mode: ${consultation.meetingMode === "in_person" ? "In-person" : consultation.meetingMode === "phone" ? "Phone" : "Virtual"}`
              : "",
            consultation.bookingNotes ? `Notes: ${consultation.bookingNotes}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          location: consultation.meetingLocation || undefined,
        }
      : null;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-muted-foreground">Loading consultation...</div>
      </div>
    );
  }

  if (error || !consultation) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">{error}</p>
        <Link to="/" className="text-primary underline">
          Go home
        </Link>
      </div>
    );
  }

  const isCancelled = consultation.status === "cancelled";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">
            Consultation with {consultation.providerName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Status:{" "}
            <span
              className={`capitalize font-medium ${
                isCancelled
                  ? "text-destructive"
                  : consultation.status === "booked"
                    ? "text-emerald-600"
                    : ""
              }`}
            >
              {consultation.status}
            </span>
          </p>
        </div>
        {!isCancelled && (
          <div>
            {!showCancelConfirm ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-muted-foreground gap-1.5"
                onClick={() => setShowCancelConfirm(true)}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={cancelling}
                >
                  Keep
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? "Cancelling..." : "Confirm Cancel"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {isCancelled && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">This consultation has been cancelled.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            If you'd like to reschedule, please{" "}
            <Link to={`/providers`} className="underline hover:text-foreground">
              find your provider
            </Link>{" "}
            and submit a new consultation request.
          </p>
        </div>
      )}

      {consultation.scheduledAt && !isCancelled && (
        <div className="mb-4 rounded-xl border bg-card p-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-foreground" />
                <p className="text-sm font-medium text-foreground">Appointment Scheduled</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground ml-6">
                {new Date(consultation.scheduledAt).toLocaleString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
                {consultation.meetingMode
                  ? ` · ${consultation.meetingMode === "in_person" ? "In person" : consultation.meetingMode === "phone" ? "Phone" : "Virtual"}`
                  : ""}
              </p>
              {consultation.meetingLocation && (
                <p className="mt-1 text-sm text-muted-foreground ml-6">{consultation.meetingLocation}</p>
              )}
              {consultation.bookingNotes && (
                <p className="mt-1 text-sm text-muted-foreground ml-6">{consultation.bookingNotes}</p>
              )}
            </div>
          </div>

          {calendarParams && (
            <div className="mt-3 ml-6 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 text-[12px]"
                onClick={() => window.open(buildGoogleCalendarUrl(calendarParams), "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-3 w-3" />
                Google Calendar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 text-[12px]"
                onClick={() => downloadIcsFile(calendarParams)}
              >
                <Download className="h-3 w-3" />
                Download .ics
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border bg-card h-[500px] flex flex-col overflow-hidden">
        <ConsultationThread
          consultationId={consultation.id}
          consultationToken={id}
          senderType="patient"
          senderName={consultation.patientName}
        />
      </div>

      <p className="mt-3 text-xs text-muted-foreground text-center">
        Messages are sent directly to {consultation.providerName}&apos;s inbox.
      </p>
    </div>
  );
}
