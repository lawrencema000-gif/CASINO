"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface BalanceState {
  balance: number;
  loading: boolean;
}

export function useBalance(userId: string | undefined) {
  const [state, setState] = useState<BalanceState>({
    balance: 0,
    loading: true,
  });
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!userId) {
      setState({ balance: 0, loading: false });
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching balance:", error);
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    setState({ balance: data.balance, loading: false });
  }, [userId, supabase]);

  useEffect(() => {
    fetchBalance();

    if (!userId) return;

    // Subscribe to realtime balance changes
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
          const newBalance = (payload.new as { balance: number }).balance;
          setState({ balance: newBalance, loading: false });
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

  const placeBet = useCallback(
    async (amount: number): Promise<{ success: boolean; newBalance: number }> => {
      if (!userId) return { success: false, newBalance: 0 };
      if (amount <= 0) return { success: false, newBalance: state.balance };
      if (amount > state.balance)
        return { success: false, newBalance: state.balance };

      // Optimistic update
      const previousBalance = state.balance;
      const newBalance = previousBalance - amount;
      setState({ balance: newBalance, loading: false });

      const { data, error } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", userId)
        .select("balance")
        .single();

      if (error) {
        // Rollback optimistic update
        setState({ balance: previousBalance, loading: false });
        console.error("Error placing bet:", error);
        return { success: false, newBalance: previousBalance };
      }

      const actualBalance = data?.balance ?? newBalance;
      setState({ balance: actualBalance, loading: false });
      return { success: true, newBalance: actualBalance };
    },
    [userId, state.balance, supabase]
  );

  const addWinnings = useCallback(
    async (amount: number): Promise<{ success: boolean; newBalance: number }> => {
      if (!userId) return { success: false, newBalance: 0 };
      if (amount <= 0) return { success: false, newBalance: state.balance };

      // Optimistic update
      const previousBalance = state.balance;
      const newBalance = previousBalance + amount;
      setState({ balance: newBalance, loading: false });

      const { data, error } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("id", userId)
        .select("balance")
        .single();

      if (error) {
        setState({ balance: previousBalance, loading: false });
        console.error("Error adding winnings:", error);
        return { success: false, newBalance: previousBalance };
      }

      const actualBalance = data?.balance ?? newBalance;
      setState({ balance: actualBalance, loading: false });
      return { success: true, newBalance: actualBalance };
    },
    [userId, state.balance, supabase]
  );

  const refreshBalance = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance: state.balance,
    loading: state.loading,
    placeBet,
    addWinnings,
    refreshBalance,
  };
}
