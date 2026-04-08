import { publicSupabase, supabase } from "./client";

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function isWhitelistedEmail(email: string): Promise<boolean> {
  const { data, error } = await publicSupabase.rpc("is_whitelisted_email", {
    target_email: email,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle(nextPath?: string) {
  const redirectUrl = new URL("/provider/login", window.location.origin);
  if (nextPath) {
    redirectUrl.searchParams.set("next", nextPath);
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectUrl.toString() },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function completeAuthCodeExchange(code: string) {
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("is_admin");
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

export async function claimProviderByEmail(): Promise<{
  linked: boolean;
  provider_id?: string;
  reason: string;
}> {
  const { data, error } = await supabase.rpc("claim_provider_by_email");
  if (error) throw error;
  return data as { linked: boolean; provider_id?: string; reason: string };
}

export async function ensureAdminIfDesignated(): Promise<boolean> {
  const { data, error } = await supabase.rpc("ensure_admin_if_designated");
  if (error) throw error;
  return Boolean(data);
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/provider/reset-password`,
  });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
