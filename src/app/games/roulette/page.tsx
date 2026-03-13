"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, RotateCcw, History } from "lucide-react";
import { useGame } from "@/hooks/useGame";
import { useBalance } from "@/hooks/useBalance";
import { useAuth } from "@/hooks/useAuth";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

/* ─── roulette data ─── */
const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

// European wheel order
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const CHIP_VALUES = [1, 5, 10, 25, 50, 100];

type BetType =
  | { kind: "straight"; number: number }
  | { kind: "red" }
  | { kind: "black" }
  | { kind: "odd" }
  | { kind: "even" }
  | { kind: "low" }
  | { kind: "high" }
  | { kind: "dozen"; dozen: 1 | 2 | 3 }
  | { kind: "column"; column: 1 | 2 | 3 };

interface Bet {
  type: BetType;
  amount: number;
  label: string;
}

function betKey(bt: BetType): string {
  if (bt.kind === "straight") return `s-${bt.number}`;
  if (bt.kind === "dozen") return `dz-${bt.dozen}`;
  if (bt.kind === "column") return `col-${bt.column}`;
  return bt.kind;
}

function numberColor(n: number): "red" | "black" | "green" {
  if (n === 0) return "green";
  return RED_NUMBERS.has(n) ? "red" : "black";
}

function doesBetWin(bt: BetType, winning: number): boolean {
  switch (bt.kind) {
    case "straight":
      return bt.number === winning;
    case "red":
      return winning !== 0 && RED_NUMBERS.has(winning);
    case "black":
      return winning !== 0 && !RED_NUMBERS.has(winning);
    case "odd":
      return winning !== 0 && winning % 2 === 1;
    case "even":
      return winning !== 0 && winning % 2 === 0;
    case "low":
      return winning >= 1 && winning <= 18;
    case "high":
      return winning >= 19 && winning <= 36;
    case "dozen":
      if (bt.dozen === 1) return winning >= 1 && winning <= 12;
      if (bt.dozen === 2) return winning >= 13 && winning <= 24;
      return winning >= 25 && winning <= 36;
    case "column":
      if (winning === 0) return false;
      return winning % 3 === (bt.column === 1 ? 1 : bt.column === 2 ? 2 : 0);
  }
}

