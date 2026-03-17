"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/database.types";
import { registerDevice } from "@/lib/fraud/device-fingerprint";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    loading: true,
    error: null,
  });

  const supabase = createClient();

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      return data;
    },
    [supabase]
  );

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const profile = await fetchProfile(user.id);
          setState({ user, profile, loading: false, error: null });
          // Register device fingerprint in background
          registerDevice().catch(() => {});
        } else {
          setState({ user: null, profile: null, loading: false, error: null });
        }
      } catch {
        setState((prev) => ({ ...prev, loading: false }));
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id);
        setState({
          user: session.user,
          profile,
          loading: false,
          error: null,
        });
      } else {
        setState({ user: null, profile: null, loading: false, error: null });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    // --- Account lockout check (client-side) ---
    const LOCKOUT_KEY = "login_attempts";
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

    try {
      const raw = localStorage.getItem(LOCKOUT_KEY);
      if (raw) {
        const lockout = JSON.parse(raw) as { count: number; firstAttempt: number };
        const elapsed = Date.now() - lockout.firstAttempt;

        if (lockout.count >= MAX_ATTEMPTS && elapsed < LOCKOUT_WINDOW_MS) {
          const minutesLeft = Math.ceil((LOCKOUT_WINDOW_MS - elapsed) / 60000);
          const msg = `Account temporarily locked. Try again in ${minutesLeft} minute${minutesLeft !== 1 ? "s" : ""}.`;
          setState((prev) => ({ ...prev, loading: false, error: msg }));
          return { error: msg };
        }

        // Reset if window has expired
        if (elapsed >= LOCKOUT_WINDOW_MS) {
          localStorage.removeItem(LOCKOUT_KEY);
        }
      }
    } catch {
      // localStorage unavailable — skip lockout check
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Track failed attempt
      try {
        const raw = localStorage.getItem(LOCKOUT_KEY);
        const lockout = raw
          ? (JSON.parse(raw) as { count: number; firstAttempt: number })
          : { count: 0, firstAttempt: Date.now() };

        const elapsed = Date.now() - lockout.firstAttempt;
        if (elapsed >= LOCKOUT_WINDOW_MS) {
          // Start fresh window
          localStorage.setItem(
            LOCKOUT_KEY,
            JSON.stringify({ count: 1, firstAttempt: Date.now() })
          );
        } else {
          lockout.count += 1;
          localStorage.setItem(LOCKOUT_KEY, JSON.stringify(lockout));
        }
      } catch {
        // localStorage unavailable
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return { error: error.message };
    }

    // Successful login — clear lockout counter
    try {
      localStorage.removeItem(LOCKOUT_KEY);
    } catch {
      // localStorage unavailable
    }

    const profile = await fetchProfile(data.user.id);
    setState({ user: data.user, profile, loading: false, error: null });
    // Register device fingerprint on sign-in
    registerDevice().catch(() => {});
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    username: string
  ) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    });

    if (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return { error: error.message };
    }

    if (data.user) {
      // Create profile via server API (bypasses RLS)
      try {
        const profileRes = await fetch("/api/auth/create-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        if (!profileRes.ok) {
          const profileData = await profileRes.json();
          setState((prev) => ({
            ...prev,
            loading: false,
            error: profileData.error || "Profile setup failed.",
          }));
          return { error: profileData.error || "Profile setup failed" };
        }
      } catch (err) {
        console.error("Error creating profile:", err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Account created but profile setup failed. Please contact support.",
        }));
        return { error: "Profile setup failed" };
      }

      const profile = await fetchProfile(data.user.id);
      setState({ user: data.user, profile, loading: false, error: null });
      // Register device fingerprint on sign-up
      registerDevice().catch(() => {});
    }

    return { error: null };
  };

  const signInWithOAuth = async (provider: 'google' | 'github' | 'discord') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    setState((prev) => ({ ...prev, loading: true }));
    await supabase.auth.signOut();
    setState({ user: null, profile: null, loading: false, error: null });
  };

  const refreshProfile = async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      setState((prev) => ({ ...prev, profile }));
    }
  };

  return {
    user: state.user,
    profile: state.profile,
    loading: state.loading,
    error: state.error,
    signIn,
    signUp,
    signInWithOAuth,
    signOut,
    refreshProfile,
  };
}
