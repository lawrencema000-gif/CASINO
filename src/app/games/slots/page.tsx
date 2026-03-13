"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Info,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import { useGame } from "@/hooks/useGame";
import { SYMBOLS, spin as spinEngine, getPaylines } from "@/lib/games/slots";
import BetControls from "@/components/ui/BetControls";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Modal from "@/components/ui/Modal";
import { cn } from "@/components/ui/cn";
import Link from "next/link";

/* ─── types ─── */
type GamePhase = "idle" | "spinning" | "revealing" | "celebrating";

const PAYLINE_COLORS = [
  "text-yellow-400",
  "text-green-400",
  "text-blue-400",
  "text-pink-400",
  "text-purple-400",
];
const PAYLINE_LABELS = ["TOP", "MID", "BOT", "D1", "D2"];

/* helper: get symbol by id */
function getSymbol(id: string) {
  return SYMBOLS.find((s) => s.id === id) ?? SYMBOLS[SYMBOLS.length - 1];
}

/* ─── component ─── */
export default function SlotsPage() {
  const { user } = useAuth();
  const { balance: serverBalance, refreshBalance } = useBalance(user?.id);
  const { placeBet, loading } = useGame(() => refreshBalance());

  /* demo balance */
  const [demoBalance, setDemoBalance] = useState(10000);
  const balance = user ? serverBalance : demoBalance;

  /* game state */
  const [betAmount, setBetAmount] = useState(100);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [grid, setGrid] = useState<string[][]>(() =>
    Array.from({ length: 3 }, () =>
      Array.from({ length: 3 }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id)
    )
  );
  const [winResult, setWinResult] = useState<{
    paylines: { line: number; symbols: string[]; payout: number }[];
    totalPayout: number;
    isJackpot: boolean;
  } | null>(null);
  const [winningCells, setWinningCells] = useState<Set<string>>(new Set());
  const [showPaytable, setShowPaytable] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);
  const [autoSpinsLeft, setAutoSpinsLeft] = useState(0);
  const [showCoinShower, setShowCoinShower] = useState(false);

  /* spinning reel state: each reel has its own "spinning" flag */
  const [reelSpinning, setReelSpinning] = useState([false, false, false]);

  const autoSpinRef = useRef(false);
  autoSpinRef.current = autoSpin;

  /* ─── spin logic ─── */
  const doSpin = useCallback(async () => {
    if (phase !== "idle" || betAmount > balance) return;

    setPhase("spinning");
    setWinResult(null);
    setWinningCells(new Set());
    setShowCoinShower(false);
    setReelSpinning([true, true, true]);

    /* deduct bet */
    if (!user) {
      setDemoBalance((b) => b - betAmount);
    }

    /* compute result (client-side demo) */
    const rng = Math.random();
    const result = spinEngine(betAmount, rng);

    /* stagger reel stops */
    for (let reel = 0; reel < 3; reel++) {
      await new Promise((r) => setTimeout(r, 600 + reel * 400));
      setGrid((prev) => {
        const next = prev.map((col) => [...col]);
        next[reel] = result.reels[reel];
        return next;
      });
      setReelSpinning((prev) => {
        const next = [...prev];
        next[reel] = false;
        return next;
      });
    }

    /* reveal phase */
    setPhase("revealing");
    await new Promise((r) => setTimeout(r, 300));

    /* highlight winning cells */
    if (result.paylines.length > 0) {
      const cells = new Set<string>();
      const paylinesDef = getPaylines();
      for (const pl of result.paylines) {
        const line = paylinesDef[pl.line];
        line.forEach((row, reel) => cells.add(`${reel}-${row}`));
      }
      setWinningCells(cells);
      setWinResult({
        paylines: result.paylines,
        totalPayout: result.totalPayout,
        isJackpot: result.isJackpot,
      });

      /* add winnings */
      if (!user) {
        setDemoBalance((b) => b + result.totalPayout);
      }

      if (result.isJackpot || result.totalPayout >= betAmount * 10) {
        setShowCoinShower(true);
      }
      setPhase("celebrating");
      await new Promise((r) => setTimeout(r, 2000));
    }

    setPhase("idle");

    /* auto-spin */
    if (autoSpinRef.current) {
      setAutoSpinsLeft((prev) => {
        if (prev <= 1) {
          setAutoSpin(false);
          return 0;
        }
        return prev - 1;
      });
    }
  }, [phase, betAmount, balance, user]);

  /* auto-spin trigger */
  useEffect(() => {
    if (autoSpin && phase === "idle") {
      const t = setTimeout(() => doSpin(), 500);
      return () => clearTimeout(t);
    }
  }, [autoSpin, phase, doSpin]);

  /* coin particles */
  const coinParticles = showCoinShower
    ? Array.from({ length: 40 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 1.5 + Math.random() * 1.5,
      }))
    : [];

  /* spinning symbols strip for animation */
  const spinSymbols = SYMBOLS.map((s) => s.emoji);

  return (
    <div className="min-h-screen px-2 sm:px-4 py-6 relative overflow-hidden">
      {/* coin shower */}
      <AnimatePresence>
        {showCoinShower &&
          coinParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute text-2xl pointer-events-none z-50"
              initial={{ x: `${p.x}vw`, y: -30, opacity: 1 }}
              animate={{ y: "110vh", opacity: 0, rotate: 720 }}
              exit={{ opacity: 0 }}
              transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
            >
              {Math.random() > 0.5 ? "🪙" : "✨"}
            </motion.div>
          ))}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto space-y-5">
        {/* header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Lobby</span>
          </Link>
          <div className="text-right">
            <p className="text-xs text-gray-500">House Edge: 3.5%</p>
          </div>
        </div>

        <div className="text-center space-y-1">
          <motion.h1
            className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 bg-clip-text text-transparent"
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ repeat: Infinity, duration: 3 }}
          >
            MEGA SLOTS
          </motion.h1>
          <p className="text-gray-400 text-sm">
            Balance:{" "}
            <span className="text-[#00FF88] font-bold">
              ${balance.toLocaleString()}
            </span>
            {!user && (
              <span className="text-gray-600 ml-1">(Demo)</span>
            )}
          </p>
        </div>

        {/* slot machine */}
        <Card glow="gold" className="relative !p-4 md:!p-6">
          {/* payline indicators + reel grid */}
          <div className="flex justify-center gap-1 md:gap-2 mb-4">
            {/* payline labels on left */}
            <div className="flex flex-col justify-around py-1 mr-1">
              {PAYLINE_LABELS.map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded",
                    winResult?.paylines.some((p) => p.line === i)
                      ? `${PAYLINE_COLORS[i]} bg-white/10`
                      : "text-gray-600"
                  )}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* 3x3 reel grid */}
            {[0, 1, 2].map((reel) => (
              <div
                key={reel}
                className="flex flex-col gap-1.5 bg-black/50 rounded-xl p-1.5 md:p-2 border border-yellow-900/30 overflow-hidden"
              >
                {reelSpinning[reel]
                  ? /* spinning animation */
                    [0, 1, 2].map((row) => (
                      <div
                        key={row}
                        className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-3xl md:text-4xl rounded-lg bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 overflow-hidden"
                      >
                        <motion.div
                          className="flex flex-col items-center"
                          animate={{ y: [0, -spinSymbols.length * 64] }}
                          transition={{
                            repeat: Infinity,
                            duration: 0.2 + reel * 0.05,
                            ease: "linear",
                          }}
                        >
                          {[...spinSymbols, ...spinSymbols].map((s, i) => (
                            <span
                              key={i}
                              className="block h-16 md:h-20 leading-[4rem] md:leading-[5rem] blur-[1px]"
                            >
                              {s}
                            </span>
                          ))}
                        </motion.div>
                      </div>
                    ))
                  : /* stopped: final symbols */
                    [0, 1, 2].map((row) => {
                      const symbolId = grid[reel]?.[row] ?? "grape";
                      const sym = getSymbol(symbolId);
                      const cellKey = `${reel}-${row}`;
                      const isWin = winningCells.has(cellKey);

                      return (
                        <motion.div
                          key={row}
                          className={cn(
                            "w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-3xl md:text-4xl rounded-lg",
                            "bg-gradient-to-b from-[#1a1a25] to-[#0f0f18] border",
                            isWin
                              ? "border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.6)] bg-gradient-to-b from-yellow-900/30 to-yellow-950/30"
                              : "border-gray-700"
                          )}
                          initial={{ scale: 1.1, opacity: 0.8 }}
                          animate={{
                            scale: isWin ? [1, 1.1, 1] : 1,
                            opacity: 1,
                          }}
                          transition={{
                            repeat: isWin ? Infinity : 0,
                            duration: 0.6,
                          }}
                        >
                          {sym.emoji}
                        </motion.div>
                      );
                    })}
              </div>
            ))}
          </div>

          {/* win display */}
          <AnimatePresence>
            {winResult && winResult.totalPayout > 0 && phase === "celebrating" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="text-center mb-4 space-y-2"
              >
                {winResult.isJackpot && (
                  <motion.p
                    className="text-lg font-bold text-purple-400"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                  >
                    JACKPOT!!!
                  </motion.p>
                )}
                <motion.p
                  className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-200"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  WIN ${winResult.totalPayout.toLocaleString()}!
                </motion.p>
                <div className="flex flex-wrap justify-center gap-2">
                  {winResult.paylines.map((pl, i) => (
                    <span
                      key={i}
                      className={cn(
                        "text-xs px-2 py-1 rounded-full bg-white/5",
                        PAYLINE_COLORS[pl.line] ?? "text-white"
                      )}
                    >
                      {PAYLINE_LABELS[pl.line]}: ${pl.payout}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* controls */}
        <Card hover={false} className="!p-4">
          <BetControls
            balance={balance}
            betAmount={betAmount}
            onBetChange={setBetAmount}
            onPlay={doSpin}
            disabled={phase !== "idle" || loading}
            minBet={100}
            maxBet={Math.min(balance, 50000)}
            playLabel={
              phase === "spinning"
                ? "SPINNING..."
                : phase === "celebrating"
                ? "WIN!"
                : autoSpin
                ? `AUTO (${autoSpinsLeft})`
                : "SPIN"
            }
          />

          {/* action row */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Button
              variant={autoSpin ? "danger" : "ghost"}
              size="sm"
              onClick={() => {
                if (autoSpin) {
                  setAutoSpin(false);
                  setAutoSpinsLeft(0);
                } else {
                  setAutoSpinsLeft(10);
                  setAutoSpin(true);
                }
              }}
              icon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              {autoSpin ? "Stop Auto" : "Auto (10)"}
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
              {soundOn ? "Sound" : "Muted"}
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
      </div>

      {/* paytable modal */}
      <Modal
        open={showPaytable}
        onClose={() => setShowPaytable(false)}
        title="Paytable"
        size="lg"
      >
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-gray-400 mb-3">
            Match 3 symbols on any of 5 paylines (3 rows + 2 diagonals). Star is wild.
          </p>
          <div className="grid grid-cols-4 gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider pb-2 border-b border-gray-700">
            <span>Symbol</span>
            <span>Name</span>
            <span className="text-center">Multiplier</span>
            <span className="text-center">Weight</span>
          </div>
          {SYMBOLS.map((sym) => (
            <div
              key={sym.id}
              className="grid grid-cols-4 gap-2 items-center py-2 border-b border-gray-800"
            >
              <span className="text-2xl">{sym.emoji}</span>
              <span className="text-sm text-gray-300">{sym.name}</span>
              <span className="text-center text-yellow-400 font-semibold text-sm">
                {sym.multiplier > 0 ? `${sym.multiplier}x` : "Wild"}
              </span>
              <span className="text-center text-gray-500 text-sm">
                {sym.weight}
              </span>
            </div>
          ))}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-400">
              <Sparkles className="w-3 h-3 inline mr-1" />
              5 Paylines: Top Row, Middle Row, Bottom Row, Diagonal TL-BR, Diagonal BL-TR
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
