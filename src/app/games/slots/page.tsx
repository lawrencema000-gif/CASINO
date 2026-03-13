"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  Minus,
  Plus,
  RotateCcw,
  Trophy,
  Info,
} from "lucide-react";
import { useGame } from "@/hooks/useGame";
import { useBalance } from "@/hooks/useBalance";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { cn } from "@/components/ui/cn";

/* ─── constants ─── */
const SYMBOLS = ["🍒", "🍋", "🍊", "🍑", "🔔", "💎", "7️⃣", "⭐", "🎰"];
const REEL_COUNT = 5;
const ROW_COUNT = 3;
const PAYLINE_OPTIONS = [1, 5, 10, 20];

const PAYTABLE: Record<string, { name: string; x3: number; x4: number; x5: number }> = {
  "🎰": { name: "Jackpot", x3: 50, x4: 200, x5: 1000 },
  "7️⃣": { name: "Lucky 7", x3: 30, x4: 100, x5: 500 },
  "⭐": { name: "Star", x3: 20, x4: 75, x5: 300 },
  "💎": { name: "Diamond", x3: 15, x4: 50, x5: 200 },
  "🔔": { name: "Bell", x3: 10, x4: 30, x5: 100 },
  "🍑": { name: "Peach", x3: 8, x4: 20, x5: 60 },
  "🍊": { name: "Orange", x3: 5, x4: 15, x5: 40 },
  "🍋": { name: "Lemon", x3: 3, x4: 10, x5: 25 },
  "🍒": { name: "Cherry", x3: 2, x4: 5, x5: 15 },
};

/* ─── helpers ─── */
function randomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function generateGrid(): string[][] {
  return Array.from({ length: REEL_COUNT }, () =>
    Array.from({ length: ROW_COUNT }, () => randomSymbol())
  );
}

function generateReelStrip(length: number): string[] {
  return Array.from({ length }, () => randomSymbol());
}

