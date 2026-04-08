import { useState } from "react";
import PageTransition from "@/components/PageTransition";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUp } from "@/lib/api";
import BrandMark from "@/components/BrandMark";
import { Eye, EyeOff, Check } from "lucide-react";

const UserSignup = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email format";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8) newErrors.password = "Password must be at least 8 characters";
    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isFormValid = (): boolean => {
    return Boolean(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && password.length >= 8
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setError(null);
    setLoading(true);

    try {
      const { user } = await signUp(email, password);
      if (!user) throw new Error("Account creation failed. Please try again.");
      navigate("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="text-center mb-8">
            <BrandMark className="mx-auto mb-4" sizeClassName="h-14 w-14" textClassName="text-lg font-bold" />
            <h1 className="text-display-sm text-foreground">Create Account</h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Save providers, track consultations, and leave verified reviews.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-[13px]">Email</Label>
              <Input name="email" type="email" placeholder="you@email.com" className="rounded-xl h-11" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((prev) => { const { email: _, ...rest } = prev; return rest; }); }} />
              {fieldErrors.email && <p className="text-sm text-destructive mt-1">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[13px]">Password</Label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  className="rounded-xl h-11 pr-10"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors((prev) => { const { password: _, ...rest } = prev; return rest; }); }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Must be at least 8 characters</p>
              {fieldErrors.password && <p className="text-sm text-destructive mt-1">{fieldErrors.password}</p>}
            </div>

            <Button type="submit" className="w-full rounded-xl h-11 text-[15px]" disabled={loading || !isFormValid()}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 space-y-2">
            {["Save and compare providers", "Track your consultations", "Leave verified reviews", "Upload before & after photos"].map((f) => (
              <div key={f} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Check className="h-3 w-3 text-foreground" />
                {f}
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-[13px] text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-foreground font-medium hover:underline">Sign in</Link>
          </p>

          <p className="mt-3 text-center text-[12px] text-muted-foreground">
            Are you a provider?{" "}
            <Link to="/provider/signup" className="text-foreground font-medium hover:underline">Register here</Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
};

export default UserSignup;
