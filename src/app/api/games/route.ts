import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";
import type { Json } from "@/lib/supabase/database.types";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

// All game types supported by the casino
const VALID_GAME_TYPES = [
  "blackjack",
  "slots",
  "roulette",
  "dice",
  "coinflip",
  "crash",
  "plinko",
  "poker",
  "lottery",
  "jackpot",
  "mines",
  "keno",
  "limbo",
  "hilo",
] as const;

type ValidGameType = (typeof VALID_GAME_TYPES)[number];

const VALID_ACTIONS = [
  "bet",
  "hit",
  "stand",
  "split",
  "double",
  "cashout",
  "spin",
  "pick",
  "roll",
];

interface GameRequest {
  gameType?: ValidGameType;
  gameId?: string;
  action: string;
  betAmount?: number;
  gameData?: Record<string, unknown>;
  demoMode?: boolean;
}

function generateServerSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

function hashServerSeed(seed: string): string {
  return crypto.createHash("sha256").update(seed).digest("hex");
}

function generateGameResult(
  gameType: ValidGameType,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  gameData: Record<string, unknown>
): { result: Record<string, unknown>; multiplier: number } {
  const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = crypto.createHash("sha256").update(combinedSeed).digest("hex");
  const roll = parseInt(hash.substring(0, 8), 16) / 0xffffffff;

  switch (gameType) {
    case "dice": {
      const target = (gameData.target as number) || 50;
      const isOver = (gameData.isOver as boolean) ?? true;
      const diceResult = parseFloat((roll * 100).toFixed(2));
      const won = isOver ? diceResult > target : diceResult < target;
      const edge = 0.01;
      const winChance = isOver ? (100 - target) / 100 : target / 100;
      const mult = won ? parseFloat(((1 - edge) / winChance).toFixed(4)) : 0;

      return {
        result: { roll: diceResult, target, isOver, won },
        multiplier: mult,
      };
    }

    case "coinflip": {
      const choice = (gameData.choice as string) || "heads";
      const coinResult = roll < 0.5 ? "heads" : "tails";
      const won = coinResult === choice;

      return {
        result: { choice, coinResult, won },
        multiplier: won ? 1.95 : 0,
      };
    }

    case "mines": {
      const mineCount = (gameData.mineCount as number) || 5;
      const totalTiles = 25;
      const revealed = (gameData.revealed as number[]) || [];
      const pickIndex = gameData.pick as number;

      const mines: number[] = [];
      for (let i = 0; i < mineCount; i++) {
        const mineHash = crypto
          .createHash("sha256")
          .update(`${combinedSeed}:mine:${i}`)
          .digest("hex");
        let pos = parseInt(mineHash.substring(0, 8), 16) % totalTiles;
        while (mines.includes(pos)) {
          pos = (pos + 1) % totalTiles;
        }
        mines.push(pos);
      }

      const hitMine = mines.includes(pickIndex);
      const safeRevealed = revealed.length + (hitMine ? 0 : 1);
      const safeTiles = totalTiles - mineCount;

      let mult = 1;
      for (let i = 0; i < safeRevealed; i++) {
        mult *= (totalTiles - i) / (totalTiles - mineCount - i);
      }
      mult = hitMine ? 0 : parseFloat((mult * 0.97).toFixed(4));

      return {
        result: {
          mines: hitMine ? mines : undefined,
          hitMine,
          pick: pickIndex,
          safeRevealed,
          safeTiles,
        },
        multiplier: mult,
      };
    }

    case "limbo": {
      const targetMultiplier = (gameData.targetMultiplier as number) || 2;
      const e = 0.01;
      const crashPoint =
        roll === 0 ? 1 : parseFloat(((1 - e) / roll).toFixed(4));
      const won = crashPoint >= targetMultiplier;

      return {
        result: { crashPoint, targetMultiplier, won },
        multiplier: won ? targetMultiplier : 0,
      };
    }

    case "crash": {
      const e = 0.01;
      const crashPoint =
        roll === 0 ? 1 : parseFloat(Math.max(1, (1 - e) / roll).toFixed(2));

      return {
        result: { crashPoint, phase: "crashed" },
        multiplier: 0,
      };
    }

    case "slots": {
      const symbols = [
        "cherry",
        "lemon",
        "orange",
        "plum",
        "bell",
        "bar",
        "seven",
        "diamond",
      ];
      const reels: string[][] = [];

      for (let r = 0; r < 5; r++) {
        const reel: string[] = [];
        for (let row = 0; row < 3; row++) {
          const reelHash = crypto
            .createHash("sha256")
            .update(`${combinedSeed}:reel:${r}:${row}`)
            .digest("hex");
          const idx = parseInt(reelHash.substring(0, 8), 16) % symbols.length;
          reel.push(symbols[idx]);
        }
        reels.push(reel);
      }

      const middleRow = reels.map((r) => r[1]);
      const counts: Record<string, number> = {};
      middleRow.forEach((s) => (counts[s] = (counts[s] || 0) + 1));
      const maxMatch = Math.max(...Object.values(counts));
      const bestSymbol = Object.keys(counts).find(
        (k) => counts[k] === maxMatch
      )!;

      const symbolMultipliers: Record<string, number> = {
        cherry: 2,
        lemon: 3,
        orange: 4,
        plum: 5,
        bell: 8,
        bar: 15,
        seven: 25,
        diamond: 50,
      };

      let mult = 0;
      if (maxMatch >= 3) {
        mult =
          symbolMultipliers[bestSymbol] *
          (maxMatch === 5 ? 5 : maxMatch === 4 ? 2 : 1);
      }

      return {
        result: {
          reels,
          middleRow,
          matchCount: maxMatch,
          bestSymbol,
          won: mult > 0,
        },
        multiplier: mult,
      };
    }

    case "roulette": {
      const betType = (gameData.betType as string) || "red";
      const betNumber = gameData.betNumber as number | undefined;
      const pocketCount = 37;
      const pocket = Math.floor(roll * pocketCount);

      const redNumbers = [
        1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
      ];
      const isRed = redNumbers.includes(pocket);
      const isBlack = pocket !== 0 && !isRed;
      const isEven = pocket !== 0 && pocket % 2 === 0;
      const isOdd = pocket !== 0 && pocket % 2 !== 0;

      let won = false;
      let mult = 0;

      switch (betType) {
        case "red":
          won = isRed;
          mult = won ? 2 : 0;
          break;
        case "black":
          won = isBlack;
          mult = won ? 2 : 0;
          break;
        case "even":
          won = isEven;
          mult = won ? 2 : 0;
          break;
        case "odd":
          won = isOdd;
          mult = won ? 2 : 0;
          break;
        case "number":
          won = pocket === betNumber;
          mult = won ? 36 : 0;
          break;
        case "1-18":
          won = pocket >= 1 && pocket <= 18;
          mult = won ? 2 : 0;
          break;
        case "19-36":
          won = pocket >= 19 && pocket <= 36;
          mult = won ? 2 : 0;
          break;
        case "1st12":
          won = pocket >= 1 && pocket <= 12;
          mult = won ? 3 : 0;
          break;
        case "2nd12":
          won = pocket >= 13 && pocket <= 24;
          mult = won ? 3 : 0;
          break;
        case "3rd12":
          won = pocket >= 25 && pocket <= 36;
          mult = won ? 3 : 0;
          break;
      }

      return {
        result: { pocket, isRed, isBlack, betType, won },
        multiplier: mult,
      };
    }

    case "blackjack": {
      const deck = generateShuffledDeck(combinedSeed);
      const playerCards = [deck[0], deck[2]];
      const dealerCards = [deck[1], deck[3]];
      const playerTotal = calculateHandTotal(playerCards);
      const dealerTotal = calculateHandTotal([dealerCards[0]]);

      const playerBlackjack = playerTotal === 21;
      const settled = playerBlackjack;

      return {
        result: {
          playerCards,
          dealerCards: settled
            ? dealerCards
            : [dealerCards[0], { suit: "hidden", rank: "hidden", value: 0 }],
          playerTotal,
          dealerVisible: dealerTotal,
          deckPosition: 4,
          phase: settled ? "settled" : "player_turn",
          playerBlackjack,
        },
        multiplier: playerBlackjack ? 2.5 : 0,
      };
    }

    case "poker": {
      const deck = generateShuffledDeck(combinedSeed);
      const hand = deck.slice(0, 5);

      return {
        result: { hand, phase: "deal", held: [] },
        multiplier: 0,
      };
    }

    case "lottery": {
      const picks = (gameData.picks as number[]) || [];
      const drawnNumbers: number[] = [];

      for (let i = 0; i < 6; i++) {
        const drawHash = crypto
          .createHash("sha256")
          .update(`${combinedSeed}:draw:${i}`)
          .digest("hex");
        let num = (parseInt(drawHash.substring(0, 8), 16) % 49) + 1;
        while (drawnNumbers.includes(num)) {
          num = (num % 49) + 1;
        }
        drawnNumbers.push(num);
      }

      const matches = picks.filter((p: number) =>
        drawnNumbers.includes(p)
      ).length;

      const lotteryPayouts: Record<number, number> = {
        6: 10000,
        5: 1000,
        4: 100,
        3: 10,
        2: 2,
      };
      const mult = lotteryPayouts[matches] || 0;

      return {
        result: { picks, drawnNumbers, matches, won: mult > 0 },
        multiplier: mult,
      };
    }

    case "jackpot": {
      // Progressive jackpot — weighted entry, roulette-style draw
      const jackpotRoll = roll * 100;
      const won = jackpotRoll < 1; // 1% chance
      const mult = won ? 100 : 0;

      return {
        result: { roll: jackpotRoll, won, threshold: 1 },
        multiplier: mult,
      };
    }

    case "plinko": {
      const rows = 16;
      const risk = (gameData.risk as string) || "medium";
      const path: number[] = [];
      let position = 0;

      for (let i = 0; i < rows; i++) {
        const rowHash = crypto
          .createHash("sha256")
          .update(`${combinedSeed}:row:${i}`)
          .digest("hex");
        const direction =
          parseInt(rowHash.substring(0, 8), 16) % 2 === 0 ? 0 : 1;
        position += direction;
        path.push(direction);
      }

      // position is count of right moves (0 to 16), maps to 17 buckets
      const bucket = position;
      const multipliers: Record<string, number[]> = {
        low:    [5.6, 2.1, 1.4, 1.1, 1, 0.5, 0.3, 0.3, 0.3, 0.3, 0.3, 0.5, 1, 1.1, 1.4, 2.1, 5.6],
        medium: [13, 3, 1.9, 1.3, 0.7, 0.4, 0.2, 0.2, 0.2, 0.2, 0.2, 0.4, 0.7, 1.3, 1.9, 3, 13],
        high:   [110, 41, 10, 5, 3, 1.5, 0.5, 0.3, 0.2, 0.3, 0.5, 1.5, 3, 5, 10, 41, 110],
      };
      const riskMultipliers = multipliers[risk] || multipliers.medium;
      const mult = riskMultipliers[bucket] ?? 0.2;

      return {
        result: {
          path,
          bucket,
          risk,
          rows,
        },
        multiplier: mult,
      };
    }

    case "keno": {
      const picks = (gameData.picks as number[]) || [];
      const numPicks = picks.length || 10;
      const drawnNumbers: number[] = [];

      for (let i = 0; i < 10; i++) {
        const drawHash = crypto
          .createHash("sha256")
          .update(`${combinedSeed}:draw:${i}`)
          .digest("hex");
        let num = (parseInt(drawHash.substring(0, 8), 16) % 40) + 1;
        while (drawnNumbers.includes(num)) {
          num = (num % 40) + 1;
        }
        drawnNumbers.push(num);
      }

      const hits = picks.filter((p: number) =>
        drawnNumbers.includes(p)
      ).length;

      const payoutTable: Record<number, Record<number, number>> = {
        1: { 1: 3.5 },
        2: { 2: 6 },
        3: { 2: 2, 3: 26 },
        4: { 2: 1.5, 3: 8, 4: 80 },
        5: { 3: 3, 4: 12, 5: 200 },
        10: { 5: 3, 6: 15, 7: 50, 8: 200, 9: 750, 10: 3000 },
      };

      const tableKey =
        numPicks in payoutTable
          ? numPicks
          : Object.keys(payoutTable)
              .map(Number)
              .reduce((prev, curr) =>
                Math.abs(curr - numPicks) < Math.abs(prev - numPicks)
                  ? curr
                  : prev
              );
      const mult = payoutTable[tableKey]?.[hits] || 0;

      return {
        result: { picks, drawnNumbers, hits, won: mult > 0 },
        multiplier: mult,
      };
    }

    case "hilo": {
      const cards = generateShuffledDeck(combinedSeed);
      const currentCard = cards[0];
      const guess = (gameData.guess as string) || "higher";
      const nextCard = cards[1];

      const won =
        guess === "higher"
          ? nextCard.value > currentCard.value
          : nextCard.value < currentCard.value;

      return {
        result: { currentCard, nextCard, guess, won },
        multiplier: won ? 1.96 : 0,
      };
    }

    default:
      return {
        result: { error: "Unknown game type" },
        multiplier: 0,
      };
  }
}

