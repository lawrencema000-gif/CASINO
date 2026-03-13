"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import {
  createDeck,
  dealInitial,
  hit,
  canSplit,
  canDoubleDown,
  split,
  doubleDown,
  playDealerHand,
  settleHands,
  type HandOutcome,
} from "@/lib/games/blackjack";
import type { BlackjackCard, BlackjackHand } from "@/lib/types";
import BetControls from "@/components/ui/BetControls";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import Link from "next/link";

/* ─── card image helpers ─── */
function getCardImage(card: { suit: string; rank: string }): string {
  const suitMap: Record<string, number> = { 'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4 }
  const rankMap: Record<string, number> = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2 }
  const s = suitMap[card.suit] || 1
  const r = rankMap[card.rank] || 2
  return `/images/cards/${s}_${r}.png`
}
const CARD_BACK = '/images/cards/0_0.png'

/* ─── types ─── */
type GamePhase = "betting" | "dealing" | "playing" | "dealer" | "settled";

/* ─── playing card component ─── */
function PlayingCard({
  card,
  faceDown = false,
  index = 0,
  animated = true,
}: {
  card: BlackjackCard;
  faceDown?: boolean;
  index?: number;
  animated?: boolean;
}) {
  const [hasDealt, setHasDealt] = useState(false);

  return (
    <motion.div
      initial={animated ? { x: 200, y: -100, opacity: 0 } : false}
      animate={{ x: 0, y: 0, opacity: 1 }}
      transition={{ delay: index * 0.15, duration: 0.4, type: "spring" }}
      onAnimationComplete={() => setHasDealt(true)}
      className="flex-shrink-0"
      style={{ perspective: "800px" }}
    >
      <motion.div
        initial={{ rotateY: 180 }}
        animate={{ rotateY: faceDown ? 180 : 0 }}
        transition={{ duration: 0.5, delay: animated && !hasDealt ? index * 0.15 + 0.3 : 0 }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative w-[69px] h-[93px] md:w-20 md:h-28"
      >
        {/* Front face */}
        <div
          className="absolute inset-0 rounded-lg shadow-lg border border-gray-700 overflow-hidden"
          style={{ backfaceVisibility: "hidden" }}
        >
          <img
            src={getCardImage(card)}
            alt={`${card.rank} of ${card.suit}`}
            className="w-full h-full object-cover"
            style={{ imageRendering: "auto" }}
            draggable={false}
          />
        </div>
        {/* Back face */}
        <div
          className="absolute inset-0 rounded-lg shadow-lg border border-gray-700 overflow-hidden"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <img
            src={CARD_BACK}
            alt="Card back"
            className="w-full h-full object-cover"
            style={{ imageRendering: "auto" }}
            draggable={false}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── hand value badge ─── */
function HandValue({ hand, label }: { hand: BlackjackHand | null; label: string }) {
  if (!hand) return null;
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-500 uppercase">{label}</span>}
      <span
        className={cn(
          "px-2 py-0.5 rounded-full text-sm font-bold",
          hand.isBust
            ? "bg-red-500/20 text-red-400"
            : hand.isBlackjack
            ? "bg-yellow-500/20 text-yellow-400"
            : "bg-white/10 text-white"
        )}
      >
        {hand.value}
        {hand.isSoft && !hand.isBlackjack && " (soft)"}
        {hand.isBlackjack && " BJ!"}
      </span>
    </div>
  );
}

/* ─── chip stack visual ─── */
function ChipStack({ amount }: { amount: number }) {
  const chips = Math.min(Math.ceil(amount / 500), 8);
  return (
    <div className="flex flex-col-reverse items-center">
      {Array.from({ length: chips }, (_, i) => (
        <div
          key={i}
          className="w-8 h-2 rounded-full bg-gradient-to-r from-red-700 via-red-500 to-red-700 border border-red-400/50 shadow"
          style={{ marginTop: i === 0 ? 0 : -2 }}
        />
      ))}
      <span className="text-xs text-yellow-400 font-bold mt-1">${amount}</span>
    </div>
  );
}

/* ─── main component ─── */
export default function BlackjackPage() {
  const { user } = useAuth();
  const { balance: serverBalance, refreshBalance } = useBalance(user?.id);

  /* demo balance */
  const [demoBalance, setDemoBalance] = useState(10000);
  const balance = user ? serverBalance : demoBalance;
  const adjustBalance = useCallback(
    (delta: number) => {
      if (!user) setDemoBalance((b) => b + delta);
    },
    [user]
  );

  /* game state */
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [betAmount, setBetAmount] = useState(100);
  const [playerHands, setPlayerHands] = useState<BlackjackHand[]>([]);
  const [dealerHand, setDealerHand] = useState<BlackjackHand | null>(null);
  const [activeHandIdx, setActiveHandIdx] = useState(0);
  const [bets, setBets] = useState<number[]>([]);
  const [outcomes, setOutcomes] = useState<HandOutcome[]>([]);
  const [payouts, setPayouts] = useState<number[]>([]);
  const [showDealerHole, setShowDealerHole] = useState(false);
  const [showInsurance, setShowInsurance] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [cardsInShoe, setCardsInShoe] = useState(312);

  const deckRef = useRef<BlackjackCard[]>([]);

  /* outcome labels */
  const outcomeLabels: Record<HandOutcome, { text: string; color: string }> = {
    blackjack: { text: "BLACKJACK! 3:2", color: "text-yellow-400" },
    win: { text: "YOU WIN!", color: "text-[#00FF88]" },
    push: { text: "PUSH", color: "text-gray-400" },
    lose: { text: "DEALER WINS", color: "text-red-400" },
  };

  /* deal */
  const handleDeal = useCallback(async () => {
    let currentDeck = deckRef.current;
    if (currentDeck.length < 52) {
      currentDeck = createDeck(6);
    }

    adjustBalance(-betAmount);

    const { playerHand, dealerHand: dHand, deck: remaining } = dealInitial(currentDeck);
    deckRef.current = remaining;
    setCardsInShoe(remaining.length);
    setPlayerHands([playerHand]);
    setDealerHand(dHand);
    setBets([betAmount]);
    setOutcomes([]);
    setPayouts([]);
    setActiveHandIdx(0);
    setShowDealerHole(false);
    setShowInsurance(false);

    setPhase("dealing");
    await new Promise((r) => setTimeout(r, 800));

    /* check insurance */
    if (dHand.cards[0].rank === "A") {
      setShowInsurance(true);
    }

    /* check natural blackjack */
    if (playerHand.isBlackjack || dHand.isBlackjack) {
      setShowDealerHole(true);
      setShowInsurance(false);
      const { outcomes: o, payouts: p } = settleHands([playerHand], dHand, [betAmount]);
      setOutcomes(o);
      setPayouts(p);
      adjustBalance(p[0]);
      setPhase("settled");
      return;
    }

    setPhase("playing");
  }, [betAmount, adjustBalance]);

  /* run dealer turn - declared before player actions that reference it */
  const runDealerTurn = useCallback(
    async (finalPlayerHands: BlackjackHand[], currentBets: number[]) => {
      setPhase("dealer");
      setShowDealerHole(true);
      setShowInsurance(false);
      await new Promise((r) => setTimeout(r, 500));

      const allBusted = finalPlayerHands.every((h) => h.isBust);
      let finalDealerHand = dealerHand!;

      if (!allBusted) {
        const { hand: dh, deck: remaining } = playDealerHand(dealerHand!, deckRef.current);
        deckRef.current = remaining;
        setCardsInShoe(remaining.length);
        finalDealerHand = dh;
        setDealerHand(dh);
        await new Promise((r) => setTimeout(r, 500));
      }

      const { outcomes: o, payouts: p } = settleHands(finalPlayerHands, finalDealerHand, currentBets);
      setOutcomes(o);
      setPayouts(p);

      const totalPayout = p.reduce((a, b) => a + b, 0);
      adjustBalance(totalPayout);
      setPhase("settled");
    },
    [dealerHand, adjustBalance]
  );

  /* player actions */
  const handleHit = useCallback(() => {
    if (phase !== "playing") return;
    const currentHand = playerHands[activeHandIdx];
    const { hand: newHand, deck: remaining } = hit(currentHand, deckRef.current);
    deckRef.current = remaining;
    setCardsInShoe(remaining.length);

    const newHands = [...playerHands];
    newHands[activeHandIdx] = newHand;
    setPlayerHands(newHands);

    if (newHand.isBust || newHand.value === 21) {
      if (activeHandIdx < newHands.length - 1) {
        setActiveHandIdx(activeHandIdx + 1);
      } else {
        runDealerTurn(newHands, bets);
      }
    }
  }, [phase, playerHands, activeHandIdx, bets, runDealerTurn]);

  const handleStand = useCallback(() => {
    if (phase !== "playing") return;
    if (activeHandIdx < playerHands.length - 1) {
      setActiveHandIdx(activeHandIdx + 1);
    } else {
      runDealerTurn(playerHands, bets);
    }
  }, [phase, playerHands, activeHandIdx, bets, runDealerTurn]);

  const handleDouble = useCallback(() => {
    if (phase !== "playing") return;
    const currentHand = playerHands[activeHandIdx];
    if (!canDoubleDown(currentHand)) return;

    adjustBalance(-bets[activeHandIdx]);
    const newBets = [...bets];
    newBets[activeHandIdx] = newBets[activeHandIdx] * 2;
    setBets(newBets);

    const { hand: newHand, deck: remaining } = doubleDown(currentHand, deckRef.current, bets[activeHandIdx]);
    deckRef.current = remaining;
    setCardsInShoe(remaining.length);

    const newHands = [...playerHands];
    newHands[activeHandIdx] = newHand;
    setPlayerHands(newHands);

    if (activeHandIdx < newHands.length - 1) {
      setActiveHandIdx(activeHandIdx + 1);
    } else {
      runDealerTurn(newHands, newBets);
    }
  }, [phase, playerHands, activeHandIdx, bets, adjustBalance, runDealerTurn]);

  const handleSplit = useCallback(() => {
    if (phase !== "playing") return;
    const currentHand = playerHands[activeHandIdx];
    if (!canSplit(currentHand)) return;

    adjustBalance(-bets[activeHandIdx]);

    const { hands: [h1, h2], deck: remaining } = split(currentHand, deckRef.current);
    deckRef.current = remaining;
    setCardsInShoe(remaining.length);

    const newHands = [...playerHands];
    newHands.splice(activeHandIdx, 1, h1, h2);
    setPlayerHands(newHands);

    const newBets = [...bets];
    const bet = newBets[activeHandIdx];
    newBets.splice(activeHandIdx, 1, bet, bet);
    setBets(newBets);
  }, [phase, playerHands, activeHandIdx, bets, adjustBalance]);

  /* new round */
  const newRound = useCallback(() => {
    setPhase("betting");
    setPlayerHands([]);
    setDealerHand(null);
    setOutcomes([]);
    setPayouts([]);
    setShowDealerHole(false);
  }, []);

  const activeHand = playerHands[activeHandIdx];

  return (
    <div className="min-h-screen px-2 sm:px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {/* header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Lobby</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-600 bg-gray-800/50 px-2 py-1 rounded">
              Shoe: {cardsInShoe} cards
            </span>
            <span className="text-xs text-gray-500">House Edge: 0.5%</span>
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
            BLACKJACK
          </h1>
          <p className="text-gray-400 text-sm">
            Balance:{" "}
            <span className="text-[#00FF88] font-bold">${balance.toLocaleString()}</span>
            {!user && <span className="text-gray-600 ml-1">(Demo)</span>}
          </p>
        </div>

        {/* table */}
        <div className="relative rounded-3xl overflow-hidden border border-emerald-800/50">
          <div
            className="bg-gradient-to-b from-emerald-900 via-emerald-950 to-emerald-900 p-4 md:p-8 min-h-[420px] flex flex-col justify-between"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"), linear-gradient(to bottom, rgb(6 78 59), rgb(6 58 39), rgb(6 78 59))`,
            }}
          >
            {/* dealer area */}
            <div className="space-y-2">
              <HandValue hand={showDealerHole ? dealerHand : dealerHand ? { ...dealerHand, value: dealerHand.cards[0].value, isSoft: false, isBust: false, isBlackjack: false, cards: [dealerHand.cards[0]] } : null} label="Dealer" />
              <div className="flex gap-2 flex-wrap min-h-[112px] items-center">
                {dealerHand?.cards.map((card, i) => (
                  <PlayingCard
                    key={`d-${i}-${card.rank}-${card.suit}`}
                    card={card}
                    faceDown={i === 1 && !showDealerHole}
                    index={i}
                  />
                ))}
                {!dealerHand && (
                  <div className="text-gray-600 text-sm italic">Waiting for deal...</div>
                )}
              </div>
            </div>

            {/* outcome overlay */}
            <AnimatePresence>
              {phase === "settled" && outcomes.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-4 gap-2"
                >
                  {outcomes.map((outcome, i) => {
                    const { text, color } = outcomeLabels[outcome];
                    return (
                      <motion.div
                        key={i}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.2 }}
                        className="text-center"
                      >
                        <p className={cn("text-2xl md:text-4xl font-black", color)}>
                          {text}
                        </p>
                        {payouts[i] > 0 && (
                          <p className="text-[#00FF88] font-bold text-lg">
                            +${payouts[i].toLocaleString()}
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {/* insurance prompt */}
            <AnimatePresence>
              {showInsurance && phase === "playing" && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-3 py-2"
                >
                  <span className="text-yellow-400 text-sm font-bold">Insurance?</span>
                  <button
                    onClick={() => setShowInsurance(false)}
                    className="px-3 py-1 text-xs bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-400 hover:bg-yellow-500/30 transition-colors cursor-pointer"
                  >
                    No Thanks
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* player area */}
            <div className="space-y-2">
              {playerHands.map((hand, hIdx) => (
                <div key={hIdx} className="space-y-1">
                  {playerHands.length > 1 && (
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded",
                        hIdx === activeHandIdx && phase === "playing"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "text-gray-500"
                      )}
                    >
                      Hand {hIdx + 1}
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="flex gap-2 flex-wrap">
                      {hand.cards.map((card, cIdx) => (
                        <PlayingCard key={`p-${hIdx}-${cIdx}-${card.rank}-${card.suit}`} card={card} index={cIdx} />
                      ))}
                    </div>
                    <HandValue hand={hand} label="" />
                  </div>
                </div>
              ))}
              {playerHands.length === 0 && (
                <div className="flex gap-2 min-h-[112px] items-center">
                  <div className="text-gray-600 text-sm italic">Place your bet to start</div>
                </div>
              )}
            </div>
          </div>

          {/* chip stack overlay */}
          {bets.length > 0 && (
            <div className="absolute bottom-4 right-4">
              <ChipStack amount={bets.reduce((a, b) => a + b, 0)} />
            </div>
          )}
        </div>

        {/* action buttons */}
        {phase === "playing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap justify-center gap-2"
          >
            <Button variant="primary" size="md" onClick={handleHit}>
              HIT
            </Button>
            <Button variant="ghost" size="md" onClick={handleStand}>
              STAND
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={handleDouble}
              disabled={!activeHand || !canDoubleDown(activeHand) || bets[activeHandIdx] > balance}
            >
              DOUBLE
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={handleSplit}
              disabled={!activeHand || !canSplit(activeHand) || bets[activeHandIdx] > balance}
            >
              SPLIT
            </Button>
          </motion.div>
        )}

        {/* settled: new round button */}
        {phase === "settled" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center"
          >
            <Button variant="success" size="lg" onClick={newRound} icon={<RotateCcw className="w-4 h-4" />}>
              NEW HAND
            </Button>
          </motion.div>
        )}

        {/* bet controls (betting phase only) */}
        {phase === "betting" && (
          <Card hover={false} className="!p-4">
            <BetControls
              balance={balance}
              betAmount={betAmount}
              onBetChange={setBetAmount}
              onPlay={handleDeal}
              disabled={false}
              minBet={100}
              maxBet={Math.min(balance, 50000)}
              playLabel="DEAL"
            />
          </Card>
        )}

        {/* sound toggle */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundOn((p) => !p)}
            icon={soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          >
            {soundOn ? "Sound On" : "Muted"}
          </Button>
        </div>
      </div>
    </div>
  );
}
