import { Button } from "@/components/ui/button";
import type { Provider } from "@/data/mockData";
import type { AnalyticsSummary } from "@/lib/api";
import { BarChart3 } from "lucide-react";

interface AnalyticsTabProps {
  analyticsSummary: AnalyticsSummary | null;
  provider: Provider;
  onOpenSubscription: () => void;
}

export const AnalyticsTab = ({
  analyticsSummary,
  provider,
  onOpenSubscription,
}: AnalyticsTabProps) => {
  const isPremium = provider.subscriptionTier === "premium";

  if (!analyticsSummary || (analyticsSummary.totalViews === 0 && analyticsSummary.totalConsultations === 0)) {
    return (
      <div className="max-w-4xl animate-fade-up">
        <div className="mb-8">
          <h1 className="text-display-sm text-foreground">Analytics</h1>
          <p className="mt-2 text-muted-foreground">
            Track your profile performance and patient funnel.
          </p>
        </div>
        <div className="apple-card p-8">
          <div className="flex flex-col items-center text-center py-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5">
              <BarChart3 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-[14px] font-medium text-foreground mb-2">No analytics data yet</p>
            <p className="text-[13px] text-muted-foreground max-w-sm">
              Analytics will appear as patients discover your profile. Share your profile link to start getting views.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const maxViewCount = Math.max(
    ...(analyticsSummary.viewsByDay ?? []).map((v) => v.count),
    1,
  );

  return (
    <div className="max-w-4xl animate-fade-up space-y-6">
      <div>
        <h1 className="text-display-sm text-foreground">Analytics</h1>
        <p className="mt-2 text-muted-foreground">
          Track your profile performance and patient funnel.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="apple-card p-4">
          <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide">Profile Views</p>
          <p className="text-2xl font-bold mt-1">{analyticsSummary.totalViews}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Last 30 days</p>
        </div>
        <div className="apple-card p-4">
          <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide">Procedure Clicks</p>
          <p className="text-2xl font-bold mt-1">{analyticsSummary.totalClicks}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Last 30 days</p>
        </div>
        <div className="apple-card p-4">
          <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide">Consultations</p>
          <p className="text-2xl font-bold mt-1">{analyticsSummary.totalConsultations}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Last 30 days</p>
        </div>
        <div className="apple-card p-4">
          <p className="text-[12px] text-muted-foreground font-medium uppercase tracking-wide">Conversion Rate</p>
          <p className="text-2xl font-bold mt-1">{analyticsSummary.conversionRate.toFixed(1)}%</p>
          <p className="text-[11px] text-muted-foreground mt-1">Views &rarr; Consults</p>
        </div>
      </div>

      {/* Views Chart */}
      {isPremium ? (
        <div className="apple-card p-5">
          <h3 className="text-sm font-semibold mb-4">Profile Views — Last 30 Days</h3>
          <div className="flex items-end gap-[2px] h-36">
            {analyticsSummary.viewsByDay.map((d) => {
              const height = (d.count / maxViewCount) * 100;
              return (
                <div
                  key={d.date}
                  className="flex-1 bg-primary/60 rounded-t hover:bg-primary transition-colors group relative cursor-default"
                  style={{ height: `${Math.max(height, 2)}%` }}
                  title={`${d.date}: ${d.count} views`}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block text-[10px] bg-popover border rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm">
                    {d.count}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">30 days ago</span>
            <span className="text-[10px] text-muted-foreground">Today</span>
          </div>
        </div>
      ) : (
        <div className="apple-card p-5 text-center">
          <p className="text-sm text-muted-foreground mb-3">Upgrade to Premium for daily view charts</p>
          <Button size="sm" variant="outline" className="rounded-full" onClick={onOpenSubscription}>
            Upgrade
          </Button>
        </div>
      )}

      {/* Recent Activity */}
      <div className="apple-card p-5">
        <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {analyticsSummary.recentEvents.map((event, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    event.eventType === "profile_view"
                      ? "bg-blue-400"
                      : event.eventType === "procedure_click"
                        ? "bg-amber-400"
                        : event.eventType === "consultation_request"
                          ? "bg-green-400"
                          : "bg-purple-400"
                  }`}
                />
                <span className="text-sm capitalize">
                  {event.eventType.replace(/_/g, " ")}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {new Date(event.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
          {analyticsSummary.recentEvents.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No recent activity.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
