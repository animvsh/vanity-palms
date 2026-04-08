import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Star, ThumbsUp, ThumbsDown, ChevronRight, ChevronLeft, ArrowLeft } from "lucide-react";

import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { fetchReviewRequest, submitReviewRequest, type ReviewRequest } from "@/lib/api";
import { REVIEW_STAGES, type ReviewStage } from "@/data/mockData";
import { POST_OP_OPTIONS } from "@/data/constants";

// ── Stage-specific question sets ────────────────────────────

interface StageQuestion {
  id: string;
  label: string;
  type: "stars" | "boolean" | "select" | "text";
  options?: readonly string[];
  placeholder?: string;
  required?: boolean;
}

const CONSULT_QUESTIONS: StageQuestion[] = [
  { id: "consultRating", label: "How was the consultation experience?", type: "stars", required: true },
  { id: "officeEnvironment", label: "Office environment & staff", type: "stars" },
  { id: "doctorListened", label: "Did the doctor listen to your goals?", type: "boolean" },
  { id: "explanationClarity", label: "How clearly were options explained?", type: "stars" },
  { id: "feltPressured", label: "Did you feel pressured into a decision?", type: "boolean" },
];

const PROCEDURE_QUESTIONS: StageQuestion[] = [
  { id: "resultsRating", label: "How satisfied are you with results so far?", type: "stars", required: true },
  { id: "recoveryRating", label: "How was the recovery experience?", type: "stars", required: true },
  { id: "postOpTimeline", label: "How far post-op are you?", type: "select", options: POST_OP_OPTIONS },
  { id: "complicationsOccurred", label: "Did you experience any complications?", type: "boolean" },
  { id: "followUpCare", label: "Quality of follow-up care", type: "stars" },
];

const RESULTS_QUESTIONS: StageQuestion[] = [
  { id: "resultsRating", label: "Final results satisfaction", type: "stars", required: true },
  { id: "postOpTimeline", label: "How far post-op are you?", type: "select", options: POST_OP_OPTIONS },
  { id: "resultsMatchExpectations", label: "Did results match what was discussed?", type: "boolean" },
  { id: "naturalLooking", label: "Do results look natural?", type: "boolean" },
  { id: "longTermSatisfaction", label: "Long-term satisfaction", type: "stars" },
];

function getQuestionsForStage(stage: string): StageQuestion[] {
  switch (stage) {
    case "consultation":
    case "consult_decision":
      return CONSULT_QUESTIONS;
    case "procedure":
      return PROCEDURE_QUESTIONS;
    case "results":
    case "follow_up":
      return RESULTS_QUESTIONS;
    default:
      return CONSULT_QUESTIONS;
  }
}

// ── Wizard Step Components ──────────────────────────────────

