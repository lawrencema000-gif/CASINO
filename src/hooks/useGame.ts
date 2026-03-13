"use client";

import { useState, useCallback } from "react";
import type { GameType, Json } from "@/lib/supabase/database.types";

type GameStatus = "idle" | "betting" | "playing" | "result";

interface GameState {
  status: GameStatus;
  currentBet: number;
  result: Json | null;
  payout: number;
  multiplier: number;
  error: string | null;
  loading: boolean;
  gameId: string | null;
}

interface GameResult {
  gameId: string;
  result: Json;
  payout: number;
  multiplier: number;
  balanceAfter: number;
  settled: boolean;
}

interface PlaceBetOptions {
  gameType: GameType;
  betAmount: number;
  action?: string;
  gameData?: Record<string, unknown>;
}

export function useGame(onBalanceUpdate?: (newBalance: number) => void) {
  const [state, setState] = useState<GameState>({
    status: "idle",
    currentBet: 0,
    result: null,
    payout: 0,
    multiplier: 0,
    error: null,
    loading: false,
    gameId: null,
  });

  const placeBet = useCallback(
    async ({
      gameType,
      betAmount,
      action = "bet",
      gameData = {},
    }: PlaceBetOptions): Promise<GameResult | null> => {
      setState((prev) => ({
        ...prev,
        status: "betting",
        loading: true,
        error: null,
        currentBet: betAmount,
      }));

      try {
        const response = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameType,
            action,
            betAmount,
            gameData,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setState((prev) => ({
            ...prev,
            status: "idle",
            loading: false,
            error: data.error || "Something went wrong",
          }));
          return null;
        }

        const gameResult: GameResult = {
          gameId: data.gameId,
          result: data.result,
          payout: data.payout,
          multiplier: data.multiplier,
          balanceAfter: data.balanceAfter,
          settled: data.settled,
        };

        setState({
          status: data.settled ? "result" : "playing",
          currentBet: betAmount,
          result: data.result,
          payout: data.payout,
          multiplier: data.multiplier,
          error: null,
          loading: false,
          gameId: data.gameId,
        });

        if (onBalanceUpdate) {
          onBalanceUpdate(data.balanceAfter);
        }

        return gameResult;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Network error";
        setState((prev) => ({
          ...prev,
          status: "idle",
          loading: false,
          error: message,
        }));
        return null;
      }
    },
    [onBalanceUpdate]
  );

  const gameAction = useCallback(
    async (
      action: string,
      gameData: Record<string, unknown> = {}
    ): Promise<GameResult | null> => {
      if (!state.gameId) {
        setState((prev) => ({
          ...prev,
          error: "No active game",
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/games", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            gameId: state.gameId,
            action,
            gameData,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: data.error || "Something went wrong",
          }));
          return null;
        }

        const gameResult: GameResult = {
          gameId: data.gameId,
          result: data.result,
          payout: data.payout,
          multiplier: data.multiplier,
          balanceAfter: data.balanceAfter,
          settled: data.settled,
        };

        setState((prev) => ({
          ...prev,
          status: data.settled ? "result" : "playing",
          result: data.result,
          payout: data.payout,
          multiplier: data.multiplier,
          loading: false,
          gameId: data.settled ? null : prev.gameId,
        }));

        if (onBalanceUpdate) {
          onBalanceUpdate(data.balanceAfter);
        }

        return gameResult;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Network error";
        setState((prev) => ({
          ...prev,
          loading: false,
          error: message,
        }));
        return null;
      }
    },
    [state.gameId, onBalanceUpdate]
  );

  const resetGame = useCallback(() => {
    setState({
      status: "idle",
      currentBet: 0,
      result: null,
      payout: 0,
      multiplier: 0,
      error: null,
      loading: false,
      gameId: null,
    });
  }, []);

  return {
    ...state,
    placeBet,
    gameAction,
    resetGame,
  };
}
