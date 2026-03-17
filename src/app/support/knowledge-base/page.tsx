'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Search, ChevronDown, ChevronRight, Book,
  CreditCard, Shield, Gamepad2, Gift, Settings, HelpCircle, Users
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Article {
  id: string
  title: string
  content: string
  category: string
}

const categories = [
  { id: 'getting-started', name: 'Getting Started', icon: Book, color: 'text-[var(--casino-blue)]' },
  { id: 'account', name: 'Account & Security', icon: Shield, color: 'text-[var(--casino-green)]' },
  { id: 'credits', name: 'Credits & Store', icon: CreditCard, color: 'text-[var(--casino-accent)]' },
  { id: 'games', name: 'Games & Fairness', icon: Gamepad2, color: 'text-[var(--casino-purple-light)]' },
  { id: 'bonuses', name: 'Bonuses & Rewards', icon: Gift, color: 'text-[var(--casino-red)]' },
  { id: 'settings', name: 'Settings & Preferences', icon: Settings, color: 'text-zinc-400' },
  { id: 'social', name: 'Social & Referrals', icon: Users, color: 'text-cyan-400' },
]

const articles: Article[] = [
  // Getting Started
  { id: 'gs-1', category: 'getting-started', title: 'How to create an account', content: 'Visit the registration page and fill in your username, email, and password. You must be 18 or older to play. After registration, verify your email to activate your account. You\'ll receive 10,000 free credits as a welcome bonus!' },
  { id: 'gs-2', category: 'getting-started', title: 'What are Fortuna Credits?', content: 'Fortuna Credits are virtual entertainment tokens used to play games on our platform. They have NO monetary value and cannot be exchanged for real money. Credits are purely for entertainment purposes.' },
  { id: 'gs-3', category: 'getting-started', title: 'How to play your first game', content: 'After logging in, visit the Game Lobby (homepage) and choose any game. Set your bet amount using the controls, and click the play/spin/deal button. Each game has its own rules explained on the game page.' },
  { id: 'gs-4', category: 'getting-started', title: 'Guest mode vs registered account', content: 'Guest mode lets you try games with demo credits that aren\'t saved. Registering gives you persistent credits, access to bonuses, leaderboards, tournaments, and all platform features.' },

  // Account & Security
  { id: 'ac-1', category: 'account', title: 'How to enable Two-Factor Authentication (2FA)', content: 'Go to Profile > Security Settings > Enable 2FA. You\'ll need an authenticator app (like Google Authenticator or Authy). Scan the QR code, enter the 6-digit code to verify, and save your backup codes securely.' },
  { id: 'ac-2', category: 'account', title: 'How to reset your password', content: 'Click "Forgot password?" on the login page. Enter your email address and we\'ll send a password reset link. Click the link in the email and set a new password. The link expires in 1 hour.' },
  { id: 'ac-3', category: 'account', title: 'How to change your username', content: 'Currently, usernames cannot be changed after registration. Choose your username carefully when creating your account. Contact support if you have a special circumstance.' },
  { id: 'ac-4', category: 'account', title: 'Account security best practices', content: 'Use a strong, unique password. Enable 2FA for extra protection. Never share your login credentials. Log out on shared devices. Review your game history regularly for any unauthorized activity.' },

  // Credits & Store
  { id: 'cr-1', category: 'credits', title: 'How to purchase credits', content: 'Visit the Credit Store from the header menu or navigation. Choose a credit package, click Buy, and complete the checkout with your card. Credits are added to your account instantly after payment.' },
  { id: 'cr-2', category: 'credits', title: 'Are credits refundable?', content: 'Credit purchases are generally non-refundable as they are consumed upon purchase. If you experience a technical issue with a purchase, contact support within 48 hours for assistance.' },
  { id: 'cr-3', category: 'credits', title: 'Understanding balance types', content: 'Your balance has two components: Purchased Credits (from the store) and Bonus Credits (from rewards, missions, etc.). Both can be used for gameplay. The wallet page shows the breakdown.' },
  { id: 'cr-4', category: 'credits', title: 'Daily bonus and free credits', content: 'Log in daily to claim your daily bonus! The bonus increases with consecutive login streaks. You can also earn credits through missions, achievements, referrals, and tournament prizes.' },

  // Games & Fairness
  { id: 'gm-1', category: 'games', title: 'What is Provably Fair?', content: 'Provably Fair is a cryptographic system that lets you verify every game result is random and not manipulated. Each game uses server seeds and client seeds to generate results. You can verify any game result on our Provably Fair page.' },
  { id: 'gm-2', category: 'games', title: 'Available games', content: 'We offer 15+ games: Slots, Blackjack, Roulette, Poker, Texas Hold\'em, Crash, Plinko, Dice, Coin Flip, Hi-Lo, Keno, Limbo, Mines, Lottery, and Jackpot. New games are added regularly!' },
  { id: 'gm-3', category: 'games', title: 'What is the house edge?', content: 'The house edge is the mathematical advantage built into each game, typically 1-5%. This means over time, the platform retains a small percentage while players enjoy entertainment. Each game\'s specific house edge is listed on its page.' },
  { id: 'gm-4', category: 'games', title: 'Game disconnection policy', content: 'If you disconnect during a game, your bet is still processed server-side. Check your game history after reconnecting. For incomplete games (like blackjack hands), the system will resolve them automatically.' },

  // Bonuses & Rewards
  { id: 'bn-1', category: 'bonuses', title: 'VIP tier system explained', content: 'There are 5 VIP tiers: Bronze, Silver, Gold, Platinum, and Diamond. Tiers are based on total credits wagered. Higher tiers unlock better daily bonuses, exclusive tournaments, and special perks.' },
  { id: 'bn-2', category: 'bonuses', title: 'How missions work', content: 'Missions are daily and weekly challenges that reward credits. Examples: "Play 10 rounds of Slots" or "Win 5 Blackjack hands." Complete missions to earn bonus credits and XP.' },
  { id: 'bn-3', category: 'bonuses', title: 'Battle Pass system', content: 'The Battle Pass offers a progression track with rewards at each level. Play games to earn XP and unlock tiers. The free track has basic rewards; premium features are available for active players.' },
  { id: 'bn-4', category: 'bonuses', title: 'Referral program', content: 'Share your referral code with friends. When they sign up and start playing, both of you earn bonus credits! Check the Referrals page for your unique code and tracking.' },

  // Settings
  { id: 'st-1', category: 'settings', title: 'Sound and mute settings', content: 'Click the speaker icon in the header to toggle sound on/off. Game sounds include win animations, card dealing, and spin effects.' },
  { id: 'st-2', category: 'settings', title: 'Language settings', content: 'Fortuna Casino supports 10 languages. Use the language switcher in the footer to change your preferred language. The setting is saved automatically.' },
  { id: 'st-3', category: 'settings', title: 'Responsible gambling tools', content: 'Visit the Responsible Gambling page to set deposit limits, loss limits, wager limits, and session time limits. You can also self-exclude for periods of 24 hours to 90 days.' },

  // Social
  { id: 'so-1', category: 'social', title: 'How leaderboards work', content: 'Leaderboards rank players by various metrics: highest balance, most wagered, biggest wins, and more. Rankings update in real-time. Top players earn bragging rights and special recognition!' },
  { id: 'so-2', category: 'social', title: 'Tournament participation', content: 'Tournaments are competitive events with prize pools. Check the Tournaments page for active and upcoming events. Some tournaments have entry fees, others are free. Play the designated game during the tournament period to score points.' },
]