function StarRating({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [hover, setHover] = useState(0);
  const sizeClass = size === "lg" ? "h-8 w-8" : size === "md" ? "h-6 w-6" : "h-5 w-5";

  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Star rating">
      {Array.from({ length: 5 }).map((_, i) => (
        <button
          key={i}
          type="button"
          role="radio"
          aria-checked={value === i + 1}
          aria-label={`${i + 1} star${i > 0 ? "s" : ""}`}
          className="p-0.5 transition-transform duration-150 hover:scale-110 active:scale-95"
          onClick={() => onChange(i + 1)}
          onMouseEnter={() => setHover(i + 1)}
          onMouseLeave={() => setHover(0)}
        >
          <Star
            className={`${sizeClass} transition-colors duration-150 ${
              i < (hover || value) ? "fill-primary text-primary" : "text-border"
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className="ml-2 text-[13px] text-muted-foreground font-medium">{value}/5</span>
      )}
    </div>
  );
}

function BooleanToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex gap-3" role="radiogroup" aria-label="Yes or No">
      <button
        type="button"
        role="radio"
        aria-checked={value === true}
        onClick={() => onChange(true)}
        className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium border transition-all duration-200 ${
          value === true
            ? "bg-foreground text-background border-foreground shadow-sm"
            : "bg-background text-muted-foreground border-border hover:border-foreground/30"
        }`}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        Yes
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === false}
        onClick={() => onChange(false)}
        className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium border transition-all duration-200 ${
          value === false
            ? "bg-foreground text-background border-foreground shadow-sm"
            : "bg-background text-muted-foreground border-border hover:border-foreground/30"
        }`}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        No
      </button>
    </div>
  );
}

function SelectPills({
  value,
  options,
  onChange,
}: {
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full px-4 py-2 text-[13px] font-medium border transition-all duration-200 ${
            value === opt
              ? "bg-foreground text-background border-foreground"
              : "bg-background text-muted-foreground border-border hover:border-foreground/30"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Progress Indicator ──────────────────────────────────────

function StepProgress({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-semibold transition-all duration-300 ${
              i < current
                ? "bg-foreground text-background"
                : i === current
                ? "bg-foreground text-background ring-4 ring-foreground/10"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {i < current ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              i + 1
            )}
          </div>
          <span
            className={`text-[12px] font-medium hidden sm:inline ${
              i <= current ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {label}
          </span>
          {i < labels.length - 1 && (
            <div className={`h-px w-6 sm:w-10 transition-colors duration-300 ${i < current ? "bg-foreground" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────

const WIZARD_STEPS = ["Rating", "Details", "Recommend"] as const;

const ReviewRequestPage = () => {
  const { token = "" } = useParams<{ token: string }>();
  const [request, setRequest] = useState<ReviewRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Wizard state
  const [step, setStep] = useState(0);

  // Step 1: Overall rating + stage-specific questions
  const [rating, setRating] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | boolean | string>>({});

  // Step 2: Written review
  const [body, setBody] = useState("");
  const [patientName, setPatientName] = useState("");

  // Step 3: Recommend toggles
  const [worthIt, setWorthIt] = useState<boolean | null>(null);
  const [wouldChooseAgain, setWouldChooseAgain] = useState<boolean | null>(null);
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const reviewRequest = await fetchReviewRequest(token);
        if (!reviewRequest) {
          setError("This review link is invalid or has expired.");
          return;
        }
        setRequest(reviewRequest);
        setPatientName(reviewRequest.patientName);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load review request.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const stageQuestions = useMemo(
    () => (request?.stage ? getQuestionsForStage(request.stage) : []),
    [request?.stage]
  );

  const stageLabel = request?.stage
    ? (REVIEW_STAGES[request.stage as ReviewStage]?.label ?? "Review")
    : "Review";

  const setAnswer = useCallback(
    (id: string, value: number | boolean | string) => {
      setAnswers((prev) => ({ ...prev, [id]: value }));
    },
    []
  );

  const canAdvance = useMemo(() => {
    if (step === 0) {
      if (rating === 0) return false;
      // Check required stage questions
      return stageQuestions
        .filter((q) => q.required)
        .every((q) => answers[q.id] !== undefined && answers[q.id] !== 0);
    }
    if (step === 1) return body.trim().length >= 10;
    if (step === 2) return worthIt !== null;
    return false;
  }, [step, rating, stageQuestions, answers, body, worthIt]);

  const handleSubmit = async () => {
    if (!request || !canAdvance) return;
    setSubmitting(true);
    setError(null);

    try {
      await submitReviewRequest({
        token,
        rating,
        body: body.trim(),
        consultRating: (answers.consultRating as number) || undefined,
        resultsRating: (answers.resultsRating as number) || undefined,
        recoveryRating: (answers.recoveryRating as number) || undefined,
        worthIt: worthIt ?? undefined,
        wouldChooseAgain: wouldChooseAgain ?? undefined,
        wouldRecommend: wouldRecommend ?? undefined,
        structuredAnswers: answers,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (step === 0) {
      return (
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[14px] font-semibold text-foreground">
              Overall, how would you rate your experience?
            </label>
            <StarRating value={rating} onChange={setRating} size="lg" />
          </div>

          <hr className="divider-fade" />

          {stageQuestions.map((q) => (
            <div key={q.id} className="space-y-3">
              <label className="text-[14px] font-medium text-foreground flex items-center gap-1">
                {q.label}
                {q.required && <span className="text-destructive text-[11px]">*</span>}
              </label>
              {q.type === "stars" && (
                <StarRating
                  value={(answers[q.id] as number) || 0}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              )}
              {q.type === "boolean" && (
                <BooleanToggle
                  value={answers[q.id] as boolean | null ?? null}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              )}
              {q.type === "select" && q.options && (
                <SelectPills
                  value={(answers[q.id] as string) || ""}
                  options={q.options}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              )}
            </div>
          ))}
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="space-y-6">
          <div className="space-y-1.5">
            <label className="text-[14px] font-semibold text-foreground">Your name</label>
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[14px] text-foreground transition-shadow focus:shadow-lg focus:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[14px] font-semibold text-foreground">
              Tell future patients about your experience
            </label>
            <p className="text-[12px] text-muted-foreground mb-2">
              What stood out? What should others know before booking?
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-[14px] text-foreground resize-none transition-shadow focus:shadow-lg focus:shadow-primary/5 focus:outline-none focus:ring-2 focus:ring-foreground/10"
              placeholder={
                request?.stage === "consultation" || request?.stage === "consult_decision"
                  ? "How did the consultation go? Did you feel heard? Was the information helpful?"
                  : "How has your recovery been? Are you happy with the results so far?"
              }
            />
            <p className="text-[11px] text-muted-foreground text-right">
              {body.length} / 10 min characters
            </p>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-8">
          <p className="text-[14px] text-muted-foreground">
            These quick answers help other patients make confident decisions.
          </p>

          <div className="space-y-3">
            <label className="text-[14px] font-semibold text-foreground">
              Was it worth it?
              <span className="text-destructive text-[11px] ml-1">*</span>
            </label>
            <BooleanToggle value={worthIt} onChange={setWorthIt} />
          </div>

          <div className="space-y-3">
            <label className="text-[14px] font-semibold text-foreground">
              Would you choose this provider again?
            </label>
            <BooleanToggle value={wouldChooseAgain} onChange={setWouldChooseAgain} />
          </div>

          <div className="space-y-3">
            <label className="text-[14px] font-semibold text-foreground">
              Would you recommend to a friend?
            </label>
            <BooleanToggle value={wouldRecommend} onChange={setWouldRecommend} />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <PageTransition>
      <div className="container mx-auto max-w-2xl px-6 py-16">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Vanity Palms
        </Link>

        <div className="apple-card p-8 sm:p-10">
          {loading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
              Loading review request...
            </div>
          ) : error && !request ? (
            <div className="space-y-4">
              <h1 className="text-display-sm text-foreground">Review unavailable</h1>
              <p className="text-[14px] text-muted-foreground">{error}</p>
            </div>
          ) : submitted ? (
            <div className="space-y-5 text-center py-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
              <h1 className="text-display-sm text-foreground">Thank you!</h1>
              <p className="text-[14px] text-muted-foreground max-w-sm mx-auto">
                Your review for <span className="font-medium text-foreground">{request?.providerName}</span> has been
                submitted. It will help other patients make better decisions.
              </p>
              <div className="flex flex-col items-center gap-2 mt-4">
                {request?.providerId && (
                  <Link to={`/providers/${request.providerId}`}>
                    <Button className="rounded-full">
                      View {request.providerName}'s Profile
                    </Button>
                  </Link>
                )}
                <Link to="/">
                  <Button variant="outline" className="rounded-full">
                    Back to Vanity Palms
                  </Button>
                </Link>
              </div>
            </div>
          ) : request ? (
            <div className="space-y-8">
              {/* Header */}
              <div className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                  {stageLabel}
                </p>
                <h1 className="text-title sm:text-display-sm text-foreground">
                  Share your experience
                </h1>
                <p className="text-[14px] text-muted-foreground">
                  Review <span className="font-medium text-foreground">{request.providerName}</span> for{" "}
                  <span className="font-medium text-foreground">{request.procedureName}</span>
                </p>
              </div>

              {/* Progress */}
              <StepProgress
                current={step}
                total={WIZARD_STEPS.length}
                labels={[...WIZARD_STEPS]}
              />

              {/* Step Content */}
              <div className="min-h-[280px]">
                {renderStepContent()}
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
                  {error}
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2 border-t border-border/40">
                <Button
                  variant="ghost"
                  className="rounded-full gap-1.5 text-[13px]"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>

                {step < WIZARD_STEPS.length - 1 ? (
                  <Button
                    className="rounded-full gap-1.5 text-[13px] px-6"
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canAdvance}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    className="rounded-full gap-1.5 text-[13px] px-6"
                    onClick={handleSubmit}
                    disabled={submitting || !canAdvance}
                  >
                    {submitting ? "Submitting..." : "Submit Review"}
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </PageTransition>
  );
};

export default ReviewRequestPage;
