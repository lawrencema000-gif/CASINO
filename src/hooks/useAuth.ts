"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/database.types";

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
      return { error: error.message };
    }

    const profile = await fetchProfile(data.user.id);
    setState({ user: data.user, profile, loading: false, error: null });
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
      // Create profile with 10,000 starting credits
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username,
        balance: 10000,
        total_wagered: 0,
        total_won: 0,
        level: 1,
        exp: 0,
        vip_tier: "bronze",
      });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Account created but profile setup failed. Please contact support.",
        }));
        return { error: profileError.message };
      }

      const profile = await fetchProfile(data.user.id);
      setState({ user: data.user, profile, loading: false, error: null });
    }

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
    signOut,
    refreshProfile,
  };
}
