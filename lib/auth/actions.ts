"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/redirect";
import type { AuthActionState } from "@/lib/auth/state";

/**
 * Signs in with email and password, then redirects to a safe path.
 *
 * Args:
 *   _prev (AuthActionState): Previous client state from useActionState.
 *   formData (FormData): Form fields `email`, `password`, optional `next`.
 *
 * Returns:
 *   AuthActionState: Error message on failure; otherwise redirects (no return).
 */
export async function signInAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = getSafeRedirectPath(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: "Email and password are required.", success: null };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message, success: null };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

/**
 * Registers a new user and relies on DB trigger to create public.profiles.
 *
 * Args:
 *   _prev (AuthActionState): Previous client state.
 *   formData (FormData): `email`, `password`, optional `full_name`.
 *
 * Returns:
 *   AuthActionState: Error or success hint; may redirect if session exists.
 */
export async function signUpAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullNameRaw = String(formData.get("full_name") ?? "").trim();

  if (!email || !password) {
    return { error: "Email and password are required.", success: null };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters.", success: null };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: fullNameRaw ? { full_name: fullNameRaw } : undefined,
    },
  });

  if (error) {
    return { error: error.message, success: null };
  }

  if (data.user && !data.session) {
    return {
      error: null,
      success:
        "Check your email to confirm your account before signing in.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

/**
 * Signs out the current user and returns to home.
 */
export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
