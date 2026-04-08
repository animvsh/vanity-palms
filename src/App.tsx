import { lazy, Suspense, useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SplashScreen from "@/components/SplashScreen";
import StaticPage from "./pages/StaticPage";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import ErrorBoundary from "@/components/ErrorBoundary";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import OfflineBanner from "@/components/OfflineBanner";
import { HelmetProvider } from "react-helmet-async";

// Lazy-loaded routes — code-split into separate chunks
const ConcernDetail = lazy(() => import("./pages/ConcernDetail"));
const ProcedureDetail = lazy(() => import("./pages/ProcedureDetail"));
const ProviderListing = lazy(() => import("./pages/ProviderListing"));
const ProviderProfile = lazy(() => import("./pages/ProviderProfile"));
const CompareProviders = lazy(() => import("./pages/CompareProviders"));
const ReviewRequestPage = lazy(() => import("./pages/ReviewRequest"));
const ProviderLogin = lazy(() => import("./pages/provider/ProviderLogin"));
const ProviderResetPassword = lazy(() => import("./pages/provider/ProviderResetPassword"));
const ProviderSignup = lazy(() => import("./pages/provider/ProviderSignup"));
const ProviderDashboard = lazy(() => import("./pages/provider/ProviderDashboard"));
const AdminConsole = lazy(() => import("./pages/admin/AdminConsole"));
const UserLogin = lazy(() => import("./pages/user/UserLogin"));
const UserSignup = lazy(() => import("./pages/user/UserSignup"));
const UserDashboard = lazy(() => import("./pages/user/UserDashboard"));
const LocationProcedure = lazy(() => import("./pages/LocationProcedure"));
const Visualizer = lazy(() => import("./pages/Visualizer"));
const ConsultationChat = lazy(() => import("./pages/ConsultationChat"));

/** Layout shell that hides Footer on full-screen pages like /visualizer */
function AppLayout() {
  const { pathname } = useLocation();
  const hideFooter = pathname === "/visualizer";

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main-content" className="flex-1">
        <RouteErrorBoundary>
        <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/concerns/:id" element={<ConcernDetail />} />
          <Route path="/procedures/:procedureSlug/:location" element={<LocationProcedure />} />
          <Route path="/procedures/:id" element={<ProcedureDetail />} />
          <Route path="/providers" element={<ProviderListing />} />
          <Route path="/providers/:id" element={<ProviderProfile />} />
          <Route path="/review/:token" element={<ReviewRequestPage />} />
          <Route path="/compare" element={<CompareProviders />} />
          <Route path="/visualizer" element={<Visualizer />} />
          <Route path="/consultation/:id" element={<ConsultationChat />} />
          <Route path="/login" element={<UserLogin />} />
          <Route path="/signup" element={<UserSignup />} />
          <Route path="/account" element={<UserDashboard />} />
          <Route path="/provider/login" element={<ProviderLogin />} />
          <Route path="/provider/reset-password" element={<ProviderResetPassword />} />
          <Route path="/provider/signup" element={<ProviderSignup />} />
          <Route path="/provider/dashboard" element={<ProviderDashboard />} />
          <Route path="/admin" element={<AdminConsole />} />
          <Route
            path="/about"
            element={
              <StaticPage
                eyebrow="About"
                title="Vanity Palms"
                intro="Vanity Palms helps patients discover vetted aesthetic providers and helps providers present premium profiles that convert."
                sections={[
                  {
                    title: "What we do",
                    body: [
                      "We bring verified providers, procedure research, side-by-side comparison, and consultation requests into one place.",
                      "The product is designed to shorten the gap between curiosity and a qualified consultation without forcing patients through opaque marketplaces.",
                    ],
                  },
                  {
                    title: "Who it serves",
                    body: [
                      "Patients use Vanity Palms to understand procedures, compare providers, and request consultations.",
                      "Providers use Vanity Palms to manage premium profiles, pricing, galleries, inquiries, and analytics from one dashboard.",
                    ],
                  },
                ]}
              />
            }
          />
          <Route
            path="/privacy"
            element={
              <StaticPage
                eyebrow="Privacy"
                title="Privacy Policy"
                intro="Vanity Palms collects only the information needed to operate provider discovery, consultations, and authenticated provider accounts."
                sections={[
                  {
                    title: "What we collect",
                    body: [
                      "We store account information for providers, consultation request details submitted by patients, provider profile content, and product analytics tied to profile usage.",
                      "Public browsing data is limited to the minimum needed to keep the product reliable and secure.",
                    ],
                  },
                  {
                    title: "How we use it",
                    body: [
                      "Consultation details are used to route inquiries to the selected provider.",
                      "Provider data is used to power search, profile pages, analytics, moderation, and account management.",
                    ],
                  },
                ]}
              />
            }
          />
          <Route
            path="/terms"
            element={
              <StaticPage
                eyebrow="Terms"
                title="Terms of Service"
                intro="Using Vanity Palms means using the platform responsibly, providing accurate information, and respecting provider and patient safety."
                sections={[
                  {
                    title: "Platform use",
                    body: [
                      "Patients may browse, compare, and request consultations through the product.",
                      "Providers are responsible for keeping their profile information, pricing, and credentials accurate.",
                    ],
                  },
                  {
                    title: "Account expectations",
                    body: [
                      "Provider accounts are subject to approval and moderation.",
                      "Vanity Palms may suspend or remove accounts that violate policy, submit misleading information, or misuse patient data.",
                    ],
                  },
                ]}
              />
            }
          />
          <Route
            path="/cookies"
            element={
              <StaticPage
                eyebrow="Cookies"
                title="Cookie Policy"
                intro="Vanity Palms uses essential cookies and local storage for authentication, session continuity, and product performance."
                sections={[
                  {
                    title: "Essential usage",
                    body: [
                      "Authentication tokens and session data are required for provider and admin access.",
                      "Basic local persistence helps the product restore sessions and keep authenticated experiences reliable.",
                    ],
                  },
                  {
                    title: "Analytics usage",
                    body: [
                      "We use lightweight product analytics to understand provider profile performance and patient funnel behavior.",
                      "These analytics support product quality, moderation, and premium reporting features.",
                    ],
                  },
                ]}
              />
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </main>
      {!hideFooter && <Footer />}
      <OfflineBanner />
    </div>
  );
}

const App = () => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), prefersReducedMotion ? 0 : 950);
    return () => window.clearTimeout(timer);
  }, [prefersReducedMotion]);

  return (
    <ErrorBoundary>
      <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showSplash ? (
          <SplashScreen />
        ) : (
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppLayout />
          </BrowserRouter>
        )}
      </TooltipProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
