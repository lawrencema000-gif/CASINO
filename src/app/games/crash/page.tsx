'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import BetControls from '@/components/ui/BetControls'
import { generateCrashPoint, tick } from '@/lib/games/crash'

type Phase = 'betting' | 'countdown' | 'running' | 'crashed' | 'cashedOut'

interface CrashHistory {
  crashPoint: number
}

export default function CrashPage() {
  const [balance, setBalance] = useState(10000)
  const [betAmount, setBetAmount] = useState(100)
  const [phase, setPhase] = useState<Phase>('betting')
  const [currentMultiplier, setCurrentMultiplier] = useState(1)
  const [crashPoint, setCrashPoint] = useState(0)
  const [cashOutAt, setCashOutAt] = useState<number | null>(null)
  const [autoCashOut, setAutoCashOut] = useState(2)
  const [countdown, setCountdown] = useState(3)
  const [history, setHistory] = useState<CrashHistory[]>([])
  const [graphPoints, setGraphPoints] = useState<{ t: number; m: number }[]>([])

  const animRef = useRef<number>(0)
  const startTimeRef = useRef(0)
  const crashPointRef = useRef(0)
  const cashedOutRef = useRef(false)
  const betAmountRef = useRef(0)
  const autoCashOutRef = useRef(2)

  useEffect(() => { autoCashOutRef.current = autoCashOut }, [autoCashOut])

  const startGame = useCallback(() => {
    if (betAmount > balance || betAmount <= 0) return

    setBalance(prev => prev - betAmount)
    betAmountRef.current = betAmount
    cashedOutRef.current = false
    setCashOutAt(null)

    const cp = generateCrashPoint(Math.random())
    setCrashPoint(cp)
    crashPointRef.current = cp

    setPhase('countdown')
    setCountdown(3)

    let count = 3
    const countInterval = setInterval(() => {
      count--
      setCountdown(count)
      if (count <= 0) {
        clearInterval(countInterval)
        setPhase('running')
        setCurrentMultiplier(1)
        setGraphPoints([{ t: 0, m: 1 }])
        startTimeRef.current = performance.now()

        const gameLoop = (now: number) => {
          const elapsed = now - startTimeRef.current
          const m = tick(elapsed)

          if (m >= crashPointRef.current) {
            setCurrentMultiplier(crashPointRef.current)
            setGraphPoints(prev => [...prev, { t: elapsed, m: crashPointRef.current }])
            if (!cashedOutRef.current) {
              setPhase('crashed')
            }
            setHistory(prev => [{ crashPoint: crashPointRef.current }, ...prev].slice(0, 10))
            return
          }

          if (!cashedOutRef.current && autoCashOutRef.current > 0 && m >= autoCashOutRef.current) {
            cashedOutRef.current = true
            setCashOutAt(m)
            setPhase('cashedOut')
            const payout = Math.floor(betAmountRef.current * m * 100) / 100
            setBalance(prev => prev + payout)
          }

          setCurrentMultiplier(m)
          setGraphPoints(prev => {
            const next = [...prev, { t: elapsed, m }]
            return next.length > 200 ? next.slice(-200) : next
          })

          animRef.current = requestAnimationFrame(gameLoop)
        }

        animRef.current = requestAnimationFrame(gameLoop)
      }
    }, 1000)
  }, [betAmount, balance])

  const handleCashOut = useCallback(() => {
    if (phase !== 'running' || cashedOutRef.current) return
    cashedOutRef.current = true
    setCashOutAt(currentMultiplier)
    setPhase('cashedOut')
    const payout = Math.floor(betAmountRef.current * currentMultiplier * 100) / 100
    setBalance(prev => prev + payout)
  }, [phase, currentMultiplier])

  const handleNewRound = useCallback(() => {
    setPhase('betting')
    setCashOutAt(null)
    setCurrentMultiplier(1)
    setGraphPoints([])
    if (animRef.current) cancelAnimationFrame(animRef.current)
  }, [])

  useEffect(() => {
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [])

  // Graph SVG
  const graphWidth = 600
  const graphHeight = 250
  const maxTime = graphPoints.length > 0 ? Math.max(graphPoints[graphPoints.length - 1].t, 1000) : 1000
  const maxMult = Math.max(currentMultiplier, 2)

  const toSvgPath = () => {
    if (graphPoints.length < 2) return ''
    return graphPoints.map((p, i) => {
      const x = (p.t / maxTime) * graphWidth
      const y = graphHeight - ((p.m - 1) / (maxMult - 1)) * (graphHeight - 20)
      return `${i === 0 ? 'M' : 'L'} ${x} ${Math.max(10, y)}`
    }).join(' ')
  }

  const isBetting = phase === 'betting'
  const isRunning = phase === 'running'
  const isCrashed = phase === 'crashed'
  const isCashedOut = phase === 'cashedOut'
  const isCountdown = phase === 'countdown'

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Top Bar */}
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-2 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Lobby</span>
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#FFD700]">Crash</h1>
          <p className="text-[10px] text-white/30">House Edge: 1%</p>
        </div>
        <div className="w-16" />
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-8 space-y-6">
        {/* Graph Area */}
        <div className={`relative rounded-2xl bg-[#1a1a25] border overflow-hidden transition-all duration-300 ${
          isCrashed ? 'border-[#EF4444]/50' : isCashedOut ? 'border-[#00FF88]/50' : 'border-white/5'
        }`}>
          {isCrashed && (
            <motion.div
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 bg-[#EF4444] z-20 pointer-events-none"
            />
          )}

          <div className="p-6 flex flex-col items-center min-h-[350px] justify-center relative">
            {/* SVG Graph */}
            {(isRunning || isCrashed || isCashedOut) && graphPoints.length > 1 && (
              <svg
                viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                className="absolute inset-0 w-full h-full opacity-40"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isCrashed ? '#EF4444' : '#00FF88'} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={isCrashed ? '#EF4444' : '#00FF88'} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`${toSvgPath()} L ${(graphPoints[graphPoints.length - 1].t / maxTime) * graphWidth} ${graphHeight} L 0 ${graphHeight} Z`}
                  fill="url(#curveGrad)"
                />
                <path
                  d={toSvgPath()}
                  fill="none"
                  stroke={isCrashed ? '#EF4444' : '#00FF88'}
                  strokeWidth="3"
                />
              </svg>
            )}

            {/* Multiplier Display */}
            <AnimatePresence mode="wait">
              {isCountdown && (
                <motion.div
                  key="countdown"
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="text-6xl font-black text-[#FFD700] z-10"
                >
                  Starting in {countdown}...
                </motion.div>
              )}

              {isRunning && (
                <motion.div
                  key="running"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center z-10"
                >
                  <div className="text-7xl md:text-9xl font-black text-[#00FF88] tabular-nums">
                    {currentMultiplier.toFixed(2)}x
                  </div>
                </motion.div>
              )}

              {isCrashed && (
                <motion.div
                  key="crashed"
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center z-10"
                >
                  <div className="text-5xl md:text-7xl font-black text-[#EF4444]">CRASHED</div>
                  <div className="text-3xl font-bold text-[#EF4444]/80 mt-2">@ {crashPoint.toFixed(2)}x</div>
                </motion.div>
              )}

              {isCashedOut && (
                <motion.div
                  key="cashedout"
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center z-10"
                >
                  <div className="text-5xl md:text-7xl font-black text-[#00FF88]">CASHED OUT</div>
                  <div className="text-3xl font-bold text-[#00FF88]/80 mt-2">@ {(cashOutAt ?? 1).toFixed(2)}x</div>
                  <div className="text-xl text-[#FFD700] mt-1">
                    +${(Math.floor(betAmountRef.current * (cashOutAt ?? 1) * 100) / 100).toFixed(2)}
                  </div>
                </motion.div>
              )}

              {isBetting && (
                <motion.div key="betting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center z-10">
                  <div className="text-4xl font-bold text-white/20">Place Your Bet</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Cash Out Button */}
        {isRunning && !cashedOutRef.current && (
          <motion.button
            initial={{ scale: 0.9 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            onClick={handleCashOut}
            className="w-full py-5 text-2xl font-black rounded-xl bg-gradient-to-r from-[#00cc6a] to-[#00FF88] text-black shadow-[0_0_40px_rgba(0,255,136,0.4)] hover:shadow-[0_0_60px_rgba(0,255,136,0.6)] transition-shadow cursor-pointer"
          >
            CASH OUT @ {currentMultiplier.toFixed(2)}x
          </motion.button>
        )}

        {/* New Round */}
        {(isCrashed || isCashedOut) && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleNewRound}
            className="w-full py-4 text-lg font-bold rounded-xl bg-[#1a1a25] border border-white/10 text-white hover:border-[#FFD700]/30 transition-all cursor-pointer"
          >
            New Round
          </motion.button>
        )}

        {/* Auto Cash Out */}
        {isBetting && (
          <div className="bg-[#1a1a25] rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-white/40">Auto Cash Out at:</span>
              <input
                type="number"
                min={1.1}
                step={0.1}
                value={autoCashOut}
                onChange={(e) => setAutoCashOut(Math.max(1.1, parseFloat(e.target.value) || 0))}
                className="bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-white font-bold w-24 focus:outline-none focus:border-[#FFD700]/50"
              />
              <span className="text-white/40">x</span>
              <button
                onClick={() => setAutoCashOut(0)}
                className="text-xs text-white/30 hover:text-white/60 cursor-pointer ml-auto"
              >
                Disable
              </button>
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-xs text-white/30 mr-2">Recent crashes:</span>
            {history.map((h, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  h.crashPoint >= 2 ? 'bg-[#00FF88]/15 text-[#00FF88]' :
                  h.crashPoint >= 1.5 ? 'bg-[#FFD700]/15 text-[#FFD700]' :
                  'bg-[#EF4444]/15 text-[#EF4444]'
                }`}
              >
                {h.crashPoint.toFixed(2)}x
              </motion.span>
            ))}
          </div>
        )}

        {/* Bet Controls - betting phase only */}
        {isBetting && (
          <BetControls
            balance={balance}
            betAmount={betAmount}
            onBetChange={setBetAmount}
            onPlay={startGame}
            disabled={false}
            playLabel="START ROUND"
          />
        )}
      </div>
    </div>
  )
}
