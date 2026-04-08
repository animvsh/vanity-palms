import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getCurrentUser,
  updatePassword,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  updateProviderConnectionStatus,
  deactivateOwnProviderAccount,
} from "@/lib/api";
import type { Provider } from "@/data/mockData";

interface SettingsTabProps {
  provider: Provider;
  onSignOut: () => Promise<void>;
}

export const SettingsTab = ({ provider, onSignOut }: SettingsTabProps) => {
  const [userEmail, setUserEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState({ email: true, sms: false, weekly_digest: true });
  const [notifLoading, setNotifLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<{
    calendar?: "not_connected" | "connected" | "error";
    email?: "not_connected" | "connected" | "error";
    provider?: string;
  }>(
    provider.composioConnectionStatus ?? {
      calendar: "not_connected",
      email: "not_connected",
      provider: "composio",
    },
  );
  const [connectionLoading, setConnectionLoading] = useState<null | "calendar" | "email">(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const user = await getCurrentUser();
        if (user?.email) setUserEmail(user.email);

        const prefs = await fetchNotificationPreferences(provider.id);
        setNotifPrefs(prefs);
      } catch {
        // keep defaults
      } finally {
        setNotifLoading(false);
      }
    };
    loadSettings();
  }, [provider.id]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      await updatePassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleToggleNotif = async (key: keyof typeof notifPrefs) => {
    const previous = { ...notifPrefs };
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    try {
      await updateNotificationPreferences(provider.id, updated);
    } catch {
      setNotifPrefs(previous);
    }
  };

  const handleConnectionAction = async (target: "calendar" | "email") => {
    type ConnectionStatus = {
      calendar?: "not_connected" | "connected" | "error";
      email?: "not_connected" | "connected" | "error";
      provider?: string;
    };
    const nextValue: "not_connected" | "connected" = connectionStatus[target] === "connected" ? "not_connected" : "connected";
    const nextStatus: ConnectionStatus = {
      calendar: connectionStatus.calendar ?? "not_connected",
      email: connectionStatus.email ?? "not_connected",
      provider: "composio",
      [target]: nextValue,
    };

    setConnectionLoading(target);
    try {
      await updateProviderConnectionStatus(provider.id, nextStatus);
      setConnectionStatus(nextStatus);
    } catch {
      // no-op UI rollback path for now
    } finally {
      setConnectionLoading(null);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await deactivateOwnProviderAccount(provider.id);
      await onSignOut();
    } catch {
      setDeleteLoading(false);
    }
  };

  const notificationItems: { label: string; key: keyof typeof notifPrefs }[] = [
    { label: "Email notifications for new inquiries", key: "email" },
    { label: "SMS alerts for bookings", key: "sms" },
    { label: "Weekly performance digest", key: "weekly_digest" },
  ];

  return (
    <div className="max-w-2xl animate-fade-up">
      <div className="mb-8">
        <h1 className="text-display-sm text-foreground">Settings</h1>
        <p className="mt-2 text-muted-foreground">Manage your account preferences.</p>
      </div>

      <div className="space-y-6">
        <form onSubmit={handleChangePassword} className="apple-card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Account</h3>
          {passwordError && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-[13px] text-destructive">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-xl bg-foreground/5 border border-foreground/10 p-3 text-[13px] text-foreground">
              Password updated successfully.
            </div>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[13px]">Email</Label>
              <Input value={userEmail} readOnly className="rounded-xl h-11 bg-surface/50 text-muted-foreground cursor-not-allowed" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">New Password</Label>
              <Input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[13px]">Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>
          </div>
          <Button type="submit" className="rounded-xl" disabled={passwordLoading || (!newPassword && !confirmPassword)}>
            {passwordLoading ? "Updating..." : "Change Password"}
          </Button>
        </form>

        <div className="apple-card p-6 space-y-5">
          <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
          {notifLoading ? (
            <p className="text-[13px] text-muted-foreground">Loading preferences...</p>
          ) : (
            <div className="space-y-3">
              {notificationItems.map(({ label, key }) => (
                <label key={key} className="flex items-center justify-between py-1 cursor-pointer group">
                  <span className="text-[13px] text-foreground">{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={notifPrefs[key]}
                    onClick={() => handleToggleNotif(key)}
                    className="relative"
                  >
                    <div className={`w-10 h-6 rounded-full transition-colors ${notifPrefs[key] ? "bg-foreground" : "bg-border"}`} />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow-sm transition-transform ${notifPrefs[key] ? "translate-x-4" : ""}`} />
                  </button>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="apple-card p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Calendar & Email Connections</h3>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Connect your calendar and email so booked consultations can sync through Composio-ready integrations.
            </p>
          </div>

          {[
            {
              key: "calendar" as const,
              title: "Calendar",
              desc: "Sync booked consultations to your external calendar.",
            },
            {
              key: "email" as const,
              title: "Email",
              desc: "Use your connected email account for consultation confirmations and future automation.",
            },
          ].map((item) => {
            const status = connectionStatus[item.key] ?? "not_connected";
            const isConnected = status === "connected";
            const isLoading = connectionLoading === item.key;

            return (
              <div key={item.key} className="rounded-xl border border-border/60 bg-surface/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{item.desc}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${isConnected ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"}`}>
                    {isConnected ? "Connected" : status === "error" ? "Needs attention" : "Not connected"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant={isConnected ? "outline" : "default"}
                    className="rounded-xl"
                    disabled={isLoading}
                    onClick={() => handleConnectionAction(item.key)}
                  >
                    {isLoading ? "Saving..." : isConnected ? `Disconnect ${item.title}` : `Connect ${item.title}`}
                  </Button>
                  <span className="text-[12px] text-muted-foreground">
                    Provider: {connectionStatus.provider || "composio"}
                  </span>
                </div>
              </div>
            );
          })}

          <div className="rounded-xl border border-dashed border-border p-4 text-[12px] text-muted-foreground">
            Calendar sync is available today: when you book a consultation from the dashboard, you can add it directly to Google Calendar or download an .ics file for any calendar app. Full automated sync via Composio is coming soon.
          </div>
        </div>

        <div className="apple-card p-6 border-border">
          <h3 className="text-sm font-semibold text-foreground mb-3">Danger Zone</h3>
          {!showDeleteConfirm ? (
            <>
              <p className="text-[13px] text-muted-foreground mb-4">Permanently delete your account and all associated data.</p>
              <Button
                variant="outline"
                className="rounded-xl text-muted-foreground border-border hover:bg-foreground/5"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete Account
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4">
                <p className="text-[14px] font-medium text-destructive mb-1">Are you sure?</p>
                <p className="text-[13px] text-muted-foreground">
                  This will deactivate your provider account and sign you out. To fully remove your data, please contact support.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteLoading}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Deleting..." : "Yes, Delete My Account"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
