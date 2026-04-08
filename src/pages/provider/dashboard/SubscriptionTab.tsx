import { Button } from "@/components/ui/button";
import type { Provider } from "@/data/mockData";
import type { Consultation } from "./types";
import { Check, CircleCheck, FileText } from "lucide-react";

interface SubscriptionTabProps {
  provider: Provider;
  consultations: Consultation[];
}

export const SubscriptionTab = ({ provider, consultations }: SubscriptionTabProps) => {
  const isPremium = provider.subscriptionTier === "premium";
  const currentTier = isPremium ? "Premium" : "Standard";

  // Group consultations by month as a proxy for activity/invoices
  const monthlyActivity: { month: string; count: number }[] = [];
  if (isPremium && consultations.length > 0) {
    const grouped: Record<string, number> = {};
    consultations.forEach(c => {
      const d = new Date(c.created_at);
      const key = d.toLocaleString("default", { month: "long", year: "numeric" });
      grouped[key] = (grouped[key] || 0) + 1;
    });
    Object.entries(grouped)
      .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
      .forEach(([month, count]) => monthlyActivity.push({ month, count }));
  }

  return (
    <div className="max-w-2xl animate-fade-up">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-display-sm text-foreground">Subscription</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${
            isPremium
              ? "bg-foreground text-background"
              : "bg-foreground/10 text-foreground"
          }`}>
            Your Plan: {currentTier}
          </span>
        </div>
        <p className="mt-2 text-muted-foreground">Manage your plan and billing.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <div className={`apple-card p-6 ${!isPremium ? "ring-2 ring-foreground/20" : ""}`}>
          <div className="text-[12px] font-semibold text-foreground mb-2">{!isPremium ? "REFERENCE" : "STARTER"}</div>
          <h3 className="text-xl font-bold text-foreground mb-1">Standard</h3>
          <p className="text-[13px] text-muted-foreground mb-5">Baseline listing tier retained for internal comparison only</p>
          <ul className="space-y-2 text-[13px]">
            {["Public profile", "Up to 5 gallery photos", "Unlimited inquiries", "Basic view count"].map(f => (
              <li key={f} className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-3 w-3 text-foreground" /> {f}
              </li>
            ))}
          </ul>
        </div>

        <div className={`apple-card p-6 ${isPremium ? "ring-2 ring-foreground/20" : "border-foreground/20"}`}>
          <div className="text-[12px] font-semibold text-foreground mb-2">{isPremium ? "CURRENT PLAN" : "DEFAULT PLAN"}</div>
          <h3 className="text-xl font-bold text-foreground mb-1">Premium</h3>
          <p className="text-[13px] text-muted-foreground mb-5">Full analytics, richer profiles, and premium launch access</p>
          <ul className="space-y-2 text-[13px] mb-6">
            {["Everything in Free", "Up to 20 gallery photos", "Full analytics dashboard", "Funnel drop-off report", "CSV data export", "Priority in search"].map(f => (
              <li key={f} className="flex items-center gap-2 text-foreground">
                <Check className="h-3 w-3" /> {f}
              </li>
            ))}
          </ul>
          {isPremium ? (
            <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <CircleCheck className="h-4 w-4 text-green-500" />
              Premium is active on this account
            </div>
          ) : (
            <div className="rounded-xl border border-border/60 bg-surface/40 px-4 py-3 text-[13px] text-muted-foreground">
              Premium is now the default launch tier and will be enabled automatically.
            </div>
          )}
        </div>
      </div>

      <div className="apple-card p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Plan Activity</h3>
        {!isPremium || monthlyActivity.length === 0 ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/5">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-[13px] text-muted-foreground">No premium activity yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {monthlyActivity.map((item) => (
              <div key={item.month} className="flex items-center justify-between rounded-xl bg-surface/50 px-4 py-3">
                <span className="text-[13px] font-medium text-foreground">{item.month}</span>
                <span className="text-[12px] text-muted-foreground">{item.count} premium interaction{item.count !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