interface Card {
  suit: string;
  rank: string;
  value: number;
}

function generateShuffledDeck(seed: string): Card[] {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const ranks = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
  ];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      let value = parseInt(rank);
      if (isNaN(value)) {
        value = rank === "A" ? 11 : 10;
      }
      deck.push({ suit, rank, value });
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const hash = crypto
      .createHash("sha256")
      .update(`${seed}:shuffle:${i}`)
      .digest("hex");
    const j = parseInt(hash.substring(0, 8), 16) % (i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function calculateHandTotal(cards: Card[]): number {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === "A") {
      aces++;
      total += 11;
    } else {
      total += card.value;
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }

  return total;
}

/**
 * Handle demo mode: calculate and return results without touching the database.
 */
function handleDemoMode(
  gameType: ValidGameType,
  betAmount: number,
  gameData: Record<string, unknown>
): NextResponse {
  const serverSeed = generateServerSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const clientSeed =
    (gameData.clientSeed as string) || crypto.randomBytes(16).toString("hex");
  const nonce = 1;

  const { result, multiplier } = generateGameResult(
    gameType,
    serverSeed,
    clientSeed,
    nonce,
    gameData
  );

  const payout = Math.floor(betAmount * multiplier);

  return NextResponse.json({
    gameId: null,
    result,
    payout,
    multiplier,
    balanceAfter: null,
    settled: true,
    serverSeedHash,
    demoMode: true,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: GameRequest = await request.json();
    const { gameType, action, betAmount, gameData = {}, demoMode } = body;

    // ---------- Demo mode (no auth required, blocked for authenticated users) ----------
    if (demoMode) {
      // Prevent authenticated users from using demo mode to bypass balance
      const supabaseCheck = await createClient();
      const { data: { user: authUser } } = await supabaseCheck.auth.getUser();
      if (authUser) {
        return NextResponse.json(
          { error: "Demo mode is not available for logged-in users" },
          { status: 403 }
        );
      }
      if (
        !gameType ||
        !VALID_GAME_TYPES.includes(gameType as ValidGameType)
      ) {
        return NextResponse.json(
          { error: "Invalid game type" },
          { status: 400 }
        );
      }
      if (!betAmount || betAmount <= 0) {
        return NextResponse.json(
          { error: "Invalid bet amount" },
          { status: 400 }
        );
      }
      return handleDemoMode(gameType as ValidGameType, betAmount, gameData);
    }

    // ---------- Authenticated mode ----------
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 10 bets/min per user
    const ipHeader =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const ip = ipHeader.split(",")[0].trim();

    const userLimit = checkRateLimit(`user:${user.id}`, RATE_LIMITS.bets);
    if (!userLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please slow down.",
          retryAfterMs: userLimit.resetMs,
        },
        { status: 429 }
      );
    }

    const ipLimit = checkRateLimit(`ip:${ip}`, RATE_LIMITS.api);
    if (!ipLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests from this IP." },
        { status: 429 }
      );
    }

    if (!action || !VALID_ACTIONS.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // ========== NEW BET ==========
    if (action === "bet" || action === "spin" || action === "roll") {
      if (
        !gameType ||
        !VALID_GAME_TYPES.includes(gameType as ValidGameType)
      ) {
        return NextResponse.json(
          { error: "Invalid game type" },
          { status: 400 }
        );
      }

      if (!betAmount || betAmount <= 0) {
        return NextResponse.json(
          { error: "Invalid bet amount" },
          { status: 400 }
        );
      }

      // Generate provably fair seeds
      const serverSeed = generateServerSeed();
      const serverSeedHash = hashServerSeed(serverSeed);
      const clientSeed =
        (gameData.clientSeed as string) ||
        crypto.randomBytes(16).toString("hex");
      const nonce = 1;

      // ---- ATOMIC BET: use process_bet stored procedure (FOR UPDATE lock) ----
      const { data: gameId, error: betError } = await supabaseAdmin.rpc(
        "process_bet",
        {
          p_player_id: user.id,
          p_game_type: gameType,
          p_bet_amount: betAmount,
          p_server_seed_hash: serverSeedHash,
          p_client_seed: clientSeed,
          p_nonce: nonce,
        }
      );

      if (betError) {
        const msg = betError.message || "Failed to place bet";
        const status = msg.includes("Insufficient balance") ? 400 : 500;
        return NextResponse.json({ error: msg }, { status });
      }

      // Compute game result
      const { result, multiplier } = generateGameResult(
        gameType as ValidGameType,
        serverSeed,
        clientSeed,
        nonce,
        gameData
      );

      const payout = Math.floor(betAmount * multiplier);
      const settled =
        gameType !== "blackjack" ||
        (result as Record<string, unknown>).playerBlackjack === true;

      // ---- ATOMIC SETTLE: use settle_game stored procedure ----
      if (settled) {
        const { data: newBalance, error: settleError } =
          await supabaseAdmin.rpc("settle_game", {
            p_game_id: gameId,
            p_player_id: user.id,
            p_result: result as unknown as Json,
            p_payout: payout,
            p_multiplier: multiplier,
          });

        if (settleError) {
          console.error("Error settling game:", settleError);
          return NextResponse.json(
            { error: "Failed to settle game" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          gameId,
          result,
          payout,
          multiplier,
          balanceAfter: newBalance,
          settled: true,
          serverSeedHash,
        });
      }

      // Unsettled game (e.g. blackjack player_turn) — update result but don't settle
      await supabaseAdmin
        .from("games")
        .update({ result: result as unknown as Json })
        .eq("id", gameId);

      // Fetch updated balance (bet was already deducted by process_bet)
      const { data: profileAfterBet } = await supabaseAdmin
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      return NextResponse.json({
        gameId,
        result,
        payout: 0,
        multiplier: 0,
        balanceAfter: profileAfterBet?.balance ?? 0,
        settled: false,
        serverSeedHash,
      });
    }

    // ========== GAME ACTIONS (hit, stand, cashout, pick) ==========
    if (body.gameId) {
      const { data: existingGame, error: gameError } = await supabaseAdmin
        .from("games")
        .select("*")
        .eq("id", body.gameId)
        .eq("player_id", user.id)
        .eq("settled", false)
        .single();

      if (gameError || !existingGame) {
        return NextResponse.json(
          { error: "Game not found or already settled" },
          { status: 404 }
        );
      }

      const currentResult = existingGame.result as Record<string, unknown>;
      let newResult = { ...currentResult };
      let payout = 0;
      let multiplier = 0;
      let settled = false;

      if (existingGame.game_type === "blackjack") {
        const serverSeed = generateServerSeed();
        const combinedSeed = `${serverSeed}:${existingGame.client_seed}:${existingGame.nonce + 1}`;
        const deck = generateShuffledDeck(combinedSeed);
        const deckPos = (currentResult.deckPosition as number) || 4;

        if (action === "hit") {
          const playerCards = [
            ...(currentResult.playerCards as Card[]),
            deck[deckPos],
          ];
          const playerTotal = calculateHandTotal(playerCards);
          const busted = playerTotal > 21;

          newResult = {
            ...currentResult,
            playerCards,
            playerTotal,
            deckPosition: deckPos + 1,
            phase: busted ? "settled" : "player_turn",
            busted,
          };

          settled = busted;
          multiplier = 0;
        } else if (action === "stand") {
          const dealerCards = [...(currentResult.dealerCards as Card[])];
          if (dealerCards[1].suit === "hidden") {
            dealerCards[1] = deck[3];
          }

          let dealerIdx = deckPos;
          while (calculateHandTotal(dealerCards) < 17) {
            dealerCards.push(deck[dealerIdx]);
            dealerIdx++;
          }

          const playerTotal = calculateHandTotal(
            currentResult.playerCards as Card[]
          );
          const dealerTotal = calculateHandTotal(dealerCards);
          const dealerBusted = dealerTotal > 21;
          const playerWins = dealerBusted || playerTotal > dealerTotal;
          const push = !dealerBusted && playerTotal === dealerTotal;

          multiplier = playerWins ? 2 : push ? 1 : 0;
          payout = Math.floor(existingGame.bet_amount * multiplier);
          settled = true;

          newResult = {
            ...currentResult,
            dealerCards,
            dealerTotal,
            playerTotal,
            phase: "settled",
            dealerBusted,
            playerWins,
            push,
          };
        }
      } else if (
        action === "cashout" &&
        existingGame.game_type === "crash"
      ) {
        const cashoutMultiplier = (gameData.multiplier as number) || 1;
        multiplier = cashoutMultiplier;
        payout = Math.floor(existingGame.bet_amount * multiplier);
        settled = true;

        newResult = {
          ...currentResult,
          cashedOut: true,
          cashoutMultiplier,
          phase: "settled",
        };
      } else if (existingGame.game_type === "mines" && action === "pick") {
        const serverSeed = generateServerSeed();
        const newNonce = existingGame.nonce + 1;

        const { result: mineResult, multiplier: mineMult } =
          generateGameResult(
            "mines",
            serverSeed,
            existingGame.client_seed,
            newNonce,
            gameData
          );

        const mineResultObj = mineResult as Record<string, unknown>;
        settled = mineResultObj.hitMine as boolean;
        multiplier = settled ? 0 : mineMult;
        payout = settled
          ? 0
          : Math.floor(existingGame.bet_amount * multiplier);

        newResult = {
          ...currentResult,
          ...mineResultObj,
        };
      } else if (
        action === "cashout" &&
        existingGame.game_type === "mines"
      ) {
        multiplier = existingGame.multiplier || 1;
        payout = Math.floor(existingGame.bet_amount * multiplier);
        settled = true;

        newResult = {
          ...currentResult,
          cashedOut: true,
          phase: "settled",
        };
      }

      // ---- ATOMIC SETTLE via stored procedure ----
      if (settled) {
        const { data: newBalance, error: settleError } =
          await supabaseAdmin.rpc("settle_game", {
            p_game_id: body.gameId,
            p_player_id: user.id,
            p_result: newResult as unknown as Json,
            p_payout: payout,
            p_multiplier: multiplier,
          });

        if (settleError) {
          console.error("Error settling game:", settleError);
          return NextResponse.json(
            { error: "Failed to settle game" },
            { status: 500 }
          );
        }

        return NextResponse.json({
          gameId: body.gameId,
          result: newResult,
          payout,
          multiplier,
          balanceAfter: newBalance,
          settled: true,
        });
      }

      // Unsettled update (e.g. blackjack hit without bust)
      await supabaseAdmin
        .from("games")
        .update({
          result: newResult as unknown as Json,
          nonce: existingGame.nonce + 1,
        })
        .eq("id", body.gameId);

      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("balance")
        .eq("id", user.id)
        .single();

      return NextResponse.json({
        gameId: body.gameId,
        result: newResult,
        payout: 0,
        multiplier: 0,
        balanceAfter: profile?.balance ?? 0,
        settled: false,
      });
    }

    return NextResponse.json(
      { error: "Missing gameType or gameId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Game API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