export default function KnowledgeBasePage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null)

  const filteredArticles = searchQuery.trim()
    ? articles.filter(
        (a) =>
          a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : articles

  const getArticlesForCategory = (catId: string) =>
    filteredArticles.filter((a) => a.category === catId)

  return (
    <div className="min-h-screen bg-[var(--casino-bg)]">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/support')} className="text-[var(--casino-text-muted)] hover:text-white transition-colors cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Book className="w-7 h-7 text-[var(--casino-accent)]" />
          <h1 className="text-2xl font-bold text-white">Knowledge Base</h1>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--casino-text-muted)]" />
          <input
            type="text"
            placeholder="Search for help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-[var(--casino-border)] bg-[var(--casino-card)] text-white placeholder-[var(--casino-text-muted)] outline-none focus:border-[var(--casino-accent)] transition-colors"
          />
        </div>

        {/* Search results mode */}
        {searchQuery.trim() ? (
          <div className="space-y-3">
            <p className="text-sm text-[var(--casino-text-muted)] mb-4">
              {filteredArticles.length} result{filteredArticles.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;
            </p>
            {filteredArticles.map((article) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-[var(--casino-border)] bg-[var(--casino-card)] overflow-hidden"
              >
                <button
                  onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}
                  className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer"
                >
                  <div>
                    <h3 className="font-semibold text-white text-sm">{article.title}</h3>
                    <p className="text-xs text-[var(--casino-text-muted)] mt-0.5 capitalize">{article.category.replace('-', ' ')}</p>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[var(--casino-text-muted)] transition-transform ${expandedArticle === article.id ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {expandedArticle === article.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-4 text-sm text-[var(--casino-text-muted)] leading-relaxed border-t border-[var(--casino-border)] pt-3">
                        {article.content}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Category browse mode */
          <div className="space-y-4">
            {categories.map((category) => {
              const catArticles = getArticlesForCategory(category.id)
              if (catArticles.length === 0) return null
              const isExpanded = expandedCategory === category.id

              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-[var(--casino-border)] bg-[var(--casino-card)] overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                    className="w-full px-5 py-4 flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <category.icon className={`w-5 h-5 ${category.color}`} />
                      <div className="text-left">
                        <h2 className="font-bold text-white">{category.name}</h2>
                        <p className="text-xs text-[var(--casino-text-muted)]">{catArticles.length} articles</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-[var(--casino-text-muted)] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t border-[var(--casino-border)]"
                      >
                        <div className="p-2">
                          {catArticles.map((article) => (
                            <div key={article.id}>
                              <button
                                onClick={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}
                                className="w-full px-4 py-3 flex items-center justify-between rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                              >
                                <span className="text-sm text-[var(--casino-text-muted)] hover:text-white text-left">{article.title}</span>
                                <ChevronRight className={`w-4 h-4 text-[var(--casino-text-muted)] transition-transform ${expandedArticle === article.id ? 'rotate-90' : ''}`} />
                              </button>
                              <AnimatePresence>
                                {expandedArticle === article.id && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-3 text-sm text-[var(--casino-text-muted)] leading-relaxed ml-4 border-l-2 border-[var(--casino-accent)]/20 pl-4">
                                      {article.content}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Still need help? */}
        <div className="mt-10 text-center">
          <HelpCircle className="w-8 h-8 text-[var(--casino-text-muted)] mx-auto mb-3" />
          <p className="text-[var(--casino-text-muted)] mb-3">Still need help?</p>
          <Link href="/support/tickets/new">
            <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--gold-dark)] via-[var(--gold)] to-[var(--gold-light)] text-black font-semibold text-sm cursor-pointer hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all">
              Submit a Support Ticket
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
