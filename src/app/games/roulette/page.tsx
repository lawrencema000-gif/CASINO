"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, RotateCcw, Trash2, Volume2, VolumeX } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import {
  ROULETTE_NUMBERS,
  spin as spinWheel,
  calculateBetPayout,
  type RouletteNumber,
} from "@/lib/games/roulette";
import type { RouletteBet } from "@/lib/types";
import BetControls from "@/components/ui/BetControls";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";
import Link from "next/link";

/* ─── wheel layout (European) ─── */
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

function getNumberColor(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

function colorClass(color: "red" | "black" | "green") {
  if (color === "red") return "bg-red-600";
  if (color === "black") return "bg-gray-900";
  return "bg-emerald-600";
}

function colorBorder(color: "red" | "black" | "green") {
  if (color === "red") return "border-red-500";
  if (color === "black") return "border-gray-600";
  return "border-emerald-500";
}

/* ─── types ─── */
type GamePhase = "betting" | "spinning" | "result";

interface PlacedBet {
  id: string;
  type: string;
  value: string | number;
  amount: number;
  label: string;
}

/* ─── main component ─── */
export default function RoulettePage() {
  const { user } = useAuth();
  const { balance: serverBalance, refreshBalance } = useBalance(user?.id);

  const [demoBalance, setDemoBalance] = useState(10000);
  const balance = user ? serverBalance : demoBalance;

  const [phase, setPhase] = useState<GamePhase>("betting");
  const [chipValue, setChipValue] = useState(100);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [result, setResult] = useState<RouletteNumber | null>(null);
  const [winningBetIds, setWinningBetIds] = useState<Set<string>>(new Set());
  const [totalWin, setTotalWin] = useState(0);
  const [history, setHistory] = useState<RouletteNumber[]>([]);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [soundOn, setSoundOn] = useState(true);

  const totalBet = useMemo(
    () => placedBets.reduce((sum, b) => sum + b.amount, 0),
    [placedBets]
  );

  /* place a bet */
  const placeBet = useCallback(
    (type: string, value: string | number, label: string) => {
      if (phase !== "betting") return;
      if (chipValue > balance - totalBet) return;

      /* stack on existing bet of same type+value */
      setPlacedBets((prev) => {
        const existing = prev.find((b) => b.type === type && String(b.value) === String(value));
        if (existing) {
          return prev.map((b) =>
            b.id === existing.id ? { ...b, amount: b.amount + chipValue } : b
          );
        }
        return [
          ...prev,
          {
            id: `${type}-${value}-${Date.now()}`,
            type,
            value,
            amount: chipValue,
            label,
          },
        ];
      });
    },
    [phase, chipValue, balance, totalBet]
  );

  const clearBets = useCallback(() => {
    if (phase !== "betting") return;
    setPlacedBets([]);
  }, [phase]);

  /* spin */
  const handleSpin = useCallback(async () => {
    if (phase !== "betting" || placedBets.length === 0) return;

    /* deduct total bet */
    if (!user) setDemoBalance((b) => b - totalBet);

    setPhase("spinning");
    setResult(null);
    setWinningBetIds(new Set());
    setTotalWin(0);

    /* animate wheel */
    const rng = Math.random();
    const winNumber = spinWheel(rng);
    const winIdx = WHEEL_ORDER.indexOf(winNumber.number);
    const slotAngle = (winIdx / 37) * 360;
    const spins = 5 + Math.random() * 3;
    const finalRotation = wheelRotation + spins * 360;
    const finalBall = -(spins * 360 + slotAngle + 180);

    setWheelRotation(finalRotation);
    setBallAngle(finalBall);

    /* wait for animation */
    await new Promise((r) => setTimeout(r, 4000));

    setResult(winNumber);
    setHistory((prev) => [winNumber, ...prev.slice(0, 9)]);

    /* calculate payouts */
    let winTotal = 0;
    const winIds = new Set<string>();

    for (const bet of placedBets) {
      const rBet: RouletteBet = {
        type: bet.type,
        value: bet.value,
        amount: bet.amount,
        payout: 0,
      };
      const payout = calculateBetPayout(rBet, winNumber);
      if (payout > 0) {
        winTotal += payout;
        winIds.add(bet.id);
      }
    }

    setWinningBetIds(winIds);
    setTotalWin(winTotal);

    if (!user && winTotal > 0) {
      setDemoBalance((b) => b + winTotal);
    }

    setPhase("result");
  }, [phase, placedBets, totalBet, user, wheelRotation]);

  /* new round */
  const newRound = useCallback(() => {
    setPhase("betting");
    setResult(null);
    setWinningBetIds(new Set());
    setTotalWin(0);
    setPlacedBets([]);
  }, []);

  /* board numbers: 3 columns, 12 rows */
  const boardRows = useMemo(() => {
    const rows: number[][] = [];
    for (let row = 0; row < 12; row++) {
      rows.push([row * 3 + 1, row * 3 + 2, row * 3 + 3]);
    }
    return rows;
  }, []);

  /* chip denominations */
  const chipDenoms = [100, 500, 1000, 5000];

  return (
    <div className="min-h-screen px-2 sm:px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Lobby</span>
          </Link>
          <span className="text-xs text-gray-500">House Edge: 2.7%</span>
        </div>

        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-red-400 via-yellow-400 to-red-400 bg-clip-text text-transparent">
            ROULETTE
          </h1>
          <p className="text-gray-400 text-sm">
            Balance:{" "}
            <span className="text-[#00FF88] font-bold">${balance.toLocaleString()}</span>
            {!user && <span className="text-gray-600 ml-1">(Demo)</span>}
          </p>
        </div>

        {/* wheel */}
        <Card hover={false} className="!p-4 relative overflow-hidden">
          <div className="flex justify-center">
            <div className="relative w-48 h-48 md:w-64 md:h-64">
              {/* wheel */}
              <motion.div
                className="w-full h-full rounded-full border-4 border-yellow-600 bg-gradient-to-br from-green-900 to-green-950 relative overflow-hidden"
                animate={{ rotate: wheelRotation }}
                transition={
                  phase === "spinning"
                    ? { duration: 4, ease: [0.15, 0.85, 0.35, 1] }
                    : { duration: 0 }
                }
              >
                {WHEEL_ORDER.map((num, i) => {
                  const angle = (i / 37) * 360;
                  const color = getNumberColor(num);
                  return (
                    <div
                      key={num}
                      className="absolute w-full h-full"
                      style={{ transform: `rotate(${angle}deg)` }}
                    >
                      <div
                        className={cn(
                          "absolute top-0 left-1/2 -translate-x-1/2 w-5 md:w-6 h-8 md:h-10 flex items-start justify-center pt-0.5 text-[8px] md:text-[10px] font-bold text-white",
                          color === "red" ? "text-red-300" : color === "green" ? "text-emerald-300" : "text-gray-300"
                        )}
                      >
                        {num}
                      </div>
                    </div>
                  );
                })}
                {/* center */}
                <div className="absolute inset-[25%] rounded-full bg-gradient-to-br from-yellow-700 to-yellow-900 border-2 border-yellow-500 flex items-center justify-center">
                  <span className="text-xs md:text-sm font-bold text-yellow-200">
                    {result ? result.number : ""}
                  </span>
                </div>
              </motion.div>

              {/* ball */}
              <motion.div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full shadow-lg z-10"
                style={{ transformOrigin: "50% 96px" }}
                animate={{ rotate: ballAngle }}
                transition={
                  phase === "spinning"
                    ? { duration: 4, ease: [0.15, 0.85, 0.35, 1] }
                    : { duration: 0 }
                }
              />

              {/* pointer */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-l-transparent border-r-transparent border-t-yellow-400 z-20" />
            </div>
          </div>

          {/* result display */}
          <AnimatePresence>
            {result && phase === "result" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center mt-4 space-y-2"
              >
                <div className="flex justify-center">
                  <div
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white border-4",
                      colorClass(result.color),
                      colorBorder(result.color)
                    )}
                  >
                    {result.number}
                  </div>
                </div>
                {totalWin > 0 ? (
                  <motion.p
                    className="text-2xl font-black text-[#00FF88]"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: 3, duration: 0.4 }}
                  >
                    WIN ${totalWin.toLocaleString()}!
                  </motion.p>
                ) : (
                  <p className="text-lg font-bold text-red-400">No win</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* recent history */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] text-gray-500 uppercase shrink-0">Last:</span>
            {history.map((h, i) => (
              <motion.div
                key={`${h.number}-${i}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border shrink-0",
                  colorClass(h.color),
                  colorBorder(h.color)
                )}
              >
                {h.number}
              </motion.div>
            ))}
          </div>
        )}

        {/* betting board */}
        <Card hover={false} className="!p-3 md:!p-4 overflow-x-auto">
          {/* chip selector */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] text-gray-500 uppercase">Chip:</span>
            {chipDenoms.map((val) => (
              <button
                key={val}
                onClick={() => setChipValue(val)}
                disabled={phase !== "betting"}
                className={cn(
                  "w-10 h-10 rounded-full text-[10px] font-bold border-2 transition-all cursor-pointer",
                  chipValue === val
                    ? "bg-yellow-500 border-yellow-300 text-black scale-110 shadow-[0_0_10px_rgba(234,179,8,0.5)]"
                    : "bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400",
                  "disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {val >= 1000 ? `${val / 1000}K` : val}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-gray-400">
                Total: <span className="text-yellow-400 font-bold">${totalBet.toLocaleString()}</span>
              </span>
              <button
                onClick={clearBets}
                disabled={phase !== "betting" || placedBets.length === 0}
                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* number grid */}
          <div className="min-w-[340px]">
            {/* zero */}
            <div className="flex mb-1">
              <button
                onClick={() => placeBet("straight", "0", "0")}
                disabled={phase !== "betting"}
                className={cn(
                  "w-full h-10 rounded-lg border-2 flex items-center justify-center text-sm font-bold text-white transition-all cursor-pointer",
                  "bg-emerald-700 border-emerald-500 hover:bg-emerald-600",
                  result?.number === 0 && phase === "result" && "ring-2 ring-yellow-400 ring-offset-1 ring-offset-transparent",
                  "disabled:cursor-not-allowed"
                )}
              >
                0
                {placedBets.some((b) => b.type === "straight" && b.value === "0") && (
                  <span className="ml-1 w-4 h-4 rounded-full bg-yellow-400 text-black text-[8px] font-bold flex items-center justify-center">
                    {placedBets.find((b) => b.type === "straight" && b.value === "0")?.amount}
                  </span>
                )}
              </button>
            </div>

            {/* number rows */}
            <div className="space-y-0.5">
              {boardRows.map((row, rIdx) => (
                <div key={rIdx} className="flex gap-0.5">
                  {row.map((num) => {
                    const color = getNumberColor(num);
                    const isResult = result?.number === num && phase === "result";
                    const bet = placedBets.find(
                      (b) => b.type === "straight" && String(b.value) === String(num)
                    );
                    const isWinBet = bet && winningBetIds.has(bet.id);

                    return (
                      <button
                        key={num}
                        onClick={() => placeBet("straight", String(num), String(num))}
                        disabled={phase !== "betting"}
                        className={cn(
                          "flex-1 h-10 rounded-md border flex items-center justify-center text-sm font-bold text-white transition-all cursor-pointer relative",
                          colorClass(color),
                          isResult
                            ? "ring-2 ring-yellow-400 scale-105 z-10"
                            : color === "red"
                            ? "border-red-700 hover:brightness-125"
                            : "border-gray-700 hover:brightness-150",
                          phase === "result" && !isResult && !isWinBet && "opacity-40",
                          "disabled:cursor-not-allowed"
                        )}
                      >
                        {num}
                        {bet && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-yellow-400 text-black text-[7px] font-bold flex items-center justify-center shadow">
                            $
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* columns */}
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3].map((col) => {
                const bet = placedBets.find(
                  (b) => b.type === "column" && String(b.value) === String(col)
                );
                return (
                  <button
                    key={col}
                    onClick={() => placeBet("column", String(col), `Col ${col}`)}
                    disabled={phase !== "betting"}
                    className={cn(
                      "flex-1 h-8 rounded-md border border-gray-600 bg-gray-800 text-[10px] font-bold text-gray-300 hover:bg-gray-700 transition-all cursor-pointer",
                      bet && "border-yellow-500 bg-yellow-900/30",
                      "disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  >
                    2:1
                  </button>
                );
              })}
            </div>

            {/* dozens */}
            <div className="flex gap-0.5 mt-1">
              {[
                { v: 1, label: "1st 12" },
                { v: 2, label: "2nd 12" },
                { v: 3, label: "3rd 12" },
              ].map(({ v, label }) => {
                const bet = placedBets.find(
                  (b) => b.type === "dozen" && String(b.value) === String(v)
                );
                return (
                  <button
                    key={v}
                    onClick={() => placeBet("dozen", String(v), label)}
                    disabled={phase !== "betting"}
                    className={cn(
                      "flex-1 h-8 rounded-md border border-gray-600 bg-gray-800 text-[10px] font-bold text-gray-300 hover:bg-gray-700 transition-all cursor-pointer",
                      bet && "border-yellow-500 bg-yellow-900/30",
                      "disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* outside bets */}
            <div className="grid grid-cols-6 gap-0.5 mt-1">
              {[
                { type: "low", value: "low", label: "1-18" },
                { type: "even", value: "even", label: "EVEN" },
                { type: "red", value: "red", label: "RED" },
                { type: "black", value: "black", label: "BLK" },
                { type: "odd", value: "odd", label: "ODD" },
                { type: "high", value: "high", label: "19-36" },
              ].map(({ type, value, label }) => {
                const bet = placedBets.find((b) => b.type === type);
                const isRed = type === "red";
                const isBlack = type === "black";
                return (
                  <button
                    key={type}
                    onClick={() => placeBet(type, value, label)}
                    disabled={phase !== "betting"}
                    className={cn(
                      "h-9 rounded-md border text-[10px] font-bold transition-all cursor-pointer",
                      isRed
                        ? "bg-red-700 border-red-600 text-white hover:bg-red-600"
                        : isBlack
                        ? "bg-gray-900 border-gray-600 text-white hover:bg-gray-800"
                        : "bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700",
                      bet && "ring-1 ring-yellow-400",
                      "disabled:cursor-not-allowed disabled:opacity-60"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* placed bets summary */}
          {placedBets.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {placedBets.map((bet) => {
                const isWin = winningBetIds.has(bet.id);
                return (
                  <span
                    key={bet.id}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border",
                      isWin
                        ? "bg-green-500/20 border-green-500/50 text-green-400"
                        : phase === "result"
                        ? "bg-red-500/10 border-red-500/30 text-red-400 opacity-50"
                        : "bg-white/5 border-gray-700 text-gray-400"
                    )}
                  >
                    {bet.label}: ${bet.amount}
                  </span>
                );
              })}
            </div>
          )}
        </Card>

        {/* spin / new round */}
        {phase === "betting" && (
          <div className="flex justify-center">
            <motion.button
              onClick={handleSpin}
              disabled={placedBets.length === 0 || totalBet > balance}
              className={cn(
                "px-12 py-4 rounded-2xl text-xl font-black uppercase tracking-widest transition-all cursor-pointer",
                "bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white",
                "hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              )}
              whileTap={{ scale: 0.95 }}
              animate={
                placedBets.length > 0
                  ? {
                      boxShadow: [
                        "0 0 10px rgba(239,68,68,0.3)",
                        "0 0 25px rgba(239,68,68,0.6)",
                        "0 0 10px rgba(239,68,68,0.3)",
                      ],
                    }
                  : {}
              }
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              SPIN
            </motion.button>
          </div>
        )}

        {phase === "spinning" && (
          <div className="text-center">
            <motion.p
              className="text-xl font-bold text-yellow-400"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              Spinning...
            </motion.p>
          </div>
        )}

        {phase === "result" && (
          <div className="flex justify-center">
            <Button variant="success" size="lg" onClick={newRound} icon={<RotateCcw className="w-4 h-4" />}>
              NEW ROUND
            </Button>
          </div>
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