/* ─── component ─── */
export default function SlotsPage() {
  const { user } = useAuth();
  const { balance, refreshBalance } = useBalance(user?.id);
  const { placeBet, status, loading, error } = useGame((newBal) => {
    refreshBalance();
  });

  const [grid, setGrid] = useState<string[][]>(generateGrid);
  const [betAmount, setBetAmount] = useState(10);
  const [paylines, setPaylines] = useState(1);
  const [spinning, setSpinning] = useState(false);
  const [reelsStopped, setReelsStopped] = useState<boolean[]>(
    Array(REEL_COUNT).fill(true)
  );
  const [winAmount, setWinAmount] = useState(0);
  const [lastWin, setLastWin] = useState(0);
  const [totalBet, setTotalBet] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [showPaytable, setShowPaytable] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [winningCells, setWinningCells] = useState<Set<string>>(new Set());
  const [showCoinShower, setShowCoinShower] = useState(false);

  /* reel animation strips (for blur scroll effect) */
  const [reelStrips, setReelStrips] = useState<string[][]>(
    Array.from({ length: REEL_COUNT }, () => generateReelStrip(20))
  );

  const autoSpinRef = useRef(false);
  autoSpinRef.current = autoSpin;

  /* ─── spin logic ─── */
  const spin = useCallback(async () => {
    if (spinning || loading) return;
    const totalCost = betAmount * paylines;
    if (totalCost > balance) return;

    setSpinning(true);
    setWinAmount(0);
    setWinningCells(new Set());
    setShowCoinShower(false);
    setReelsStopped(Array(REEL_COUNT).fill(false));
    setReelStrips(
      Array.from({ length: REEL_COUNT }, () => generateReelStrip(20))
    );

    const result = await placeBet({
      gameType: "slots",
      betAmount: totalCost,
      gameData: { paylines, betPerLine: betAmount },
    });

    /* stop reels left-to-right with delays */
    const finalGrid = result?.result
      ? (result.result as { grid: string[][] }).grid ?? generateGrid()
      : generateGrid();

    for (let i = 0; i < REEL_COUNT; i++) {
      await new Promise((r) => setTimeout(r, 300 + i * 250));
      setGrid((prev) => {
        const next = [...prev];
        next[i] = finalGrid[i] ?? Array.from({ length: ROW_COUNT }, () => randomSymbol());
        return next;
      });
      setReelsStopped((prev) => {
        const next = [...prev];
        next[i] = true;
        return next;
      });
    }

    const payout = result?.payout ?? 0;
    const winLines =
      (result?.result as { winningCells?: string[] })?.winningCells ?? [];

    setTotalBet((p) => p + totalCost);
    if (payout > 0) {
      setWinAmount(payout);
      setLastWin(payout);
      setTotalWon((p) => p + payout);
      setWinningCells(new Set(winLines));
      if (payout >= totalCost * 5) setShowCoinShower(true);
    }

    setSpinning(false);

    /* auto-spin continuation */
    if (autoSpinRef.current) {
      setTimeout(() => {
        if (autoSpinRef.current) spin();
      }, 800);
    }
  }, [spinning, loading, betAmount, paylines, balance, placeBet]);

  /* auto-spin toggle */
  useEffect(() => {
    if (autoSpin && !spinning) spin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpin]);

  /* coin particles */
  const coinParticles = showCoinShower
    ? Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 1.2 + Math.random() * 1,
      }))
    : [];

  return (
    <div className="min-h-screen bg-[var(--casino-bg)] px-4 py-8 relative overflow-hidden">
      {/* coin shower */}
      <AnimatePresence>
        {showCoinShower &&
          coinParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute text-2xl pointer-events-none z-50"
              initial={{ x: `${p.x}vw`, y: -30, opacity: 1 }}
              animate={{ y: "110vh", opacity: 0, rotate: 360 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: "easeIn",
              }}
            >
              🪙
            </motion.div>
          ))}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* header */}
        <div className="text-center space-y-2">
          <motion.h1
            className="text-4xl md:text-5xl font-black bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            🎰 MEGA SLOTS
          </motion.h1>
          <p className="text-[var(--casino-text-muted)] text-sm">
            Balance:{" "}
            <span className="text-green-400 font-bold">
              ${balance.toLocaleString()}
            </span>
          </p>
        </div>

        {/* error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-red-500/20 border border-red-500/50 text-red-300 rounded-xl px-4 py-3 text-sm text-center"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* slot machine */}
        <Card glow="gold" className="relative">
          {/* reel grid */}
          <div className="flex justify-center gap-2 md:gap-3 mb-6">
            {Array.from({ length: REEL_COUNT }, (_, col) => (
              <div
                key={col}
                className="flex flex-col gap-2 bg-black/40 rounded-xl p-2 border border-yellow-900/30 overflow-hidden"
              >
                {reelsStopped[col]
                  ? /* stopped: show final symbols */
                    (grid[col] ?? []).map((sym, row) => {
                      const cellKey = `${col}-${row}`;
                      const isWin = winningCells.has(cellKey);
                      return (
                        <motion.div
                          key={row}
                          className={cn(
                            "w-14 h-14 md:w-20 md:h-20 flex items-center justify-center text-3xl md:text-5xl rounded-lg",
                            "bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700",
                            isWin &&
                              "border-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.6)] bg-gradient-to-b from-yellow-900/30 to-yellow-950/30"
                          )}
                          initial={{ scale: 1.1 }}
                          animate={{
                            scale: isWin ? [1, 1.15, 1] : 1,
                          }}
                          transition={{
                            repeat: isWin ? Infinity : 0,
                            duration: 0.6,
                          }}
                        >
                          {sym}
                        </motion.div>
                      );
                    })
                  : /* spinning: blur scroll effect */
                    Array.from({ length: ROW_COUNT }, (_, row) => (
                      <motion.div
                        key={row}
                        className="w-14 h-14 md:w-20 md:h-20 flex items-center justify-center text-3xl md:text-5xl rounded-lg bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 overflow-hidden"
                      >
                        <motion.div
                          className="flex flex-col items-center"
                          animate={{ y: [0, -600] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.15,
                            ease: "linear",
                          }}
                        >
                          {reelStrips[col]?.slice(0, 8).map((s, i) => (
                            <span
                              key={i}
                              className="block h-14 md:h-20 leading-[3.5rem] md:leading-[5rem] blur-[1px]"
                            >
                              {s}
                            </span>
                          ))}
                        </motion.div>
                      </motion.div>
                    ))}
              </div>
            ))}
          </div>

          {/* win display */}
          <AnimatePresence>
            {winAmount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center mb-4"
              >
                <motion.p
                  className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  🏆 WIN ${winAmount.toLocaleString()}! 🏆
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* controls row */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            {/* bet amount */}
            <div className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2 border border-gray-700">
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Bet
              </span>
              <button
                onClick={() => setBetAmount((p) => Math.max(1, p - 5))}
                disabled={spinning}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-40"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-16 text-center text-lg font-bold text-yellow-400">
                ${betAmount}
              </span>
              <button
                onClick={() => setBetAmount((p) => Math.min(1000, p + 5))}
                disabled={spinning}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-40"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* paylines */}
            <div className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2 border border-gray-700">
              <span className="text-xs text-gray-400 uppercase tracking-wider">
                Lines
              </span>
              {PAYLINE_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setPaylines(n)}
                  disabled={spinning}
                  className={cn(
                    "w-9 h-7 rounded-lg text-xs font-bold transition-all",
                    paylines === n
                      ? "bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                      : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* total cost display */}
          <p className="text-center text-sm text-gray-400 mt-2">
            Total bet:{" "}
            <span className="text-yellow-400 font-semibold">
              ${(betAmount * paylines).toLocaleString()}
            </span>
          </p>

          {/* spin button */}
          <div className="flex justify-center mt-4">
            <motion.button
              onClick={spin}
              disabled={spinning || loading || betAmount * paylines > balance}
              className={cn(
                "relative px-12 py-4 rounded-2xl text-2xl font-black uppercase tracking-widest transition-all",
                "bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 text-black",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                !spinning &&
                  "hover:shadow-[0_0_40px_rgba(234,179,8,0.5)] cursor-pointer"
              )}
              animate={
                !spinning
                  ? {
                      boxShadow: [
                        "0 0 15px rgba(234,179,8,0.3)",
                        "0 0 30px rgba(234,179,8,0.6)",
                        "0 0 15px rgba(234,179,8,0.3)",
                      ],
                    }
                  : {}
              }
              transition={{ repeat: Infinity, duration: 1.5 }}
              whileTap={{ scale: 0.95 }}
            >
              {spinning ? "SPINNING..." : "🎰 SPIN"}
            </motion.button>
          </div>

          {/* action row */}
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <Button
              variant={autoSpin ? "danger" : "ghost"}
              size="sm"
              onClick={() => setAutoSpin((p) => !p)}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              {autoSpin ? "Stop Auto" : "Auto Spin"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundOn((p) => !p)}
              icon={
                soundOn ? (
                  <Volume2 className="w-3.5 h-3.5" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5" />
                )
              }
            >
              {soundOn ? "Sound On" : "Sound Off"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPaytable(true)}
              icon={<Info className="w-3.5 h-3.5" />}
            >
              Paytable
            </Button>
          </div>
        </Card>

        {/* stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Bet", value: totalBet, color: "text-red-400" },
            { label: "Total Won", value: totalWon, color: "text-green-400" },
            { label: "Last Win", value: lastWin, color: "text-yellow-400" },
          ].map((s) => (
            <Card key={s.label} hover={false} className="text-center !p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500">
                {s.label}
              </p>
              <p className={cn("text-lg font-bold", s.color)}>
                ${s.value.toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      </div>

      {/* paytable modal */}
      <Modal
        open={showPaytable}
        onClose={() => setShowPaytable(false)}
        title="Paytable"
        size="lg"
      >
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-5 gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider pb-2 border-b border-gray-700">
            <span>Symbol</span>
            <span>Name</span>
            <span className="text-center">x3</span>
            <span className="text-center">x4</span>
            <span className="text-center">x5</span>
          </div>
          {Object.entries(PAYTABLE).map(([sym, info]) => (
            <div
              key={sym}
              className="grid grid-cols-5 gap-2 items-center py-2 border-b border-gray-800"
            >
              <span className="text-2xl">{sym}</span>
              <span className="text-sm text-gray-300">{info.name}</span>
              <span className="text-center text-yellow-400 font-semibold text-sm">
                {info.x3}x
              </span>
              <span className="text-center text-yellow-400 font-semibold text-sm">
                {info.x4}x
              </span>
              <span className="text-center text-yellow-400 font-semibold text-sm">
                {info.x5}x
              </span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
