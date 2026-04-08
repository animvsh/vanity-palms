import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import PageTransition from "@/components/PageTransition";
import BrandMark from "@/components/BrandMark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeAuthCodeExchange, signOut, updatePassword } from "@/lib/api";

const ProviderResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      const code = searchParams.get("code");
      try {
        if (!code) {
          throw new Error("This reset link is invalid or has expired.");
        }
        await completeAuthCodeExchange(code);
        setReady(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to verify reset link.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await updatePassword(newPassword);
      await signOut();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="text-center mb-8">
            <BrandMark className="mx-auto mb-4" sizeClassName="h-14 w-14" textClassName="text-lg font-bold" />
            <h1 className="text-display-sm text-foreground">Set a new password</h1>
            <p className="mt-2 text-[14px] text-muted-foreground">
              Secure your Vanity Palms account and return to your dashboard.
            </p>
          </div>

          {loading ? (
            <div className="rounded-xl border border-border/60 bg-surface/40 p-4 text-[13px] text-muted-foreground">
              Verifying your reset link...
            </div>
          ) : success ? (
            <div className="space-y-4 rounded-xl border border-border/60 bg-surface/40 p-5">
              <p className="text-[14px] font-medium text-foreground">Password updated successfully.</p>
              <Button className="w-full rounded-xl" onClick={() => navigate("/provider/login")}>
                Return to login
              </Button>
            </div>
          ) : !ready ? (
            <div className="space-y-4 rounded-xl border border-destructive/20 bg-destructive/10 p-5">
              <p className="text-[13px] text-destructive">{error}</p>
              <Link to="/provider/login">
                <Button variant="outline" className="w-full rounded-xl">Back to login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-[13px]">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter a new password"
                  className="rounded-xl h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-[13px]">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  className="rounded-xl h-11"
                />
              </div>
              <Button type="submit" className="w-full rounded-xl h-11" disabled={submitting}>
                {submitting ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default ProviderResetPassword;
