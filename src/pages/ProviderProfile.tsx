import { useParams, Link } from "react-router-dom";
import { trackEvent } from "@/lib/api";
import { REVIEW_STAGES } from "@/data/mockData";
import type { Procedure } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Clock, ShieldCheck, ArrowLeft, CheckCircle2, Instagram } from "lucide-react";
import { useState, useEffect } from "react";
import ConsultationModal from "@/components/ConsultationModal";
import PageTransition from "@/components/PageTransition";
import Reveal from "@/components/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import RecentWorkGallery from "@/components/RecentWorkGallery";
import InstagramFeed from "@/components/InstagramFeed";
import CertificationBadge from "@/components/provider/CertificationBadge";
import VerificationBadge from "@/components/provider/VerificationBadge";
import ReviewMetrics from "@/components/reviews/ReviewMetrics";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { useProviderById, useReviewsByProvider, useProcedures, useProviderImages } from "@/hooks/useQueries";

const ProviderProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: provider, isLoading: providerLoading, error: providerError, refetch } = useProviderById(id);
  const { data: providerReviews = [] } = useReviewsByProvider(id);
  const { data: allProcedures = [] } = useProcedures();
  const { data: galleryImages = [] } = useProviderImages(id);
  const [showConsultation, setShowConsultation] = useState(false);

  const loading = providerLoading;

  useEffect(() => {
    if (provider) {
      trackEvent(provider.id, "profile_view");
    }
  }, [provider]);

  if (providerError) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <p className="text-lg font-medium text-foreground mb-2">Something went wrong</p>
        <p className="text-sm text-muted-foreground mb-6">Failed to load data. Please try again.</p>
        <Button onClick={() => refetch()}>Try again</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-10">
        <Skeleton className="h-4 w-24 mb-8" />
        <div className="mb-10 rounded-2xl border border-border/50 p-8 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Skeleton className="h-20 w-20 rounded-3xl shrink-0" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-20 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-4 w-full max-w-2xl" />
              <Skeleton className="h-4 w-3/4 max-w-xl" />
            </div>
            <Skeleton className="h-12 w-44 rounded-full shrink-0" />
          </div>
        </div>
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <div>
              <Skeleton className="h-6 w-40 mb-5" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-xl" />
                ))}
              </div>
            </div>
            <div>
              <Skeleton className="h-6 w-32 mb-5" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!provider) {
    return <div className="container mx-auto px-6 py-20 text-center text-muted-foreground">Provider not found.</div>;
  }

  const providerProcedures = provider.procedures
    .map(pp => ({
      ...pp,
      procedure: allProcedures.find(p => p.id === pp.procedureId),
    }))
    .filter((pp): pp is typeof pp & { procedure: Procedure } => !!pp.procedure);

  return (
    <PageTransition>
      <SEOHead
        title={provider.name}
        description={`${provider.name} — ${provider.specialty} specialist with ${provider.yearsExperience} years of experience. ${provider.rating}★ rating from ${provider.reviewCount} reviews. Book a consultation on Vanity Palms.`}
        path={`/providers/${id}`}
      />
      {provider && (
        <StructuredData
          data={{
            "@context": "https://schema.org",
            "@type": "Physician",
            name: provider.name,
            description: provider.bio ?? `${provider.specialty} specialist`,
            medicalSpecialty: provider.specialty,
            ...(provider.location
              ? {
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: provider.location,
                  },
                }
              : {}),
            ...(provider.rating
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: provider.rating,
                    reviewCount: provider.reviewCount,
                    bestRating: 5,
                  },
                }
              : {}),
          }}
        />
      )}
      <div className="container mx-auto px-6 py-10">
        <Link to="/providers" className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> All Providers
        </Link>

        <Reveal>
          <div className="mb-10 apple-card p-8 sm:p-10">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary text-xl font-bold transition-transform duration-300 hover:scale-105">
                {provider.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-display-sm text-foreground">{provider.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                    {provider.rating} ({provider.reviewCount} reviews)
                  </span>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {provider.location}
                  </span>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Responds {provider.responseTime}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {provider.verificationStatus && (
                    <VerificationBadge status={provider.verificationStatus} />
                  )}
                  {provider.credentials?.boardCertifications && provider.credentials.boardCertifications.length > 0 ? (
                    <CertificationBadge boardCertifications={provider.credentials.boardCertifications} compact />
                  ) : (
                    provider.certifications.map(c => (
                      <span key={c} className="inline-flex items-center gap-1 rounded-full bg-success/8 border border-success/10 px-2.5 py-1 text-[11px] font-medium text-success transition-colors hover:bg-success/15">
                        <ShieldCheck className="h-3 w-3" />{c}
                      </span>
                    ))
                  )}
                </div>
                {provider.credentials && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-muted-foreground">
                    {provider.credentials.degree && <span className="rounded-md bg-foreground/5 px-2 py-0.5">{provider.credentials.degree}</span>}
                    {provider.credentials.providerType && <span className="rounded-md bg-foreground/5 px-2 py-0.5">{provider.credentials.providerType}</span>}
                    {provider.credentials.subspecialties?.map(s => (
                      <span key={s} className="rounded-md bg-foreground/5 px-2 py-0.5">{s}</span>
                    ))}
                  </div>
                )}
                <p className="mt-4 text-[14px] text-muted-foreground leading-relaxed max-w-2xl">{provider.bio}</p>
                {provider.instagramUrl && (
                  <div className="mt-4">
                    <a
                      href={provider.instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-foreground/5"
                    >
                      <Instagram className="h-4 w-4" />
                      View Instagram
                    </a>
                  </div>
                )}
              </div>
              <Button size="lg" className="shrink-0 rounded-full px-7 h-12 transition-transform active:scale-95 shadow-lg shadow-primary/20" onClick={() => setShowConsultation(true)}>
                Request Consultation
              </Button>
            </div>
          </div>
        </Reveal>

        {galleryImages.length > 0 && (
          <Reveal>
            <RecentWorkGallery images={galleryImages} />
          </Reveal>
        )}

        {provider.instagramUrl && (
          <Reveal>
            <InstagramFeed instagramUrl={provider.instagramUrl} providerId={provider.id} />
          </Reveal>
        )}

        <div className="grid gap-10 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <Reveal>
              <section>
                <h2 className="text-title text-foreground mb-5">Procedures & Pricing</h2>
                <div className="space-y-3">
                  {providerProcedures.map(({ procedure, price }, i) => (
                    <Reveal key={procedure.id} delay={i * 60}>
                      <Link
                        to={`/procedures/${procedure.id}`}
                        onClick={() => {
                          trackEvent(provider.id, "procedure_click", {
                            procedure_id: procedure.id,
                            procedure_name: procedure.name,
                          });
                        }}
                      >
                        <div className="apple-card-interactive group flex items-center justify-between p-5">
                          <div>
                            <div className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors duration-200">{procedure.name}</div>
                            <div className="text-[13px] text-muted-foreground mt-0.5">
                              {procedure.type === "surgical" ? "Surgical" : "Non-Surgical"} · {procedure.recoveryDays === 0 ? "No downtime" : `${procedure.recoveryDays} day recovery`}
                            </div>
                          </div>
                          <div className="text-xl font-bold text-foreground tracking-tight">${price.toLocaleString()}</div>
                        </div>
                      </Link>
                    </Reveal>
                  ))}
                </div>
              </section>
            </Reveal>

            <Reveal>
              <ReviewMetrics reviews={providerReviews} />
            </Reveal>

            <Reveal>
              <section>
                <h2 className="text-title text-foreground mb-5">Patient Reviews</h2>
                {providerReviews.length === 0 ? (
                  <p className="text-muted-foreground py-8">No reviews yet.</p>
                ) : (
                  <div className="space-y-4">
                    {providerReviews.map((review, i) => (
                      <Reveal key={review.id} delay={i * 80}>
                        <div className="apple-card p-6 transition-all duration-300 hover:shadow-md">
                          <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/12 to-primary/4 text-[13px] font-semibold text-primary">
                                {review.patientName[0]}
                              </div>
                              <div>
                                <div className="text-[13px] font-medium text-foreground">{review.patientName}</div>
                                <div className="text-[12px] text-muted-foreground">
                                  {new Date(review.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`h-3.5 w-3.5 transition-colors ${i < review.rating ? "fill-primary text-primary" : "text-border"}`} />
                              ))}
                            </div>
                          </div>
                          <p className="text-[14px] text-muted-foreground leading-relaxed">{review.body}</p>
                        </div>
                      </Reveal>
                    ))}
                  </div>
                )}
              </section>
            </Reveal>

            <Reveal>
              <section className="apple-card p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-foreground" />
                  <div>
                    <h3 className="text-[15px] font-medium text-foreground">Booked-patient reviews only</h3>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                      Vanity Palms collects reviews through secure review links after a consultation or procedure is marked complete.
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {Object.values(REVIEW_STAGES).map((stage) => (
                    <div key={stage.label} className="rounded-xl border border-border/60 bg-surface/40 p-4">
                      <p className="text-[12px] font-medium text-foreground">{stage.label}</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        Automatically requested {"daysAfterBooking" in stage ? stage.daysAfterBooking : stage.daysAfterProcedure} days after the milestone.
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </Reveal>
          </div>

          <div>
            <Reveal direction="right">
              <div className="lg:sticky lg:top-24 space-y-4">
                <div className="apple-card p-6">
                  <h3 className="mb-4 text-sm font-semibold text-foreground">Quick Info</h3>
                  <dl className="space-y-3.5 text-[13px]">
                    {[
                      { label: "Experience", value: `${provider.yearsExperience} years` },
                      { label: "Consultation", value: provider.consultationType.join(", ") },
                      { label: "Response Time", value: provider.responseTime },
                      { label: "Specialties", value: provider.specialty.length.toString() },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between group/item">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="font-medium text-foreground transition-colors group-hover/item:text-primary">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <Button className="w-full rounded-xl h-11 transition-transform active:scale-[0.98] shadow-lg shadow-primary/20" onClick={() => setShowConsultation(true)}>
                  Request Consultation
                </Button>
              </div>
            </Reveal>
          </div>
        </div>

        <ConsultationModal open={showConsultation} onOpenChange={setShowConsultation} providerName={provider.name} providerId={provider.id} />
      </div>
    </PageTransition>
  );
};

export default ProviderProfile;
