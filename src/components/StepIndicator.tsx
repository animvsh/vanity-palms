import { Link } from "react-router-dom";

interface StepIndicatorProps {
  current: number;
  total?: number;
}

const STEPS = [
  { num: 1, label: "Choose Concern", to: "/#concerns" },
  { num: 2, label: "Explore Treatments", to: "" },
  { num: 3, label: "Procedure Detail", to: "" },
  { num: 4, label: "Find Providers", to: "/providers" },
  { num: 5, label: "Compare & Book", to: "/compare" },
];

const StepIndicator = ({ current, total = 5 }: StepIndicatorProps) => (
  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/80 px-4 py-1.5 text-[13px] font-medium text-muted-foreground">
    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-bold">
      {current}
    </span>
    Step {current} of {total}
  </div>
);

export default StepIndicator;
