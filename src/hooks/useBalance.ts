"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface BalanceState {
  balance: number;
  purchasedBalance: number;
  bonusBalance: number;
  loading: boolean;
}

/**
 * Read-only balance hook with Supabase Realtime subscription.
 * All balance mutations MUST go through /api/games (which uses atomic stored procedures).
 * This hook only reads and subscribes — never writes directly to the profiles table.
 */
export function useBalance(userId: string | undefined) {
  const [state, setState] = useState<BalanceState>({
    balance: 0,
    purchasedBalance: 0,
    bonusBalance: 0,
    loading: true,
  });
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setState({ balance: 0, purchasedBalance: 0, bonusBalance: 0, loading: false });
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("balance, purchased_balance, bonus_balance")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching balance:", error);
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    setState({
      balance: data.balance,
      purchasedBalance: data.purchased_balance ?? 0,
      bonusBalance: data.bonus_balance ?? 0,
      loading: false,
    });
  }, [userId, supabase]);

  useEffect(() => {
    fetchBalance();

    if (!userId) return;

    // Subscribe to realtime balance changes (set by server-side stored procedures)
    const channel = supabase
      .channel(`profile-balance-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const p = payload.new as { balance: number; purchased_balance?: number; bonus_balance?: number };
          setState((prev) => ({
            balance: p.balance,
            purchasedBalance: p.purchased_balance ?? prev.purchasedBalance,
            bonusBalance: p.bonus_balance ?? prev.bonusBalance,
            loading: false,
          }));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId, supabase, fetchBalance]);

  /**
   * Update the local balance state from an API response.
   * This does NOT write to the database — it just syncs the client
   * with the balance returned from /api/games.
   */
  const setBalanceFromApi = useCallback((newBalance: number) => {
    setState((prev) => ({ ...prev, balance: newBalance, loading: false }));
  }, []);

  const refreshBalance = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance: state.balance,
    purchasedBalance: state.purchasedBalance,
    bonusBalance: state.bonusBalance,
    loading: state.loading,
    setBalanceFromApi,
    refreshBalance,
  };
}
