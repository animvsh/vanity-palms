import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import {
  Stethoscope, Clock, Hourglass, Mail, CircleX, LogOut,
  Home, Inbox, User, BarChart3, CreditCard, Settings,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  getCurrentUser,
  getProviderByUserId,
  fetchProviderConsultations,
  fetchProviderAnalytics,
  signOut,
  createProviderProfile,
  isWhitelistedEmail,
  claimProviderByEmail,
  ensureAdminIfDesignated,
  fetchProviderAnalyticsSummary,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { Provider } from "@/data/mockData";
import type { AnalyticsSummary } from "@/lib/api";
import ProviderOnboarding from "@/components/provider/ProviderOnboarding";
import {
  DashboardTab,
  InboxTab,
  ProfileTab,
  AnalyticsTab,
  SubscriptionTab,
  SettingsTab,
} from "./dashboard";
import type { Consultation, AnalyticsEvent } from "./dashboard";

type Tab = "dashboard" | "inbox" | "profile" | "analytics" | "subscription" | "settings";

function CompleteProfileForm({ onCreated, onSignOut }: { onCreated: (p: Provider & { status: string }) => void; onSignOut: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = e.target as HTMLFormElement;
    const fd = new FormData(form);
    const firstName = fd.get("firstName") as string;
    const lastName = fd.get("lastName") as string;
    const practiceName = fd.get("practiceName") as string;

    try {
      const user = await getCurrentUser();
      if (!user) throw new Error("Not authenticated");

      const email = user.email ?? "";

      await createProviderProfile({
        userId: user.id,
        firstName,
        lastName,
        practiceName,
        email,
      });

      const providerData = await getProviderByUserId(user.id);
      if (!providerData) throw new Error("Profile creation failed. Please try again.");
      onCreated(providerData);
      toast.success("Profile created!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.includes("row-level security") ? "Unable to create profile. Please try again or contact support." : msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5">
            <Stethoscope className="h-6 w-6 text-foreground" />
          </div>
          <h2 className="text-display-sm text-foreground mb-2">Complete Your Profile</h2>
          <p className="text-[14px] text-muted-foreground">
            Fill in your details to set up your provider profile.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[13px]">First Name</Label>
              <Input name="firstName" placeholder="Sarah" required className="rounded-xl h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Last Name</Label>
              <Input name="lastName" placeholder="Chen" required className="rounded-xl h-11" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[13px]">Practice Name</Label>
            <Input name="practiceName" placeholder="Beverly Hills Aesthetics" required className="rounded-xl h-11" />
          </div>
          <Button type="submit" className="w-full rounded-xl h-11 text-[15px]" disabled={saving}>
            {saving ? "Creating..." : "Create Profile"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={onSignOut} className="text-[13px] text-muted-foreground hover:text-foreground hover:underline">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

const ProviderDashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultationId, setSelectedConsultationId] = useState<string | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummary | null>(null);
  const [composioStatus] = useState<"not_connected" | "connected">("not_connected");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          navigate("/provider/login");
          return;
        }

        // Auto-link seeded provider record and grant admin if designated
        await Promise.all([
          claimProviderByEmail().catch(() => {}),
          ensureAdminIfDesignated().catch(() => {}),
        ]);

        const providerData = await getProviderByUserId(user.id);
        if (providerData) {
          setProviderStatus(providerData.status);
        }
        setProvider(providerData);

        if (providerData && providerData.status === "approved") {
          const [consults, analyticsData] = await Promise.all([
            fetchProviderConsultations(providerData.id),
            fetchProviderAnalytics(providerData.id),
          ]);
          setConsultations(consults.map((c) => ({ ...c, preferred_date: c.preferred_date ?? "" })));
          setAnalytics(analyticsData);
          fetchProviderAnalyticsSummary(providerData.id).then(setAnalyticsSummary).catch(() => {});
        }
      } catch {
        navigate("/provider/login");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [navigate]);

  // Real-time subscription for new consultations
  useEffect(() => {
    if (!provider) return;

    const channel = supabase
      .channel("consultations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "consultations",
          filter: `provider_id=eq.${provider.id}`,
        },
        (payload) => {
          const newConsultation = payload.new as Consultation;
          setConsultations((prev) => [newConsultation, ...prev]);
          toast("New consultation request!", {
            description: `From ${newConsultation.patient_name}`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [provider]);

  // Show onboarding wizard for providers with incomplete profiles
  useEffect(() => {
    if (provider && !provider.bio && provider.specialty.length === 0) {
      setShowOnboarding(true);
    }
  }, [provider]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      navigate("/");
    }
  };

  const sidebarItems: { icon: ReactNode; label: string; value: Tab }[] = [
    { icon: <Home className="h-4 w-4" />, label: "Dashboard", value: "dashboard" },
    { icon: <Inbox className="h-4 w-4" />, label: "Inbox", value: "inbox" },
    { icon: <User className="h-4 w-4" />, label: "Profile", value: "profile" },
    { icon: <BarChart3 className="h-4 w-4" />, label: "Analytics", value: "analytics" },
    { icon: <CreditCard className="h-4 w-4" />, label: "Subscription", value: "subscription" },
    { icon: <Settings className="h-4 w-4" />, label: "Settings", value: "settings" },
  ];

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  if (!provider) {
    return <CompleteProfileForm onCreated={(p) => { setProvider(p); setProviderStatus(p.status); }} onSignOut={handleSignOut} />;
  }

  if (providerStatus === "pending") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
        <div className="max-w-sm text-center animate-fade-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-foreground/5">
            <Clock className="h-6 w-6 text-foreground" />
          </div>
          <h2 className="text-display-sm text-foreground mb-2">Pending Approval</h2>
          <p className="text-[14px] text-muted-foreground mb-6">
            Your profile is pending approval. You will be notified when it is approved by our team.
          </p>
          <div className="text-[13px] text-muted-foreground mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/10 px-3 py-1 text-[12px] font-medium text-foreground">
              <Hourglass className="h-3 w-3" /> Under Review
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <Button className="rounded-xl" onClick={handleSignOut}>Sign Out</Button>
            <a href="mailto:support@vanitypalms.com" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="h-3.5 w-3.5 mr-1.5 inline-block" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (providerStatus === "rejected") {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center px-6">
        <div className="max-w-sm text-center animate-fade-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <CircleX className="h-6 w-6 text-destructive" />
          </div>
          <h2 className="text-display-sm text-foreground mb-2">Application Not Approved</h2>
          <p className="text-[14px] text-muted-foreground mb-6">
            Unfortunately, your provider application was not approved at this time. Please contact support for more information.
          </p>
          <div className="flex flex-col gap-2">
            <Button className="rounded-xl" onClick={handleSignOut}>Sign Out</Button>
            <a href="mailto:support@vanitypalms.com" className="text-[13px] text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="h-3.5 w-3.5 mr-1.5 inline-block" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <ProviderOnboarding
        providerId={provider.id}
        initialData={{
          name: provider.name,
          specialty: provider.specialty,
          bio: provider.bio,
          yearsExperience: provider.yearsExperience,
          certifications: provider.certifications,
          instagramUrl: provider.instagramUrl,
        }}
        onComplete={() => {
          setShowOnboarding(false);
          window.location.reload();
        }}
        onSkip={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden w-60 shrink-0 border-r border-border/50 bg-surface/30 p-4 lg:block">
        <div className="mb-6 px-3">
          <div className="text-[13px] font-medium text-foreground">{provider.name}</div>
          <div className="text-[12px] text-muted-foreground">{provider.location}</div>
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
              <span className="w-4 text-center flex items-center justify-center">{icon}</span> {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto pt-6">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" /> Sign Out
          </button>
        </div>
      </aside>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-nav border-t border-border/40 flex justify-around py-2 px-1">
        {sidebarItems.map(({ icon, label, value }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-[10px] ${
              activeTab === value ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto p-6 sm:p-8 pb-24 lg:pb-8">
        {activeTab === "dashboard" && <DashboardTab provider={provider} consultations={consultations} analytics={analytics} onConsultationsChange={setConsultations} />}
        {activeTab === "inbox" && (
          <InboxTab
            consultations={consultations}
            providerName={provider.name}
            selectedId={selectedConsultationId}
            onSelect={setSelectedConsultationId}
          />
        )}
        {activeTab === "profile" && <ProfileTab provider={provider} onSave={setProvider} />}
        {activeTab === "analytics" && (
          <AnalyticsTab
            analyticsSummary={analyticsSummary}
            provider={provider}
            onOpenSubscription={() => setActiveTab("subscription")}
          />
        )}
        {activeTab === "subscription" && <SubscriptionTab provider={provider} consultations={consultations} />}
        {activeTab === "settings" && <SettingsTab provider={provider} onSignOut={handleSignOut} />}
      </main>
    </div>
  );
};

export default ProviderDashboard;
