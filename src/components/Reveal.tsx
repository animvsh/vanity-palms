import { ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "scale" | "fade";
}

const directionStyles = {
  up: { from: "translate-y-4 opacity-0", to: "translate-y-0 opacity-100" },
  down: { from: "-translate-y-4 opacity-0", to: "translate-y-0 opacity-100" },
  left: { from: "translate-x-4 opacity-0", to: "translate-x-0 opacity-100" },
  right: { from: "-translate-x-4 opacity-0", to: "translate-x-0 opacity-100" },
  scale: { from: "scale-[0.97] opacity-0", to: "scale-100 opacity-100" },
  fade: { from: "opacity-0", to: "opacity-100" },
};

const Reveal = ({ children, className = "", delay = 0, direction = "up" }: RevealProps) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const { ref, isVisible } = useScrollReveal();
  const styles = directionStyles[direction];

  return (
    <div
      ref={ref}
      className={`${prefersReducedMotion ? "" : "transition-all duration-500 ease-out"} ${isVisible ? styles.to : styles.from} ${className}`}
      style={{ transitionDelay: prefersReducedMotion ? "0ms" : `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default Reveal;
