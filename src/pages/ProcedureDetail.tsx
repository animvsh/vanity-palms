import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, Star, CheckCircle, ArrowRight, Sparkles, MapPin, ThumbsUp, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import PriceRangeScale from "@/components/PriceRangeScale";
import ProviderCard from "@/components/ProviderCard";
import ReviewMetrics from "@/components/reviews/ReviewMetrics";
import PageTransition from "@/components/PageTransition";
import Reveal from "@/components/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";
import StepIndicator from "@/components/StepIndicator";
import StructuredData from "@/components/StructuredData";
import { useProcedureById, useProvidersByProcedure, useReviewsByProcedure } from "@/hooks/useQueries";

const ProcedureDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: procedure, isLoading: loadingProcedure, error: procError } = useProcedureById(id);
  const { data: relatedProviders = [], isLoading: loadingProviders } = useProvidersByProcedure(procedure?.id);
  const { data: reviews = [], isLoading: loadingReviews } = useReviewsByProcedure(procedure?.id);
  const loading = loadingProcedure || loadingProviders || loadingReviews;
  const error = procError ? "Failed to load procedure details. Please try again." : null;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <p className="text-lg font-medium text-foreground mb-2">Something went wrong</p>
        <p className="text-sm text-muted-foreground mb-6">{error}</p>
        <Button onClick={() => window.location.reload()}>Try again</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-10">
        <Skeleton className="h-4 w-16 mb-8" />
        <div className="mb-10 rounded-2xl border border-border/50 p-8 sm:p-10">
          <Skeleton className="h-6 w-28 rounded-full mb-4" />
          <Skeleton className="h-10 w-72 mb-4" />
          <div className="flex gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <Skeleton className="h-5 w-5 mx-auto" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <div>
              <Skeleton className="h-6 w-24 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div>
              <Skeleton className="h-6 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-6 w-28 mb-5" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const premiumProviders = relatedProviders.filter(p => p.subscriptionTier === "premium");
  const regularProviders = relatedProviders.filter(p => p.subscriptionTier !== "premium");

  if (!procedure) {
    return <div className="container mx-auto px-6 py-20 text-center text-muted-foreground">Procedure not found.</div>;
  }

  return (
    <PageTransition>
      <SEOHead
        title={procedure.name}
        description={`Learn about ${procedure.name} — cost, recovery time, ratings, and top providers in Los Angeles. ${procedure.type === "surgical" ? "Surgical procedure" : "Non-surgical treatment"} starting from $${procedure.costMin?.toLocaleString() ?? "N/A"}.`}
        path={`/procedures/${id}`}
      />
      {procedure && (
        <StructuredData
          data={{
            "@context": "https://schema.org",
            "@type": "MedicalProcedure",
            name: procedure.name,
            procedureType: procedure.type === "surgical" ? "SurgicalProcedure" : "NoninvasiveProcedure",
            description: procedure.howItWorks ?? `${procedure.name} aesthetic procedure`,
            ...(procedure.costMin && procedure.costMax
              ? {
                  offers: {
                    "@type": "AggregateOffer",
                    priceCurrency: "USD",
                    lowPrice: procedure.costMin,
                    highPrice: procedure.costMax,
                  },
                }
              : {}),
            ...(procedure.rating
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: procedure.rating,
                    bestRating: 5,
                  },
                }
              : {}),
          }}
        />
      )}
      <div className="container mx-auto px-6 py-10">
        <button
          onClick={() => window.history.length > 1 ? window.history.back() : window.location.assign(`/concerns/${procedure.concernId}`)}
          className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> Back
        </button>

        <StepIndicator current={3} />

        {/* Header */}
        <Reveal>
          <div className="mb-10 apple-card p-8 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className={`inline-block rounded-full px-3 py-1 text-[12px] font-medium mb-4 ${
                  procedure.type === "surgical" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                }`}>
                  {procedure.type === "surgical" ? "Surgical Procedure" : "Non-Surgical Treatment"}
                </span>
                <h1 className="text-display-sm sm:text-display text-foreground">{procedure.name}</h1>
              </div>
              <div className="flex flex-wrap gap-6 shrink-0">
                {[
                  { icon: <ThumbsUp className="h-5 w-5" />, value: `${Math.round(procedure.rating * 20)}%`, label: "Worth It" },
                  { icon: <Clock className="h-5 w-5" />, value: procedure.recoveryDays === 0 ? "None" : `${procedure.recoveryDays}d`, label: "Recovery" },
                  { icon: <Star className="h-5 w-5 fill-primary" />, value: procedure.rating.toString(), label: "Rating" },
                  { icon: <DollarSign className="h-5 w-5" />, value: `$${(Math.round((procedure.costMin + procedure.costMax) / 2 / 100) / 10).toFixed(1)}k`, label: "Avg Cost" },
                ].map((stat, i) => (
                  <div key={i} className="text-center group/stat cursor-default">
                    <div className="text-primary mb-1 transition-transform duration-300 group-hover/stat:scale-110">{stat.icon}</div>
                    <div className="text-sm font-semibold text-foreground">{stat.value}</div>
                    <div className="text-[12px] text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 pt-6 border-t border-border/50">
              <h2 className="text-[13px] font-medium text-muted-foreground mb-3">Price Range</h2>
              <PriceRangeScale costMin={procedure.costMin} costMax={procedure.costMax} />
            </div>
          </div>
        </Reveal>

        {/* Featured Providers */}
        {premiumProviders.length > 0 && (
          <Reveal>
            <section className="mb-12">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <h2 className="text-xl font-semibold text-foreground">Featured Providers</h2>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                  Sponsored
                </span>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">
                Premium providers offering {procedure?.name}
              </p>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {premiumProviders.map((provider) => (
                  <ProviderCard key={provider.id} provider={provider} contextSignal={`Specialist in ${procedure?.name}`} />
                ))}
              </div>
            </section>
          </Reveal>
        )}

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <Reveal>
              <section>
                <h2 className="text-title text-foreground mb-3">Overview</h2>
                <p className="text-muted-foreground leading-relaxed">{procedure.overview}</p>
              </section>
            </Reveal>

            <Reveal>
              <section>
                <h2 className="text-title text-foreground mb-3">How it works</h2>
                <p className="text-muted-foreground leading-relaxed">{procedure.howItWorks}</p>
              </section>
            </Reveal>

            <Reveal>
              <section>
                <h2 className="text-title text-foreground mb-5">Recovery timeline</h2>
                <div className="space-y-0">
                  {procedure.recoveryTimeline.map((step, i) => (
                    <Reveal key={i} delay={i * 80}>
                      <div className="flex gap-5 group/step">
                        <div className="flex flex-col items-center">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[13px] font-semibold transition-all duration-300 group-hover/step:scale-110 group-hover/step:shadow-lg group-hover/step:shadow-primary/30">
                            {i + 1}
                          </div>
                          {i < procedure.recoveryTimeline.length - 1 && (
                            <div className="w-px flex-1 bg-gradient-to-b from-primary/30 to-border" />
                          )}
                        </div>
                        <div className="pb-7">
                          <div className="text-sm font-semibold text-foreground">{step.day}</div>
                          <p className="mt-1 text-[13px] text-muted-foreground leading-relaxed">{step.description}</p>
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              </section>
            </Reveal>

            <Reveal>
              <section>
                <h2 className="text-title text-foreground mb-3">Expected results</h2>
                <div className="flex gap-4 rounded-2xl bg-success/5 border border-success/10 p-5 transition-all duration-300 hover:bg-success/8">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-success" />
                  <p className="text-[14px] text-foreground leading-relaxed">{procedure.expectedResults}</p>
                </div>
              </section>
            </Reveal>

            {/* Visualize Your Results CTA */}
            <Reveal>
              <section className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-6 sm:p-8">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-semibold text-foreground mb-1">See Your Potential Results</h3>
                    <p className="text-[13px] text-muted-foreground mb-4">
                      Upload your photo to receive an AI-generated visualization of how {procedure.name.toLowerCase()} could enhance your appearance.
                    </p>
                    <Link to="/visualizer">
                      <Button className="rounded-full px-6 gap-2">
                        Visualize Your Results
                        <Sparkles className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    <p className="mt-2 text-[11px] text-muted-foreground">✓ Free · ✓ Instant · ✓ Private</p>
                  </div>
                </div>
              </section>
            </Reveal>

            {/* Questions to Ask Your Surgeon */}
            <Reveal>
              <section>
                <h2 className="text-title text-foreground mb-2">Questions to Ask Your Surgeon</h2>
                <p className="text-[13px] text-muted-foreground mb-5">Arrive informed and confident. These curated questions help you evaluate the surgeon's expertise.</p>
                <ol className="space-y-3">
                  {[
                    "Are you board-certified in plastic surgery?",
                    `How many ${procedure.name.toLowerCase()} procedures have you performed?`,
                    "What technique do you recommend for my anatomy?",
                    "Can I see before-and-after photos of your patients?",
                    "What are the most common complications?",
                    "What is your revision rate?",
                    "Where will the surgery be performed?",
                    "Who will administer anesthesia?",
                    "What does recovery realistically look like?",
                    "When will I see final results?",
                    "What results are realistic for my face/body?",
                  ].map((q, i) => (
                    <li key={i} className="flex gap-3 text-[14px]">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-[11px] font-semibold text-foreground">{i + 1}</span>
                      <span className="text-foreground leading-relaxed pt-0.5">{q}</span>
                    </li>
                  ))}
                </ol>
              </section>
            </Reveal>
          </div>

          <div>
            <Reveal direction="right">
              <div className="lg:sticky lg:top-24">
                <h2 className="text-title text-foreground mb-5">
                  Specialists
                  <span className="ml-2 text-muted-foreground text-sm font-normal">({regularProviders.length})</span>
                </h2>
                <div className="space-y-3">
                  {regularProviders.map((p, i) => (
                    <Reveal key={p.id} delay={i * 80} direction="right">
                      <ProviderCard provider={p} contextSignal={`Specialist in ${procedure.name}`} />
                    </Reveal>
                  ))}
                </div>
                <Link to="/providers" className="mt-4 block">
                  <Button variant="outline" className="w-full rounded-xl transition-transform active:scale-[0.98]">
                    View All Providers <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Patient Reviews */}
        {reviews.length > 0 && (
          <Reveal>
            <section className="mt-10">
              <h2 className="mb-6 text-xl font-semibold text-foreground">
                Patient Reviews ({reviews.length})
              </h2>

              {/* Aggregated review metrics */}
              <div className="mb-8">
                <ReviewMetrics reviews={reviews} />
              </div>

              {/* Individual review cards */}
              <div className="space-y-4">
                {reviews.slice(0, 5).map((review) => (
                  <div key={review.id} className="rounded-xl border border-border/40 bg-background p-5">
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-4 w-4",
                              i < review.rating
                                ? "fill-amber-400 text-amber-400"
                                : "text-border",
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground capitalize">
                        {review.stage?.replace("_", " ") ?? "Review"}
                      </span>
                      {review.worthIt && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Worth It
                        </span>
                      )}
                    </div>
                    {review.body && (
                      <p className="text-sm leading-relaxed text-foreground">
                        {review.body}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{review.patientName}</span>
                      <span>&middot;</span>
                      <span>
                        {new Date(review.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </Reveal>
        )}

        {/* Compare Providers CTA */}
        {relatedProviders.length >= 2 && (
          <Reveal>
            <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-border/40 bg-secondary/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Not sure which provider is right for you?
              </p>
              <Link
                to={`/compare?ids=${relatedProviders.slice(0, 3).map(p => p.id).join(",")}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Compare Providers for {procedure?.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        )}

        {/* Location-specific pages */}
        {procedure && (
          <Reveal>
            <div className="mt-12">
              <h3 className="mb-4 text-lg font-semibold text-foreground">
                Find {procedure.name} Providers By Location
              </h3>
              <div className="flex flex-wrap gap-2">
                {[
                  { slug: "los-angeles", name: "Los Angeles" },
                  { slug: "beverly-hills", name: "Beverly Hills" },
                  { slug: "orange-county", name: "Orange County" },
                  { slug: "santa-monica", name: "Santa Monica" },
                  { slug: "newport-beach", name: "Newport Beach" },
                ].map((loc) => (
                  <Link
                    key={loc.slug}
                    to={`/procedures/${procedure.name.toLowerCase().replace(/\s+/g, "-")}/${loc.slug}`}
                    className="rounded-full border border-border/40 bg-secondary/20 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                  >
                    <MapPin className="mr-1.5 inline-block h-3.5 w-3.5" />
                    {procedure.name} in {loc.name}
                  </Link>
                ))}
              </div>
            </div>
          </Reveal>
        )}
      </div>
    </PageTransition>
  );
};

export default ProcedureDetail;
