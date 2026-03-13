"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, History } from "lucide-react";
import { useGame } from "@/hooks/useGame";
import { useBalance } from "@/hooks/useBalance";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

/* ─── types ─── */
interface PlayingCard {
  suit: "♠" | "♥" | "♦" | "♣";
  value: string;
  hidden?: boolean;
}

type GamePhase = "betting" | "playing" | "dealer" | "result";
type ResultType = "win" | "lose" | "push" | "blackjack" | null;

interface HandRecord {
  playerScore: number;
  dealerScore: number;
  result: ResultType;
  bet: number;
  payout: number;
}

/* ─── constants ─── */
const SUITS: PlayingCard["suit"][] = ["♠", "♥", "♦", "♣"];
const VALUES = [
  "A",
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
];
const CHIP_VALUES = [10, 25, 50, 100, 500];

/* ─── helpers ─── */
function randomCard(hidden = false): PlayingCard {
  return {
    suit: SUITS[Math.floor(Math.random() * 4)],
    value: VALUES[Math.floor(Math.random() * 13)],
    hidden,
  };
}

function cardScore(cards: PlayingCard[]): number {
  let score = 0;
  let aces = 0;
  for (const c of cards) {
    if (c.hidden) continue;
    if (c.value === "A") {
      aces++;
      score += 11;
    } else if (["K", "Q", "J"].includes(c.value)) {
      score += 10;
    } else {
      score += parseInt(c.value);
    }
  }
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }
  return score;
}

function isRed(suit: string) {
  return suit === "♥" || suit === "♦";
}

