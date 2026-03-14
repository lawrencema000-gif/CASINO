"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Volume2,
  VolumeX,
  ArrowLeft,
  Sparkles,
  Zap,
  Info,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import { useGame } from "@/hooks/useGame";
import { SYMBOLS, spin as spinEngine, getPaylines } from "@/lib/games/slots";
import { cn } from "@/components/ui/cn";
import Modal from "@/components/ui/Modal";
import Link from "next/link";

/* ─── CONSTANTS ─── */
const SYMBOL_HEIGHT = 100; // px per symbol tile
const VISIBLE_ROWS = 3;
const REEL_REPEATS = 4; // repeat symbol set this many times in the reel strip
/* Factor-based staggered stop times from html5-slot-machine:
   factor = 1 + Math.pow(idx/2, 2) → 1s, 1.25s, 2s, 3.25s, 5s */
const REEL_STOP_TIMES = [1000, 1250, 2000, 3250, 5000]; // stagger ms

type GamePhase =
  | "idle"
  | "spinning"
  | "stopping_reel_1"
  | "stopping_reel_2"
  | "stopping_reel_3"
  | "stopping_reel_4"
  | "stopping_reel_5"
  | "evaluating"
  | "celebrating";

const PAYLINE_COLORS = [
  "#FFD700", "#00FF88", "#60A5FA", "#F472B6", "#A78BFA",
  "#EF4444", "#14B8A6", "#F59E0B", "#8B5CF6", "#06B6D4",
  "#EC4899", "#22C55E", "#3B82F6", "#F97316", "#6366F1",
  "#10B981", "#E11D48", "#0EA5E9", "#D946EF", "#84CC16",
];
const PAYLINE_LABELS = [
  "MID", "TOP", "BOT", "V\u2193", "V\u2191",
  "W1", "W2", "D\u2198", "D\u2197", "S1",
  "S2", "P1", "P2", "W3", "W4",
  "W5", "W6", "A1", "A2", "A3",
];

/* Symbol visuals: SVG paths, display names, and accent colors */
const SYMBOL_VISUALS: Record<string, { src: string; name: string; color: string }> = {
  seven: { src: '/images/symbols/yoda.svg', name: 'Yoda', color: '#4ade80' },
  diamond: { src: '/images/symbols/darth_vader.svg', name: 'Darth Vader', color: '#ef4444' },
  bell: { src: '/images/symbols/death_star.svg', name: 'Death Star', color: '#94a3b8' },
  cherry: { src: '/images/symbols/falcon.svg', name: 'Millennium Falcon', color: '#60a5fa' },
  lemon: { src: '/images/symbols/stormtrooper.svg', name: 'Stormtrooper', color: '#f1f5f9' },
  orange: { src: '/images/symbols/r2d2.svg', name: 'R2-D2', color: '#38bdf8' },
  grape: { src: '/images/symbols/c3po.svg', name: 'C-3PO', color: '#fbbf24' },
  star: { src: '/images/symbols/at_at.svg', name: 'AT-AT Wild', color: '#FFD700' },
};

/* Helper: get background gradient from symbol color */
function getSymbolBg(symId: string): string {
  const v = SYMBOL_VISUALS[symId];
  if (!v) return 'transparent';
  const opacity = symId === 'star' ? '35' : '20';
  // Convert hex to rgba
  const hex = v.color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `radial-gradient(circle, rgba(${r},${g},${b},0.${opacity}) 0%, transparent 70%)`;
}

/* helper: get symbol by id */
function getSymbol(id: string) {
  return SYMBOLS.find((s) => s.id === id) ?? SYMBOLS[SYMBOLS.length - 1];
}

/* Build a full reel strip: repeat the weighted symbol set multiple times */
function buildReelStrip(): string[] {
  const strip: string[] = [];
  for (let r = 0; r < REEL_REPEATS; r++) {
    for (const sym of SYMBOLS) {
      // Add symbol proportional to weight (simplified: each once per repeat for smooth visuals)
      strip.push(sym.id);
    }
  }
  // Shuffle for visual variety
  for (let i = strip.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [strip[i], strip[j]] = [strip[j], strip[i]];
  }
  return strip;
}

