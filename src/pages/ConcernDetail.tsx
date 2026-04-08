import { useParams, Link } from "react-router-dom";
import type { Procedure } from "@/data/mockData";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Clock, DollarSign, ArrowLeft, ArrowRight, ThumbsUp, Sparkles } from "lucide-react";
import PageTransition from "@/components/PageTransition";
import SEOHead from "@/components/SEOHead";
import StepIndicator from "@/components/StepIndicator";
import Reveal from "@/components/Reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useConcerns, useProceduresByConcern } from "@/hooks/useQueries";

const ConcernDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { data: concerns = [], isLoading: loadingConcerns, error: concernsError, refetch: refetchConcerns } = useConcerns();
  const { data: concernProcedures = [], isLoading: loadingProcedures, error: proceduresError, refetch: refetchProcedures } = useProceduresByConcern(id);
  const loading = loadingConcerns || loadingProcedures;
  const error = concernsError || proceduresError;
  const concern = concerns.find(c => c.id === id);

  const surgical = concernProcedures.filter(p => p.type === "surgical");
  const nonSurgical = concernProcedures.filter(p => p.type === "non-surgical");

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-32 text-center">
        <p className="text-lg font-medium text-foreground mb-2">Something went wrong</p>
        <p className="text-sm text-muted-foreground mb-6">Failed to load data. Please try again.</p>
        <Button onClick={() => { refetchConcerns(); refetchProcedures(); }}>Try again</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-10">
        <Skeleton className="h-4 w-24 mb-8" />
        <Skeleton className="h-10 w-64 mb-3" />
        <Skeleton className="h-5 w-full max-w-lg mb-10" />
        <Skeleton className="h-10 w-72 rounded-full mb-8" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!concern) {
    return <div className="container mx-auto px-6 py-20 text-center text-muted-foreground">Concern not found.</div>;
  }

  const ProcedureList = ({ items }: { items: Procedure[] }) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">No procedures in this category yet.</p>
      ) : (
        items.sort((a, b) => b.popularity - a.popularity).map((proc, i) => (
          <Reveal key={proc.id} delay={i * 60}>
            <Link to={`/procedures/${proc.id}`}>
              <div className="apple-card-interactive group flex items-center justify-between p-5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-[15px] text-foreground group-hover:text-primary transition-colors duration-200">{proc.name}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors duration-200 ${
                      proc.type === "surgical" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"
                    }`}>
                      {proc.type === "surgical" ? "Surgical" : "Non-Surgical"}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[13px] text-muted-foreground line-clamp-1">{proc.overview}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-[13px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {Math.round(proc.rating * 20)}% Worth It
                    </span>
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${Math.round((proc.costMin + proc.costMax) / 2).toLocaleString()} Avg Cost
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {proc.recoveryDays === 0 ? "No downtime" : `${proc.recoveryDays} day recovery`}
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 ml-4 text-muted-foreground transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
              </div>
            </Link>
          </Reveal>
        ))
      )}
    </div>
  );

  return (
    <PageTransition>
      <SEOHead title={concern.name} description={concern.description} path={'/concerns/' + id} />
      <div className="container mx-auto px-6 py-10">
        <Link to="/#concerns" className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" /> All Concerns
        </Link>

        <StepIndicator current={1} />

        <Reveal>
          <div className="mb-10">
            <h1 className="text-display-sm sm:text-display text-foreground">{concern.name}</h1>
            <p className="mt-3 text-body-lg text-muted-foreground">{concern.description}</p>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="mb-8 bg-secondary/50 rounded-full p-1 h-auto inline-flex">
              {[
                { value: "all", label: `All (${concernProcedures.length})` },
                { value: "surgical", label: `Surgical (${surgical.length})` },
                { value: "non-surgical", label: `Non-Surgical (${nonSurgical.length})` },
              ].map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="rounded-full text-[13px] px-5 py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm transition-all duration-200">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all"><ProcedureList items={concernProcedures} /></TabsContent>
            <TabsContent value="surgical"><ProcedureList items={surgical} /></TabsContent>
            <TabsContent value="non-surgical"><ProcedureList items={nonSurgical} /></TabsContent>
          </Tabs>
        </Reveal>

        {/* Visualizer CTA */}
        <Reveal delay={200}>
          <div className="mt-12 rounded-2xl border border-border/40 bg-card/60 p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/[0.04]">
              <Sparkles className="h-5 w-5 text-foreground/80" />
            </div>
            <h3 className="text-[16px] font-semibold text-foreground mb-2">
              Curious what results might look like?
            </h3>
            <p className="text-[14px] text-muted-foreground mb-5 max-w-md mx-auto">
              Upload a photo and preview AI-generated treatment outcomes before booking a consultation.
            </p>
            <Link to="/visualizer">
              <Button className="rounded-full px-8 gap-2">
                Try the AI Visualizer
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </PageTransition>
  );
};

export default ConcernDetail;
