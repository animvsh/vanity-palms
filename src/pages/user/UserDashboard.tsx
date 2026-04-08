import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getCurrentUser, signOut, getProviderByUserId, fetchConsultationsByEmail } from "@/lib/api";
import type { PatientConsultation } from "@/lib/api";
import PageTransition from "@/components/PageTransition";
import {
  Home, Stethoscope, Search, Sparkles, ChevronRight, CircleCheck,
  Hourglass, CircleX, ArrowRight, TrendingUp, Images, Inbox, ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";

type Tab = "overview" | "provider";

const UserDashboard = () => {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [providerStatus, setProviderStatus] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<PatientConsultation[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const u = await getCurrentUser();
      if (!u) { navigate("/login"); return; }
      setUser({ id: u.id, email: u.email ?? "" });

      // Check if user already has a provider profile
      const provider = await getProviderByUserId(u.id);
      if (provider) setProviderStatus(provider.status);

      // Fetch patient consultations
      if (u.email) {
        try {
          const consults = await fetchConsultationsByEmail(u.email);
          setConsultations(consults);
        } catch { /* consultation fetch is non-critical */ }
      }

      setLoading(false);
    };
    init();
  }, [navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-[14px] text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-6 py-10 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-display-sm text-foreground">My Account</h1>
            <p className="text-[14px] text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-full bg-secondary/50 p-1 mb-8 w-fit">
          {([
            { key: "overview" as Tab, label: "Overview", icon: <Home className="h-3.5 w-3.5" /> },
            { key: "provider" as Tab, label: "Provider Access", icon: <Stethoscope className="h-3.5 w-3.5" /> },
          ]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-all ${
                tab === key ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-6 animate-fade-up">
            {/* Quick Actions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Link to="/providers" className="group">
                <div className="rounded-2xl border border-border/40 bg-card/50 p-6 transition-all hover:border-border/60 hover:shadow-md hover:-translate-y-0.5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 group-hover:bg-foreground/10 transition-colors">
                    <Search className="h-4 w-4 text-foreground" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground">Browse Providers</h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">Discover and compare qualified providers</p>
                </div>
              </Link>

              <Link to="/visualizer" className="group">
                <div className="rounded-2xl border border-border/40 bg-card/50 p-6 transition-all hover:border-border/60 hover:shadow-md hover:-translate-y-0.5">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-foreground/5 group-hover:bg-foreground/10 transition-colors">
                    <Sparkles className="h-4 w-4 text-foreground" />
                  </div>
                  <h3 className="text-[15px] font-semibold text-foreground">Visualizer</h3>
                  <p className="mt-1 text-[13px] text-muted-foreground">Preview AI-generated treatment outcomes</p>
                </div>
              </Link>
            </div>

            {/* My Consultations */}
            {consultations.length > 0 && (
              <div className="rounded-2xl border border-border/40 bg-card/50 p-6">
                <h3 className="text-[15px] font-semibold text-foreground mb-4">My Consultations</h3>
                <div className="space-y-3">
                  {consultations.map((c) => (
                    <Link
                      key={c.id}
                      to={`/consultation/${c.accessToken}`}
                      className="flex items-center justify-between rounded-xl border border-border/30 bg-background/50 p-4 hover:border-border/60 hover:shadow-sm transition-all group"
                    >
                      <div>
                        <p className="text-[14px] font-medium text-foreground group-hover:text-primary transition-colors">
                          {c.providerName}
                        </p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          {c.scheduledAt && ` · Scheduled ${new Date(c.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
                          c.status === "booked" ? "bg-emerald-500/10 text-emerald-600" :
                          c.status === "replied" ? "bg-blue-500/10 text-blue-600" :
                          c.status === "cancelled" ? "bg-red-500/10 text-red-600" :
                          "bg-amber-500/10 text-amber-600"
                        }`}>
                          {c.status}
                        </span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Account Info */}
            <div className="rounded-2xl border border-border/40 bg-card/50 p-6">
              <h3 className="text-[15px] font-semibold text-foreground mb-4">Account Details</h3>
              <dl className="space-y-3 text-[13px]">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="font-medium text-foreground">{user?.email}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Account Type</dt>
                  <dd className="font-medium text-foreground">{providerStatus ? "Provider" : "Patient"}</dd>
                </div>
                {providerStatus && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Provider Status</dt>
                    <dd className={`font-medium capitalize ${
                      providerStatus === "approved" ? "text-emerald-600" :
                      providerStatus === "pending" ? "text-amber-600" :
                      "text-red-600"
                    }`}>{providerStatus}</dd>
                  </div>
                )}
              </dl>
              {providerStatus === "approved" && (
                <Link to="/provider/dashboard">
                  <Button className="mt-4 rounded-xl w-full" size="sm">
                    Go to Provider Dashboard
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {tab === "provider" && (
          <ProviderAccessTab
            providerStatus={providerStatus}
            userId={user?.id ?? ""}
            userEmail={user?.email ?? ""}
          />
        )}
      </div>
    </PageTransition>
  );
};

function ProviderAccessTab({ providerStatus, userId, userEmail }: { providerStatus: string | null; userId: string; userEmail: string }) {
  if (providerStatus === "approved") {
    return (
      <div className="animate-fade-up">
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
            <CircleCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Provider Access Approved</h2>
          <p className="mt-2 text-[14px] text-muted-foreground">Your provider account is active.</p>
          <Link to="/provider/dashboard">
            <Button className="mt-4 rounded-full">Go to Provider Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (providerStatus === "pending") {
    return (
      <div className="animate-fade-up">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10">
            <Hourglass className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Application Under Review</h2>
          <p className="mt-2 text-[14px] text-muted-foreground max-w-md mx-auto">
            Your provider application is being reviewed. We'll verify your credentials and license, then activate your account.
          </p>
          <Link to="/provider/dashboard">
            <Button variant="outline" className="mt-4 rounded-full">View Application</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (providerStatus === "rejected") {
    return (
      <div className="animate-fade-up">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
            <CircleX className="h-5 w-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">Application Not Approved</h2>
          <p className="mt-2 text-[14px] text-muted-foreground">
            Your provider application was not approved. Contact support for more information.
          </p>
        </div>
      </div>
    );
  }

  // No provider status — show "Request Provider Access" CTA
  return (
    <div className="animate-fade-up space-y-6">
      <div className="rounded-2xl border border-border/40 bg-card/50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-foreground/5">
          <Stethoscope className="h-5 w-5 text-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Become a Provider</h2>
        <p className="mt-2 text-[14px] text-muted-foreground max-w-md mx-auto">
          Are you a licensed aesthetic provider? Register for a provider account to manage your profile, receive consultation requests, and grow your practice.
        </p>
        <Link to="/provider/signup">
          <Button className="mt-6 rounded-full px-8">
            <ArrowRight className="h-4 w-4 mr-2" />
            Apply for Provider Access
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        <h3 className="text-[14px] font-semibold text-foreground">Provider Benefits</h3>
        {[
          { icon: <TrendingUp className="h-3.5 w-3.5 text-foreground" />, title: "Analytics Dashboard", desc: "Track profile views, consultations, and conversion rates" },
          { icon: <Images className="h-3.5 w-3.5 text-foreground" />, title: "Gallery & Before/After", desc: "Showcase your work with up to 20 photos" },
          { icon: <Inbox className="h-3.5 w-3.5 text-foreground" />, title: "Consultation Inbox", desc: "Manage all patient inquiries in one place" },
          { icon: <ShieldCheck className="h-3.5 w-3.5 text-foreground" />, title: "Verified Profile", desc: "Stand out with credential and license verification" },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 rounded-xl border border-border/40 bg-card/50 p-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground/5">
              {icon}
            </div>
            <div>
              <p className="text-[13px] font-medium text-foreground">{title}</p>
              <p className="text-[12px] text-muted-foreground">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserDashboard;
