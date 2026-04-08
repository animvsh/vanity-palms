import { useEffect, useMemo, useState } from "react";
import PageTransition from "@/components/PageTransition";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeAuthCodeExchange, getCurrentUser, resetPassword, signIn, signInWithGoogle } from "@/lib/api";
import BrandMark from "@/components/BrandMark";
import { Mail, Eye, EyeOff, Chrome } from "lucide-react";

const UserLogin = () => {
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [exchangeLoading, setExchangeLoading] = useState(true);
  const navigate = useNavigate();
  const nextPath = useMemo(() => searchParams.get("next") || "/account", [searchParams]);

  useEffect(() => {
    const init = async () => {
      const code = searchParams.get("code");
      try {
        if (code) await completeAuthCodeExchange(code);
        const user = await getCurrentUser();
        if (user) { navigate(nextPath, { replace: true }); return; }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Authentication failed.");
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
      navigate(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch {
      setError("Failed to send reset link.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          {exchangeLoading && (
            <div className="rounded-xl border border-border/60 bg-surface/40 p-4 text-[13px] text-muted-foreground mb-4">
              Preparing secure sign-in...
            </div>
          )}
          <div className="text-center mb-8">
            <BrandMark className="mx-auto mb-4" sizeClassName="h-14 w-14" textClassName="text-lg font-bold" />
            {showForgot ? (
              <>
                <h1 className="text-display-sm text-foreground">Reset password</h1>
                <p className="mt-2 text-[14px] text-muted-foreground">Enter your email to receive a reset link</p>
              </>
            ) : (
              <>
                <h1 className="text-display-sm text-foreground">Welcome back</h1>
                <p className="mt-2 text-[14px] text-muted-foreground">Sign in to your account</p>
              </>
            )}
          </div>

          {showForgot ? (
            <div className="space-y-4">
              {resetSuccess ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-foreground/5 border border-foreground/10 p-4 text-center">
                    <Mail className="h-5 w-5 text-foreground mb-2" />
                    <p className="text-[14px] font-medium text-foreground">Check your email</p>
                    <p className="text-[13px] text-muted-foreground">Reset link sent to <span className="font-medium">{resetEmail}</span></p>
                  </div>
                  <button onClick={() => { setShowForgot(false); setResetSuccess(false); }} className="w-full text-center text-[13px] text-foreground font-medium hover:underline">
                    Back to login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px]">Email</Label>
                    <Input type="email" required className="rounded-xl h-11" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full rounded-xl h-11 text-[15px]" disabled={resetLoading}>
                    {resetLoading ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <button type="button" onClick={() => setShowForgot(false)} className="w-full text-center text-[13px] text-foreground font-medium hover:underline">
                    Back to login
                  </button>
                </form>
              )}
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">{error}</div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-[13px]">Email</Label>
                  <Input type="email" className="rounded-xl h-11" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => { const { email: _, ...rest } = prev; return rest; }); }} />
                  {fieldErrors.email && <p className="text-sm text-destructive mt-1">{fieldErrors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px]">Password</Label>
                    <button type="button" onClick={() => setShowForgot(true)} className="text-[12px] text-foreground hover:underline">Forgot password?</button>
                  </div>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} className="rounded-xl h-11 pr-10" value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => { const { password: _, ...rest } = prev; return rest; }); }} />
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
                <Link to="/signup" className="text-foreground font-medium hover:underline">Create one</Link>
              </p>

              <p className="mt-3 text-center text-[12px] text-muted-foreground">
                Are you a provider?{" "}
                <Link to="/provider/login" className="text-foreground font-medium hover:underline">Provider sign-in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default UserLogin;
