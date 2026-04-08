import BrandMark from "@/components/BrandMark";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const SplashScreen = () => {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
      <div className={`relative flex flex-col items-center gap-5 px-6 text-center ${prefersReducedMotion ? "" : "animate-fade-in"}`}>
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06),transparent_55%)]" />
        <BrandMark sizeClassName="h-20 w-20" textClassName="text-2xl font-bold tracking-tight" className={prefersReducedMotion ? "" : "animate-float"} />
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-muted-foreground">
            Premium Access
          </p>
          <h1 className="text-title text-foreground">Vanity Palms</h1>
          <p className="text-[13px] text-muted-foreground">
            Curated providers. Premium profiles. Faster matching.
          </p>
        </div>
        <div className="h-1.5 w-40 overflow-hidden rounded-full bg-foreground/10">
          <div className="h-full w-full origin-left animate-[shimmer_1.2s_ease-in-out_infinite] bg-foreground/80" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
