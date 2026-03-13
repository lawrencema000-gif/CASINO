"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Rocket, TrendingUp, Users, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBalance } from "@/hooks/useBalance";
import { useGame } from "@/hooks/useGame";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { cn } from "@/components/ui/cn";

type RoundPhase = "waiting" | "running" | "crashed" | "cashedout";

interface CrashHistory {
  crashPoint: number;
  cashedAt: number | null;
  bet: number;
  profit: number;
}

interface FakePlayer {
  name: string;
  bet: number;
  cashedAt: number | null;
  active: boolean;
}

const FAKE_NAMES = [
  "CryptoKing", "LuckyStar", "HighRoller", "MoonShot", "DiamondHands",
  "NeonWolf", "GoldRush", "AcePlayer", "ShadowBet", "ThunderBolt",
  "RiskTaker", "BigWinner", "CasinoRat", "JackpotJoe", "VegasViper",
];

function generateFakePlayers(): FakePlayer[] {
  const count = 5 + Math.floor(Math.random() * 8);
  const shuffled = [...FAKE_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((name) => ({
    name,
    bet: Math.floor(Math.random() * 5000 + 50),
    cashedAt: null,
    active: true,
  }));
}

function generateCrashPoint(): number {
  // e-distribution for realistic crash points
  const r = Math.random();
  const crash = 1 / (1 - r);
  return Math.max(1.0, parseFloat(Math.min(crash, 100).toFixed(2)));
}

export default function CrashPage() {
  const { user } = useAuth();
  const { balance, refreshBalance } = useBalance(user?.id);
  const { placeBet, loading } = useGame(() => refreshBalance());

  const [phase, setPhase] = useState<RoundPhase>("waiting");
  const [multiplier, setMultiplier] = useState(1.0);
  const [crashPoint, setCrashPoint] = useState(0);
  const [betAmount, setBetAmount] = useState(100);
  const [autoCashout, setAutoCashout] = useState(2.0);
  const [hasBet, setHasBet] = useState(false);
  const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
  const [history, setHistory] = useState<CrashHistory[]>([]);
  const [fakePlayers, setFakePlayers] = useState<FakePlayer[]>([]);
  const [countdown, setCountdown] = useState(0);
  const [graphPoints, setGraphPoints] = useState<{ x: number; y: number }[]>([]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const startTimeRef = useRef(0);
  const crashPointRef = useRef(0);
  const multiplierRef = useRef(1.0);
  const phaseRef = useRef<RoundPhase>("waiting");
  const fakePlayersRef = useRef<FakePlayer[]>([]);
  const autoCashoutRef = useRef(2.0);
  const hasBetRef = useRef(false);
  const cashedOutRef = useRef(false);

  // Keep refs in sync
  useEffect(() => { autoCashoutRef.current = autoCashout; }, [autoCashout]);
  useEffect(() => { hasBetRef.current = hasBet; }, [hasBet]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const drawGraph = useCallback((currentMult: number, crashed: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Background
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
      const y = (h / 10) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const x = (w / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    if (currentMult <= 1) return;

    // Calculate curve points
    const maxTime = Math.log(currentMult) / 0.06;
    const points: { x: number; y: number }[] = [];
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * maxTime;
      const m = Math.exp(0.06 * t);
      const x = (i / steps) * w;
      const maxMult = Math.max(currentMult, 2);
      const y = h - ((m - 1) / (maxMult - 1)) * (h * 0.85) - h * 0.05;
      points.push({ x, y });
    }

    // Gradient under curve
    const gradient = ctx.createLinearGradient(0, h, 0, 0);
    if (crashed) {
      gradient.addColorStop(0, "rgba(255,59,92,0)");
      gradient.addColorStop(1, "rgba(255,59,92,0.15)");
    } else if (currentMult < 2) {
      gradient.addColorStop(0, "rgba(255,255,255,0)");
      gradient.addColorStop(1, "rgba(255,255,255,0.05)");
    } else if (currentMult < 5) {
      gradient.addColorStop(0, "rgba(0,255,136,0)");
      gradient.addColorStop(1, "rgba(0,255,136,0.1)");
    } else if (currentMult < 10) {
      gradient.addColorStop(0, "rgba(201,162,39,0)");
      gradient.addColorStop(1, "rgba(201,162,39,0.1)");
    } else {
      gradient.addColorStop(0, "rgba(255,59,92,0)");
      gradient.addColorStop(1, "rgba(255,59,92,0.1)");
    }

    ctx.beginPath();
    ctx.moveTo(0, h);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineTo(points[points.length - 1]?.x ?? 0, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Curve line
    ctx.beginPath();
    ctx.moveTo(points[0]?.x ?? 0, points[0]?.y ?? h);
    points.forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.lineWidth = 3;

    if (crashed) {
      ctx.strokeStyle = "#ff3b5c";
    } else if (currentMult < 2) {
      ctx.strokeStyle = "#ffffff";
    } else if (currentMult < 5) {
      ctx.strokeStyle = "#00ff88";
    } else if (currentMult < 10) {
      ctx.strokeStyle = "#e6c84a";
    } else {
      ctx.strokeStyle = "#ff3b5c";
    }
    ctx.stroke();

    // Rocket at end of curve
    if (!crashed && points.length > 0) {
      const last = points[points.length - 1];
      ctx.font = "24px serif";
      ctx.fillText("\u{1F680}", last.x - 12, last.y - 10);
    }

    // Crashed explosion
    if (crashed && points.length > 0) {
      const last = points[points.length - 1];
      ctx.font = "32px serif";
      ctx.fillText("\u{1F4A5}", last.x - 16, last.y - 5);
    }
  }, []);

  const handleCashout = useCallback(() => {
    if (phaseRef.current !== "running" || !hasBetRef.current || cashedOutRef.current) return;
    cashedOutRef.current = true;
    const cashAt = multiplierRef.current;
    setCashedOutAt(cashAt);
    setPhase("cashedout");
    phaseRef.current = "cashedout";
  }, []);

  const startRound = useCallback(async () => {
    // Countdown phase
    setPhase("waiting");
    phaseRef.current = "waiting";
    setCashedOutAt(null);
    cashedOutRef.current = false;
    setMultiplier(1.0);
    multiplierRef.current = 1.0;

    const players = generateFakePlayers();
    setFakePlayers(players);
    fakePlayersRef.current = players;

    // 3-second countdown
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      await new Promise((r) => setTimeout(r, 1000));
    }
    setCountdown(0);

    // Generate crash point
    const cp = generateCrashPoint();
    setCrashPoint(cp);
    crashPointRef.current = cp;

    // Place actual bet if user has one
    if (hasBetRef.current && betAmount > 0) {
      await placeBet({
        gameType: "crash",
        betAmount,
        gameData: { autoCashout: autoCashoutRef.current },
      });
    }

    // Start animation
    setPhase("running");
    phaseRef.current = "running";
    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000;
      const currentMult = parseFloat(Math.exp(0.06 * elapsed).toFixed(2));
      multiplierRef.current = currentMult;
      setMultiplier(currentMult);

      // Auto-cashout fake players
      const updatedPlayers = fakePlayersRef.current.map((p) => {
        if (p.active && !p.cashedAt) {
          const cashThreshold = 1.1 + Math.random() * (crashPointRef.current * 0.9);
          if (currentMult >= cashThreshold && Math.random() < 0.03) {
            return { ...p, cashedAt: currentMult, active: false };
          }
        }
        return p;
      });
      fakePlayersRef.current = updatedPlayers;
      setFakePlayers([...updatedPlayers]);

      // Auto-cashout for player
      if (
        hasBetRef.current &&
        !cashedOutRef.current &&
        phaseRef.current === "running" &&
        autoCashoutRef.current > 0 &&
        currentMult >= autoCashoutRef.current
      ) {
        cashedOutRef.current = true;
        setCashedOutAt(currentMult);
        setPhase("cashedout");
        phaseRef.current = "cashedout";
      }

      drawGraph(currentMult, false);

      // Check crash
      if (currentMult >= crashPointRef.current) {
        // CRASHED
        setMultiplier(crashPointRef.current);
        drawGraph(crashPointRef.current, true);

        const finalPhase = phaseRef.current;
        if (finalPhase === "running") {
          setPhase("crashed");
          phaseRef.current = "crashed";
        }

        // Record history
        const profit =
          cashedOutRef.current && cashedOutRef.current
            ? betAmount * ((cashedOutRef.current ? multiplierRef.current : 0) - 1)
            : -betAmount;

        setHistory((prev) =>
          [
            {
              crashPoint: crashPointRef.current,
              cashedAt: cashedOutRef.current ? (finalPhase === "cashedout" ? multiplierRef.current : null) : null,
              bet: hasBetRef.current ? betAmount : 0,
              profit: hasBetRef.current ? profit : 0,
            },
            ...prev,
          ].slice(0, 20)
        );

        setHasBet(false);
        hasBetRef.current = false;
        refreshBalance();

        // Auto-restart after delay
        setTimeout(() => {
          startRound();
        }, 3000);
        return;
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
  }, [betAmount, drawGraph, placeBet, refreshBalance]);

  // Start first round
  useEffect(() => {
    startRound();
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlaceBet = () => {
    if (phase !== "waiting" && phase !== "crashed") return;
    if (betAmount <= 0 || betAmount > balance) return;
    setHasBet(true);
    hasBetRef.current = true;
  };

  const getMultiplierColor = (m: number) => {
    if (m < 2) return "text-white";
    if (m < 5) return "text-[#00ff88]";
    if (m < 10) return "text-[#e6c84a]";
    return "text-[#ff3b5c]";
  };

  const getCrashBadgeColor = (cp: number) => {
    if (cp < 1.5) return "bg-[#ff3b5c]/20 text-[#ff3b5c] border-[#ff3b5c]/30";
    if (cp < 3) return "bg-white/10 text-white/70 border-white/20";
    if (cp < 10) return "bg-[#00ff88]/20 text-[#00ff88] border-[#00ff88]/30";
    return "bg-[#e6c84a]/20 text-[#e6c84a] border-[#e6c84a]/30";
  };

  return (
    <div className="min-h-screen bg-[var(--casino-bg)] py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Rocket className="w-8 h-8 text-[#ff3b5c]" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#ff3b5c] to-[#ff6b81] bg-clip-text text-transparent">
            Crash
          </h1>
          <div className="ml-auto text-[#c9a227] font-semibold text-lg">
            {balance.toLocaleString()} credits
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Game Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Graph + Multiplier */}
            <Card glow="none" className="relative overflow-hidden">
              <div className="relative" style={{ minHeight: 350 }}>
                <canvas
                  ref={canvasRef}
                  className="w-full rounded-xl"
                  style={{ height: 350, display: "block" }}
                />

                {/* Multiplier Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Countdown */}
                  {countdown > 0 && (
                    <motion.div
                      key={countdown}
                      initial={{ scale: 2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      className="text-6xl font-black text-white/80"
                    >
                      {countdown}
                    </motion.div>
                  )}

                  {/* Running Multiplier */}
                  {phase === "running" && countdown === 0 && (
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ repeat: Infinity, duration: 0.5 }}
                      className={cn("text-6xl md:text-7xl font-black", getMultiplierColor(multiplier))}
                    >
                      {multiplier.toFixed(2)}x
                    </motion.div>
                  )}

                  {/* Cashed Out Multiplier */}
                  {phase === "cashedout" && (
                    <div className="text-center">
                      <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className="text-5xl md:text-6xl font-black text-[#00ff88]"
                      >
                        {cashedOutAt?.toFixed(2)}x
                      </motion.div>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xl font-bold text-[#00ff88] mt-2"
                      >
                        CASHED OUT +{((cashedOutAt ?? 0) * betAmount - betAmount).toFixed(2)}
                      </motion.div>
                    </div>
                  )}

                  {/* Crashed */}
                  {phase === "crashed" && (
                    <motion.div
                      initial={{ scale: 3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="text-center"
                    >
                      <div className="text-5xl md:text-6xl font-black text-[#ff3b5c]">
                        CRASHED!
                      </div>
                      <div className="text-2xl font-bold text-[#ff3b5c]/70 mt-2">
                        {crashPoint.toFixed(2)}x
                      </div>
                    </motion.div>
                  )}

                  {/* Waiting */}
                  {phase === "waiting" && countdown === 0 && (
                    <div className="text-xl text-white/40 font-bold">
                      Starting next round...
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Controls */}
            <Card>
              <div className="flex flex-col md:flex-row gap-4">
                {/* Bet Input */}
                <div className="flex-1 space-y-3">
                  <label className="text-xs text-white/40 uppercase tracking-wider font-bold">Bet Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                      disabled={hasBet}
                      className="flex-1 bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold
                        focus:outline-none focus:border-[#c9a227] focus:shadow-[0_0_10px_rgba(201,162,39,0.2)] transition-all
                        disabled:opacity-50"
                    />
                    <button
                      onClick={() => setBetAmount(Math.max(1, Math.floor(betAmount / 2)))}
                      disabled={hasBet}
                      className="px-3 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-[#c9a227] transition-all font-bold text-sm disabled:opacity-50"
                    >
                      1/2
                    </button>
                    <button
                      onClick={() => setBetAmount(Math.min(balance, betAmount * 2))}
                      disabled={hasBet}
                      className="px-3 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-[#c9a227] transition-all font-bold text-sm disabled:opacity-50"
                    >
                      2x
                    </button>
                    <button
                      onClick={() => setBetAmount(balance)}
                      disabled={hasBet}
                      className="px-3 py-3 bg-[#1a1a2e] border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-[#ff3b5c] transition-all font-bold text-sm disabled:opacity-50"
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* Auto Cashout */}
                <div className="w-full md:w-44 space-y-3">
                  <label className="text-xs text-white/40 uppercase tracking-wider font-bold">Auto Cashout</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1.1"
                    value={autoCashout}
                    onChange={(e) => setAutoCashout(Math.max(1.1, parseFloat(e.target.value) || 1.1))}
                    className="w-full bg-[#1a1a2e] border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold
                      focus:outline-none focus:border-[#c9a227] focus:shadow-[0_0_10px_rgba(201,162,39,0.2)] transition-all"
                  />
                </div>

                {/* Action Button */}
                <div className="flex items-end">
                  {phase === "running" && hasBet && !cashedOutRef.current ? (
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    >
                      <Button
                        variant="success"
                        size="lg"
                        className="px-10 py-3 text-lg font-black whitespace-nowrap"
                        onClick={handleCashout}
                      >
                        CASHOUT {multiplier.toFixed(2)}x
                      </Button>
                    </motion.div>
                  ) : (phase === "waiting" || phase === "crashed") && !hasBet ? (
                    <Button
                      variant="primary"
                      size="lg"
                      className="px-10 py-3 text-lg font-black whitespace-nowrap"
                      onClick={handlePlaceBet}
                      disabled={betAmount <= 0 || betAmount > balance}
                    >
                      PLACE BET
                    </Button>
                  ) : hasBet ? (
                    <Button
                      variant="ghost"
                      size="lg"
                      className="px-10 py-3 text-lg font-black whitespace-nowrap"
                      disabled
                    >
                      BET PLACED
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="lg"
                      className="px-10 py-3 text-lg font-black whitespace-nowrap opacity-50"
                      disabled
                    >
                      WAIT...
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Round History */}
            <Card>
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">Round History</h3>
              <div className="flex flex-wrap gap-2">
                {history.length === 0 && <span className="text-white/30 text-sm">No rounds yet</span>}
                {history.map((h, i) => (
                  <motion.div
                    key={`${i}-${h.crashPoint}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold border",
                      getCrashBadgeColor(h.crashPoint)
                    )}
                  >
                    {h.crashPoint.toFixed(2)}x
                  </motion.div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar - Players */}
          <div className="space-y-6">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-white/40" />
                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider">
                  Players ({fakePlayers.length + (hasBet ? 1 : 0)})
                </h3>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {/* Current User */}
                {hasBet && (
                  <div
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg text-sm border",
                      cashedOutAt
                        ? "bg-[#00ff88]/10 border-[#00ff88]/20"
                        : phase === "crashed"
                        ? "bg-[#ff3b5c]/10 border-[#ff3b5c]/20"
                        : "bg-[#c9a227]/10 border-[#c9a227]/20"
                    )}
                  >
                    <div>
                      <div className="font-bold text-[#c9a227] text-xs">You</div>
                      <div className="text-white/50 text-xs">{betAmount}</div>
                    </div>
                    {cashedOutAt ? (
                      <span className="text-[#00ff88] font-bold text-xs">{cashedOutAt.toFixed(2)}x</span>
                    ) : phase === "crashed" ? (
                      <span className="text-[#ff3b5c] font-bold text-xs">BUST</span>
                    ) : (
                      <span className="text-white/40 text-xs">Playing</span>
                    )}
                  </div>
                )}

                {/* Fake Players */}
                {fakePlayers.map((p, i) => (
                  <div
                    key={p.name}
                    className={cn(
                      "flex items-center justify-between p-2 rounded-lg text-sm border",
                      p.cashedAt
                        ? "bg-[#00ff88]/5 border-[#00ff88]/10"
                        : phase === "crashed" && !p.cashedAt
                        ? "bg-[#ff3b5c]/5 border-[#ff3b5c]/10"
                        : "bg-white/[0.02] border-white/5"
                    )}
                  >
                    <div>
                      <div className="font-medium text-white/70 text-xs">{p.name}</div>
                      <div className="text-white/30 text-xs">{p.bet}</div>
                    </div>
                    {p.cashedAt ? (
                      <span className="text-[#00ff88] font-bold text-xs">{p.cashedAt.toFixed(2)}x</span>
                    ) : phase === "crashed" ? (
                      <span className="text-[#ff3b5c]/60 font-bold text-xs">BUST</span>
                    ) : (
                      <Zap className="w-3 h-3 text-[#e6c84a] animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* How to Play */}
            <Card>
              <h3 className="text-sm font-bold text-white/60 uppercase tracking-wider mb-3">How to Play</h3>
              <ul className="text-white/40 text-sm space-y-2">
                <li>1. Place bet before round starts</li>
                <li>2. Watch the multiplier rise</li>
                <li>3. Cash out before it crashes!</li>
                <li>4. Set auto-cashout for safety</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
