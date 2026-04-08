import { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchProcedures, fetchProvidersByLocation } from "@/lib/api";
import type { Procedure, Provider } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MapPin, Star, ArrowRight, Sparkles } from "lucide-react";
import ProviderCard from "@/components/ProviderCard";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import PageTransition from "@/components/PageTransition";
import Reveal from "@/components/Reveal";
import { Skeleton } from "@/components/ui/skeleton";

/** Convert URL slug to display name */
function slugToName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Convert name to URL slug */
function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

const SUPPORTED_LOCATIONS = [
  { slug: "los-angeles", name: "Los Angeles", aliases: ["LA", "Los Angeles"] },
  { slug: "beverly-hills", name: "Beverly Hills", aliases: ["Beverly Hills"] },
  { slug: "orange-county", name: "Orange County", aliases: ["OC", "Orange County", "Irvine"] },
  { slug: "santa-monica", name: "Santa Monica", aliases: ["Santa Monica"] },
  { slug: "newport-beach", name: "Newport Beach", aliases: ["Newport Beach"] },
];

export default function LocationProcedure() {
  const { procedureSlug, location } = useParams<{ procedureSlug: string; location: string }>();
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  const locationInfo = useMemo(
    () => SUPPORTED_LOCATIONS.find((l) => l.slug === location) ?? { slug: location ?? "", name: slugToName(location ?? ""), aliases: [] },
    [location],
  );

  const procedureName = slugToName(procedureSlug ?? "");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        // Fetch procedures (small dataset) and location-filtered providers in parallel
        const aliases = locationInfo.aliases.length > 0 ? locationInfo.aliases : [locationInfo.name];
        const [allProcedures, ...providerSets] = await Promise.all([
          fetchProcedures(),
          ...aliases.map((alias) => fetchProvidersByLocation(alias)),
        ]);
        if (cancelled) return;

        // Find matching procedure by slug
        const match = allProcedures.find(
          (p) => nameToSlug(p.name) === procedureSlug,
        );
        setProcedure(match ?? null);

        // Dedupe providers across alias queries
        const seen = new Set<string>();
        const filtered = providerSets.flat().filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        setProviders(filtered);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [procedureSlug, locationInfo]);

  const seoTitle = `Best ${procedureName} in ${locationInfo.name}`;
  const seoDescription = `Find top-rated ${procedureName.toLowerCase()} specialists in ${locationInfo.name}. Compare verified providers, read patient reviews, and book consultations on Vanity Palms.`;

  if (loading) {
    return (
      <PageTransition>
        <div className="container mx-auto px-6 py-10">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-4 w-96 mb-10" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        path={`/procedures/${procedureSlug}/${location}`}
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "MedicalProcedure",
          name: procedureName,
          procedureType: procedure?.type === "surgical" ? "SurgicalProcedure" : "NoninvasiveProcedure",
          description: seoDescription,
          areaServed: {
            "@type": "Place",
            name: locationInfo.name + ", California",
          },
          ...(procedure?.rating
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

      <div className="container mx-auto px-6 py-10">
        {/* Breadcrumb */}
        <Link
          to={procedure ? `/procedures/${procedure.id}` : "/providers"}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {procedure ? procedure.name : "Procedures"}
        </Link>

        {/* Hero */}
        <Reveal>
          <div className="mb-10 rounded-2xl border border-border/50 bg-gradient-to-br from-primary/[0.03] to-transparent p-8 sm:p-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MapPin className="h-4 w-4" />
              {locationInfo.name}, California
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Best {procedureName} in {locationInfo.name}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground leading-relaxed">
              {seoDescription}
            </p>
            {procedure && (
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                {procedure.costMin != null && procedure.costMax != null && (
                  <span className="rounded-full bg-secondary/60 px-3 py-1 text-muted-foreground">
                    ${procedure.costMin.toLocaleString()} – ${procedure.costMax.toLocaleString()}
                  </span>
                )}
                {procedure.rating != null && (
                  <span className="flex items-center gap-1 rounded-full bg-secondary/60 px-3 py-1 text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {procedure.rating}
                  </span>
                )}
                {procedure.recoveryDays != null && (
                  <span className="rounded-full bg-secondary/60 px-3 py-1 text-muted-foreground">
                    {procedure.recoveryDays} day recovery
                  </span>
                )}
              </div>
            )}
          </div>
        </Reveal>

        {/* Providers */}
        <Reveal>
          <h2 className="mb-6 text-xl font-semibold text-foreground">
            {providers.length > 0
              ? `${providers.length} Provider${providers.length !== 1 ? "s" : ""} in ${locationInfo.name}`
              : `No providers found in ${locationInfo.name}`}
          </h2>

          {providers.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border/40 bg-secondary/10 p-10 text-center">
              <p className="text-muted-foreground mb-4">
                We're expanding our network in {locationInfo.name}. Browse all providers or try the AI visualizer.
              </p>
              <div className="flex justify-center gap-3">
                <Link to="/providers">
                  <Button variant="outline" className="rounded-full">
                    Browse All Providers
                  </Button>
                </Link>
                <Link to="/visualizer">
                  <Button className="gap-1.5 rounded-full">
                    <Sparkles className="h-4 w-4" />
                    Try Visualizer
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </Reveal>

        {/* Compare CTA */}
        {providers.length >= 2 && (
          <Reveal>
            <div className="mt-10 flex flex-col items-center gap-3 rounded-2xl border border-border/40 bg-secondary/20 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Compare top {procedureName.toLowerCase()} specialists in {locationInfo.name}
              </p>
              <Link
                to={`/compare?ids=${providers.slice(0, 3).map((p) => p.id).join(",")}`}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Compare Providers
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        )}

        {/* Other locations */}
        <Reveal>
          <div className="mt-12">
            <h3 className="mb-4 text-lg font-semibold text-foreground">
              {procedureName} in Other Areas
            </h3>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_LOCATIONS.filter((l) => l.slug !== location).map((loc) => (
                <Link
                  key={loc.slug}
                  to={`/procedures/${procedureSlug}/${loc.slug}`}
                  className="rounded-full border border-border/40 bg-secondary/20 px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/50 hover:text-foreground"
                >
                  <MapPin className="mr-1.5 inline-block h-3.5 w-3.5" />
                  {loc.name}
                </Link>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </PageTransition>
  );
}