/* ─── component ─── */
export default function RoulettePage() {
  const { user } = useAuth();
  const { balance, refreshBalance } = useBalance(user?.id);
  const game = useGame(() => refreshBalance());

  const [bets, setBets] = useState<Bet[]>([]);
  const [selectedChip, setSelectedChip] = useState(10);
  const [spinning, setSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [lastPayout, setLastPayout] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const [lastBets, setLastBets] = useState<Bet[]>([]);

  const totalBet = useMemo(() => bets.reduce((s, b) => s + b.amount, 0), [bets]);

  /* ─── place bet ─── */
  const addBet = useCallback(
    (type: BetType, label: string) => {
      if (spinning) return;
      if (selectedChip > balance - totalBet) return;
      setBets((prev) => {
        const key = betKey(type);
        const existing = prev.findIndex((b) => betKey(b.type) === key);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = {
            ...updated[existing],
            amount: updated[existing].amount + selectedChip,
          };
          return updated;
        }
        return [...prev, { type, amount: selectedChip, label }];
      });
    },
    [spinning, selectedChip, balance, totalBet]
  );

  /* ─── spin ─── */
  const spin = useCallback(async () => {
    if (spinning || bets.length === 0 || totalBet > balance) return;

    setSpinning(true);
    setShowResult(false);
    setWinningNumber(null);

    const result = await game.placeBet({
      gameType: "roulette",
      betAmount: totalBet,
      gameData: {
        bets: bets.map((b) => ({
          type: b.type,
          amount: b.amount,
        })),
      },
    });

    const data = result?.result as { winningNumber?: number } | null;
    const winning = data?.winningNumber ?? Math.floor(Math.random() * 37);

    /* animate wheel */
    const idx = WHEEL_ORDER.indexOf(winning);
    const segDeg = 360 / WHEEL_ORDER.length;
    const targetAngle = 360 * 5 + idx * segDeg;
    setWheelRotation((p) => p + targetAngle);
    setBallAngle(-(wheelRotation + targetAngle) + idx * segDeg);

    /* wait for animation */
    await new Promise((r) => setTimeout(r, 4000));

    setWinningNumber(winning);
    setHistory((prev) => [winning, ...prev].slice(0, 20));

    /* calculate payout */
    const payout = result?.payout ?? 0;
    setLastPayout(payout);
    setLastBets([...bets]);
    setShowResult(true);

    setTimeout(() => {
      setSpinning(false);
      setBets([]);
    }, 2500);
  }, [spinning, bets, totalBet, balance, game]);

  /* ─── repeat last bet ─── */
  const repeatLast = useCallback(() => {
    if (lastBets.length === 0 || spinning) return;
    const total = lastBets.reduce((s, b) => s + b.amount, 0);
    if (total > balance) return;
    setBets([...lastBets]);
  }, [lastBets, spinning, balance]);

  /* ─── board layout: numbers 1-36 in 3-column × 12-row grid ─── */
  const boardRows: number[][] = [];
  for (let row = 0; row < 12; row++) {
    const base = row * 3;
    boardRows.push([base + 3, base + 2, base + 1]);
  }

  /* chip count on a bet type */
  function getBetAmount(bt: BetType): number {
    const key = betKey(bt);
    const found = bets.find((b) => betKey(b.type) === key);
    return found?.amount ?? 0;
  }

  /* number cell */
  function NumberCell({ n }: { n: number }) {
    const color = numberColor(n);
    const isWinner = winningNumber === n;
    const betAmt = getBetAmount({ kind: "straight", number: n });

    return (
      <motion.button
        onClick={() => addBet({ kind: "straight", number: n }, `${n}`)}
        disabled={spinning}
        className={cn(
          "relative w-full aspect-[3/4] md:aspect-square rounded-lg font-bold text-sm md:text-base transition-all cursor-pointer",
          "border-2 flex items-center justify-center",
          "disabled:cursor-not-allowed",
          color === "red" &&
            "bg-gradient-to-b from-red-600 to-red-800 border-red-500 hover:shadow-[0_0_12px_rgba(239,68,68,0.5)]",
          color === "black" &&
            "bg-gradient-to-b from-gray-700 to-gray-900 border-gray-600 hover:shadow-[0_0_12px_rgba(107,114,128,0.5)]",
          color === "green" &&
            "bg-gradient-to-b from-green-600 to-green-800 border-green-500 hover:shadow-[0_0_12px_rgba(34,197,94,0.5)]",
          isWinner &&
            "ring-4 ring-yellow-400 shadow-[0_0_25px_rgba(234,179,8,0.8)] z-10"
        )}
        whileHover={{ scale: spinning ? 1 : 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={
          isWinner
            ? { scale: [1, 1.1, 1], transition: { repeat: Infinity, duration: 0.8 } }
            : {}
        }
      >
        <span className="text-white drop-shadow">{n}</span>
        {betAmt > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full bg-yellow-400 text-black text-[10px] font-black flex items-center justify-center shadow-lg z-20">
            {betAmt}
          </div>
        )}
      </motion.button>
    );
  }

  /* outside bet button */
  function OutsideBet({
    label,
    type,
    className,
  }: {
    label: string;
    type: BetType;
    className?: string;
  }) {
    const betAmt = getBetAmount(type);
    return (
      <motion.button
        onClick={() => addBet(type, label)}
        disabled={spinning}
        className={cn(
          "relative px-2 py-2 md:py-3 rounded-lg font-semibold text-xs md:text-sm transition-all cursor-pointer",
          "bg-gradient-to-b from-gray-700 to-gray-800 border-2 border-gray-600 text-gray-200",
          "hover:border-yellow-500/50 hover:shadow-[0_0_10px_rgba(234,179,8,0.3)]",
          "disabled:cursor-not-allowed disabled:opacity-60",
          className
        )}
        whileHover={{ scale: spinning ? 1 : 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {label}
        {betAmt > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 text-black text-[10px] font-black flex items-center justify-center shadow-lg z-20">
            {betAmt}
          </div>
        )}
      </motion.button>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--casino-bg)] px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* header */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-red-400 via-yellow-300 to-red-500 bg-clip-text text-transparent">
            ROULETTE
          </h1>
          <p className="text-[var(--casino-text-muted)] text-sm">
            Balance:{" "}
            <span className="text-green-400 font-bold">
              ${balance.toLocaleString()}
            </span>
            {totalBet > 0 && (
              <span className="ml-3 text-yellow-400">
                Total Bet: ${totalBet.toLocaleString()}
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

        <div className="grid lg:grid-cols-[280px_1fr] gap-6">
          {/* wheel section */}
          <div className="flex flex-col items-center gap-4">
            {/* roulette wheel */}
            <div className="relative w-56 h-56 md:w-72 md:h-72">
              {/* outer ring */}
              <div className="absolute inset-0 rounded-full border-8 border-yellow-900 bg-gradient-to-b from-yellow-800 to-yellow-950 shadow-2xl" />

              {/* spinning wheel */}
              <motion.div
                className="absolute inset-3 rounded-full overflow-hidden"
                animate={{ rotate: wheelRotation }}
                transition={{ duration: 4, ease: [0.2, 0.8, 0.3, 1] }}
                style={{ transformOrigin: "center center" }}
              >
                {/* wheel segments */}
                <div className="relative w-full h-full rounded-full">
                  {WHEEL_ORDER.map((n, i) => {
                    const angle = (i / WHEEL_ORDER.length) * 360;
                    const color = numberColor(n);
                    return (
                      <div
                        key={n}
                        className="absolute top-0 left-1/2 h-1/2 origin-bottom"
                        style={{
                          transform: `rotate(${angle}deg) translateX(-50%)`,
                          width: `${100 / WHEEL_ORDER.length}%`,
                        }}
                      >
                        <div
                          className={cn(
                            "w-full h-full flex items-start justify-center pt-1",
                            color === "red" && "bg-red-700",
                            color === "black" && "bg-gray-900",
                            color === "green" && "bg-green-700"
                          )}
                          style={{
                            clipPath:
                              "polygon(0% 100%, 50% 0%, 100% 100%)",
                          }}
                        >
                          <span
                            className="text-[6px] md:text-[8px] font-bold text-white mt-2"
                            style={{
                              transform: "rotate(180deg)",
                            }}
                          >
                            {n}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {/* center hub */}
                  <div className="absolute inset-[35%] rounded-full bg-gradient-to-b from-yellow-700 to-yellow-900 border-4 border-yellow-600 shadow-inner flex items-center justify-center z-10">
                    <span className="text-yellow-200 text-[10px] md:text-xs font-black">
                      {winningNumber !== null ? winningNumber : ""}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* ball marker (top) */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 z-20">
                <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white] border border-gray-300" />
              </div>
            </div>

            {/* winning number display */}
            <AnimatePresence>
              {winningNumber !== null && showResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <div
                    className={cn(
                      "inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-black text-white border-4",
                      numberColor(winningNumber) === "red" &&
                        "bg-red-600 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.6)]",
                      numberColor(winningNumber) === "black" &&
                        "bg-gray-800 border-gray-500 shadow-[0_0_30px_rgba(107,114,128,0.6)]",
                      numberColor(winningNumber) === "green" &&
                        "bg-green-600 border-green-400 shadow-[0_0_30px_rgba(34,197,94,0.6)]"
                    )}
                  >
                    {winningNumber}
                  </div>
                  {lastPayout > 0 ? (
                    <motion.p
                      className="text-xl font-black text-green-400 mt-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      WIN +${lastPayout.toLocaleString()}!
                    </motion.p>
                  ) : (
                    <motion.p
                      className="text-sm text-red-400 mt-2"
                      initial={{ y: 10, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      No win
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* history */}
            <Card hover={false} className="w-full !p-3">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-xs font-bold text-yellow-400 uppercase tracking-wider">
                  Last Numbers
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {history.length === 0 ? (
                  <span className="text-xs text-gray-500">No spins yet</span>
                ) : (
                  history.map((n, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                        numberColor(n) === "red" && "bg-red-600",
                        numberColor(n) === "black" && "bg-gray-700",
                        numberColor(n) === "green" && "bg-green-600",
                        i === 0 && "ring-2 ring-yellow-400"
                      )}
                    >
                      {n}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* betting board */}
          <Card hover={false} className="!p-3 md:!p-4 overflow-x-auto">
            <div className="min-w-[340px]">
              {/* zero */}
              <div className="mb-2">
                <NumberCell n={0} />
              </div>

              {/* number grid: 12 rows × 3 columns */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {boardRows.map((row) =>
                  row.map((n) => <NumberCell key={n} n={n} />)
                )}
              </div>

              {/* column bets */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {([1, 2, 3] as const).map((col) => (
                  <OutsideBet
                    key={col}
                    label={`Col ${col}`}
                    type={{ kind: "column", column: col }}
                  />
                ))}
              </div>

              {/* dozen bets */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {([1, 2, 3] as const).map((d) => (
                  <OutsideBet
                    key={d}
                    label={`${d === 1 ? "1st" : d === 2 ? "2nd" : "3rd"} 12`}
                    type={{ kind: "dozen", dozen: d }}
                  />
                ))}
              </div>

              {/* even money bets */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                <OutsideBet label="1-18" type={{ kind: "low" }} />
                <OutsideBet label="Even" type={{ kind: "even" }} />
                <OutsideBet
                  label="Red"
                  type={{ kind: "red" }}
                  className="!bg-gradient-to-b !from-red-600 !to-red-800 !border-red-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-4">
                <OutsideBet label="19-36" type={{ kind: "high" }} />
                <OutsideBet label="Odd" type={{ kind: "odd" }} />
                <OutsideBet
                  label="Black"
                  type={{ kind: "black" }}
                  className="!bg-gradient-to-b !from-gray-800 !to-black !border-gray-600"
                />
              </div>

              {/* chip selector */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs text-gray-400 uppercase tracking-wider mr-1">
                  Chip:
                </span>
                {CHIP_VALUES.map((val) => (
                  <motion.button
                    key={val}
                    onClick={() => setSelectedChip(val)}
                    className={cn(
                      "w-10 h-10 rounded-full font-bold text-xs border-[3px] transition-all cursor-pointer",
                      selectedChip === val
                        ? "bg-yellow-400 border-yellow-300 text-black shadow-[0_0_15px_rgba(234,179,8,0.5)] scale-110"
                        : "bg-gray-700 border-gray-500 text-gray-300 hover:bg-gray-600"
                    )}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    ${val}
                  </motion.button>
                ))}
              </div>

              {/* action buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="flex-1"
                  onClick={spin}
                  loading={spinning || game.loading}
                  disabled={bets.length === 0 || totalBet > balance}
                >
                  SPIN
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setBets([])}
                  disabled={spinning || bets.length === 0}
                  icon={<Trash2 className="w-4 h-4" />}
                >
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={repeatLast}
                  disabled={spinning || lastBets.length === 0}
                  icon={<RotateCcw className="w-4 h-4" />}
                >
                  Repeat
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
