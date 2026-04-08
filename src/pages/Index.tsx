import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Reveal from "@/components/Reveal";
import { Link, useLocation } from "react-router-dom";
import PageTransition from "@/components/PageTransition";
import { Skeleton } from "@/components/ui/skeleton";
import SEOHead from "@/components/SEOHead";
import StructuredData from "@/components/StructuredData";
import { useConcerns } from "@/hooks/useQueries";
import {
  Crosshair, ListChecks, Sparkles, GitCompareArrows, CalendarCheck,
  ArrowRight, BarChart3, Eye, SearchCheck, Scale, ShieldCheck, StarHalf,
  SmilePlus, Scissors, Heart, Syringe, Waves, Star,
} from "lucide-react";
import type { ReactNode } from "react";

const HOW_IT_WORKS_STEPS = [
  {
    num: "1",
    title: "Choose Concern",
    desc: "Start with the area you want to improve.",
    icon: <Crosshair className="h-4 w-4" />,
    to: "/#concerns",
  },
  {
    num: "2",
    title: "Explore Treatments",
    desc: "Browse surgical and non-surgical options.",
    icon: <ListChecks className="h-4 w-4" />,
    to: "/#concerns",
  },
  {
    num: "3",
    title: "Visualize",
    desc: "Preview AI-generated outcomes.",
    icon: <Sparkles className="h-4 w-4" />,
    to: "/visualizer",
  },
  {
    num: "4",
    title: "Compare",
    desc: "Review specialists and credentials.",
    icon: <GitCompareArrows className="h-4 w-4" />,
    to: "/providers",
  },
  {
    num: "5",
    title: "Book",
    desc: "Schedule consultations confidently.",
    icon: <CalendarCheck className="h-4 w-4" />,
    to: "/providers",
  },
] as const;

const STATS = [
  { value: "500+", label: "Verified Providers" },
  { value: "50k+", label: "Consultations Booked" },
  { value: "4.9", label: "Average Rating" },
  { value: "98%", label: "Patient Satisfaction" },
] as const;

const WHY_DIFFERENT = [
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: "Structured Treatment Data",
    desc: "Procedures are organized using real metrics like patient satisfaction and average cost so patients can compare with confidence.",
  },
  {
    icon: <Eye className="h-5 w-5" />,
    title: "Preview Potential Results",
    desc: "AI-powered visualization allows patients to preview potential outcomes before meeting with a provider.",
  },
  {
    icon: <SearchCheck className="h-5 w-5" />,
    title: "Procedure-Based Provider Search",
    desc: "Find specialists based on the exact procedure you need, not just general surgeon profiles.",
  },
  {
    icon: <Scale className="h-5 w-5" />,
    title: "Compare Providers Side-by-Side",
    desc: "Evaluate surgeons based on experience, procedure ratings, certifications, and techniques before scheduling.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Verified Providers",
    desc: "Providers self-verify their credentials directly within the platform, ensuring transparency and authenticity.",
  },
  {
    icon: <StarHalf className="h-5 w-5" />,
    title: "Structured Reviews",
    desc: "Reviews are available through direct bookings, with guided feedback categories for meaningful, actionable insights.",
  },
] as const;

const CONCERN_ICON_MAP: Record<string, ReactNode> = {
  smile: <SmilePlus className="h-5 w-5" />,
  wind: <Scissors className="h-5 w-5" />,
  sparkles: <Sparkles className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  eye: <Eye className="h-5 w-5" />,
  syringe: <Syringe className="h-5 w-5" />,
  waves: <Waves className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
};

