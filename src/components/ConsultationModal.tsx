import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { submitConsultation, sendPublicConsultationMessage, trackEvent } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { CircleCheck } from "lucide-react";

interface ConsultationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerName: string;
  providerId: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS_RE = /\d/g;

const ConsultationModal = ({ open, onOpenChange, providerName, providerId }: ConsultationModalProps) => {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!EMAIL_RE.test(email)) newErrors.email = "Invalid email format";
    if (!phone.trim()) newErrors.phone = "Phone is required";
    else if ((phone.match(PHONE_DIGITS_RE) || []).length < 10) newErrors.phone = "Phone must have at least 10 digits";
    if (!date) newErrors.date = "Preferred date is required";
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = (): boolean => {
    return Boolean(
      name.trim() &&
      EMAIL_RE.test(email) &&
      phone.trim() &&
      (phone.match(PHONE_DIGITS_RE) || []).length >= 10 &&
      date
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setError(null);

    try {
      const result = await submitConsultation({
        providerId,
        patientName: name,
        phone,
        email,
        preferredDate: date,
        message,
      });
      setConsultationId(result.accessToken);

      // Also create the initial message in the thread via token-gated public access
      if (message.trim()) {
        await sendPublicConsultationMessage({
          consultationToken: result.accessToken,
          senderName: name,
          body: message,
        }).catch(() => {}); // non-blocking
      }

      setSubmitted(true);
      trackEvent(providerId, "consultation_request").catch(() => {});
      toast.success("Consultation request sent!", {
        description: "The provider will respond within 24 hours.",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit consultation request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setError(null);
    setFieldErrors({});
    setConsultationId(null);
    setName("");
    setPhone("");
    setEmail("");
    setDate("");
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        {submitted ? (
          <div className="flex flex-col items-center py-10 text-center animate-scale-in">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5">
              <CircleCheck className="h-8 w-8 text-foreground" />
            </div>
            <h3 className="mb-2 text-title text-foreground">Request Sent</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Your consultation request has been sent to {providerName}. They'll respond within 24 hours.
            </p>
            <div className="mt-6 flex gap-3">
              <Button variant="outline" className="rounded-full px-6" onClick={handleClose}>Done</Button>
              {consultationId && (
                <Button
                  className="rounded-full px-6"
                  onClick={() => {
                    handleClose();
                    navigate(`/consultation/${consultationId}`);
                  }}
                >
                  Continue Messaging
                </Button>
              )}
            </div>

            {/* Account creation prompt */}
            <div className="mt-6 rounded-xl border border-border/60 bg-surface/50 p-4">
              <p className="text-[13px] font-medium text-foreground mb-1">Want to track your journey?</p>
              <p className="text-[12px] text-muted-foreground mb-3">Create a free account to save providers, track consultations, and leave verified reviews.</p>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full text-[12px]"
                onClick={() => {
                  handleClose();
                  navigate("/signup");
                }}
              >
                Create Account
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">Request a Consultation</DialogTitle>
              <DialogDescription>
                Reach out to {providerName}. No account required.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-[13px]">Full Name *</Label>
                  <Input id="name" name="name" placeholder="Jane Doe" className="rounded-xl h-11" value={name} onChange={(e) => { setName(e.target.value); setFieldErrors((prev) => { const { name: _, ...rest } = prev; return rest; }); }} />
                  {fieldErrors.name && <p className="text-sm text-destructive mt-1">{fieldErrors.name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-[13px]">Phone *</Label>
                  <Input id="phone" name="phone" placeholder="(310) 555-0100" className="rounded-xl h-11" value={phone} onChange={(e) => { setPhone(e.target.value); setFieldErrors((prev) => { const { phone: _, ...rest } = prev; return rest; }); }} />
                  {fieldErrors.phone && <p className="text-sm text-destructive mt-1">{fieldErrors.phone}</p>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px]">Email *</Label>
                <Input id="email" name="email" type="email" placeholder="jane@example.com" className="rounded-xl h-11" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => { const { email: _, ...rest } = prev; return rest; }); }} />
                {fieldErrors.email && <p className="text-sm text-destructive mt-1">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-[13px]">Preferred Date *</Label>
                <Input id="date" name="date" type="date" className="rounded-xl h-11" value={date} onChange={(e) => { setDate(e.target.value); setFieldErrors((prev) => { const { date: _, ...rest } = prev; return rest; }); }} />
                {fieldErrors.date && <p className="text-sm text-destructive mt-1">{fieldErrors.date}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message" className="text-[13px]">Message (optional)</Label>
                <Textarea id="message" name="message" placeholder="Tell the provider about your goals..." rows={3} className="rounded-xl resize-none" value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 text-[15px]" disabled={submitting || !isFormValid()}>
                {submitting ? "Sending..." : "Send Request"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ConsultationModal;
