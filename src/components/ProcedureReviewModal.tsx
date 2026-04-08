import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star } from "lucide-react";
import { useState } from "react";
import type { Review } from "@/data/mockData";

interface ProcedureReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  procedureName: string;
  reviews: Review[];
  providerNames: Record<string, string>;
}

const ProcedureReviewModal = ({ open, onOpenChange, procedureName, reviews, providerNames }: ProcedureReviewModalProps) => {
  const [sortBy, setSortBy] = useState<"high" | "low">("high");

  const sorted = [...reviews].sort((a, b) =>
    sortBy === "high" ? b.rating - a.rating : a.rating - b.rating
  );

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "N/A";

  const breakdown = [
    {
      label: "Consult",
      value:
        reviews.filter((review) => review.consultRating != null).length > 0
          ? (
              reviews.reduce((sum, review) => sum + (review.consultRating ?? 0), 0) /
              reviews.filter((review) => review.consultRating != null).length
            ).toFixed(1)
          : null,
    },
    {
      label: "Results",
      value:
        reviews.filter((review) => review.resultsRating != null).length > 0
          ? (
              reviews.reduce((sum, review) => sum + (review.resultsRating ?? 0), 0) /
              reviews.filter((review) => review.resultsRating != null).length
            ).toFixed(1)
          : null,
    },
    {
      label: "Recovery",
      value:
        reviews.filter((review) => review.recoveryRating != null).length > 0
          ? (
              reviews.reduce((sum, review) => sum + (review.recoveryRating ?? 0), 0) /
              reviews.filter((review) => review.recoveryRating != null).length
            ).toFixed(1)
          : null,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{procedureName} — Reviews</DialogTitle>
          <DialogDescription className="sr-only">
            Patient reviews and average rating for {procedureName}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Star className="h-5 w-5 fill-primary text-primary" />
            <span className="text-lg font-semibold">{avgRating}</span>
            <span className="text-[13px] text-muted-foreground">({reviews.length} reviews)</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "high" | "low")}
            className="text-[13px] rounded-lg border border-border bg-background px-2 py-1"
            aria-label="Sort reviews"
          >
            <option value="high">Highest rated</option>
            <option value="low">Lowest rated</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {breakdown.map((item) => (
            <div key={item.label} className="rounded-xl bg-surface/50 border border-border/50 p-3 text-center">
              <div className="text-[11px] text-muted-foreground mb-1">{item.label}</div>
              <div className="text-[13px] font-medium text-muted-foreground">{item.value ?? "Not captured"}</div>
            </div>
          ))}
        </div>

        {sorted.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-[14px]">No reviews for this procedure yet.</p>
        ) : (
          <div className="space-y-3">
            {sorted.map((review) => (
              <div key={review.id} className="rounded-xl border border-border/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[13px] font-medium text-foreground">{review.patientName}</span>
                    {providerNames[review.providerId] && (
                      <span className="text-[11px] text-muted-foreground ml-2">
                        via {providerNames[review.providerId]}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-primary text-primary" : "text-border"}`} />
                    ))}
                  </div>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{review.body}</p>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {new Date(review.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProcedureReviewModal;
