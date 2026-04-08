import { useSearchParams, Link } from "react-router-dom";
import { fetchReviewsByProcedure, trackEvent } from "@/lib/api";
import type { Review } from "@/data/mockData";
import ProcedureReviewModal from "@/components/ProcedureReviewModal";
import { Button } from "@/components/ui/button";
import { Star, ShieldCheck, ArrowLeft, ArrowUpRight, ArrowRight } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import ConsultationModal from "@/components/ConsultationModal";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import Reveal from "@/components/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import StepIndicator from "@/components/StepIndicator";
import { useProvidersByIds, useProcedures } from "@/hooks/useQueries";

const CompareProviders = () => {
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get("ids") ?? "";
  const ids = useMemo(() => (idsParam ? idsParam.split(",") : []), [idsParam]);
  const { data: selected = [], isLoading: loadingProviders, error: providersError, refetch: refetchProviders } = useProvidersByIds(ids);
  const { data: allProcedures = [], isLoading: loadingProcedures, error: proceduresError, refetch: refetchProcedures } = useProcedures();
  const loading = loadingProviders || loadingProcedures;
  const error = providersError || proceduresError;
  const [consultationProvider, setConsultationProvider] = useState<string | null>(null);
  const [reviewModalProcId, setReviewModalProcId] = useState<string | null>(null);
  const [procedureReviews, setProcedureReviews] = useState<Review[]>([]);

  const openReviewModal = async (procedureId: string) => {
    setReviewModalProcId(procedureId);
    try {
      const reviews = await fetchReviewsByProcedure(procedureId);
      setProcedureReviews(reviews);
    } catch {
      setProcedureReviews([]);
    }
  };

  useEffect(() => {
    for (const p of selected) {
      trackEvent(p.id, "compare_view");
    }
  }, [selected]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <p className="text-lg font-medium text-foreground mb-2">Something went wrong</p>
        <p className="text-sm text-muted-foreground mb-6">Failed to load data. Please try again.</p>
        <Button onClick={() => { refetchProviders(); refetchProcedures(); }}>Try again</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-6 py-10">
          <Skeleton className="h-4 w-24 mb-8" />
          <Skeleton className="h-10 w-64 mb-10" />
          <div className="rounded-2xl border border-border/50 p-6 overflow-hidden">
            <div className="flex gap-8 justify-center mb-8">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-3">
                  <Skeleton className="h-16 w-16 rounded-2xl" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
            <div className="space-y-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="h-4 w-28 shrink-0" />
                  {Array.from({ length: 3 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 flex-1" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (selected.length < 2) {
    return (
      <PageTransition>
        <div className="container mx-auto px-6 py-20 text-center">
          <p className="text-muted-foreground mb-4 text-lg">Select at least 2 providers to compare.</p>
          <Link to="/providers"><Button className="rounded-full transition-transform active:scale-95">Browse Providers</Button></Link>
        </div>
      </PageTransition>
    );
  }

  const allProcedureIds = [...new Set(selected.flatMap(p => p.procedures.map(pp => pp.procedureId)))];
  const comparedProcedures = allProcedureIds.map(id => allProcedures.find(p => p.id === id)!).filter(Boolean);

  const Row = ({ label, children, highlight }: { label: string; children: React.ReactNode; highlight?: boolean }) => (
    <tr className={`transition-colors duration-200 ${highlight ? "bg-surface/50" : "hover:bg-surface/30"}`}>
      <td className="p-3 sm:p-4 text-[12px] sm:text-[13px] font-medium text-muted-foreground w-28 sm:w-44 align-middle sticky left-0 bg-card z-10">{label}</td>
      {children}
    </tr>
  );

  return (
    <PageTransition>
      <SEOHead title="Compare Providers" description="Compare aesthetic providers side by side" path="/compare" />
      <div className="container mx-auto px-6 py-10">
        <Link to="/providers" className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> All Providers
        </Link>

        <StepIndicator current={5} />

        <Reveal>
          <h1 className="text-display-sm sm:text-display text-foreground mb-10">Compare providers</h1>
        </Reveal>

        <Reveal delay={100} direction="scale">
          <div className="apple-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]" aria-label="Provider comparison">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="p-4 sm:p-6 w-28 sm:w-44 sticky left-0 bg-card z-10" />
                    {selected.map((p, i) => (
                      <th key={p.id} className="p-6 text-center" style={{ animationDelay: `${i * 100}ms` }}>
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 text-primary font-bold text-lg transition-transform duration-300 hover:scale-110">
                            {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                          </div>
                          <Link to={`/providers/${p.id}`} className="text-[15px] font-semibold text-foreground hover:text-primary transition-colors group/name flex items-center gap-1">
                            {p.name}
                            <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  <Row label="Rating" highlight>
                    {selected.map(p => (
                      <td key={p.id} className="p-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <Star className="h-4 w-4 fill-primary text-primary" /> {p.rating}
                        </span>
                      </td>
                    ))}
                  </Row>
                  <Row label="Reviews">
                    {selected.map(p => <td key={p.id} className="p-4 text-center text-[14px] font-medium text-foreground">{p.reviewCount}</td>)}
                  </Row>
                  <Row label="Location" highlight>
                    {selected.map(p => <td key={p.id} className="p-4 text-center text-[13px] text-foreground">{p.location}</td>)}
                  </Row>
                  <Row label="Distance">
                    {selected.map(p => <td key={p.id} className="p-4 text-center text-[13px] text-foreground">{p.distance} mi</td>)}
                  </Row>
                  <Row label="Experience" highlight>
                    {selected.map(p => <td key={p.id} className="p-4 text-center text-[13px] text-foreground">{p.yearsExperience} years</td>)}
                  </Row>
                  <Row label="Response Time">
                    {selected.map(p => <td key={p.id} className="p-4 text-center text-[13px] text-foreground">{p.responseTime}</td>)}
                  </Row>
                  <Row label="Consultation" highlight>
                    {selected.map(p => <td key={p.id} className="p-4 text-center text-[13px] text-foreground">{p.consultationType.join(", ")}</td>)}
                  </Row>
                  <Row label="Certifications">
                    {selected.map(p => (
                      <td key={p.id} className="p-4 text-center">
                        <div className="flex flex-wrap justify-center gap-1">
                          {p.certifications.map(c => (
                            <span key={c} className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] text-muted-foreground">
                              <ShieldCheck className="h-2.5 w-2.5 text-success" />{c}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </Row>
                  <Row label="Techniques" highlight>
                    {selected.map(p => (
                      <td key={p.id} className="p-4 text-center text-[13px] text-foreground">
                        {p.specialty.slice(0, 2).join(", ") || "—"}
                      </td>
                    ))}
                  </Row>
                  <Row label="Often Combined">
                    {selected.map(p => (
                      <td key={p.id} className="p-4 text-center text-[13px] text-foreground">
                        {p.specialty.slice(2).join(", ") || "—"}
                      </td>
                    ))}
                  </Row>

                  {comparedProcedures.map((proc, i) => (
                    <tr key={proc.id} className={`transition-colors duration-200 ${i % 2 === 0 ? "bg-surface/50" : "hover:bg-surface/30"}`}>
                      <td className="p-3 sm:p-4 text-[12px] sm:text-[13px] font-medium text-muted-foreground w-28 sm:w-44 align-middle sticky left-0 bg-card z-10">
                        <button onClick={() => openReviewModal(proc.id)} className="text-left hover:text-primary transition-colors underline decoration-dashed underline-offset-2">
                          {proc.name}
                        </button>
                      </td>
                      {selected.map(p => {
                        const pp = p.procedures.find(x => x.procedureId === proc.id);
                        return (
                          <td key={p.id} className="p-4 text-center text-[14px] font-semibold">
                            {pp ? (
                              <span className="text-foreground">${pp.price.toLocaleString()}</span>
                            ) : (
                              <span className="text-muted-foreground/40">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  <tr>
                    <td className="p-4 sm:p-6 sticky left-0 bg-card z-10" />
                    {selected.map(p => (
                      <td key={p.id} className="p-6 text-center">
                        <Button className="rounded-full transition-transform active:scale-95 shadow-lg shadow-primary/20" onClick={() => setConsultationProvider(p.id)}>
                          Request Consultation
                        </Button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>

        {consultationProvider && (
          <ConsultationModal
            open={!!consultationProvider}
            onOpenChange={() => setConsultationProvider(null)}
            providerName={selected.find(p => p.id === consultationProvider)?.name || ""}
            providerId={consultationProvider}
          />
        )}

        {/* Booking CTA */}
        <div className="mt-8 rounded-2xl bg-foreground p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-60 h-60 rounded-full bg-background/[0.04] -translate-y-1/2 translate-x-1/3 blur-2xl" />
          <div className="relative">
            <h2 className="text-[18px] font-semibold text-background mb-2">Found the right provider?</h2>
            <p className="text-[14px] text-background/70 mb-5">
              Request a consultation directly from any provider's profile above.
            </p>
            <Link to="/providers">
              <Button variant="secondary" className="rounded-full px-8 bg-background text-foreground hover:bg-background/90 gap-2">
                Browse More Providers
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {reviewModalProcId && (
          <ProcedureReviewModal
            open={!!reviewModalProcId}
            onOpenChange={() => setReviewModalProcId(null)}
            procedureName={comparedProcedures.find(p => p.id === reviewModalProcId)?.name || ""}
            reviews={procedureReviews}
            providerNames={Object.fromEntries(selected.map(p => [p.id, p.name]))}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default CompareProviders;
