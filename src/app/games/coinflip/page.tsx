"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Flame, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import { useGame } from "@/hooks/useGame";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

type CoinSide = "heads" | "tails";

interface FlipHistory {
  choice: CoinSide;
  result: CoinSide;
  won: boolean;
  bet: number;
  payout: number;
}

const PAYOUT = 1.95;

export default function CoinFlipPage() {
  const { user } = useAuth();
  const { balance, refreshBalance } = useBalance(user?.id);
  const { placeBet, loading } = useGame(() => refreshBalance());

  const [choice, setChoice] = useState<CoinSide>("heads");
  const [betAmount, setBetAmount] = useState(100);
  const [flipping, setFlipping] = useState(false);
  const [coinResult, setCoinResult] = useState<CoinSide | null>(null);
  const [lastWon, setLastWon] = useState<boolean | null>(null);
  const [flipKey, setFlipKey] = useState(0);
  const [history, setHistory] = useState<FlipHistory[]>([]);
  const [winStreak, setWinStreak] = useState(0);
  const [showParticles, setShowParticles] = useState(false);

  const handleFlip = async () => {
    if (loading || flipping || betAmount <= 0 || betAmount > balance) return;

    setFlipping(true);
    setLastWon(null);
    setCoinResult(null);
    setShowParticles(false);
    setFlipKey((k) => k + 1);

    const result = await placeBet({
      gameType: "dice", // server maps this; coinflip uses dice type
      betAmount,
      action: "coinflip",
      gameData: { choice },
    });

    // Determine outcome
    const serverResult = result?.result as { side?: CoinSide; won?: boolean } | null;
    const finalSide: CoinSide = serverResult?.side ?? (Math.random() > 0.5 ? "heads" : "tails");
    const won = serverResult?.won ?? finalSide === choice;
    const payout = won ? betAmount * PAYOUT : 0;

    // Wait for flip animation
    await new Promise((r) => setTimeout(r, 1800));

    setCoinResult(finalSide);
    setLastWon(won);
    setFlipping(false);

    if (won) {
      setShowParticles(true);
      setWinStreak((s) => s + 1);
      setTimeout(() => setShowParticles(false), 2000);
    } else {
      setWinStreak(0);
    }

    setHistory((prev) => [{ choice, result: finalSide, won, bet: betAmount, payout }, ...prev].slice(0, 20));
    refreshBalance();
  };

  // Particle effect for wins
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 300,
    y: -(Math.random() * 200 + 50),
    rotation: Math.random() * 720 - 360,
    scale: Math.random() * 0.5 + 0.5,
    delay: Math.random() * 0.3,
  }));

  return (
    <div className="min-h-screen bg-[var(--casino-bg)] py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Coins className="w-8 h-8 text-[#c9a227]" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#c9a227] to-[#e6c84a] bg-clip-text text-transparent">
            Coin Flip
          </h1>
          <div className="ml-auto text-[#c9a227] font-semibold text-lg">
            {balance.toLocaleString()} credits
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Coin Display */}
            <Card glow={lastWon === true ? "gold" : "none"} className="relative overflow-hidden">
              <div className="flex flex-col items-center py-12 relative">
                {/* Win Particles */}
                <AnimatePresence>
                  {showParticles &&
                    particles.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                        animate={{
                          x: p.x,
                          y: p.y,
                          opacity: 0,
                          scale: p.scale,
                          rotate: p.rotation,
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.5, delay: p.delay, ease: "easeOut" }}
                        className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
                        style={{
                          background:
                            p.id % 3 === 0
                              ? "#c9a227"
                              : p.id % 3 === 1
                              ? "#e6c84a"
                              : "#00ff88",
                        }}
                      />
                    ))}
                </AnimatePresence>

                {/* The Coin */}
                <div className="perspective-[800px]" style={{ perspective: "800px" }}>
                  <motion.div
                    key={flipKey}
                    animate={
                      flipping
                        ? {
                            rotateY: [0, 1800],
                            scale: [1, 1.2, 1],
                          }
                        : lastWon === false
                        ? { x: [-8, 8, -6, 6, -4, 4, 0], rotateY: coinResult === "tails" ? 180 : 0 }
                        : { rotateY: coinResult === "tails" ? 180 : 0 }
                    }
                    transition={
                      flipping
                        ? { duration: 1.8, ease: [0.25, 0.1, 0.25, 1] }
                        : lastWon === false
                        ? { duration: 0.5, ease: "easeInOut" }
                        : { duration: 0.3 }
                    }
                    className="relative"
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Heads Face */}
                    <div
                      className={cn(
                        "w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center text-5xl md:text-6xl font-black",
                        "bg-gradient-to-br from-[#e6c84a] via-[#c9a227] to-[#a07d1a]",
                        "border-4 border-[#e6c84a]/60 shadow-[0_0_40px_rgba(201,162,39,0.3)]",
                        "select-none",
                        lastWon === true && !flipping && "shadow-[0_0_60px_rgba(201,162,39,0.6)]",
                        lastWon === false && !flipping && "opacity-60"
                      )}
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[#5a4410] drop-shadow-lg">H</span>
                        <span className="text-xs text-[#5a4410]/80 mt-1">HEADS</span>
                      </div>
                    </div>

                    {/* Tails Face */}
                    <div
                      className={cn(
                        "w-40 h-40 md:w-48 md:h-48 rounded-full flex items-center justify-center text-5xl md:text-6xl font-black absolute inset-0",
                        "bg-gradient-to-br from-[#9b59f0] via-[#6c2bd9] to-[#4a1a9e]",
                        "border-4 border-[#9b59f0]/60 shadow-[0_0_40px_rgba(108,43,217,0.3)]",
                        "select-none",
                        lastWon === true && !flipping && "shadow-[0_0_60px_rgba(108,43,217,0.6)]",
                        lastWon === false && !flipping && "opacity-60"
                      )}
                      style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[#e0d0f5] drop-shadow-lg">T</span>
                        <span className="text-xs text-[#e0d0f5]/80 mt-1">TAILS</span>
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Result Text */}
                <AnimatePresence>
                  {!flipping && lastWon !== null && (
                    <motion.div
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "mt-6 text-xl font-black",
                        lastWon ? "text-[#00ff88]" : "text-[#ff3b5c]"
                      )}
                    >
                      {lastWon
                        ? `+${(betAmount * (PAYOUT - 1)).toFixed(2)} WIN!`
                        : `LOST -${betAmount.toFixed(2)}`}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Payout Display */}
                <div className="mt-4 text-sm text-white/40">
                  Payout: <span className="text-[#c9a227] font-bold">{PAYOUT}x</span>
                </div>
              </div>
            </Card>

            {/* Choice + Bet Controls */}
            <Card>
              {/* Choose Side */}
              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setChoice("heads")}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-black text-lg transition-all border-2",
                    choice === "heads"
                      ? "bg-gradient-to-br from-[#e6c84a]/20 to-[#c9a227]/10 border-[#c9a227] text-[#e6c84a] shadow-[0_0_20px_rgba(201,162,39,0.2)]"
                      : "bg-[#1a1a2e] border-white/10 text-white/40 hover:border-white/20"
                  )}
                >
                  <div className="text-3xl mb-1">H</div>
                  HEADS
                </button>
                <button
                  onClick={() => setChoice("tails")}
                  className={cn(
                    "flex-1 py-4 rounded-xl font-black text-lg transition-all border-2",
                    choice === "tails"
                      ? "bg-gradient-to-br from-[#9b59f0]/20 to-[#6c2bd9]/10 border-[#9b59f0] text-[#9b59f0] shadow-[0_0_20px_rgba(155,89,240,0.2)]"
                      : "bg-[#1a1a2e] border-white/10 text-white/40 hover:border-white/20"
                  )}
                >
                  <div className="text-3xl mb-1">T</div>
                  TAILS
                </button>
              </div>

              {/* Bet Input */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold
                      focus:outline-none focus:border-[#c9a227] focus:shadow-[0_0_10px_rgba(201,162,39,0.2)] transition-all"
                    placeholder="Bet amount"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBetAmount(Math.max(1, Math.floor(betAmount / 2)))}
                    className="px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-[#c9a227] transition-all font-bold text-sm"
                  >
                    1/2x
                  </button>
                  <button
                    onClick={() => setBetAmount(Math.min(balance, betAmount * 2))}
                    className="px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-[#c9a227] transition-all font-bold text-sm"
                  >
                    2x
                  </button>
                  <button
                    onClick={() => setBetAmount(balance)}
                    className="px-4 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-[#ff3b5c] transition-all font-bold text-sm"
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* FLIP Button */}
              <Button
                variant="primary"
                size="lg"
                className="w-full text-xl py-5 font-black tracking-wide"
                onClick={handleFlip}
                loading={loading || flipping}
                disabled={betAmount <= 0 || betAmount > balance}
              >
                {flipping ? "FLIPPING..." : "FLIP COIN"}
              </Button>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Win Streak */}
            {winStreak > 0 && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <Card glow="gold">
                  <div className="flex items-center gap-3">
                    <Flame className="w-8 h-8 text-[#ff6b35]" />
                    <div>
                      <div className="text-xs text-white/40 uppercase tracking-wider">Win Streak</div>
                      <div className="text-3xl font-black text-[#e6c84a]">{winStreak}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )}

            {/* History */}
            <Card>
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">Last 20 Flips</h3>
              <div className="flex flex-wrap gap-2">
                {history.length === 0 && <span className="text-white/30 text-sm">No flips yet</span>}
                {history.map((h, i) => (
                  <motion.div
                    key={`${i}-${h.result}`}
                    initial={{ scale: 0, rotateY: 180 }}
                    animate={{ scale: 1, rotateY: 0 }}
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center text-xs font-black border-2",
                      h.won
                        ? h.result === "heads"
                          ? "bg-[#c9a227]/20 text-[#e6c84a] border-[#c9a227]/40"
                          : "bg-[#6c2bd9]/20 text-[#9b59f0] border-[#6c2bd9]/40"
                        : "bg-[#ff3b5c]/10 text-[#ff3b5c]/60 border-[#ff3b5c]/20"
                    )}
                  >
                    {h.result === "heads" ? "H" : "T"}
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Game Info */}
            <Card>
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">How to Play</h3>
              <ul className="text-white/40 text-sm space-y-2">
                <li>1. Pick Heads or Tails</li>
                <li>2. Enter your bet</li>
                <li>3. Hit FLIP</li>
                <li>4. Win {PAYOUT}x your bet!</li>
              </ul>
              <div className="mt-3 text-xs text-white/20">50/50 chance | {PAYOUT}x payout</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
