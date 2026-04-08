import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  createReviewRequest,
  updateConsultationStatus,
  cancelConsultation,
  scheduleConsultationMeeting,
  sendConsultationMessage,
  buildGoogleCalendarUrl,
  downloadIcsFile,
} from "@/lib/api";
import type { CalendarEventParams } from "@/lib/api";
import type { Provider, ReviewStage } from "@/data/mockData";
import type { Consultation, AnalyticsEvent } from "./types";
import type { ReactNode } from "react";
import ConsultationThread from "@/components/ConsultationThread";
import {
  Eye, MessageCircle, TrendingUp, Star, ChevronUp, ChevronRight,
  Mail, Phone, Calendar, ExternalLink, Download, XCircle,
} from "lucide-react";

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

interface DashboardTabProps {
  provider: Provider;
  consultations: Consultation[];
  analytics: AnalyticsEvent[];
  onConsultationsChange: (c: Consultation[]) => void;
}

export const DashboardTab = ({ provider, consultations, analytics, onConsultationsChange }: DashboardTabProps) => {
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showAllInquiries, setShowAllInquiries] = useState(false);
  const [reviewRequestProcedureId, setReviewRequestProcedureId] = useState(provider.procedures[0]?.procedureId ?? "");
  const [reviewRequestStage, setReviewRequestStage] = useState<ReviewStage>("consultation");
  const [reviewRequestLink, setReviewRequestLink] = useState("");
  const [creatingReviewRequest, setCreatingReviewRequest] = useState(false);
  const [meetingDateTime, setMeetingDateTime] = useState("");
  const [meetingMode, setMeetingMode] = useState<"virtual" | "in_person" | "phone">("virtual");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [schedulingMeeting, setSchedulingMeeting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancellingConsultation, setCancellingConsultation] = useState(false);
  const [showMessages, setShowMessages] = useState(false);

  const profileViews = analytics.filter(e => e.event_type === "profile_view").length;
  const inquiries = consultations.length;
  const consultationRequests = analytics.filter(e => e.event_type === "consultation_request").length;
  const conversionRate = profileViews > 0 ? ((consultationRequests / profileViews) * 100).toFixed(1) : "0.0";
  const ratingValue = provider.rating != null && !isNaN(Number(provider.rating)) ? String(provider.rating) : "0";

  const formatTimeAgo = (dateStr: string) => {
    const createdAt = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    return diffHours < 1 ? "Just now" : diffHours < 24 ? `${diffHours} hours ago` : `${Math.floor(diffHours / 24)} days ago`;
  };

  const formatStatus = (status: string) =>
    status === "new" ? "New" : status === "replied" ? "Replied" : status === "booked" ? "Booked" : status === "cancelled" ? "Cancelled" : status;

  const statusClassName = (displayStatus: string) =>
    displayStatus === "New" ? "bg-foreground/10 text-foreground" :
    displayStatus === "Booked" ? "bg-foreground text-background" :
    displayStatus === "Cancelled" ? "bg-destructive/10 text-destructive" :
    "bg-secondary text-secondary-foreground";

  const handleStatusUpdate = async (id: string, newStatus: "replied" | "booked") => {
    setUpdatingStatus(true);
    try {
      await updateConsultationStatus(id, newStatus);
      const updated = consultations.map((c) =>
        c.id === id ? { ...c, status: newStatus } : c
      );
      onConsultationsChange(updated);
      if (selectedConsultation?.id === id) {
        setSelectedConsultation({ ...selectedConsultation, status: newStatus });
      }
      toast.success(`Marked as ${formatStatus(newStatus)}`);
    } catch {
      toast.error("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleScheduleMeeting = async () => {
    if (!selectedConsultation || !meetingDateTime) return;

    setSchedulingMeeting(true);
    try {
      const scheduledIso = new Date(meetingDateTime).toISOString();
      await scheduleConsultationMeeting({
        consultationId: selectedConsultation.id,
        scheduledAt: scheduledIso,
        meetingMode,
        meetingLocation,
        bookingNotes,
      });

      const updatedConsultation: Consultation = {
        ...selectedConsultation,
        status: "booked",
        scheduled_at: scheduledIso,
        meeting_mode: meetingMode,
        meeting_location: meetingLocation,
        booking_notes: bookingNotes,
      };

      const updated = consultations.map((c) =>
        c.id === selectedConsultation.id ? updatedConsultation : c,
      );
      onConsultationsChange(updated);
      setSelectedConsultation(updatedConsultation);

      const isReschedule = Boolean(selectedConsultation.scheduled_at);
      const dateStr = new Date(meetingDateTime).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
      const modeStr = meetingMode === "in_person" ? "In person" : meetingMode === "phone" ? "Phone" : "Virtual";
      const prefix = isReschedule ? "Your consultation has been rescheduled." : "Your consultation has been scheduled.";
      await sendConsultationMessage({
        consultationId: selectedConsultation.id,
        senderType: "provider",
        senderName: provider.name,
        body: `${prefix}\n\nDate: ${dateStr}\nMode: ${modeStr}${meetingLocation ? `\nLocation: ${meetingLocation}` : ""}${bookingNotes ? `\n\nNotes: ${bookingNotes}` : ""}`,
      });

      toast.success(isReschedule ? "Consultation rescheduled — update your calendar below" : "Consultation booked — add it to your calendar below");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to schedule consultation.");
    } finally {
      setSchedulingMeeting(false);
    }
  };

  const buildCalendarParams = (consultation: Consultation): CalendarEventParams | null => {
    if (!consultation.scheduled_at) return null;
    const modeLabel =
      consultation.meeting_mode === "in_person" ? "In-person" :
      consultation.meeting_mode === "phone" ? "Phone" : "Virtual";
    return {
      title: `Consultation — ${consultation.patient_name}`,
      startIso: consultation.scheduled_at,
      durationMinutes: 30,
      description: [
        `Patient: ${consultation.patient_name}`,
        `Mode: ${modeLabel}`,
        consultation.booking_notes ? `Notes: ${consultation.booking_notes}` : "",
      ].filter(Boolean).join("\n"),
      location: consultation.meeting_location || undefined,
    };
  };

  const handleCancelConsultation = async () => {
    if (!selectedConsultation) return;
    setCancellingConsultation(true);
    try {
      await cancelConsultation(selectedConsultation.id, "provider", provider.name);
      const updatedConsultation: Consultation = {
        ...selectedConsultation,
        status: "cancelled",
        scheduled_at: null,
      };
      const updated = consultations.map((c) =>
        c.id === selectedConsultation.id ? updatedConsultation : c,
      );
      onConsultationsChange(updated);
      setSelectedConsultation(updatedConsultation);
      setShowCancelConfirm(false);
      toast.success("Consultation cancelled");
    } catch {
      toast.error("Failed to cancel consultation.");
    } finally {
      setCancellingConsultation(false);
    }
  };

  const recentInquiries = showAllInquiries ? consultations : consultations.slice(0, 4);

  useEffect(() => {
    if (!selectedConsultation) return;
    setShowCancelConfirm(false);
    setShowMessages(false);
    setReviewRequestProcedureId(provider.procedures[0]?.procedureId ?? "");
    setReviewRequestStage("consultation");
    setReviewRequestLink("");
    setMeetingDateTime(
      selectedConsultation.scheduled_at
        ? new Date(selectedConsultation.scheduled_at).toISOString().slice(0, 16)
        : "",
    );
    setMeetingMode(selectedConsultation.meeting_mode || "virtual");
    setMeetingLocation(selectedConsultation.meeting_location || "");
    setBookingNotes(selectedConsultation.booking_notes || "");
  }, [provider.procedures, selectedConsultation]);

  return (
    <div className="max-w-4xl animate-fade-up">
      <div className="mb-8">
        <h1 className="text-display-sm text-foreground">{getGreeting()}, {provider.name.split(" ").pop()}</h1>
        <p className="mt-2 text-muted-foreground">Here's how your practice is performing.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { label: "Profile Views", value: String(profileViews || 0), icon: <Eye className="h-4 w-4" /> as ReactNode },
          { label: "Inquiries", value: String(inquiries || 0), icon: <MessageCircle className="h-4 w-4" /> as ReactNode },
          { label: "Conversion", value: `${conversionRate}%`, icon: <TrendingUp className="h-4 w-4" /> as ReactNode },
          { label: "Avg Rating", value: ratingValue, icon: <Star className="h-4 w-4" /> as ReactNode },
        ].map((stat) => (
          <div key={stat.label} className="apple-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-muted-foreground">{stat.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface text-muted-foreground">
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="apple-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">Recent Inquiries</h2>
          {recentInquiries.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-[13px] text-foreground"
              onClick={() => setShowAllInquiries((value) => !value)}
            >
              {showAllInquiries ? "Show recent" : "View all"}
              {showAllInquiries ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronRight className="h-3 w-3 ml-0.5" />}
            </Button>
          )}
        </div>
        <div className="space-y-3">
          {recentInquiries.length === 0 && (
            <div className="flex flex-col items-center py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5">
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-[13px] font-medium text-foreground mb-1">No inquiries yet</p>
              <p className="text-[12px] text-muted-foreground">Inquiries from patients will appear here as they discover your profile.</p>
            </div>
          )}
          {recentInquiries.map((c) => {
            const displayStatus = formatStatus(c.status);
            return (
              <button
                key={c.id}
                onClick={() => setSelectedConsultation(c)}
                className="flex w-full items-center justify-between rounded-xl bg-surface/50 p-4 text-left transition-colors hover:bg-surface/80"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-foreground">
                    {c.patient_name[0]}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-foreground">{c.patient_name}</div>
                    <div className="text-[12px] text-muted-foreground">{c.message?.slice(0, 30) || "Consultation"}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClassName(displayStatus)}`}>
                    {displayStatus}
                  </span>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{formatTimeAgo(c.created_at)}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Dialog open={selectedConsultation !== null} onOpenChange={(open) => { if (!open) setSelectedConsultation(null); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          {selectedConsultation && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">Consultation Details</DialogTitle>
                <DialogDescription>
                  Inquiry from {selectedConsultation.patient_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
                    {selectedConsultation.patient_name[0]}
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-foreground">{selectedConsultation.patient_name}</div>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClassName(formatStatus(selectedConsultation.status))}`}>
                      {formatStatus(selectedConsultation.status)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl bg-surface/50 p-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground w-4 text-center" />
                    <span className="text-[13px] text-foreground">{selectedConsultation.email || "Not provided"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground w-4 text-center" />
                    <span className="text-[13px] text-foreground">{selectedConsultation.phone || "Not provided"}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground w-4 text-center" />
                    <span className="text-[13px] text-foreground">
                      {selectedConsultation.preferred_date
                        ? new Date(selectedConsultation.preferred_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
                        : "No preferred date"}
                    </span>
                  </div>
                </div>

                {selectedConsultation.message && (
                  <div className="space-y-1.5">
                    <div className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">Message</div>
                    <p className="text-[13px] text-foreground leading-relaxed rounded-xl bg-surface/50 p-4">
                      {selectedConsultation.message}
                    </p>
                  </div>
                )}

                <div className="text-[11px] text-muted-foreground">
                  Received {formatTimeAgo(selectedConsultation.created_at)}
                </div>

                {selectedConsultation.status === "cancelled" ? (
                  <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-[13px] font-medium text-destructive">This consultation has been cancelled.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="flex-1 rounded-xl"
                      disabled={updatingStatus || selectedConsultation.status === "replied"}
                      onClick={() => handleStatusUpdate(selectedConsultation.id, "replied")}
                    >
                      {updatingStatus ? "Updating..." : "Mark as Replied"}
                    </Button>
                    <Button
                      className="flex-1 rounded-xl"
                      disabled={updatingStatus || selectedConsultation.status === "booked"}
                      onClick={() => handleStatusUpdate(selectedConsultation.id, "booked")}
                    >
                      {updatingStatus ? "Updating..." : "Mark as Booked"}
                    </Button>
                    {!showCancelConfirm ? (
                      <Button
                        variant="outline"
                        className="rounded-xl text-muted-foreground gap-1.5"
                        onClick={() => setShowCancelConfirm(true)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    ) : (
                      <div className="flex w-full gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl flex-1"
                          onClick={() => setShowCancelConfirm(false)}
                          disabled={cancellingConsultation}
                        >
                          Keep
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl flex-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={handleCancelConsultation}
                          disabled={cancellingConsultation}
                        >
                          {cancellingConsultation ? "Cancelling..." : "Confirm Cancel"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Message thread toggle */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl gap-1.5"
                  onClick={() => setShowMessages((v) => !v)}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  {showMessages ? "Hide Messages" : "View Messages"}
                </Button>

                {showMessages && (
                  <div className="rounded-xl border bg-card h-[300px] flex flex-col overflow-hidden">
                    <ConsultationThread
                      consultationId={selectedConsultation.id}
                      senderType="provider"
                      senderName={provider.name}
                    />
                  </div>
                )}

                {selectedConsultation.status !== "cancelled" && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-surface/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Book consultation in app</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        Schedule a confirmed meeting inside Vanity Palms. This is the foundation for future calendar sync and Composio connections.
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${selectedConsultation.scheduled_at ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"}`}>
                      {selectedConsultation.scheduled_at ? "Scheduled" : "Draft booking"}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={meetingDateTime}
                        onChange={(e) => setMeetingDateTime(e.target.value)}
                        className="rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[12px]">Meeting Mode</Label>
                      <select
                        value={meetingMode}
                        onChange={(e) => setMeetingMode(e.target.value as "virtual" | "in_person" | "phone")}
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground"
                      >
                        <option value="virtual">Virtual</option>
                        <option value="in_person">In person</option>
                        <option value="phone">Phone</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px]">
                      {meetingMode === "in_person" ? "Location" : meetingMode === "virtual" ? "Video meeting link" : "Call instructions"}
                    </Label>
                    <Input
                      value={meetingLocation}
                      onChange={(e) => setMeetingLocation(e.target.value)}
                      placeholder={meetingMode === "in_person" ? "Office address or suite" : meetingMode === "virtual" ? "https://meet.google.com/..." : "Best phone number or dial-in details"}
                      className="rounded-xl h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[12px]">Booking Notes</Label>
                    <Textarea
                      value={bookingNotes}
                      onChange={(e) => setBookingNotes(e.target.value)}
                      rows={3}
                      className="rounded-xl resize-none"
                      placeholder="Preparation instructions, paperwork reminders, or arrival notes..."
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      className="rounded-xl"
                      disabled={schedulingMeeting || !meetingDateTime}
                      onClick={handleScheduleMeeting}
                    >
                      {schedulingMeeting ? "Scheduling..." : selectedConsultation.scheduled_at ? "Update Booking" : "Schedule Meeting"}
                    </Button>
                    {selectedConsultation.scheduled_at && (
                      <span className="text-[12px] text-muted-foreground">
                        Scheduled for {new Date(selectedConsultation.scheduled_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    )}
                  </div>

                  {selectedConsultation.scheduled_at && (() => {
                    const calParams = buildCalendarParams(selectedConsultation);
                    if (!calParams) return null;
                    return (
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl gap-1.5"
                          onClick={() => window.open(buildGoogleCalendarUrl(calParams), "_blank", "noopener,noreferrer")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Add to Google Calendar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl gap-1.5"
                          onClick={() => downloadIcsFile(calParams)}
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download .ics
                        </Button>
                      </div>
                    );
                  })()}
                </div>
                )}

                {selectedConsultation.status === "booked" && provider.procedures.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-border/60 bg-surface/40 p-4">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">Generate secure review link</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        Share this link with the booked patient to collect a verified review.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <select
                        value={reviewRequestProcedureId}
                        onChange={(e) => setReviewRequestProcedureId(e.target.value)}
                        className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
                      >
                        {provider.procedures.map((procedure) => (
                          <option key={procedure.procedureId} value={procedure.procedureId}>
                            {procedure.procedureId}
                          </option>
                        ))}

                      </select>
                      <select
                        value={reviewRequestStage}
                        onChange={(e) => setReviewRequestStage(e.target.value as ReviewStage)}
                        className="rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <option value="consultation">Consultation</option>
                        <option value="procedure">Procedure</option>
                        <option value="follow_up">Follow-up</option>
                      </select>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="button"
                        className="rounded-xl"
                        disabled={creatingReviewRequest || !reviewRequestProcedureId}
                        onClick={async () => {
                          setCreatingReviewRequest(true);
                          try {
                            const token = await createReviewRequest(
                              selectedConsultation.id,
                              reviewRequestProcedureId,
                              reviewRequestStage,
                            );
                            const reviewUrl = `${window.location.origin}/review/${token}`;
                            setReviewRequestLink(reviewUrl);
                            if (navigator.clipboard?.writeText) {
                              await navigator.clipboard.writeText(reviewUrl);
                            }
                            toast.success("Review link created");
                          } catch (error) {
                            toast.error(error instanceof Error ? error.message : "Failed to create review link.");
                          } finally {
                            setCreatingReviewRequest(false);
                          }
                        }}
                      >
                        {creatingReviewRequest ? "Creating..." : "Create review link"}
                      </Button>
                      {reviewRequestLink && (
                        <Button
                          type="button"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => window.open(reviewRequestLink, "_blank", "noopener,noreferrer")}
                        >
                          Open link
                        </Button>
                      )}
                    </div>
                    {reviewRequestLink && (
                      <div className="rounded-xl border border-border bg-background px-3 py-2 text-[12px] text-muted-foreground break-all">
                        {reviewRequestLink}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
