import { useEffect, useMemo, useState } from "react";
import PageTransition from "@/components/PageTransition";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { claimProviderByEmail, completeAuthCodeExchange, ensureAdminIfDesignated, getCurrentUser, resetPassword, signIn, signInWithGoogle } from "@/lib/api";
import BrandMark from "@/components/BrandMark";
import { Mail, Eye, EyeOff, Chrome } from "lucide-react";

const ProviderLogin = () => {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [exchangeLoading, setExchangeLoading] = useState(true);
  const navigate = useNavigate();
  const nextPath = useMemo(() => searchParams.get("next") || "/provider/dashboard", [searchParams]);

  useEffect(() => {
    const init = async () => {
      const code = searchParams.get("code");
      try {
        if (code) {
          await completeAuthCodeExchange(code);
        }
        const user = await getCurrentUser();
        if (user) {
          // Auto-link seeded provider record and grant admin if designated
          await Promise.all([
            claimProviderByEmail().catch(() => {}),
            ensureAdminIfDesignated().catch(() => {}),
          ]);
          navigate(nextPath, { replace: true });
          return;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
      } finally {
        setExchangeLoading(false);
      }
    };

    init();
  }, [navigate, nextPath, searchParams]);

  const validateLogin = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email format";
    if (!password) newErrors.password = "Password is required";
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateLogin()) return;
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      await Promise.all([
        claimProviderByEmail().catch(() => {}),
        ensureAdminIfDesignated().catch(() => {}),
      ]);
      navigate(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to send reset link. Please try again.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowForgotPassword(false);
    setResetEmail("");
    setResetError(null);
    setResetSuccess(false);
  };

  return (
    <PageTransition>
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm animate-fade-up">
        {exchangeLoading ? (
          <div className="rounded-xl border border-border/60 bg-surface/40 p-4 text-[13px] text-muted-foreground">
            Preparing secure sign-in...
          </div>
        ) : null}
        <div className="text-center mb-8">
          <BrandMark className="mx-auto mb-4" sizeClassName="h-14 w-14" textClassName="text-lg font-bold" />
          {showForgotPassword ? (
            <>
              <h1 className="text-display-sm text-foreground">Reset password</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">Enter your email to receive a reset link</p>
            </>
          ) : (
            <>
              <h1 className="text-display-sm text-foreground">Welcome back</h1>
              <p className="mt-2 text-[14px] text-muted-foreground">Sign in to your premium provider portal</p>
            </>
          )}
        </div>

        {showForgotPassword ? (
          <div className="space-y-4">
            {resetSuccess ? (
              <div className="space-y-4">
                <div className="rounded-xl bg-foreground/5 border border-foreground/10 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-foreground/10">
                    <Mail className="h-5 w-5 text-foreground" />
                  </div>
                  <p className="text-[14px] font-medium text-foreground mb-1">Check your email</p>
                  <p className="text-[13px] text-muted-foreground">
                    We sent a password reset link to <span className="font-medium text-foreground">{resetEmail}</span>
                  </p>
                </div>
                <button
                  onClick={handleBackToLogin}
                  className="w-full text-center text-[13px] text-foreground font-medium hover:underline"
                >
                  Back to login
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                {resetError && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
                    {resetError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email" className="text-[13px]">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@practice.com"
                    required
                    className="rounded-xl h-11"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl h-11 text-[15px]" disabled={resetLoading}>
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </Button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="w-full text-center text-[13px] text-foreground font-medium hover:underline"
                >
                  Back to login
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px]">Email</Label>
                <Input
                  id="email" type="email" placeholder="you@practice.com"
                  className="rounded-xl h-11"
                  value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => { const { email: _, ...rest } = prev; return rest; }); }}
                />
                {fieldErrors.email && <p className="text-sm text-destructive mt-1">{fieldErrors.email}</p>}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[13px]">Password</Label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[12px] text-foreground hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    className="rounded-xl h-11 pr-10"
                    value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => { const { password: _, ...rest } = prev; return rest; }); }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="text-sm text-destructive mt-1">{fieldErrors.password}</p>}
              </div>
              <Button type="submit" className="w-full rounded-xl h-11 text-[15px]" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/50" /></div>
              <div className="relative flex justify-center"><span className="bg-background px-3 text-[12px] text-muted-foreground">or</span></div>
            </div>

            <Button variant="outline" className="mt-6 w-full rounded-xl h-11 text-[14px]" onClick={handleGoogleSignIn}>
              <Chrome className="h-4 w-4 mr-2" />
              Continue with Google
            </Button>

            <p className="mt-8 text-center text-[13px] text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/provider/signup" className="text-foreground font-medium hover:underline">
                Create one
              </Link>
            </p>
            {nextPath === "/admin" && (
              <p className="mt-4 text-center text-[12px] text-muted-foreground">
                Sign in to continue to the admin console.
              </p>
            )}
          </>
        )}
      </div>
    </div>
    </PageTransition>
  );
};

export default ProviderLogin;
