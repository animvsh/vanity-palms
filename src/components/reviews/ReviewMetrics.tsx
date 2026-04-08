import { Star, ThumbsUp, Heart, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Review } from "@/data/mockData";

interface ReviewMetricsProps {
  reviews: Review[];
}

const ReviewMetrics = ({ reviews }: ReviewMetricsProps) => {
  const resultsReviews = reviews.filter(
    (r) =>
      r.worthIt !== undefined ||
      r.wouldChooseAgain !== undefined ||
      r.wouldRecommend !== undefined,
  );

  if (resultsReviews.length < 1 && reviews.length === 0) return null;

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  const pctWorthIt =
    resultsReviews.length > 0
      ? Math.round(
          (resultsReviews.filter((r) => r.worthIt).length /
            resultsReviews.length) *
            100,
        )
      : null;

  const pctChooseAgain =
    resultsReviews.length > 0
      ? Math.round(
          (resultsReviews.filter((r) => r.wouldChooseAgain).length /
            resultsReviews.length) *
            100,
        )
      : null;

  const pctRecommend =
    resultsReviews.length > 0
      ? Math.round(
          (resultsReviews.filter((r) => r.wouldRecommend).length /
            resultsReviews.length) *
            100,
        )
      : null;

  return (
    <div className="space-y-6">
      {/* Prominent Worth It / Would Recommend hero metrics */}
      {(pctWorthIt !== null || pctRecommend !== null) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pctWorthIt !== null && (
            <div className="relative overflow-hidden rounded-2xl border border-green-200/60 bg-gradient-to-br from-green-50 to-emerald-50/50 p-6 dark:border-green-800/40 dark:from-green-950/40 dark:to-emerald-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                  <ThumbsUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-4xl font-bold tracking-tight text-green-700 dark:text-green-300">
                    {pctWorthIt}%
                  </div>
                  <div className="text-sm font-medium text-green-600/80 dark:text-green-400/80">
                    Said Worth It
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-green-200/50 dark:bg-green-800/30">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-700 dark:bg-green-400"
                  style={{ width: `${pctWorthIt}%` }}
                />
              </div>
            </div>
          )}
          {pctRecommend !== null && (
            <div className="relative overflow-hidden rounded-2xl border border-blue-200/60 bg-gradient-to-br from-blue-50 to-indigo-50/50 p-6 dark:border-blue-800/40 dark:from-blue-950/40 dark:to-indigo-950/20">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                  <Heart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-4xl font-bold tracking-tight text-blue-700 dark:text-blue-300">
                    {pctRecommend}%
                  </div>
                  <div className="text-sm font-medium text-blue-600/80 dark:text-blue-400/80">
                    Would Recommend
                  </div>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-blue-200/50 dark:bg-blue-800/30">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-700 dark:bg-blue-400"
                  style={{ width: `${pctRecommend}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Secondary metrics row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-surface/40 p-4 text-center">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {avgRating > 0 ? avgRating.toFixed(1) : "\u2014"}
            <span className="text-sm font-medium text-muted-foreground">
              /5
            </span>
          </div>
          <div className="mt-1 flex justify-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-3.5 w-3.5",
                  i < Math.round(avgRating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-border",
                )}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Average Rating
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-surface/40 p-4 text-center">
          <div className="flex items-center justify-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {reviews.length}
            </span>
          </div>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Total Reviews
          </p>
        </div>

        {pctChooseAgain !== null && (
          <div className="rounded-xl border border-border/60 bg-surface/40 p-4 text-center">
            <div className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              {pctChooseAgain}
              <span className="text-sm font-medium text-muted-foreground">
                %
              </span>
            </div>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Would Choose Again
            </p>
          </div>
        )}

        {resultsReviews.length > 0 && (
          <div className="rounded-xl border border-border/60 bg-surface/40 p-4 text-center">
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {resultsReviews.length}
            </div>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Detailed Reviews
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewMetrics;