const Index = () => {
  const { data: concerns = [], isLoading: loading, error: fetchError } = useConcerns();
  const error = fetchError ? "Failed to load data. Please try again." : null;
  const location = useLocation();

  // Handle hash scrolling after page loads
  useEffect(() => {
    if (!loading && location.hash) {
      const id = location.hash.slice(1);
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
      }
    }
  }, [loading, location.hash]);

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
      <div className="px-6">
        <div className="mx-auto max-w-3xl pt-36 pb-32 text-center space-y-6">
          <Skeleton className="h-14 w-full max-w-md mx-auto" />
          <Skeleton className="h-5 w-96 mx-auto" />
          <Skeleton className="h-5 w-72 mx-auto" />
          <Skeleton className="h-12 w-44 mx-auto rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <SEOHead path="/" />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Vanity Palms",
          url: "https://vanitypalms.com",
          description: "Compare verified cosmetic surgeons and aesthetic specialists in Los Angeles.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://vanitypalms.com/providers?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Vanity Palms",
          url: "https://vanitypalms.com",
          description: "Helping patients discover vetted aesthetic providers in Los Angeles.",
          areaServed: {
            "@type": "Place",
            name: "Los Angeles, California",
          },
        }}
      />
      {/* Hero */}
      <section className="relative overflow-hidden noise-overlay">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="absolute inset-0 bg-gradient-to-b from-surface/40 via-background/80 to-background" />
        <div className="relative px-6 pb-12 pt-32 sm:pb-16 sm:pt-40 text-center">
          <div className="mx-auto max-w-3xl">
            <Reveal delay={0}>
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-1.5 text-[13px] font-medium text-muted-foreground shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-success animate-pulse" />
                Now accepting providers in Los Angeles
              </p>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="text-hero-sm sm:text-hero text-foreground mb-6 text-balance">
                Vanity Palms
              </h1>
            </Reveal>

            <Reveal delay={160}>
              <p className="text-subtitle sm:text-title font-medium text-muted-foreground mb-4">
                Better Facts. Better Decisions. Better Results.
              </p>
            </Reveal>

            <Reveal delay={240}>
              <p className="mx-auto mb-12 max-w-lg text-body-lg text-muted-foreground">
                Discover, compare, and book qualified aesthetic providers using structured data.
              </p>
            </Reveal>

            <Reveal delay={320}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/#concerns"
                  onClick={(e) => {
                    e.preventDefault();
                    const el = document.getElementById("concerns");
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  <Button
                    size="lg"
                    className="rounded-full px-10 h-14 text-[16px] font-semibold shadow-lg shadow-foreground/10 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-foreground/15 active:scale-[0.97] gap-2"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/visualizer">
                  <button className="pill-btn-ghost gap-2 flex items-center h-14 px-8 text-[15px]">
                    <Sparkles className="h-4 w-4" />
                    Try Visualizer
                  </button>
                </Link>
              </div>
            </Reveal>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative border-t border-border/30">
          <div className="container mx-auto px-6 py-8 sm:py-10">
            <div className="mx-auto max-w-4xl grid grid-cols-2 gap-6 sm:grid-cols-4">
              {STATS.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 60} direction="fade">
                  <div className="text-center">
                    <p className="stat-number text-foreground">{stat.value}</p>
                    <p className="mt-1 text-[13px] text-muted-foreground font-medium">{stat.label}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="apple-section border-t border-border/30 bg-surface/30">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-2xl text-center mb-14 sm:mb-20">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
              Your Journey
            </p>
            <h2 className="text-display-sm sm:text-display text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-md mx-auto">
              Five simple steps to your aesthetic journey
            </p>
          </div>

          <div className="mx-auto max-w-6xl grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <Reveal key={step.num} delay={i * 90} direction="scale">
                <Link
                  to={step.to}
                  onClick={(e) => {
                    if (step.to.startsWith("/#")) {
                      e.preventDefault();
                      const el = document.getElementById(step.to.slice(2));
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  className="group block text-center step-connector"
                  aria-label={`${step.title}: ${step.desc}`}
                >
                  <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background text-base font-semibold shadow-sm transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:rounded-xl">
                    {step.icon}
                  </div>
                  <h3 className="mb-2 text-[15px] font-semibold text-foreground transition-colors group-hover:text-primary">
                    {step.title}
                  </h3>
                  <p className="mx-auto max-w-[180px] text-[13px] leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Browse Concerns */}
      {concerns.length > 0 && (
        <section id="concerns" className="apple-section border-t border-border/30">
          <div className="container mx-auto px-6">
            <div className="mx-auto max-w-2xl text-center mb-14 sm:mb-20">
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
                Explore
              </p>
              <h2 className="text-display-sm sm:text-display text-foreground mb-4">
                Browse by Concern
              </h2>
              <p className="text-body-lg text-muted-foreground max-w-md mx-auto">
                Start with what matters most to you
              </p>
            </div>

            <div className="mx-auto max-w-6xl grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {concerns.map((concern, i) => (
                <Reveal key={concern.id} delay={i * 80}>
                  <Link
                    to={`/concerns/${concern.id}`}
                    className="group block rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-8 transition-all duration-300 hover:border-border/70 hover:shadow-xl hover:shadow-foreground/[0.04] hover:-translate-y-1"
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/[0.04] transition-all duration-300 group-hover:bg-foreground/[0.08] group-hover:scale-110">
                      <span className="text-foreground/80">{CONCERN_ICON_MAP[concern.icon] ?? <Sparkles className="h-5 w-5" />}</span>
                    </div>
                    <h3 className="mb-2 text-[16px] font-semibold text-foreground transition-colors group-hover:text-primary">
                      {concern.name}
                    </h3>
                    <p className="text-[14px] leading-relaxed text-muted-foreground mb-3">
                      {concern.description}
                    </p>
                    <span className="text-[12px] font-medium text-muted-foreground">
                      {concern.procedureCount} procedure{concern.procedureCount !== 1 ? "s" : ""}
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Vanity Palms Is Different */}
      <section className="apple-section relative noise-overlay">
        <div className="relative container mx-auto px-6">
          <div className="mx-auto max-w-2xl text-center mb-14 sm:mb-20">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
              Why Us
            </p>
            <h2 className="text-display-sm sm:text-display text-foreground mb-4">
              Why Vanity Palms Is Different
            </h2>
            <p className="text-body-lg text-muted-foreground max-w-md mx-auto">
              Making aesthetic decisions with confidence
            </p>
          </div>

          <div className="mx-auto max-w-6xl grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHY_DIFFERENT.map((feature, i) => (
              <Reveal key={feature.title} delay={i * 80}>
                <div className="group rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-8 transition-all duration-300 hover:border-border/70 hover:shadow-xl hover:shadow-foreground/[0.04] hover:-translate-y-1">
                  <div className="icon-glow mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground/[0.04] transition-all duration-300 group-hover:bg-foreground/[0.08] group-hover:scale-110">
                    <span className="text-foreground/80">{feature.icon}</span>
                  </div>
                  <h3 className="mb-2.5 text-[16px] font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-muted-foreground">
                    {feature.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="apple-section bg-surface/30">
        <div className="container mx-auto px-6 text-center">
            <div className="mx-auto max-w-3xl rounded-[2rem] bg-foreground p-14 sm:p-20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-background/[0.04] -translate-y-1/2 translate-x-1/3 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-background/[0.04] translate-y-1/3 -translate-x-1/4 blur-2xl" />
              <div className="absolute top-1/2 left-1/2 w-40 h-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background/[0.03] blur-3xl" />

              <div className="relative">
                <p className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-background/60">
                  Get Started Today
                </p>
                <h2 className="text-display-sm sm:text-display text-background mb-5">
                  Ready to start your journey?
                </h2>
                <p className="text-background/70 mb-12 text-body-lg max-w-md mx-auto">
                  Join thousands making informed decisions about aesthetic treatments.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link to="/providers">
                    <Button
                      size="lg"
                      variant="secondary"
                      className="rounded-full px-10 h-14 text-[16px] font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-lg bg-background text-foreground hover:bg-background/90 gap-2"
                    >
                      Browse Providers
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/visualizer">
                    <button className="rounded-full px-8 h-14 text-[15px] font-medium text-background/70 hover:text-background transition-colors duration-200 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Try Visualizer
                    </button>
                  </Link>
                </div>
              </div>
            </div>
        </div>
      </section>
    </PageTransition>
  );
};

export default Index;