/* ─── REEL COMPONENT ─── */
function ReelStrip({
  reelIndex,
  strip,
  targetSymbols,
  spinning,
  onStop,
  winningRows,
}: {
  reelIndex: number;
  strip: string[];
  targetSymbols: string[];
  spinning: boolean;
  onStop: () => void;
  winningRows: Set<number>;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [currentOffset, setCurrentOffset] = useState(0);
  const hasStoppedRef = useRef(false);

  // Place target symbols at the end of the strip for landing
  const fullStrip = useMemo(() => {
    const s = [...strip];
    // Replace last 3 symbols with target
    const landingIdx = s.length - VISIBLE_ROWS;
    for (let i = 0; i < VISIBLE_ROWS; i++) {
      s[landingIdx + i] = targetSymbols[i] ?? "grape";
    }
    return s;
  }, [strip, targetSymbols]);

  const totalHeight = fullStrip.length * SYMBOL_HEIGHT;
  const landingOffset = -(fullStrip.length - VISIBLE_ROWS) * SYMBOL_HEIGHT;

  useEffect(() => {
    if (spinning) {
      hasStoppedRef.current = false;
      // Start from top
      setCurrentOffset(0);

      // After a tiny delay, begin the rapid scroll (use requestAnimationFrame for initial kick)
      const kickTimer = requestAnimationFrame(() => {
        if (innerRef.current) {
          // First remove transition for instant reset
          innerRef.current.style.transition = "none";
          innerRef.current.style.transform = `translateY(0px)`;

          // Then after a frame, add the spinning transition
          requestAnimationFrame(() => {
            if (innerRef.current) {
              const duration = REEL_STOP_TIMES[reelIndex] / 1000;
              innerRef.current.style.transition = `transform ${duration}s cubic-bezier(0.15, 0.0, 0.15, 1.02)`;
              innerRef.current.style.transform = `translateY(${landingOffset}px)`;
            }
          });
        }
      });

      // Fire onStop callback after reel finishes
      const stopTimer = setTimeout(() => {
        if (!hasStoppedRef.current) {
          hasStoppedRef.current = true;
          setCurrentOffset(landingOffset);
          onStop();
        }
      }, REEL_STOP_TIMES[reelIndex] + 50);

      return () => {
        cancelAnimationFrame(kickTimer);
        clearTimeout(stopTimer);
      };
    } else {
      // Not spinning - snap to landing position
      if (innerRef.current) {
        innerRef.current.style.transition = "none";
        innerRef.current.style.transform = `translateY(${landingOffset}px)`;
      }
      setCurrentOffset(landingOffset);
    }
  }, [spinning, landingOffset, reelIndex, onStop]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        height: VISIBLE_ROWS * SYMBOL_HEIGHT,
        width: 100,
      }}
    >
      {/* Reel strip */}
      <div
        ref={innerRef}
        className="absolute top-0 left-0 w-full"
        style={{ willChange: "transform" }}
      >
        {fullStrip.map((symId, idx) => {
          const sym = getSymbol(symId);
          const isLanding = idx >= fullStrip.length - VISIBLE_ROWS;
          const landingRow = idx - (fullStrip.length - VISIBLE_ROWS);
          const isWin = isLanding && winningRows.has(landingRow);

          const visual = SYMBOL_VISUALS[symId];
          return (
            <div
              key={`${reelIndex}-${idx}`}
              className={cn(
                "flex items-center justify-center border-b border-gray-800/50 select-none",
                isWin && "z-10"
              )}
              style={{
                height: SYMBOL_HEIGHT,
                background: getSymbolBg(symId),
                boxShadow: isWin
                  ? "inset 0 0 30px rgba(255,215,0,0.3), 0 0 20px rgba(255,215,0,0.4)"
                  : "inset 0 2px 4px rgba(0,0,0,0.3)",
              }}
            >
              <img
                src={visual?.src ?? '/images/symbols/c3po.svg'}
                alt={visual?.name ?? sym.name}
                className={cn(
                  "w-16 h-16 object-contain drop-shadow-lg",
                  symId === "star" && "animate-pulse",
                  spinning && "blur-[2px]"
                )}
                style={{
                  filter: isWin
                    ? "drop-shadow(0 0 12px rgba(255,215,0,0.8))"
                    : symId === "star"
                    ? "drop-shadow(0 0 8px rgba(255,215,0,0.6))"
                    : undefined,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Top/bottom gradient fade for depth */}
      <div
        className="absolute top-0 left-0 right-0 h-6 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to bottom, rgba(15,15,25,0.8), transparent)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-6 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(to top, rgba(15,15,25,0.8), transparent)",
        }}
      />
    </div>
  );
}

/* ─── COIN PARTICLE ─── */
function CoinParticle({ delay, x }: { delay: number; x: number }) {
  return (
    <motion.div
      className="absolute text-2xl pointer-events-none z-50"
      initial={{ x: `${x}vw`, y: -40, opacity: 1, rotate: 0 }}
      animate={{
        y: "110vh",
        opacity: 0,
        rotate: 720 + Math.random() * 360,
      }}
      exit={{ opacity: 0 }}
      transition={{
        duration: 2 + Math.random() * 2,
        delay,
        ease: "easeIn",
      }}
    >
      {Math.random() > 0.4 ? "🪙" : "✨"}
    </motion.div>
  );
}

/* ─── MAIN COMPONENT ─── */
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
    Array.from({ length: 5 }, () =>
      Array.from(
        { length: 3 },
        () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)].id
      )
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
  const [turboMode, setTurboMode] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(10);
  const [autoSpinsLeft, setAutoSpinsLeft] = useState(0);
  const [showCoinShower, setShowCoinShower] = useState(false);
  const [showBigWin, setShowBigWin] = useState(false);
  const [bigWinAmount, setBigWinAmount] = useState(0);
  const [bigWinType, setBigWinType] = useState<"big" | "jackpot">("big");
  const [isSpinning, setIsSpinning] = useState(false);
  const [reelsStopped, setReelsStopped] = useState([true, true, true, true, true]);
  const [resultHistory, setResultHistory] = useState<
    { grid: string[][]; win: number }[]
  >([]);
  const [winCounter, setWinCounter] = useState(0);

  const autoSpinRef = useRef(false);
  autoSpinRef.current = autoSpin;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  /* Build reel strips (static per mount) */
  const reelStrips = useMemo(
    () => [buildReelStrip(), buildReelStrip(), buildReelStrip(), buildReelStrip(), buildReelStrip()],
    []
  );

  /* Animated win counter */
  const winCounterRef = useRef<number>(0);
  const winCounterFrameRef = useRef<number>(0);

  const animateWinCounter = useCallback((target: number) => {
    const start = winCounterRef.current;
    const diff = target - start;
    const duration = 1500;
    const startTime = performance.now();

    const step = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setWinCounter(current);
      winCounterRef.current = current;
      if (progress < 1) {
        winCounterFrameRef.current = requestAnimationFrame(step);
      }
    };
    cancelAnimationFrame(winCounterFrameRef.current);
    winCounterFrameRef.current = requestAnimationFrame(step);
  }, []);

  /* ─── spin logic ─── */
  const doSpin = useCallback(async () => {
    if (phase !== "idle" || betAmount > balance) return;

    const speedMult = turboMode ? 0.5 : 1;

    setPhase("spinning");
    setWinResult(null);
    setWinningCells(new Set());
    setShowCoinShower(false);
    setShowBigWin(false);
    setIsSpinning(true);
    setReelsStopped([false, false, false, false, false]);

    /* deduct bet */
    if (!user) {
      setDemoBalance((b) => b - betAmount);
    }

    /* compute result (client-side demo) */
    const rng = Math.random();
    const result = spinEngine(betAmount, rng);

    /* update grid to the target (reel strips will pick these up) */
    setGrid(result.reels);

    /* stagger reel stops — factor-based timing from html5-slot-machine */
    for (let reel = 0; reel < 5; reel++) {
      const stopTime = REEL_STOP_TIMES[reel] * speedMult;
      await new Promise((r) => setTimeout(r, reel === 0 ? stopTime : (REEL_STOP_TIMES[reel] - REEL_STOP_TIMES[reel - 1]) * speedMult));
      setReelsStopped((prev) => {
        const next = [...prev];
        next[reel] = true;
        return next;
      });
      if (reel < 4) {
        setPhase(
          `stopping_reel_${reel + 1}` as GamePhase
        );
      }
    }

    setPhase("stopping_reel_5");
    await new Promise((r) => setTimeout(r, 100 * speedMult));
    setIsSpinning(false);

    /* evaluating */
    setPhase("evaluating");
    await new Promise((r) => setTimeout(r, 200 * speedMult));

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

      /* animate win counter */
      animateWinCounter(result.totalPayout);

      const multiplier = result.totalPayout / betAmount;

      if (result.isJackpot) {
        setBigWinType("jackpot");
        setBigWinAmount(result.totalPayout);
        setShowBigWin(true);
        setShowCoinShower(true);
        setPhase("celebrating");
        await new Promise((r) => setTimeout(r, 5000 * speedMult));
      } else if (multiplier >= 15) {
        setBigWinType("big");
        setBigWinAmount(result.totalPayout);
        setShowBigWin(true);
        setShowCoinShower(true);
        setPhase("celebrating");
        await new Promise((r) => setTimeout(r, 3500 * speedMult));
      } else if (multiplier >= 5) {
        setShowCoinShower(true);
        setPhase("celebrating");
        await new Promise((r) => setTimeout(r, 2500 * speedMult));
      } else {
        setPhase("celebrating");
        await new Promise((r) => setTimeout(r, 1500 * speedMult));
      }
    }

    /* add to history */
    setResultHistory((prev) => [
      { grid: result.reels, win: result.totalPayout },
      ...prev.slice(0, 9),
    ]);

    setPhase("idle");
    setShowBigWin(false);
    setShowCoinShower(false);
    winCounterRef.current = 0;
    setWinCounter(0);

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
  }, [phase, betAmount, balance, user, turboMode, animateWinCounter]);

  /* auto-spin trigger */
  useEffect(() => {
    if (autoSpin && phase === "idle") {
      const t = setTimeout(() => doSpin(), turboMode ? 250 : 500);
      return () => clearTimeout(t);
    }
  }, [autoSpin, phase, doSpin, turboMode]);

  /* coin particles */
  const coinParticles = useMemo(
    () =>
      showCoinShower
        ? Array.from({ length: 50 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            delay: Math.random() * 1,
          }))
        : [],
    [showCoinShower]
  );

  /* Compute winning rows per reel */
  const winningRowsByReel = useMemo(() => {
    const map: Set<number>[] = [new Set(), new Set(), new Set(), new Set(), new Set()];
    winningCells.forEach((key) => {
      const [reel, row] = key.split("-").map(Number);
      map[reel]?.add(row);
    });
    return map;
  }, [winningCells]);

  /* Reel stop callbacks */
  const handleReelStop = useCallback(
    (reelIndex: number) => () => {
      setReelsStopped((prev) => {
        const next = [...prev];
        next[reelIndex] = true;
        return next;
      });
    },
    []
  );

  /* Bet controls */
  const adjustBet = (direction: "up" | "down") => {
    const steps = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000];
    const currentIdx = steps.indexOf(betAmount);
    if (direction === "up" && currentIdx < steps.length - 1) {
      const next = steps[currentIdx + 1];
      if (next <= balance) setBetAmount(next);
    } else if (direction === "down" && currentIdx > 0) {
      setBetAmount(steps[currentIdx - 1]);
    }
  };

  const canSpin = phase === "idle" && betAmount <= balance && !loading;

  return (
    <div className="min-h-screen px-2 sm:px-4 py-4 relative overflow-hidden" style={{ background: '#0a0a0f' }}>
      {/* HD Background image with dark overlay */}
      <div
        className="fixed inset-0 z-0"
        style={{
          backgroundImage: 'url(/images/backgrounds/bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="fixed inset-0 z-0 bg-black/70" />
      {/* Background ambient glow */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background:
              "radial-gradient(circle, rgba(96,165,250,0.4) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Coin shower */}
      <AnimatePresence>
        {showCoinShower &&
          coinParticles.map((p) => (
            <CoinParticle key={p.id} delay={p.delay} x={p.x} />
          ))}
      </AnimatePresence>

      {/* Big win overlay */}
      <AnimatePresence>
        {showBigWin && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              className="relative text-center z-10"
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
            >
              {bigWinType === "jackpot" ? (
                <>
                  <motion.div
                    className="text-6xl md:text-8xl font-black"
                    style={{
                      background:
                        "linear-gradient(to bottom, #FFD700, #FF8C00, #FFD700)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      textShadow: "0 0 60px rgba(255,215,0,0.5)",
                      filter: "drop-shadow(0 0 30px rgba(255,215,0,0.8))",
                    }}
                    animate={{
                      scale: [1, 1.1, 1],
                      rotate: [-2, 2, -2],
                    }}
                    transition={{ repeat: Infinity, duration: 0.5 }}
                  >
                    JACKPOT!!!
                  </motion.div>
                  <motion.div
                    className="text-4xl md:text-6xl font-black text-yellow-300 mt-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >
                    ${bigWinAmount.toLocaleString()}
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    className="text-5xl md:text-7xl font-black"
                    style={{
                      background:
                        "linear-gradient(to bottom, #FFD700, #FFA500)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      filter: "drop-shadow(0 0 20px rgba(255,215,0,0.6))",
                    }}
                    animate={{ scale: [1, 1.08, 1] }}
                    transition={{ repeat: Infinity, duration: 0.7 }}
                  >
                    BIG WIN!
                  </motion.div>
                  <motion.div
                    className="text-3xl md:text-5xl font-black text-yellow-300 mt-3"
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ repeat: Infinity, duration: 0.9 }}
                  >
                    ${bigWinAmount.toLocaleString()}
                  </motion.div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-3xl mx-auto space-y-4 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">Lobby</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">House Edge: 3.5%</span>
            {!user && (
              <span className="text-xs text-gray-600 bg-gray-800/50 px-2 py-0.5 rounded">
                DEMO
              </span>
            )}
          </div>
        </div>

        {/* ═══════════════════ SLOT MACHINE CABINET ═══════════════════ */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background:
              "linear-gradient(145deg, #2a2a35 0%, #1a1a25 50%, #2a2a35 100%)",
            border: "3px solid transparent",
            borderImage:
              "linear-gradient(145deg, #555, #333, #555, #444, #555) 1",
            boxShadow:
              "0 0 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 80px rgba(139,92,246,0.08)",
          }}
        >
          {/* Machine frame border effect */}
          <div
            className="absolute inset-0 rounded-2xl pointer-events-none z-20"
            style={{
              border: "2px solid rgba(255,255,255,0.03)",
              borderRadius: "inherit",
            }}
          />

          {/* ── Marquee Header ── */}
          <div
            className="relative text-center py-4 overflow-hidden"
            style={{
              background:
                "linear-gradient(180deg, #1a1a25 0%, #0f0f18 100%)",
              borderBottom: "2px solid rgba(96,165,250,0.2)",
            }}
          >
            {/* Animated light dots */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 20 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full"
                  style={{
                    background: i % 2 === 0 ? "#60a5fa" : "#a78bfa",
                    left: `${(i / 20) * 100}%`,
                    top: i % 2 === 0 ? "8px" : "auto",
                    bottom: i % 2 === 0 ? "auto" : "8px",
                  }}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [0.8, 1.2, 0.8],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    delay: i * 0.15,
                  }}
                />
              ))}
            </div>

            <motion.h1
              className="text-2xl md:text-4xl font-black tracking-wider relative z-10"
              style={{
                background:
                  "linear-gradient(to bottom, #60a5fa, #a78bfa, #60a5fa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 20px rgba(96,165,250,0.5))",
                textShadow: "0 0 40px rgba(139,92,246,0.4)",
              }}
              animate={{ scale: [1, 1.01, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              STAR WARS SLOTS
            </motion.h1>
          </div>

          {/* ── Reel Area ── */}
          <div className="flex items-stretch">
            {/* Payline indicators left — show first 5 for space */}
            <div className="flex flex-col justify-around py-4 px-2 md:px-3 gap-1">
              {PAYLINE_LABELS.slice(0, 5).map((label, i) => {
                const isActive = winResult?.paylines.some(
                  (p) => p.line === i
                );
                return (
                  <motion.div
                    key={label}
                    className={cn(
                      "text-[10px] md:text-xs font-bold px-1.5 md:px-2 py-1 rounded-md text-center min-w-[28px]",
                      "border transition-all duration-300"
                    )}
                    style={{
                      color: isActive ? PAYLINE_COLORS[i] : "#555",
                      borderColor: isActive
                        ? PAYLINE_COLORS[i]
                        : "rgba(255,255,255,0.05)",
                      background: isActive
                        ? `${PAYLINE_COLORS[i]}15`
                        : "rgba(0,0,0,0.3)",
                      boxShadow: isActive
                        ? `0 0 10px ${PAYLINE_COLORS[i]}40`
                        : "none",
                    }}
                    animate={
                      isActive
                        ? { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] }
                        : {}
                    }
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  >
                    {label}
                  </motion.div>
                );
              })}
            </div>

            {/* Reels container with inner glow */}
            <div
              className="flex-1 flex justify-center items-center gap-1 md:gap-2 py-4 px-2 relative"
              style={{
                background:
                  "linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)",
              }}
            >
              {/* Inner reel frame */}
              <div
                className="flex gap-[3px] md:gap-1.5 p-[3px] md:p-1.5 rounded-xl relative"
                style={{
                  background:
                    "linear-gradient(145deg, #111118 0%, #0a0a0f 100%)",
                  border: "1px solid rgba(255,215,0,0.1)",
                  boxShadow:
                    "inset 0 0 30px rgba(0,0,0,0.8), 0 0 15px rgba(255,215,0,0.05)",
                }}
              >
                {/* Payline overlay lines */}
                {winResult?.paylines.map((pl) => {
                  const paylinesDef = getPaylines();
                  const line = paylinesDef[pl.line];
                  return (
                    <motion.div
                      key={pl.line}
                      className="absolute inset-0 z-30 pointer-events-none"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: [0.4, 0.9, 0.4] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                    >
                      <svg
                        className="w-full h-full"
                        viewBox={`0 0 ${5 * 104} ${VISIBLE_ROWS * SYMBOL_HEIGHT}`}
                        preserveAspectRatio="none"
                      >
                        <polyline
                          points={line
                            .map(
                              (row, reel) =>
                                `${reel * 104 + 52},${row * SYMBOL_HEIGHT + SYMBOL_HEIGHT / 2}`
                            )
                            .join(" ")}
                          fill="none"
                          stroke={PAYLINE_COLORS[pl.line]}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.7"
                        />
                      </svg>
                    </motion.div>
                  );
                })}

                {[0, 1, 2, 3, 4].map((reelIdx) => (
                  <div
                    key={reelIdx}
                    className="rounded-lg overflow-hidden relative"
                    style={{
                      background: "#08080e",
                      border: "1px solid rgba(255,255,255,0.04)",
                      boxShadow: "inset 0 0 15px rgba(0,0,0,0.5)",
                    }}
                  >
                    <ReelStrip
                      reelIndex={reelIdx}
                      strip={reelStrips[reelIdx]}
                      targetSymbols={grid[reelIdx] ?? ["grape", "grape", "grape"]}
                      spinning={isSpinning && !reelsStopped[reelIdx]}
                      onStop={handleReelStop(reelIdx)}
                      winningRows={winningRowsByReel[reelIdx]}
                    />
                  </div>
                ))}
              </div>

              {/* Center payline indicator (horizontal line) */}
              <div
                className="absolute left-0 right-0 pointer-events-none z-20"
                style={{
                  top: "50%",
                  transform: "translateY(-50%)",
                  height: "2px",
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,215,0,0.3) 20%, rgba(255,215,0,0.3) 80%, transparent)",
                }}
              />
            </div>

            {/* Lever / Arm (right side) */}
            <div className="flex flex-col items-center justify-center px-2 md:px-4">
              <button
                onClick={canSpin ? doSpin : undefined}
                disabled={!canSpin}
                className={cn(
                  "relative flex flex-col items-center cursor-pointer group transition-all",
                  !canSpin && "opacity-40 cursor-not-allowed"
                )}
              >
                {/* Lever shaft */}
                <div
                  className="w-3 md:w-4 rounded-full transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                  style={{
                    height: "80px",
                    background:
                      "linear-gradient(90deg, #888, #bbb, #888)",
                    border: "1px solid #555",
                  }}
                />
                {/* Lever ball */}
                <motion.div
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full -mt-1 transition-shadow group-hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                  style={{
                    background:
                      "radial-gradient(circle at 35% 35%, #ff6b6b, #EF4444, #b91c1c)",
                    border: "2px solid #991b1b",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                  }}
                  animate={
                    isSpinning
                      ? { y: [0, 20, 0] }
                      : { y: 0 }
                  }
                  transition={{
                    duration: 0.3,
                  }}
                />
                <span className="text-[8px] md:text-[10px] text-gray-500 mt-2 uppercase tracking-wider">
                  Pull
                </span>
              </button>
            </div>
          </div>

          {/* ── Win Display Bar ── */}
          <div
            className="text-center py-3 relative"
            style={{
              background:
                "linear-gradient(180deg, #0f0f18 0%, #1a1a25 100%)",
              borderTop: "1px solid rgba(255,215,0,0.1)",
            }}
          >
            <AnimatePresence mode="wait">
              {winResult && winResult.totalPayout > 0 && phase === "celebrating" ? (
                <motion.div
                  key="win"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-center gap-3">
                    <motion.span
                      className="text-2xl md:text-3xl font-black"
                      style={{
                        background:
                          "linear-gradient(to right, #FFD700, #FFA500, #FFD700)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ repeat: Infinity, duration: 0.6 }}
                    >
                      WIN ${winCounter.toLocaleString()}
                    </motion.span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {winResult.paylines.map((pl, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 rounded-full border"
                        style={{
                          color: PAYLINE_COLORS[pl.line],
                          borderColor: `${PAYLINE_COLORS[pl.line]}40`,
                          background: `${PAYLINE_COLORS[pl.line]}10`,
                        }}
                      >
                        {PAYLINE_LABELS[pl.line]}: ${pl.payout.toLocaleString()}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.span
                  key="idle"
                  className="text-sm text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {isSpinning ? "Spinning..." : "Good luck!"}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* ══════════ CONTROLS PANEL ══════════ */}
          <div
            className="px-3 md:px-6 py-4 space-y-4"
            style={{
              background:
                "linear-gradient(180deg, #111118 0%, #0a0a0f 100%)",
              borderTop: "2px solid rgba(255,215,0,0.08)",
            }}
          >
            {/* Main controls row */}
            <div className="flex items-center justify-between gap-2 md:gap-4">
              {/* Balance */}
              <div className="text-center min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                  Balance
                </p>
                <p className="text-sm md:text-lg font-bold text-[#00FF88] truncate">
                  ${balance.toLocaleString()}
                </p>
              </div>

              {/* Bet control */}
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                  Bet
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => adjustBet("down")}
                    disabled={phase !== "idle"}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
                    style={{
                      background:
                        "linear-gradient(145deg, #2a2a35, #1a1a25)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
                  </button>
                  <div
                    className="px-3 py-1.5 rounded-lg min-w-[80px] md:min-w-[100px] text-center"
                    style={{
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,215,0,0.2)",
                    }}
                  >
                    <span className="text-sm md:text-base font-bold text-[#FFD700]">
                      ${betAmount.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => adjustBet("up")}
                    disabled={phase !== "idle"}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer disabled:opacity-30"
                    style={{
                      background:
                        "linear-gradient(145deg, #2a2a35, #1a1a25)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <ChevronUp className="w-3.5 h-3.5 text-gray-300" />
                  </button>
                </div>
              </div>

              {/* SPIN BUTTON */}
              <div className="text-center">
                <motion.button
                  onClick={canSpin ? doSpin : undefined}
                  disabled={!canSpin}
                  className={cn(
                    "relative w-16 h-16 md:w-20 md:h-20 rounded-full font-black text-white text-sm md:text-base",
                    "transition-all duration-200 cursor-pointer",
                    "disabled:opacity-40 disabled:cursor-not-allowed",
                    "active:scale-95"
                  )}
                  style={{
                    background: canSpin
                      ? "radial-gradient(circle at 40% 35%, #ff5555, #EF4444, #b91c1c)"
                      : "radial-gradient(circle at 40% 35%, #555, #444, #333)",
                    border: "3px solid",
                    borderColor: canSpin ? "#991b1b" : "#333",
                    boxShadow: canSpin
                      ? "0 0 25px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 15px rgba(0,0,0,0.5)"
                      : "0 4px 15px rgba(0,0,0,0.5)",
                  }}
                  animate={
                    canSpin && !autoSpin
                      ? {
                          boxShadow: [
                            "0 0 25px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 15px rgba(0,0,0,0.5)",
                            "0 0 40px rgba(239,68,68,0.6), inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 15px rgba(0,0,0,0.5)",
                            "0 0 25px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 15px rgba(0,0,0,0.5)",
                          ],
                        }
                      : {}
                  }
                  transition={{ repeat: Infinity, duration: 2 }}
                  whileHover={canSpin ? { scale: 1.05 } : {}}
                  whileTap={canSpin ? { scale: 0.95 } : {}}
                >
                  {isSpinning ? (
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                      className="block"
                    >
                      &#9881;
                    </motion.span>
                  ) : autoSpin ? (
                    <span className="text-xs">
                      AUTO
                      <br />
                      {autoSpinsLeft}
                    </span>
                  ) : (
                    "SPIN"
                  )}
                </motion.button>
              </div>

              {/* Lines */}
              <div className="text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                  Lines
                </p>
                <div
                  className="px-3 py-1.5 rounded-lg"
                  style={{
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(139,92,246,0.2)",
                  }}
                >
                  <span className="text-sm md:text-base font-bold text-[#8B5CF6]">
                    20
                  </span>
                </div>
              </div>

              {/* Total win */}
              <div className="text-center min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 mb-1">
                  Win
                </p>
                <p className="text-sm md:text-lg font-bold text-[#FFD700] truncate">
                  {winResult ? `$${winResult.totalPayout.toLocaleString()}` : "$0"}
                </p>
              </div>
            </div>

            {/* Secondary controls row */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* Auto-spin */}
              <div className="flex items-center gap-1">
                {autoSpin ? (
                  <button
                    onClick={() => {
                      setAutoSpin(false);
                      setAutoSpinsLeft(0);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    style={{
                      background:
                        "linear-gradient(145deg, rgba(239,68,68,0.2), rgba(239,68,68,0.1))",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#EF4444",
                    }}
                  >
                    <X className="w-3 h-3" />
                    Stop Auto
                  </button>
                ) : (
                  <>
                    <span className="text-[10px] text-gray-500 mr-1">
                      Auto:
                    </span>
                    {[10, 25, 50, 100].map((count) => (
                      <button
                        key={count}
                        onClick={() => {
                          if (phase !== "idle") return;
                          setAutoSpinCount(count);
                          setAutoSpinsLeft(count);
                          setAutoSpin(true);
                        }}
                        disabled={phase !== "idle"}
                        className={cn(
                          "px-2 py-1 rounded text-[10px] md:text-xs font-semibold transition-all cursor-pointer",
                          "disabled:opacity-30 disabled:cursor-not-allowed",
                          "hover:bg-white/10"
                        )}
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          color: "#999",
                        }}
                      >
                        {count}
                      </button>
                    ))}
                  </>
                )}
              </div>

              <div className="w-px h-5 bg-gray-800" />

              {/* Turbo */}
              <button
                onClick={() => setTurboMode((p) => !p)}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                )}
                style={{
                  background: turboMode
                    ? "rgba(0,255,136,0.1)"
                    : "rgba(255,255,255,0.03)",
                  border: `1px solid ${turboMode ? "rgba(0,255,136,0.3)" : "rgba(255,255,255,0.08)"}`,
                  color: turboMode ? "#00FF88" : "#666",
                }}
              >
                <Zap className="w-3 h-3" />
                Turbo
              </button>

              {/* Sound */}
              <button
                onClick={() => setSoundOn((p) => !p)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: soundOn ? "#999" : "#555",
                }}
              >
                {soundOn ? (
                  <Volume2 className="w-3 h-3" />
                ) : (
                  <VolumeX className="w-3 h-3" />
                )}
                {soundOn ? "Sound" : "Muted"}
              </button>

              {/* Paytable */}
              <button
                onClick={() => setShowPaytable(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#999",
                }}
              >
                <Info className="w-3 h-3" />
                Paytable
              </button>
            </div>
          </div>
        </div>

        {/* ── History Strip ── */}
        {resultHistory.length > 0 && (
          <div
            className="rounded-xl p-3 space-y-2"
            style={{
              background: "rgba(26,26,37,0.5)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <p className="text-[10px] uppercase tracking-wider text-gray-500">
              Recent Spins
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {resultHistory.map((entry, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 flex flex-col items-center gap-1 px-2 py-1.5 rounded-lg"
                  style={{
                    background: "rgba(0,0,0,0.3)",
                    border: `1px solid ${entry.win > 0 ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.03)"}`,
                    minWidth: "60px",
                  }}
                >
                  <div className="flex gap-0.5">
                    {entry.grid.map((reel, r) => {
                      const vis = SYMBOL_VISUALS[reel[1]];
                      return (
                        <img
                          key={r}
                          src={vis?.src ?? '/images/symbols/c3po.svg'}
                          alt={vis?.name ?? reel[1]}
                          className="w-4 h-4 object-contain"
                        />
                      );
                    })}
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-bold",
                      entry.win > 0 ? "text-[#FFD700]" : "text-gray-600"
                    )}
                  >
                    {entry.win > 0
                      ? `+$${entry.win.toLocaleString()}`
                      : "---"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Paytable Modal ── */}
      <Modal
        open={showPaytable}
        onClose={() => setShowPaytable(false)}
        title="Paytable"
        size="lg"
      >
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-gray-400 mb-3">
            5-reel slot machine with 20 paylines. Match 3+ consecutive symbols from left.
            AT-AT is wild and substitutes for any symbol. 4-of-a-kind pays 2x, 5-of-a-kind pays 5x!
          </p>

          {/* Payline patterns */}
          <div className="mb-4 p-3 rounded-lg bg-black/30 border border-gray-800">
            <p className="text-xs font-semibold text-gray-300 mb-2">
              Payline Patterns (20 lines)
            </p>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {PAYLINE_LABELS.slice(0, 10).map((label, i) => {
                const line = getPaylines()[i];
                return (
                  <div key={label} className="text-center">
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: PAYLINE_COLORS[i] }}
                    >
                      {label}
                    </span>
                    <div className="grid grid-cols-5 gap-px mt-1">
                      {[0, 1, 2].map((row) =>
                        [0, 1, 2, 3, 4].map((reel) => (
                          <div
                            key={`${row}-${reel}`}
                            className="w-2 h-2 rounded-sm"
                            style={{
                              background:
                                line[reel] === row
                                  ? PAYLINE_COLORS[i]
                                  : "rgba(255,255,255,0.05)",
                            }}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Symbol payouts */}
          <div className="grid grid-cols-5 gap-2 text-xs text-gray-400 font-semibold uppercase tracking-wider pb-2 border-b border-gray-700">
            <span>Symbol</span>
            <span>Name</span>
            <span className="text-center">3x</span>
            <span className="text-center">4x</span>
            <span className="text-center">5x</span>
          </div>
          {SYMBOLS.map((sym) => {
            const visual = SYMBOL_VISUALS[sym.id];
            return (
              <div
                key={sym.id}
                className="grid grid-cols-5 gap-2 items-center py-2.5 border-b border-gray-800/50"
              >
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-lg"
                  style={{
                    background: getSymbolBg(sym.id),
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)",
                  }}
                >
                  <img
                    src={visual?.src ?? '/images/symbols/c3po.svg'}
                    alt={visual?.name ?? sym.name}
                    className="w-7 h-7 object-contain"
                    style={sym.id === 'star' ? { filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.6))' } : undefined}
                  />
                </div>
                <span className="text-sm text-gray-300" style={{ color: visual?.color }}>
                  {visual?.name ?? sym.name}
                </span>
                <span className="text-center text-[#FFD700] font-bold text-xs">
                  {sym.multiplier > 0 ? `${sym.multiplier}x` : "WILD"}
                </span>
                <span className="text-center text-[#FFA500] font-bold text-xs">
                  {sym.multiplier > 0 ? `${sym.multiplier * 2}x` : "WILD"}
                </span>
                <span className="text-center text-[#EF4444] font-bold text-xs">
                  {sym.multiplier > 0 ? `${sym.multiplier * 5}x` : "WILD"}
                </span>
              </div>
            );
          })}
          <div className="mt-4 pt-3 border-t border-gray-700 space-y-1">
            <p className="text-xs text-gray-400">
              <Sparkles className="w-3 h-3 inline mr-1 text-[#FFD700]" />
              AT-AT (Wild) substitutes for any symbol on a payline
            </p>
            <p className="text-xs text-gray-500">
              All wins are multiplied by your bet amount. Multiple paylines can
              win simultaneously.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
