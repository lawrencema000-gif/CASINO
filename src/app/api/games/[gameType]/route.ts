import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { GameType } from "@/lib/supabase/database.types";

interface GameConfig {
  name: string;
  slug: GameType;
  minBet: number;
  maxBet: number;
  houseEdge: number;
  description: string;
  maxMultiplier: number;
}

const GAME_CONFIGS: Record<string, GameConfig> = {
  blackjack: {
    name: "Blackjack",
    slug: "blackjack",
    minBet: 100,
    maxBet: 1000000,
    houseEdge: 0.005,
    description: "Classic 21 card game. Beat the dealer without going over.",
    maxMultiplier: 2.5,
  },
  slots: {
    name: "Slots",
    slug: "slots",
    minBet: 50,
    maxBet: 500000,
    houseEdge: 0.03,
    description: "5-reel slot machine with multiple paylines.",
    maxMultiplier: 250,
  },
  roulette: {
    name: "Roulette",
    slug: "roulette",
    minBet: 100,
    maxBet: 1000000,
    houseEdge: 0.027,
    description: "European roulette with 37 pockets.",
    maxMultiplier: 36,
  },
  dice: {
    name: "Dice",
    slug: "dice",
    minBet: 10,
    maxBet: 1000000,
    houseEdge: 0.01,
    description: "Roll over or under your target number.",
    maxMultiplier: 99,
  },
  mines: {
    name: "Mines",
    slug: "mines",
    minBet: 10,
    maxBet: 500000,
    houseEdge: 0.03,
    description: "Reveal tiles and avoid hidden mines.",
    maxMultiplier: 24,
  },
  crash: {
    name: "Crash",
    slug: "crash",
    minBet: 10,
    maxBet: 500000,
    houseEdge: 0.01,
    description: "Watch the multiplier rise and cash out before it crashes.",
    maxMultiplier: 1000000,
  },
  plinko: {
    name: "Plinko",
    slug: "plinko",
    minBet: 10,
    maxBet: 500000,
    houseEdge: 0.01,
    description: "Drop the ball and watch it bounce to a multiplier.",
    maxMultiplier: 16,
  },
  keno: {
    name: "Keno",
    slug: "keno",
    minBet: 10,
    maxBet: 500000,
    houseEdge: 0.05,
    description: "Pick numbers and see how many match the draw.",
    maxMultiplier: 3000,
  },
  limbo: {
    name: "Limbo",
    slug: "limbo",
    minBet: 10,
    maxBet: 1000000,
    houseEdge: 0.01,
    description: "Set your target multiplier and test your luck.",
    maxMultiplier: 1000000,
  },
  hilo: {
    name: "HiLo",
    slug: "hilo",
    minBet: 10,
    maxBet: 500000,
    houseEdge: 0.02,
    description: "Guess if the next card is higher or lower.",
    maxMultiplier: 1.96,
  },
  coinflip: {
    name: "Coin Flip",
    slug: "coinflip",
    minBet: 10,
    maxBet: 1000000,
    houseEdge: 0.025,
    description: "Pick heads or tails. 1.95x payout.",
    maxMultiplier: 1.95,
  },
  poker: {
    name: "Video Poker",
    slug: "poker",
    minBet: 100,
    maxBet: 500000,
    houseEdge: 0.02,
    description: "Jacks or Better video poker with hold and draw.",
    maxMultiplier: 800,
  },
  lottery: {
    name: "Lottery",
    slug: "lottery",
    minBet: 100,
    maxBet: 100000,
    houseEdge: 0.05,
    description: "Pick 6 numbers from 1-49 and match the draw.",
    maxMultiplier: 10000,
  },
  jackpot: {
    name: "Jackpot",
    slug: "jackpot",
    minBet: 100,
    maxBet: 500000,
    houseEdge: 0.05,
    description: "Progressive jackpot with weighted entries.",
    maxMultiplier: 100,
  },
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameType: string }> }
) {
  const { gameType } = await params;
  const config = GAME_CONFIGS[gameType];

  if (!config) {
    return NextResponse.json(
      {
        error: "Unknown game type",
        availableGames: Object.keys(GAME_CONFIGS),
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ config });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ gameType: string }> }
) {
  try {
    const { gameType } = await params;
    const config = GAME_CONFIGS[gameType];

    if (!config) {
      return NextResponse.json(
        { error: "Unknown game type" },
        { status: 404 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { betAmount, action = "bet", gameData = {} } = body;

    // Validate bet amount
    if (!betAmount || betAmount < config.minBet || betAmount > config.maxBet) {
      return NextResponse.json(
        {
          error: `Bet must be between ${config.minBet} and ${config.maxBet}`,
          minBet: config.minBet,
          maxBet: config.maxBet,
        },
        { status: 400 }
      );
    }

    // Forward to the main games API with the validated game type
    const gamesApiUrl = new URL("/api/games", request.url);
    const response = await fetch(gamesApiUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: request.headers.get("cookie") || "",
      },
      body: JSON.stringify({
        gameType: config.slug,
        action,
        betAmount,
        gameData,
      }),
    });

    const result = await response.json();
    return NextResponse.json(result, { status: response.status });
  } catch (error) {
    console.error("Game route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
