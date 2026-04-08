import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import {
  Gauge, Users, Flag, CreditCard, ListChecks, Lock, LogOut,
  UserCheck, Crown, BarChart3, X, Check, Search, Star, Trash2,
  Loader2, UserPlus, Copy,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  addProviderWhitelistEntry,
  fetchProviderWhitelist,
  fetchAdminProviders,
  fetchAdminConsultationStats,
  updateProviderStatus,
  updateProviderSubscription,
  fetchReviews,
  deleteReview,
  getCurrentUser,
  isCurrentUserAdmin,
  removeProviderWhitelistEntry,
  ensureAdminIfDesignated,
  type WhitelistEntry,
} from "@/lib/api";
import type { Review } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";

type Tab = "overview" | "providers" | "content" | "subscriptions" | "whitelist";

type AdminProvider = Awaited<ReturnType<typeof fetchAdminProviders>>[number];

const AdminConsole = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [authLoading, setAuthLoading] = useState(true);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);

  // Shared provider state — fetched once, used by Overview, Providers, and Subscriptions tabs
  const [providers, setProviders] = useState<AdminProvider[]>([]);
  const [providersLoading, setProvidersLoading] = useState(true);

  const sidebarItems: { icon: ReactNode; label: string; value: Tab }[] = [
    { icon: <Gauge className="h-4 w-4" />, label: "Overview", value: "overview" },
    { icon: <Users className="h-4 w-4" />, label: "Providers", value: "providers" },
    { icon: <Flag className="h-4 w-4" />, label: "Content", value: "content" },
    { icon: <CreditCard className="h-4 w-4" />, label: "Subscriptions", value: "subscriptions" },
    { icon: <ListChecks className="h-4 w-4" />, label: "Whitelist", value: "whitelist" },
  ];

  useEffect(() => {
    const verifyAccess = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate("/provider/login?next=/admin", { replace: true });
          return;
        }

        // Ensure admin row exists if this user is a designated admin
        await ensureAdminIfDesignated().catch(() => {});
        const admin = await isCurrentUserAdmin();
        setHasAdminAccess(admin);

        // Fetch providers once after confirming admin access
        if (admin) {
          fetchAdminProviders()
            .then(setProviders)
            .catch(() => {
              toast({ title: "Failed to load providers.", variant: "destructive" });
            })
            .finally(() => setProvidersLoading(false));
        }
      } catch {
        setHasAdminAccess(false);
      } finally {
        setAuthLoading(false);
      }
    };

    verifyAccess();
  }, [navigate]);

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-sm text-muted-foreground">Checking admin access...</div>
      </div>
    );
  }

  if (!hasAdminAccess) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
        <div className="max-w-sm text-center animate-fade-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="mb-2 text-display-sm text-foreground">Admin Access Required</h2>
          <p className="mb-6 text-[14px] text-muted-foreground">
            This area is restricted to approved admin accounts.
          </p>
          <Link to="/">
            <Button className="rounded-xl">Back Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-3.5rem)]">
      {/* Mobile tab bar */}
      <div className="lg:hidden border-b border-border/50 bg-surface/30 overflow-x-auto">
        <nav className="flex px-4 py-2 gap-1 min-w-max">
          {sidebarItems.map(({ icon, label, value }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                activeTab === value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              <span className="shrink-0">{icon}</span> {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border/50 bg-surface/30 p-4 lg:block">
        <div className="mb-6 px-3">
          <div className="text-[12px] font-semibold text-foreground uppercase tracking-wider">Admin Console</div>
          <div className="text-[12px] text-muted-foreground mt-0.5">Platform Management</div>
        </div>
        <nav className="space-y-1">
          {sidebarItems.map(({ icon, label, value }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all ${
                activeTab === value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              }`}
            >
              <span className="w-4 shrink-0 flex justify-center">{icon}</span> {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <Link to="/">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <span className="w-4 shrink-0 flex justify-center"><LogOut className="h-4 w-4" /></span> Exit Admin
            </button>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 sm:p-8">
        {activeTab === "overview" && <OverviewView providers={providers} providersLoading={providersLoading} setProviders={setProviders} />}
        {activeTab === "providers" && <ProvidersView providers={providers} loading={providersLoading} setProviders={setProviders} />}
        {activeTab === "content" && <ContentView />}
        {activeTab === "subscriptions" && <SubscriptionsView providers={providers} loading={providersLoading} setProviders={setProviders} />}
        {activeTab === "whitelist" && <WhitelistView />}
      </main>
    </div>
  );
};

/* ── Reject Dialog ──────────────────────────────────────── */

const RejectDialog = ({
  open,
  onOpenChange,
  providerName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerName: string;
  onConfirm: (reason: string) => void;
}) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm(reason);
    setSubmitting(false);
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Provider</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting <span className="font-medium text-foreground">{providerName}</span>.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          placeholder="Enter rejection reason..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="min-h-[100px] resize-none"
        />
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-full"
            disabled={reason.trim().length === 0 || submitting}
            onClick={handleConfirm}
          >
            {submitting ? "Rejecting..." : "Reject Provider"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ── Overview ──────────────────────────────────────────── */

const OverviewView = ({
  providers,
  providersLoading,
  setProviders,
}: {
  providers: AdminProvider[];
  providersLoading: boolean;
  setProviders: React.Dispatch<React.SetStateAction<AdminProvider[]>>;
}) => {
  const [consultationStats, setConsultationStats] = useState<{ totalConsultations: number; totalPatients: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [rejectTarget, setRejectTarget] = useState<AdminProvider | null>(null);

  useEffect(() => {
    fetchAdminConsultationStats()
      .then(setConsultationStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const loading = providersLoading || statsLoading;

  const pendingProviders = providers.filter((p) => p.status === "pending");
  const totalProviders = providers.length;
  const premiumCount = providers.filter((p) => p.subscription_tier === "premium").length;

  const totalConsultations = consultationStats?.totalConsultations ?? 0;
  const totalPatients = consultationStats?.totalPatients ?? 0;

  const handleApprove = async (id: string) => {
    try {
      await updateProviderStatus(id, "approved");
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p))
      );
    } catch {
      toast({ title: "Failed to approve provider. Please try again.", variant: "destructive" });
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    try {
      await updateProviderStatus(rejectTarget.id, "rejected", reason);
      setProviders((prev) =>
        prev.map((p) => (p.id === rejectTarget.id ? { ...p, status: "rejected" } : p))
      );
      setRejectTarget(null);
    } catch {
      toast({ title: "Failed to reject provider. Please try again.", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl animate-fade-up">
        <div className="mb-8">
          <h1 className="text-display-sm text-foreground">Platform Overview</h1>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl animate-fade-up">
      <div className="mb-8">
        <h1 className="text-display-sm text-foreground">Platform Overview</h1>
        <p className="mt-2 text-muted-foreground">Key metrics for the LA pilot</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[
          { label: "Total Providers", value: String(totalProviders), icon: <UserCheck className="h-4 w-4" />, change: `${pendingProviders.length} pending` },
          { label: "Total Patients", value: String(totalPatients), icon: <Users className="h-4 w-4" />, change: `${totalConsultations} consultations` },
          { label: "Premium Accounts", value: String(premiumCount), icon: <Crown className="h-4 w-4" />, change: "active premium plans" },
          { label: "Consultations", value: String(totalConsultations), icon: <BarChart3 className="h-4 w-4" />, change: `${totalPatients} unique patients` },
        ].map(stat => (
          <div key={stat.label} className="apple-card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-muted-foreground">{stat.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-surface text-muted-foreground">
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <div className="mt-1 text-[12px] text-foreground">{stat.change}</div>
          </div>
        ))}
      </div>

      <div className="apple-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">Pending Approvals</h2>
          <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-[12px] font-semibold text-foreground">{pendingProviders.length} pending</span>
        </div>
        <div className="space-y-3">
          {pendingProviders.length === 0 && (
            <p className="text-[13px] text-muted-foreground py-4 text-center">No pending approvals</p>
          )}
          {pendingProviders.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl bg-surface/50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-foreground">
                  {p.name.split(" ").map(n => n[0]).join("").slice(1, 3)}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-foreground">{p.name}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {p.email && <span>{p.email} · </span>}
                    {p.practice_name && <span>{p.practice_name} · </span>}
                    {p.specialty.length > 0 ? p.specialty.join(", ") : "No specialty"} · {p.location || "No location"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="rounded-full h-8 text-[12px] text-muted-foreground" onClick={() => setRejectTarget(p)}>
                  <X className="h-3 w-3 mr-1" /> Reject
                </Button>
                <Button size="sm" className="rounded-full h-8 text-[12px]" onClick={() => handleApprove(p.id)}>
                  <Check className="h-3 w-3 mr-1" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => { if (!open) setRejectTarget(null); }}
        providerName={rejectTarget?.name ?? ""}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
};

/* ── Providers ─────────────────────────────────────────── */

const ProvidersView = ({
  providers,
  loading,
  setProviders,
}: {
  providers: AdminProvider[];
  loading: boolean;
  setProviders: React.Dispatch<React.SetStateAction<AdminProvider[]>>;
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");
  const [rejectTarget, setRejectTarget] = useState<AdminProvider | null>(null);

  const handleApprove = async (id: string) => {
    try {
      await updateProviderStatus(id, "approved");
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p))
      );
    } catch {
      toast({ title: "Failed to approve provider. Please try again.", variant: "destructive" });
    }
  };

  const handleRejectConfirm = async (reason: string) => {
    if (!rejectTarget) return;
    try {
      await updateProviderStatus(rejectTarget.id, "rejected", reason);
      setProviders((prev) =>
        prev.map((p) => (p.id === rejectTarget.id ? { ...p, status: "rejected" } : p))
      );
      setRejectTarget(null);
    } catch {
      toast({ title: "Failed to reject provider. Please try again.", variant: "destructive" });
    }
  };

  const filtered = providers.filter(p => {
    const term = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(term) ||
      p.specialty.some(s => s.toLowerCase().includes(term)) ||
      p.location.toLowerCase().includes(term);
    const matchFilter = filter === "all" || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="max-w-4xl animate-fade-up">
      <div className="mb-8">
        <h1 className="text-display-sm text-foreground">Provider Management</h1>
        <p className="mt-2 text-muted-foreground">Review, approve, and manage provider accounts</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, specialty, or location..." className="pl-10 rounded-xl h-11" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 rounded-full bg-secondary/50 p-1">
          {(["all", "approved", "pending", "rejected"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-all capitalize ${
                filter === f ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="apple-card overflow-hidden">
        <div className="divide-y divide-border/40">
          {loading && (
            <div className="p-4 text-center text-[13px] text-muted-foreground">Loading providers...</div>
          )}
          {filtered.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4 hover:bg-surface/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-foreground">
                  {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-foreground">{p.name}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {p.email && <span>{p.email} · </span>}
                    {p.specialty.length > 0 ? p.specialty.join(", ") : "No specialty"} · {p.location || "No location"}
                  </div>
                  {p.credentials && (
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      <span className="rounded bg-foreground/5 px-1.5 py-0.5">{p.credentials.degree}</span>
                      <span className="rounded bg-foreground/5 px-1.5 py-0.5">{p.credentials.providerType}</span>
                      {p.credentials.boardCertifications?.map((c: string) => (
                        <span key={c} className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-400">{c}</span>
                      ))}
                      {p.credentials.licenseNumber && (
                        <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-amber-700 dark:text-amber-400">
                          Lic: {p.credentials.licenseState} {p.credentials.licenseNumber}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                  p.status === "approved" ? "bg-foreground text-background" :
                  p.status === "pending" ? "bg-foreground/10 text-foreground" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {p.status}
                </span>
                {p.status === "pending" && (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="outline" className="rounded-full h-7 px-3 text-[11px]" onClick={() => setRejectTarget(p)}>Reject</Button>
                    <Button size="sm" className="rounded-full h-7 px-3 text-[11px]" onClick={() => handleApprove(p.id)}>Approve</Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => { if (!open) setRejectTarget(null); }}
        providerName={rejectTarget?.name ?? ""}
        onConfirm={handleRejectConfirm}
      />
    </div>
  );
};

/* ── Content Moderation ────────────────────────────────── */

const ContentView = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReviews()
      .then(setReviews)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Deletion failure — review remains in list, no state change needed
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-4xl animate-fade-up">
      <div className="mb-8">
        <h1 className="text-display-sm text-foreground">Content Moderation</h1>
        <p className="mt-2 text-muted-foreground">Review and moderate user-submitted reviews</p>
      </div>

      <div className="apple-card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-foreground">All Reviews</h2>
          <span className="rounded-full bg-foreground/10 px-2.5 py-0.5 text-[12px] font-semibold text-foreground">
            {reviews.length} total
          </span>
        </div>
        <div className="space-y-3">
          {loading && (
            <p className="text-[13px] text-muted-foreground py-4 text-center">Loading...</p>
          )}
          {!loading && reviews.length === 0 && (
            <p className="text-[13px] text-muted-foreground py-4 text-center">No reviews to moderate</p>
          )}
          {reviews.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-xl bg-surface/50 p-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5 text-foreground">
                  <Star className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium text-foreground truncate">{item.body}</div>
                  <div className="text-[12px] text-muted-foreground">
                    {item.rating}/5 · {item.patientName} · {item.date}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 ml-3 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full h-7 text-[11px] text-destructive hover:text-destructive"
                  disabled={deletingId === item.id}
                  onClick={() => handleDelete(item.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  {deletingId === item.id ? "Deleting..." : "Delete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Subscriptions ─────────────────────────────────────── */

const SubscriptionsView = ({
  providers,
  loading,
  setProviders,
}: {
  providers: AdminProvider[];
  loading: boolean;
  setProviders: React.Dispatch<React.SetStateAction<AdminProvider[]>>;
}) => {

  const freeCount = providers.filter((p) => p.subscription_tier !== "premium").length;
  const premiumCount = providers.filter((p) => p.subscription_tier === "premium").length;

  const handleOverride = async (id: string, currentTier: string) => {
    const newTier = currentTier === "premium" ? "free" : "premium";
    try {
      await updateProviderSubscription(id, newTier);
      setProviders((prev) =>
        prev.map((p) => (p.id === id ? { ...p, subscription_tier: newTier } : p))
      );
    } catch {
      toast({ title: "Failed to update subscription. Please try again.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-4xl animate-fade-up">
      <div className="mb-8">
        <h1 className="text-display-sm text-foreground">Subscriptions</h1>
        <p className="mt-2 text-muted-foreground">Manage provider subscription tiers and overrides</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        {[
          { label: "Reference Tier", count: loading ? "--" : freeCount },
          { label: "Premium Tier", count: loading ? "--" : premiumCount },
          { label: "Premium Coverage", count: loading ? "--" : `${premiumCount}/${providers.length || 0}` },
        ].map(s => (
          <div key={s.label} className="apple-card p-5 text-center">
            <div className="text-2xl font-bold text-foreground">{s.count}</div>
            <div className="text-[12px] font-medium mt-1 text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="apple-card overflow-hidden">
        <div className="divide-y divide-border/40">
          {loading && (
            <div className="p-4 text-center text-[13px] text-muted-foreground">Loading...</div>
          )}
          {providers.map(p => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-foreground">
                  {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <div className="text-[13px] font-medium text-foreground">{p.name}</div>
                  <div className="text-[12px] text-muted-foreground">{p.location}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                  p.subscription_tier === "premium" ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"
                }`}>
                  {p.subscription_tier === "premium" ? "Premium" : "Free"}
                </span>
                <Button size="sm" variant="ghost" className="rounded-full h-7 text-[11px] text-muted-foreground" onClick={() => handleOverride(p.id, p.subscription_tier)}>
                  Override
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Whitelist ─────────────────────────────────────────── */

const WhitelistView = () => {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);
  const [bulkEmails, setBulkEmails] = useState("");
  const [bulkInviting, setBulkInviting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const bulkEmailCount = useMemo(() => {
    return bulkEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@")).length;
  }, [bulkEmails]);

  useEffect(() => {
    fetchProviderWhitelist()
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load whitelist."))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    setSaving(true);
    setError(null);
    try {
      await addProviderWhitelistEntry(email, note);
      const refreshed = await fetchProviderWhitelist();
      setEntries(refreshed);
      setEmail("");
      setNote("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add whitelist entry.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (targetEmail: string) => {
    setRemovingEmail(targetEmail);
    try {
      await removeProviderWhitelistEntry(targetEmail);
      setEntries((prev) => prev.filter((entry) => entry.email !== targetEmail));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove whitelist entry.");
    } finally {
      setRemovingEmail(null);
    }
  };

  const handleBulkInvite = async () => {
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) return;
    setBulkInviting(true);

    try {
      for (const addr of emails) {
        await addProviderWhitelistEntry(addr, "Bulk invite");
      }
      setBulkEmails("");
      const updated = await fetchProviderWhitelist();
      setEntries(updated);
      toast({ title: `${emails.length} provider${emails.length !== 1 ? "s" : ""} added to whitelist` });
    } catch {
      toast({ title: "Some invites failed", variant: "destructive" });
    } finally {
      setBulkInviting(false);
    }
  };

  const handleCopyInviteLink = (targetEmail: string) => {
    const link = `${window.location.origin}/provider/signup?email=${encodeURIComponent(targetEmail)}`;
    navigator.clipboard.writeText(link);
    setCopiedEmail(targetEmail);
    toast({ title: "Invite link copied!" });
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  return (
    <div className="max-w-4xl animate-fade-up">
      <div className="mb-8">
        <h1 className="text-display-sm text-foreground">Provider Whitelist</h1>
        <p className="mt-2 text-muted-foreground">Control which provider emails are allowed to create accounts.</p>
      </div>

      <div className="apple-card p-6 mb-6 space-y-4">
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
            {error}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input
            type="email"
            placeholder="provider@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl h-11"
          />
          <Input
            placeholder="Optional note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-xl h-11"
          />
          <Button className="rounded-xl" disabled={saving || !email.trim()} onClick={handleAdd}>
            {saving ? "Adding..." : "Add Email"}
          </Button>
        </div>

        {/* Bulk invite section */}
        <div className="mt-6 rounded-xl border border-border/40 bg-secondary/10 p-4">
          <h4 className="text-sm font-semibold text-foreground mb-2">Bulk Invite Providers</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Paste multiple email addresses — one per line or comma-separated.
          </p>
          <textarea
            value={bulkEmails}
            onChange={(e) => setBulkEmails(e.target.value)}
            placeholder={"dr.smith@clinic.com\ndr.jones@aesthetics.com\ndr.lee@beautymd.com"}
            className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20 min-h-[100px] resize-y"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {bulkEmailCount} email{bulkEmailCount !== 1 ? "s" : ""} detected
            </span>
            <Button
              onClick={handleBulkInvite}
              disabled={bulkEmailCount === 0 || bulkInviting}
              size="sm"
              className="gap-1.5"
            >
              {bulkInviting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Add All to Whitelist
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="apple-card overflow-hidden">
        <div className="divide-y divide-border/40">
          {loading && (
            <div className="p-4 text-center text-[13px] text-muted-foreground">Loading whitelist...</div>
          )}
          {!loading && entries.length === 0 && (
            <div className="p-4 text-center text-[13px] text-muted-foreground">No whitelisted provider emails yet.</div>
          )}
          {entries.map((entry) => (
            <div key={entry.email} className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-foreground">{entry.email}</span>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                    Invited
                  </span>
                </div>
                <div className="text-[12px] text-muted-foreground">
                  {entry.note || "No note"} · Added {new Date(entry.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyInviteLink(entry.email)}
                  className="text-[12px] text-primary hover:underline transition-colors"
                  title="Copy signup link"
                >
                  {copiedEmail === entry.email ? (
                    <span className="flex items-center gap-1">
                      <Check className="h-3 w-3" /> Copied
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <Copy className="h-3 w-3" /> Copy Link
                    </span>
                  )}
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full h-8 text-[12px]"
                  disabled={removingEmail === entry.email}
                  onClick={() => handleRemove(entry.email)}
                >
                  {removingEmail === entry.email ? "Removing..." : "Remove"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminConsole;
