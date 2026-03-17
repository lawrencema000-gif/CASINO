'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, User, Loader2, MinusCircle } from 'lucide-react'
import { cn } from './cn'

interface Message {
  id: string
  role: 'user' | 'bot'
  text: string
  time: Date
}

const FAQ_RESPONSES: Record<string, string> = {
  deposit: 'To deposit funds, go to your Wallet page and click "Add Funds". We support various payment methods. If you need help, create a support ticket.',
  withdraw: 'Withdrawals can be initiated from your Wallet page. Processing time depends on the method chosen. Minimum withdrawal is 100 credits.',
  bonus: 'Check the Promotions page for current bonuses! New players get a welcome bonus, and daily login bonuses are available. Use promo codes for extra rewards.',
  fairness: 'All our games are provably fair using HMAC-SHA256 cryptographic verification. Visit the Provably Fair page to verify any game result.',
  vip: 'Our VIP program has 5 tiers: Bronze, Silver, Gold, Platinum, and Diamond. You automatically level up based on your total wagered amount. Higher tiers unlock better rewards!',
  limits: 'You can set daily loss limits, deposit limits, and session time limits on the Responsible Gambling page. Self-exclusion is also available.',
  account: 'To manage your account, visit the Profile page. You can update your username, change password, enable 2FA, and manage your settings.',
  support: 'For personalized help, create a support ticket at /support. Our team typically responds within 24 hours.',
  referral: 'Share your referral code with friends! They get 200 bonus credits on signup, and you earn 500 credits when they wager 500 credits. Find your code on the Referrals page.',
}

function getBotResponse(message: string): string {
  const lower = message.toLowerCase()

  for (const [keyword, response] of Object.entries(FAQ_RESPONSES)) {
    if (lower.includes(keyword)) return response
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'Hello! Welcome to Fortuna Casino support. How can I help you today? You can ask about deposits, withdrawals, bonuses, VIP, game fairness, or account settings.'
  }

  if (lower.includes('thank')) {
    return 'You\'re welcome! Is there anything else I can help you with?'
  }

  if (lower.includes('game') || lower.includes('play')) {
    return 'We offer 15+ games including Slots, Blackjack, Roulette, Poker, Crash, Plinko, and more! Visit the Lobby to see all available games.'
  }

  return 'I\'m not sure about that. For more specific help, please create a support ticket at /support and our team will assist you. You can also ask about: deposits, withdrawals, bonuses, VIP, fairness, limits, account, or referrals.'
}

export default function LiveChat() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'bot',
      text: 'Hi! I\'m Fortuna Bot. How can I help you today? Ask about deposits, bonuses, VIP, or anything else!',
      time: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [unread, setUnread] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      time: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700))

    const botResponse = getBotResponse(userMsg.text)
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'bot',
      text: botResponse,
      time: new Date(),
    }

    setMessages(prev => [...prev, botMsg])
    setTyping(false)

    if (!isOpen || isMinimized) {
      setUnread(prev => prev + 1)
    }
  }

  const handleOpen = () => {
    setIsOpen(true)
    setIsMinimized(false)
    setUnread(0)
  }

  const formatTime = (d: Date) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <>
      {/* Chat Bubble Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={handleOpen}
            className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-black shadow-lg hover:shadow-[0_0_25px_rgba(255,215,0,0.4)] transition-shadow flex items-center justify-center cursor-pointer"
          >
            <MessageCircle className="w-6 h-6" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--casino-red)] text-white text-[10px] font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-48px)] rounded-2xl overflow-hidden',
              'bg-[var(--casino-card)] border border-[var(--casino-border)] shadow-2xl',
              'flex flex-col',
              isMinimized ? 'h-14' : 'h-[500px] max-h-[calc(100vh-100px)]'
            )}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[var(--gold-dark)]/20 to-[var(--casino-purple)]/20 border-b border-[var(--casino-border)] cursor-pointer"
              onClick={() => { if (isMinimized) { setIsMinimized(false); setUnread(0) } }}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] flex items-center justify-center">
                  <Bot className="w-4 h-4 text-black" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Fortuna Support</p>
                  <p className="text-[10px] text-[var(--casino-green)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--casino-green)] live-pulse" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized) }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <MinusCircle className="w-4 h-4 text-[var(--casino-text-muted)]" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-4 h-4 text-[var(--casino-text-muted)]" />
                </button>
              </div>
            </div>

            {/* Messages */}
            {!isMinimized && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' ? 'flex-row-reverse' : '')}>
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                        msg.role === 'bot'
                          ? 'bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)]'
                          : 'bg-[var(--casino-purple)]/30'
                      )}>
                        {msg.role === 'bot'
                          ? <Bot className="w-3.5 h-3.5 text-black" />
                          : <User className="w-3.5 h-3.5 text-[var(--casino-purple-light)]" />
                        }
                      </div>
                      <div className={cn(
                        'max-w-[75%] rounded-2xl px-3 py-2',
                        msg.role === 'bot'
                          ? 'bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-tl-sm'
                          : 'bg-[var(--casino-accent)]/15 border border-[var(--casino-accent)]/20 rounded-tr-sm'
                      )}>
                        <p className="text-sm text-white leading-relaxed">{msg.text}</p>
                        <p className="text-[10px] text-[var(--casino-text-muted)] mt-1">{formatTime(msg.time)}</p>
                      </div>
                    </div>
                  ))}

                  {typing && (
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--gold)] to-[var(--gold-dark)] flex items-center justify-center flex-shrink-0">
                        <Bot className="w-3.5 h-3.5 text-black" />
                      </div>
                      <div className="bg-[var(--casino-surface)] border border-[var(--casino-border)] rounded-2xl rounded-tl-sm px-4 py-3">
                        <Loader2 className="w-4 h-4 text-[var(--casino-text-muted)] animate-spin" />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="px-4 py-2 border-t border-[var(--casino-border)] flex gap-1.5 overflow-x-auto">
                  {['Deposit help', 'Bonus info', 'VIP tiers', 'Game fairness'].map((q) => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="px-2.5 py-1 rounded-full bg-[var(--casino-surface)] border border-[var(--casino-border)] text-[10px] text-[var(--casino-text-muted)] hover:text-white hover:border-[var(--casino-accent)]/30 transition whitespace-nowrap cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="p-3 border-t border-[var(--casino-border)]">
                  <div className="flex gap-2">
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 rounded-xl bg-[var(--casino-surface)] border border-[var(--casino-border)] text-sm text-white placeholder-[var(--casino-text-muted)]/50 focus:outline-none focus:border-[var(--casino-accent)]/50"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="w-9 h-9 rounded-xl bg-gradient-to-r from-[var(--gold-dark)] to-[var(--gold)] flex items-center justify-center text-black disabled:opacity-30 cursor-pointer transition-opacity"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
