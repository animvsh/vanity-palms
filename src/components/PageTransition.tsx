import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(prefersReducedMotion);

  useEffect(() => {
    if (prefersReducedMotion) {
      setMounted(true);
      return;
    }

    // Small delay for smooth page transition
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer);
  }, [prefersReducedMotion]);

  return (
    <div
      className={`${prefersReducedMotion ? "" : "transition-all duration-500 ease-out"} ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      {children}
    </div>
  );
};

export default PageTransition;