/* ─── PlayingCardDisplay ─── */
function CardDisplay({
  card,
  index,
  flipping,
}: {
  card: PlayingCard;
  index: number;
  flipping?: boolean;
}) {
  const faceDown = card.hidden;
  const red = isRed(card.suit);

  return (
    <motion.div
      className="relative"
      initial={{ x: 200, y: -100, opacity: 0, rotateY: 0 }}
      animate={{
        x: 0,
        y: 0,
        opacity: 1,
        rotateY: flipping ? [0, 90, 0] : 0,
      }}
      transition={{
        x: { duration: 0.4, delay: index * 0.15 },
        y: { duration: 0.4, delay: index * 0.15 },
        opacity: { duration: 0.2, delay: index * 0.15 },
        rotateY: { duration: 0.6 },
      }}
      style={{ perspective: 600 }}
    >
      <div
        className={cn(
          "w-16 h-24 md:w-20 md:h-28 rounded-xl border-2 flex flex-col items-center justify-center select-none",
          "shadow-lg transition-all duration-300",
          faceDown
            ? "bg-gradient-to-br from-purple-800 via-purple-900 to-indigo-900 border-purple-600"
            : "bg-gradient-to-br from-white to-gray-100 border-gray-300"
        )}
      >
        {faceDown ? (
          <div className="w-10 h-16 md:w-12 md:h-20 rounded-lg border border-purple-500/50 bg-purple-700/30 flex items-center justify-center">
            <span className="text-purple-400 text-lg">?</span>
          </div>
        ) : (
          <>
            <span
              className={cn(
                "text-xs md:text-sm font-bold absolute top-1 left-2",
                red ? "text-red-600" : "text-gray-900"
              )}
            >
              {card.value}
            </span>
            <span
              className={cn(
                "text-2xl md:text-3xl",
                red ? "text-red-600" : "text-gray-900"
              )}
            >
              {card.suit}
            </span>
            <span
              className={cn(
                "text-xs md:text-sm font-bold absolute bottom-1 right-2 rotate-180",
                red ? "text-red-600" : "text-gray-900"
              )}
            >
              {card.value}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ─── main component ─── */
export default function BlackjackPage() {
  const { user } = useAuth();
  const { balance, refreshBalance } = useBalance(user?.id);
  const game = useGame(() => refreshBalance());

  const [phase, setPhase] = useState<GamePhase>("betting");
  const [betAmount, setBetAmount] = useState(0);
  const [playerCards, setPlayerCards] = useState<PlayingCard[]>([]);
  const [dealerCards, setDealerCards] = useState<PlayingCard[]>([]);
  const [resultType, setResultType] = useState<ResultType>(null);
  const [resultPayout, setResultPayout] = useState(0);
  const [flipDealer, setFlipDealer] = useState(false);
  const [handHistory, setHandHistory] = useState<HandRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const playerScore = cardScore(playerCards);
  const dealerScore = cardScore(dealerCards);

  /* ─── deal ─── */
  const deal = useCallback(async () => {
    if (betAmount <= 0 || betAmount > balance) return;

    const result = await game.placeBet({
      gameType: "blackjack",
      betAmount,
      action: "deal",
    });

    if (!result) return;

    const data = result.result as {
      playerCards?: PlayingCard[];
      dealerCards?: PlayingCard[];
    } | null;

    const pCards = data?.playerCards ?? [randomCard(), randomCard()];
    const dCards = data?.dealerCards ?? [randomCard(), randomCard(true)];

    setPlayerCards(pCards);
    setDealerCards(dCards);
    setResultType(null);
    setFlipDealer(false);
    setPhase("playing");

    /* check for instant blackjack */
    if (cardScore(pCards) === 21) {
      setTimeout(() => resolveGame(pCards, dCards, "blackjack"), 800);
    }
  }, [betAmount, balance, game]);

  /* ─── hit ─── */
  const hit = useCallback(async () => {
    const result = await game.gameAction("hit");
    const newCard =
      (result?.result as { card?: PlayingCard } | null)?.card ?? randomCard();
    const newHand = [...playerCards, newCard];
    setPlayerCards(newHand);

    if (cardScore(newHand) > 21) {
      setTimeout(() => resolveGame(newHand, dealerCards, "lose"), 600);
    }
  }, [playerCards, dealerCards, game]);

  /* ─── stand ─── */
  const stand = useCallback(async () => {
    setPhase("dealer");

    /* reveal dealer hidden card */
    const revealed = dealerCards.map((c) => ({ ...c, hidden: false }));
    setDealerCards(revealed);
    setFlipDealer(true);

    const result = await game.gameAction("stand");
    const data = result?.result as {
      dealerCards?: PlayingCard[];
      outcome?: string;
    } | null;

    const finalDealer =
      data?.dealerCards?.map((c) => ({ ...c, hidden: false })) ?? revealed;

    /* animate dealer drawing */
    let current = [...revealed];
    for (let i = revealed.length; i < finalDealer.length; i++) {
      await new Promise((r) => setTimeout(r, 500));
      current = [...current, finalDealer[i]];
      setDealerCards([...current]);
    }

    await new Promise((r) => setTimeout(r, 400));

    const outcome =
      data?.outcome ??
      determineOutcome(
        cardScore(playerCards),
        cardScore(current)
      );

    resolveGame(playerCards, current, outcome as ResultType);
  }, [dealerCards, playerCards, game]);

  /* ─── double down ─── */
  const doubleDown = useCallback(async () => {
    if (betAmount > balance) return;

    const result = await game.gameAction("double", {
      additionalBet: betAmount,
    });
    const data = result?.result as {
      card?: PlayingCard;
      dealerCards?: PlayingCard[];
      outcome?: string;
    } | null;

    const newCard = data?.card ?? randomCard();
    const newHand = [...playerCards, newCard];
    setPlayerCards(newHand);
    setBetAmount((p) => p * 2);

    if (cardScore(newHand) > 21) {
      setTimeout(() => resolveGame(newHand, dealerCards, "lose"), 600);
      return;
    }

    /* auto-stand after double */
    setTimeout(() => {
      setPhase("dealer");
      const revealed = dealerCards.map((c) => ({ ...c, hidden: false }));
      setDealerCards(revealed);
      setFlipDealer(true);

      const finalDealer =
        data?.dealerCards?.map((c) => ({ ...c, hidden: false })) ?? revealed;
      setTimeout(() => {
        setDealerCards(finalDealer);
        const outcome =
          data?.outcome ??
          determineOutcome(cardScore(newHand), cardScore(finalDealer));
        resolveGame(newHand, finalDealer, outcome as ResultType);
      }, 800);
    }, 600);
  }, [betAmount, balance, playerCards, dealerCards, game]);

  /* ─── resolve ─── */
  function resolveGame(
    pCards: PlayingCard[],
    dCards: PlayingCard[],
    outcome: ResultType
  ) {
    const revealedDealer = dCards.map((c) => ({ ...c, hidden: false }));
    setDealerCards(revealedDealer);
    setFlipDealer(true);
    setResultType(outcome);
    setPhase("result");

    const pScore = cardScore(pCards);
    const dScore = cardScore(revealedDealer);
    let payout = 0;
    if (outcome === "blackjack") payout = Math.floor(betAmount * 2.5);
    else if (outcome === "win") payout = betAmount * 2;
    else if (outcome === "push") payout = betAmount;
    setResultPayout(payout);

    setHandHistory((prev) =>
      [
        {
          playerScore: pScore,
          dealerScore: dScore,
          result: outcome,
          bet: betAmount,
          payout,
        },
        ...prev,
      ].slice(0, 10)
    );
  }

  function determineOutcome(pScore: number, dScore: number): string {
    if (pScore > 21) return "lose";
    if (dScore > 21) return "win";
    if (pScore > dScore) return "win";
    if (pScore < dScore) return "lose";
    return "push";
  }

  /* ─── new game ─── */
  function newGame() {
    setPhase("betting");
    setBetAmount(0);
    setPlayerCards([]);
    setDealerCards([]);
    setResultType(null);
    setFlipDealer(false);
    setResultPayout(0);
    game.resetGame();
  }

  /* ─── result styles ─── */
  const resultConfig: Record<
    string,
    { text: string; color: string; bg: string }
  > = {
    blackjack: {
      text: "BLACKJACK!",
      color: "text-yellow-300",
      bg: "from-yellow-500/20 to-amber-600/20",
    },
    win: {
      text: "YOU WIN!",
      color: "text-green-400",
      bg: "from-green-500/20 to-emerald-600/20",
    },
    lose: {
      text: "DEALER WINS",
      color: "text-red-400",
      bg: "from-red-500/20 to-rose-600/20",
    },
    push: {
      text: "PUSH",
      color: "text-blue-400",
      bg: "from-blue-500/20 to-cyan-600/20",
    },
  };

  return (
    <div className="min-h-screen bg-[var(--casino-bg)] px-4 py-6">
      <div className="max-w-5xl mx-auto flex gap-4">
        {/* main table area */}
        <div className="flex-1 space-y-4">
          {/* header */}
          <div className="text-center space-y-1">
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-green-400 via-emerald-300 to-green-500 bg-clip-text text-transparent">
              ♠ BLACKJACK ♠
            </h1>
            <p className="text-[var(--casino-text-muted)] text-sm">
              Balance:{" "}
              <span className="text-green-400 font-bold">
                ${balance.toLocaleString()}
              </span>
              {betAmount > 0 && (
                <span className="ml-3 text-yellow-400">
                  Bet: ${betAmount.toLocaleString()}
                </span>
              )}
            </p>
          </div>

          {/* error */}
          <AnimatePresence>
            {game.error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl px-4 py-3 text-sm text-center"
              >
                {game.error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* felt table */}
          <div
            className="relative rounded-3xl overflow-hidden border-4 border-yellow-900/50 shadow-2xl"
            style={{
              background:
                "radial-gradient(ellipse at center, #1a5c2e 0%, #0d3b1a 50%, #072210 100%)",
              minHeight: "420px",
            }}
          >
            {/* table pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div
                className="w-full h-full"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(255,255,255,0.02) 35px, rgba(255,255,255,0.02) 70px)",
                }}
              />
            </div>

            <div className="relative p-4 md:p-8 flex flex-col justify-between min-h-[420px]">
              {/* dealer section */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-widest text-green-300/60 font-semibold">
                    Dealer
                  </span>
                  {dealerCards.length > 0 && (
                    <motion.span
                      className="bg-black/40 px-3 py-0.5 rounded-full text-sm font-bold text-white"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {dealerScore}
                    </motion.span>
                  )}
                </div>
                <div className="flex gap-3 min-h-[112px] items-end">
                  <AnimatePresence>
                    {dealerCards.map((card, i) => (
                      <CardDisplay
                        key={`d-${i}-${card.value}-${card.suit}`}
                        card={card}
                        index={i}
                        flipping={flipDealer && i === 0}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* center - result overlay */}
              <AnimatePresence>
                {resultType && resultConfig[resultType] && (
                  <motion.div
                    className={cn(
                      "absolute inset-0 flex flex-col items-center justify-center z-20",
                      "bg-gradient-to-b",
                      resultConfig[resultType].bg,
                      "backdrop-blur-[2px]"
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <motion.h2
                      className={cn(
                        "text-4xl md:text-6xl font-black",
                        resultConfig[resultType].color
                      )}
                      initial={{ scale: 0.3, rotateZ: -10 }}
                      animate={{ scale: 1, rotateZ: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        damping: 15,
                      }}
                    >
                      {resultConfig[resultType].text}
                    </motion.h2>
                    {resultPayout > 0 && (
                      <motion.p
                        className="text-xl text-yellow-400 font-bold mt-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                      >
                        +${resultPayout.toLocaleString()}
                      </motion.p>
                    )}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="mt-4"
                    >
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={newGame}
                        icon={<RotateCcw className="w-4 h-4" />}
                      >
                        New Hand
                      </Button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* player section */}
              <div className="space-y-3">
                <div className="flex gap-3 min-h-[112px] items-start">
                  <AnimatePresence>
                    {playerCards.map((card, i) => (
                      <CardDisplay
                        key={`p-${i}-${card.value}-${card.suit}`}
                        card={card}
                        index={i}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-widest text-green-300/60 font-semibold">
                    Player
                  </span>
                  {playerCards.length > 0 && (
                    <motion.span
                      className={cn(
                        "bg-black/40 px-3 py-0.5 rounded-full text-sm font-bold",
                        playerScore > 21
                          ? "text-red-400"
                          : playerScore === 21
                          ? "text-yellow-400"
                          : "text-white"
                      )}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {playerScore}
                      {playerScore > 21 && " BUST"}
                    </motion.span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* controls */}
          <Card hover={false} className="!p-4">
            {phase === "betting" && (
              <div className="space-y-4">
                <p className="text-center text-sm text-gray-400 uppercase tracking-wider">
                  Place Your Bet
                </p>
                <div className="flex justify-center gap-3 flex-wrap">
                  {CHIP_VALUES.map((val) => (
                    <motion.button
                      key={val}
                      onClick={() =>
                        setBetAmount((p) => Math.min(balance, p + val))
                      }
                      disabled={val > balance - betAmount}
                      className={cn(
                        "w-14 h-14 md:w-16 md:h-16 rounded-full font-bold text-sm border-4 transition-all cursor-pointer",
                        "disabled:opacity-30 disabled:cursor-not-allowed",
                        val <= 25
                          ? "bg-gradient-to-b from-green-500 to-green-700 border-green-400 text-white hover:shadow-[0_0_15px_rgba(34,197,94,0.5)]"
                          : val <= 100
                          ? "bg-gradient-to-b from-blue-500 to-blue-700 border-blue-400 text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                          : "bg-gradient-to-b from-purple-500 to-purple-700 border-purple-400 text-white hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]"
                      )}
                      whileHover={{ scale: 1.1, y: -4 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      ${val}
                    </motion.button>
                  ))}
                </div>
                {betAmount > 0 && (
                  <motion.div
                    className="text-center space-y-3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <p className="text-2xl font-black text-yellow-400">
                      ${betAmount.toLocaleString()}
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button variant="ghost" size="sm" onClick={() => setBetAmount(0)}>
                        Clear
                      </Button>
                      <Button
                        variant="primary"
                        size="lg"
                        loading={game.loading}
                        onClick={deal}
                      >
                        DEAL
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {phase === "playing" && (
              <div className="flex justify-center gap-3 flex-wrap">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={hit}
                  loading={game.loading}
                >
                  HIT
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={stand}
                  loading={game.loading}
                >
                  STAND
                </Button>
                {playerCards.length === 2 && betAmount <= balance && (
                  <Button
                    variant="success"
                    size="lg"
                    onClick={doubleDown}
                    loading={game.loading}
                  >
                    DOUBLE DOWN
                  </Button>
                )}
              </div>
            )}

            {phase === "dealer" && (
              <div className="text-center">
                <motion.p
                  className="text-lg text-yellow-400 font-semibold"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1 }}
                >
                  Dealer is playing...
                </motion.p>
              </div>
            )}
          </Card>
        </div>

        {/* hand history sidebar */}
        <div className="hidden lg:block w-56">
          <Card hover={false} className="sticky top-6">
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-yellow-400" />
              <h3 className="text-sm font-bold text-yellow-400 uppercase tracking-wider">
                History
              </h3>
            </div>
            {handHistory.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-4">
                No hands played yet
              </p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {handHistory.map((h, i) => (
                  <div
                    key={i}
                    className={cn(
                      "text-xs p-2 rounded-lg border",
                      h.result === "win" || h.result === "blackjack"
                        ? "bg-green-500/10 border-green-500/30"
                        : h.result === "lose"
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-blue-500/10 border-blue-500/30"
                    )}
                  >
                    <div className="flex justify-between">
                      <span
                        className={cn(
                          "font-bold uppercase",
                          h.result === "win" || h.result === "blackjack"
                            ? "text-green-400"
                            : h.result === "lose"
                            ? "text-red-400"
                            : "text-blue-400"
                        )}
                      >
                        {h.result}
                      </span>
                      <span className="text-gray-400">${h.bet}</span>
                    </div>
                    <div className="text-gray-500 mt-0.5">
                      P:{h.playerScore} vs D:{h.dealerScore}
                    </div>
                    {h.payout > 0 && (
                      <div className="text-green-400 font-semibold">
                        +${h.payout}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* mobile history toggle */}
        <button
          onClick={() => setShowHistory((p) => !p)}
          className="lg:hidden fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full bg-yellow-500 text-black flex items-center justify-center shadow-lg"
        >
          <History className="w-5 h-5" />
        </button>

        {/* mobile history drawer */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 bg-[var(--casino-card)] border-t border-[var(--casino-border)] rounded-t-2xl p-4 max-h-[50vh] overflow-y-auto"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-yellow-400 uppercase">
                  Hand History
                </h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="text-gray-400 text-sm"
                >
                  Close
                </button>
              </div>
              {handHistory.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No hands played yet
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {handHistory.map((h, i) => (
                    <div
                      key={i}
                      className={cn(
                        "text-xs p-2 rounded-lg border",
                        h.result === "win" || h.result === "blackjack"
                          ? "bg-green-500/10 border-green-500/30"
                          : h.result === "lose"
                          ? "bg-red-500/10 border-red-500/30"
                          : "bg-blue-500/10 border-blue-500/30"
                      )}
                    >
                      <span
                        className={cn(
                          "font-bold uppercase",
                          h.result === "win" || h.result === "blackjack"
                            ? "text-green-400"
                            : h.result === "lose"
                            ? "text-red-400"
                            : "text-blue-400"
                        )}
                      >
                        {h.result}
                      </span>
                      <span className="text-gray-400 ml-2">${h.bet}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
