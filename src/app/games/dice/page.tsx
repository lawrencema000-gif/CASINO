"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dices, TrendingUp, TrendingDown, RotateCcw, Volume2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import { useGame } from "@/hooks/useGame";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

interface RollHistory {
  roll: number;
  target: number;
  mode: "under" | "over";
  won: boolean;
  bet: number;
  payout: number;
}

const HOUSE_EDGE = 0.02;

export default function DicePage() {
  const { user } = useAuth();
  const { balance, refreshBalance } = useBalance(user?.id);
  const { placeBet, loading } = useGame((newBal) => refreshBalance());

  const [target, setTarget] = useState(50);
  const [mode, setMode] = useState<"under" | "over">("under");
  const [betAmount, setBetAmount] = useState(100);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [lastWon, setLastWon] = useState<boolean | null>(null);
  const [rolling, setRolling] = useState(false);
  const [history, setHistory] = useState<RollHistory[]>([]);
  const [stats, setStats] = useState({ profit: 0, wins: 0, total: 0 });
  const rollDisplayRef = useRef<number | null>(null);
  const animFrameRef = useRef<number>(0);

  const winChance = mode === "under" ? target : 100 - target;
  const multiplier = winChance > 0 ? parseFloat(((100 * (1 - HOUSE_EDGE)) / winChance).toFixed(4)) : 0;
  const profitOnWin = parseFloat((betAmount * (multiplier - 1)).toFixed(2));

  const animateRoll = useCallback(
    (finalValue: number, callback: () => void) => {
      setRolling(true);
      const duration = 1200;
      const start = performance.now();

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);

        if (progress < 1) {
          const randomVal = parseFloat((Math.random() * 100).toFixed(2));
          setRollResult(randomVal);
          animFrameRef.current = requestAnimationFrame(tick);
        } else {
          setRollResult(finalValue);
          setRolling(false);
          callback();
        }
      };

      animFrameRef.current = requestAnimationFrame(tick);
    },
    []
  );

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handleRoll = async () => {
    if (loading || rolling || betAmount <= 0 || betAmount > balance) return;

    const result = await placeBet({
      gameType: "dice",
      betAmount,
      gameData: { target, mode },
    });

    if (!result) return;

    const serverResult = result.result as { roll: number; won: boolean };
    const finalRoll = serverResult?.roll ?? parseFloat((Math.random() * 100).toFixed(2));
    const won = serverResult?.won ?? (mode === "under" ? finalRoll < target : finalRoll > target);
    const payout = won ? betAmount * multiplier : 0;

    animateRoll(finalRoll, () => {
      setLastWon(won);

      const entry: RollHistory = { roll: finalRoll, target, mode, won, bet: betAmount, payout };
      setHistory((prev) => [entry, ...prev].slice(0, 20));
      setStats((prev) => ({
        profit: prev.profit + (won ? payout - betAmount : -betAmount),
        wins: prev.wins + (won ? 1 : 0),
        total: prev.total + 1,
      }));

      refreshBalance();
    });
  };

  return (
    <div className="min-h-screen bg-[var(--casino-bg)] py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Dices className="w-8 h-8 text-[#00ff88]" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00ff88] to-[#00cc6a] bg-clip-text text-transparent">
            Dice
          </h1>
          <div className="ml-auto text-[#c9a227] font-semibold text-lg">
            {balance.toLocaleString()} credits
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Roll Result Display */}
            <Card glow={lastWon === true ? "green" : lastWon === false ? "gold" : "none"} className="relative overflow-hidden">
              <div className="flex flex-col items-center py-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={rollResult ?? "idle"}
                    initial={{ scale: 0.3, opacity: 0, rotateZ: -180 }}
                    animate={{
                      scale: 1,
                      opacity: 1,
                      rotateZ: 0,
                    }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className={cn(
                      "text-7xl md:text-8xl font-black tabular-nums",
                      rolling && "text-white/60",
                      !rolling && lastWon === true && "text-[#00ff88]",
                      !rolling && lastWon === false && "text-[#ff3b5c]",
                      !rolling && lastWon === null && "text-white/40"
                    )}
                  >
                    {rollResult !== null ? rollResult.toFixed(2) : "??"}
                  </motion.div>
                </AnimatePresence>

                {!rolling && lastWon !== null && (
                  <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={cn(
                      "mt-3 text-lg font-bold",
                      lastWon ? "text-[#00ff88]" : "text-[#ff3b5c]"
                    )}
                  >
                    {lastWon ? `+${profitOnWin.toFixed(2)} WIN!` : `LOST`}
                  </motion.div>
                )}
              </div>

              {/* Result Bar */}
              <div className="mt-4 relative h-8 rounded-full overflow-hidden bg-[#1a1a2e]">
                {/* Win Zone */}
                {mode === "under" ? (
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00ff88]/30 to-[#00ff88]/10 border-r-2 border-[#00ff88]"
                    style={{ width: `${target}%` }}
                  />
                ) : (
                  <div
                    className="absolute inset-y-0 right-0 bg-gradient-to-l from-[#00ff88]/30 to-[#00ff88]/10 border-l-2 border-[#00ff88]"
                    style={{ width: `${100 - target}%` }}
                  />
                )}

                {/* Lose Zone */}
                {mode === "under" ? (
                  <div
                    className="absolute inset-y-0 right-0 bg-gradient-to-l from-[#ff3b5c]/30 to-[#ff3b5c]/10"
                    style={{ width: `${100 - target}%` }}
                  />
                ) : (
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff3b5c]/30 to-[#ff3b5c]/10"
                    style={{ width: `${target}%` }}
                  />
                )}

                {/* Target Marker */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-[#c9a227] z-10"
                  style={{ left: `${target}%` }}
                />

                {/* Roll Marker */}
                {rollResult !== null && !rolling && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full z-20 border-2",
                      lastWon ? "bg-[#00ff88] border-[#00ff88]" : "bg-[#ff3b5c] border-[#ff3b5c]"
                    )}
                    style={{ left: `calc(${rollResult}% - 8px)` }}
                  />
                )}

                {/* Scale Labels */}
                <div className="absolute inset-x-0 bottom-0 flex justify-between px-2 text-[10px] text-white/40">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>
            </Card>

            {/* Slider and Controls */}
            <Card>
              {/* Mode Toggle */}
              <div className="flex items-center justify-center gap-3 mb-6">
                <button
                  onClick={() => setMode("under")}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
                    mode === "under"
                      ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/50 shadow-[0_0_15px_rgba(0,255,136,0.2)]"
                      : "bg-[#1a1a2e] text-white/50 border border-white/10 hover:border-white/20"
                  )}
                >
                  <TrendingDown className="w-5 h-5" /> Roll Under
                </button>
                <button
                  onClick={() => setMode("over")}
                  className={cn(
                    "flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all",
                    mode === "over"
                      ? "bg-[#6c2bd9]/20 text-[#9b59f0] border border-[#9b59f0]/50 shadow-[0_0_15px_rgba(155,89,240,0.2)]"
                      : "bg-[#1a1a2e] text-white/50 border border-white/10 hover:border-white/20"
                  )}
                >
                  <TrendingUp className="w-5 h-5" /> Roll Over
                </button>
              </div>

              {/* Slider */}
              <div className="relative mb-6">
                <input
                  type="range"
                  min={2}
                  max={98}
                  value={target}
                  onChange={(e) => setTarget(parseInt(e.target.value))}
                  className="w-full h-3 rounded-full appearance-none cursor-pointer bg-[#1a1a2e]
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c9a227]
                    [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(201,162,39,0.5)] [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#e6c84a]"
                />
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-white/40">2</span>
                  <span className="text-[#c9a227] font-bold text-lg">{target}</span>
                  <span className="text-white/40">98</span>
                </div>
              </div>

              {/* Win Chance / Multiplier / Profit */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-[#1a1a2e] rounded-xl p-4 text-center border border-white/5">
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Win Chance</div>
                  <div className="text-2xl font-bold text-[#00ff88]">{winChance.toFixed(1)}%</div>
                </div>
                <div className="bg-[#1a1a2e] rounded-xl p-4 text-center border border-white/5">
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Multiplier</div>
                  <div className="text-2xl font-bold text-[#c9a227]">{multiplier}x</div>
                </div>
                <div className="bg-[#1a1a2e] rounded-xl p-4 text-center border border-white/5">
                  <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Profit on Win</div>
                  <div className="text-2xl font-bold text-[#9b59f0]">{profitOnWin.toFixed(2)}</div>
                </div>
              </div>

              {/* Bet Input */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="flex-1 relative">
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

              {/* ROLL Button */}
              <Button
                variant="success"
                size="lg"
                className="w-full text-xl py-5 font-black tracking-wide"
                onClick={handleRoll}
                loading={loading || rolling}
                disabled={betAmount <= 0 || betAmount > balance}
              >
                {rolling ? "ROLLING..." : "ROLL DICE"}
              </Button>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Roll History */}
            <Card>
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">Last 20 Rolls</h3>
              <div className="flex flex-wrap gap-2">
                {history.length === 0 && <span className="text-white/30 text-sm">No rolls yet</span>}
                {history.map((h, i) => (
                  <motion.div
                    key={`${i}-${h.roll}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      h.won
                        ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40"
                        : "bg-[#ff3b5c]/20 text-[#ff3b5c] border border-[#ff3b5c]/40"
                    )}
                    title={`${h.roll.toFixed(2)} (${h.mode} ${h.target})`}
                  >
                    {h.roll.toFixed(0)}
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Stats */}
            <Card>
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">Total Bets</span>
                  <span className="text-white font-bold">{stats.total}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">Win Rate</span>
                  <span className="text-white font-bold">
                    {stats.total > 0 ? ((stats.wins / stats.total) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">Profit</span>
                  <span
                    className={cn(
                      "font-bold",
                      stats.profit > 0 ? "text-[#00ff88]" : stats.profit < 0 ? "text-[#ff3b5c]" : "text-white/50"
                    )}
                  >
                    {stats.profit >= 0 ? "+" : ""}
                    {stats.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/50 text-sm">Wins / Losses</span>
                  <span className="font-bold">
                    <span className="text-[#00ff88]">{stats.wins}</span>
                    <span className="text-white/30"> / </span>
                    <span className="text-[#ff3b5c]">{stats.total - stats.wins}</span>
                  </span>
                </div>
              </div>
            </Card>

            {/* Game Info */}
            <Card>
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">How to Play</h3>
              <ul className="text-white/40 text-sm space-y-2">
                <li>1. Set your target number (2-98)</li>
                <li>2. Choose Roll Under or Roll Over</li>
                <li>3. Enter your bet amount</li>
                <li>4. Hit ROLL and hope for the best!</li>
              </ul>
              <div className="mt-3 text-xs text-white/20">House edge: {(HOUSE_EDGE * 100).toFixed(0)}%</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
