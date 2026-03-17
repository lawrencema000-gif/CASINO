# FORTUNA CASINO — Complete Production Blueprint

**Version**: 1.0 | **Date**: 2026-03-16 | **Classification**: Internal Architecture Document
**Authors**: Principal Architect + Product Strategy + Security Lead

---

## TABLE OF CONTENTS

1. [Executive Product Vision](#1-executive-product-vision)
2. [Platform Feature Map](#2-platform-feature-map)
3. [User Experience and UI/UX Plan](#3-user-experience-and-uiux-plan)
4. [User Account Setup and Authentication System](#4-user-account-setup-and-authentication-system)
5. [User Portal and Dashboard](#5-user-portal-and-dashboard)
6. [Virtual Coin / Game Token System](#6-virtual-coin--game-token-system)
7. [Game Platform Architecture](#7-game-platform-architecture)
8. [Payments and Commerce System](#8-payments-and-commerce-system)
9. [Promotions, CRM, and Retention System](#9-promotions-crm-and-retention-system)
10. [Admin Portal / Back Office](#10-admin-portal--back-office)
11. [Customer Support and Dispute Handling](#11-customer-support-and-dispute-handling)
12. [Fraud, Risk, Trust & Safety](#12-fraud-risk-trust--safety)
13. [Security Architecture](#13-security-architecture)
14. [Compliance, Legal, and Policy Layer](#14-compliance-legal-and-policy-layer)
15. [System Architecture](#15-system-architecture)
16. [Database Design](#16-database-design)
17. [API Design](#17-api-design)
18. [Event-Driven and Background Jobs](#18-event-driven-and-background-jobs)
19. [Analytics, Reporting, and Business Intelligence](#19-analytics-reporting-and-business-intelligence)
20. [DevOps, SRE, and Operations](#20-devops-sre-and-operations)
21. [Implementation Roadmap](#21-implementation-roadmap)
22. [Team Structure](#22-team-structure)
23. [Testing Strategy](#23-testing-strategy)
24. [Sample User Flows](#24-sample-user-flows)
25. [Recommended Stack](#25-recommended-stack)
26. [Output Requirements Summary](#26-output-requirements-summary)
A-G. [Appendices](#appendices)

---

# 1. EXECUTIVE PRODUCT VISION

## 1.1 Product Definition

**Fortuna Casino** is a premium free-to-play social gaming platform where users play casino-style entertainment games using virtual coins ("Fortuna Credits"). Credits have **zero cash value**, cannot be withdrawn, and exist solely for entertainment scoring. The platform monetizes through optional purchases of credit bundles, cosmetic upgrades, battle passes, and VIP subscriptions.

This is **not** a gambling platform. It is a social entertainment product — legally equivalent to a mobile game with in-app purchases (like Coin Master, Slotomania, or DoubleDown Casino).

## 1.2 Target Audience Segments

| Segment | Age | Motivation | Spend Profile | Retention Driver |
|---------|-----|-----------|--------------|-----------------|
| **Casual Gamers** | 18-35 | Quick entertainment, lunch breaks | Free or micro-spenders ($1-5/mo) | Daily rewards, streaks |
| **Social Players** | 25-45 | Leaderboard competition, community | Mid-spenders ($10-30/mo) | Leaderboards, VIP status |
| **Enthusiasts** | 30-55 | Game variety, strategy (blackjack/poker) | Core spenders ($30-100/mo) | New games, tournaments |
| **Whales** | 35-60 | VIP experience, exclusive access | High-spenders ($100+/mo) | Diamond tier perks, personalization |

**Critical exclusion**: Under-18 users are hard-blocked at registration. No exceptions.

## 1.3 Business Model

```
Revenue Streams:
$0.01 = 1 token (the token will later be a crypto currency)
```

**Unit Economics Target**:
- DAU/MAU ratio: 25%+
- D7 retention: 35%+
- D30 retention: 15%+
- ARPPU (monthly): $15-25
- Conversion rate (free → paid): 3-5%
- LTV/CAC ratio: 3:1+

## 1.4 Why Virtual Coins Are Legally and Operationally Safer

| Dimension | Real-Money Gambling | Fortuna (Virtual Coins) |
|-----------|-------------------|----------------------|
| **Licensing** | Requires gambling license per jurisdiction ($50K-$500K+, 6-18 months) | No gambling license needed — it's a game with IAP |
| **Age verification** | KYC with ID scan, proof of address, source of funds | Self-declared 18+ gate + ToS acceptance |
| **Financial regulation** | Payment processor gambling MCC codes, restricted banking | Standard e-commerce MCC code, any processor |
| **Tax obligations** | Gambling tax per jurisdiction (15-50% GGR) | Standard corporate income tax on revenue |
| **Withdrawal liability** | Must hold player funds in segregated accounts | No withdrawal = no fund segregation needed |
| **Chargeback risk** | Gambling chargebacks are 3-5x higher | Standard e-commerce chargeback rates (~0.5%) |
| **App store approval** | Apple/Google restrict real-money gambling apps | Standard app store approval (simulated gambling category) |
| **Operational complexity** | AML/KYC, responsible gambling mandates, regulatory audits | Voluntary responsible-use tools, no regulatory audits |

**The critical legal firewall**: Credits are purchased, never earned back as cash. There is no "cashout" mechanism. The system must **never** allow credits to be converted to monetary value, transferred between users for value, or redeemed for prizes with cash value. This is what keeps us in the "entertainment software" category.

## 1.5 Key User Journeys

### Journey 1: First Visit → Registration → First Game
```
Landing Page (3s pitch) → "Play Free" CTA → Age Gate (18+ confirm)
→ Registration (email or Google) → Email Verification → Welcome Screen
→ 10,000 free credits deposited → Onboarding tutorial (optional)
→ Game Lobby → Pick a game → First spin/hand → Win animation
→ "Nice! You won 2,500 credits!" → Continue playing
```

### Journey 2: Free Player → First Purchase
```
Player runs low on credits (< 500) → "Top Up" prompt appears
→ Wallet page shows bundle options → Starter Pack $0.99 highlighted
→ "Most players start here" social proof → Stripe checkout
→ Credits instant-deposited → Celebratory animation
→ Resume playing with new credits
```

### Journey 3: Regular Player → VIP Conversion
```
Day 14: Player has logged in 10+ days → Loyalty progress shown
→ "You're 200 XP from Silver tier!" → Unlock Silver
→ Silver perks visible (2x daily bonus, exclusive slot)
→ "Upgrade to Gold Pass for $9.99/mo" upsell on VIP page
→ Player subscribes → Gold badge on profile
→ 5x daily bonus, priority support, exclusive games
```

### Journey 4: Churn Risk → Re-engagement
```
Player hasn't logged in for 5 days → Push notification:
"Your daily streak is about to reset! Log in to keep your 12-day streak"
→ Player returns → Claims daily bonus (streak saved)
→ Sees new seasonal event → Plays event games
→ Earns event tokens → Claims event rewards → Re-engaged
```

---

# 2. PLATFORM FEATURE MAP

## 2.1 Module Breakdown

### Module 1: Marketing Website

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Convert visitors to registered users |
| **Core Functions** | Landing page, feature showcase, social proof, SEO content, legal pages |
| **Dependencies** | CDN, analytics |
| **Backend Services** | None (static/SSR) |
| **Frontend Pages** | `/`, `/about`, `/faq`, `/terms`, `/privacy`, `/responsible-gambling`, `/provably-fair` |

### Module 2: Authentication & Onboarding

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Register, verify, and authenticate users |
| **Core Functions** | Email/password signup, Google OAuth, email verification, password reset, 2FA, session management, age gate |
| **Dependencies** | Supabase Auth, email provider (Resend/SendGrid), rate limiter |
| **Backend Services** | `auth.users` (Supabase managed), `profiles` table, `auth_sessions`, `devices` |
| **Frontend Pages** | `/login`, `/register`, `/verify-email`, `/reset-password`, `/setup-2fa` |

### Module 3: User Account Portal

| Attribute | Detail |
|-----------|--------|
| **Purpose** | User self-service for profile, settings, security, history |
| **Core Functions** | Profile editing, avatar upload, password change, 2FA management, session viewer, transaction history, game history, responsible gambling settings |
| **Dependencies** | Auth module, wallet module, game module |
| **Backend Services** | `profiles`, `transactions`, `games`, `user_sessions`, `devices` |
| **Frontend Pages** | `/profile`, `/profile/security`, `/profile/history`, `/profile/settings`, `/responsible-gambling` |

### Module 4: Wallet / Virtual Coin Ledger

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Track and manage all credit balances and movements |
| **Core Functions** | Balance display, transaction log, credit purchase, bonus claiming, balance buckets (purchased vs bonus), ledger reconciliation |
| **Dependencies** | Auth, payments, promotions |
| **Backend Services** | `wallets`, `wallet_ledger`, `transactions` + RPCs: `process_bet`, `settle_game`, `wallet_deposit`, `collect_bonus` |
| **Frontend Pages** | `/wallet`, balance widget in header |

### Module 5: Game Launcher / Session Service

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Host, launch, and track game sessions |
| **Core Functions** | Game catalog, game launch, server-side RNG, provably fair verification, session tracking, bet processing, settlement, demo mode |
| **Dependencies** | Wallet, auth, analytics |
| **Backend Services** | `games`, `game_sessions`, `game_events`, `jackpots`, provably-fair engine |
| **Frontend Pages** | `/games/*` (15 game pages), `/games` (lobby) |

### Module 6: Store / Purchases

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Sell virtual credit bundles, subscriptions, and cosmetics |
| **Core Functions** | Product catalog, checkout, payment processing, receipt generation, subscription management, promo code redemption |
| **Dependencies** | Payments provider (Stripe), wallet, auth |
| **Backend Services** | `coin_packages`, `purchases`, `payment_attempts`, `subscriptions`, `entitlements` |
| **Frontend Pages** | `/store`, `/store/checkout`, `/store/subscriptions`, `/store/history` |

### Module 7: Rewards / Loyalty / Daily Bonus

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Drive daily engagement and long-term retention |
| **Core Functions** | Daily login bonus with streaks, XP system, VIP tiers, loyalty points, missions, battle pass, referral program |
| **Dependencies** | Wallet, auth, analytics |
| **Backend Services** | `login_bonuses`, `loyalty_tiers`, `missions`, `battle_pass_progress`, `referrals`, `rewards_claims` |
| **Frontend Pages** | `/rewards`, `/vip`, `/battle-pass`, `/referrals` |

### Module 8: Notifications System

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Deliver timely, relevant messages to users |
| **Core Functions** | In-app notifications, push notifications, email notifications, notification preferences, read/unread state |
| **Dependencies** | Auth, all modules that trigger notifications |
| **Backend Services** | `notifications`, `notification_preferences`, email queue, push queue |
| **Frontend Pages** | Notification bell in header, `/notifications` page |

### Module 9: Support Center

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Resolve user issues and maintain trust |
| **Core Functions** | Ticket creation, ticket tracking, knowledge base, FAQ, live chat (phase 2), account recovery |
| **Dependencies** | Auth, admin portal |
| **Backend Services** | `support_tickets`, `ticket_messages`, `knowledge_base_articles` |
| **Frontend Pages** | `/support`, `/support/tickets`, `/support/new`, `/support/[ticketId]` |

### Module 10: Admin Back Office

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Operate the platform — user management, financial oversight, content control |
| **Core Functions** | User lookup/edit/ban, wallet adjustments with approval, game management, promo management, support queue, fraud review, analytics dashboard, audit logs |
| **Dependencies** | All modules |
| **Backend Services** | `admin_actions`, `audit_logs`, all other tables via service_role |
| **Frontend Pages** | `/admin/*` (10+ pages) |

### Module 11: Fraud / Risk / Trust & Safety

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Detect and prevent abuse, protect platform integrity |
| **Core Functions** | Multi-account detection, bonus abuse detection, stolen card detection, behavioral scoring, device fingerprinting, IP analysis, manual review queue |
| **Dependencies** | Auth, wallet, payments, admin |
| **Backend Services** | `fraud_flags`, `risk_scores`, `device_fingerprints`, rules engine |
| **Frontend Pages** | `/admin/fraud/*` (review queues, dashboards) |

### Module 12: Analytics & Reporting

| Attribute | Detail |
|-----------|--------|
| **Purpose** | Measure everything, inform decisions |
| **Core Functions** | Event tracking, funnel analysis, cohort retention, revenue metrics, game performance, fraud KPIs, support KPIs |
| **Dependencies** | All modules emit events |
| **Backend Services** | Event pipeline, data warehouse (BigQuery/Snowflake or Supabase analytics), dashboards |
| **Frontend Pages** | `/admin/analytics/*` |

---

# 3. USER EXPERIENCE AND UI/UX PLAN

## 3.1 Design Language

**Theme**: Dark luxury casino — deep blacks (#0a0a0f), rich golds (#d4a843, #f5c842), electric accent (#7c3aed purple, #06b6d4 cyan). Think "high-end lounge" not "Vegas neon."

**Typography**: Inter for UI, JetBrains Mono for numbers/balances. Large, confident headings. Generous whitespace.

**Motion**: Framer Motion for page transitions, micro-interactions on wins, smooth number counting animations for balance changes. Never janky — 60fps minimum.

**Iconography**: Lucide React icons throughout. Custom SVG icons for game types.

**Tone**: Confident, friendly, never pushy. "Ready to play?" not "BUY NOW!" Trust-building > conversion pressure.

## 3.2 Page-by-Page Design

### Homepage (`/`)

```
┌─────────────────────────────────────────────────┐
│ HEADER: Logo | Game Lobby | Rewards | Wallet    │
│         [Login] [Play Free]                      │
├─────────────────────────────────────────────────┤
│ HERO SECTION                                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ "Your Luck Starts Here"                     │ │
│ │ Premium casino games. Provably fair.         │ │
│ │ [Play Free — 10,000 Credits] [Learn More]   │ │
│ └─────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────┤
│ FEATURED GAMES (horizontal scroll, 6 cards)      │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│ │Slot│ │BJ  │ │Rou │ │Crsh│ │Dice│ │Pokr│     │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘     │
├─────────────────────────────────────────────────┤
│ LIVE STATS BAR                                   │
│ 🎰 12,847 games played today | 👤 892 online   │
│ 💰 2.4M credits won today | 🏆 Jackpot: 847K  │
├─────────────────────────────────────────────────┤
│ GAME CATEGORIES (grid)                           │
│ [All] [Slots] [Table] [Instant] [Live]          │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐                    │
│ │Game│ │Game│ │Game│ │Game│ (12 cards)          │
│ └────┘ └────┘ └────┘ └────┘                    │
├─────────────────────────────────────────────────┤
│ TRUST SECTION                                    │
│ ✓ Provably Fair | ✓ 18+ Only | ✓ Play Credits  │
│ ✓ No Real Money | ✓ Responsible Play Tools      │
├─────────────────────────────────────────────────┤
│ FOOTER: About | FAQ | Terms | Privacy |          │
│         Responsible Gambling | Provably Fair     │
│         © 2026 Fortuna Casino. Entertainment     │
│         only. Credits have no cash value.        │
└─────────────────────────────────────────────────┘
```

**Layout blocks**: Hero (full-width gradient), Featured (carousel), Stats (ticker), Catalog (filterable grid), Trust (icon row), Footer
**CTA hierarchy**: Primary = "Play Free", Secondary = "Login", Tertiary = "Learn More"
**Loading state**: Skeleton cards for game grid, animated counter placeholders for stats
**Empty state**: N/A (always populated)
**Error state**: "Games temporarily unavailable. Try refreshing." with retry button
**Mobile**: Hero stacks vertically, game grid becomes 2-column, stats bar scrolls horizontally
**Trust elements**: Provably fair badge, 18+ badge, "Entertainment Only" badge, responsible play link

### Registration Flow (`/register`)

```
┌─────────────────────────────────────────────────┐
│              CREATE YOUR ACCOUNT                 │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ [Continue with Google]                     │  │
│  │ ─────────── or ───────────                │  │
│  │ Username: [____________]                   │  │
│  │ Email:    [____________]                   │  │
│  │ Password: [____________] 👁                │  │
│  │                                            │  │
│  │ ☑ I confirm I am 18 years or older        │  │
│  │ ☑ I agree to Terms of Service             │  │
│  │ ☐ Send me promotions (optional)           │  │
│  │                                            │  │
│  │ [Create Account]                           │  │
│  │                                            │  │
│  │ Already have an account? Login             │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  🔒 Your data is encrypted and secure           │
│  🎮 This is an entertainment platform only      │
│  💰 Credits have no real money value             │
└─────────────────────────────────────────────────┘
```

**UX Behavior**:
- Real-time username availability check (debounced 300ms)
- Password strength meter (zxcvbn library)
- Age checkbox is REQUIRED — form won't submit without it
- Terms link opens in modal, not new tab
- On submit → loading spinner on button → success → redirect to `/verify-email`
- Error states: inline red text below each field, specific messages ("Email already registered — did you mean to login?")

**Mobile**: Full-width form, sticky "Create Account" button at bottom

### Login Flow (`/login`)

```
┌─────────────────────────────────────────────────┐
│              WELCOME BACK                        │
│                                                  │
│  ┌───────────────────────────────────────────┐  │
│  │ [Continue with Google]                     │  │
│  │ ─────────── or ───────────                │  │
│  │ Email:    [____________]                   │  │
│  │ Password: [____________] 👁                │  │
│  │                                            │  │
│  │ [Login]                                    │  │
│  │                                            │  │
│  │ Forgot password?     Don't have an account?│  │
│  │                                            │  │
│  │ ─────────── or ───────────                │  │
│  │ [Continue as Guest — Demo Mode]            │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**UX Behavior**:
- "Continue as Guest" enters demo mode — client-side balance, localStorage, no DB writes
- Demo mode shows persistent banner: "🎮 Demo Mode — Sign up to save progress"
- Failed login: "Invalid email or password" (never reveal which is wrong)
- After 5 failed attempts: 15-minute lockout with CAPTCHA on next attempt
- Successful login with 2FA enabled → redirect to `/verify-2fa`

### Main Dashboard (Logged-in Home `/`)

```
┌─────────────────────────────────────────────────┐
│ HEADER: Logo | Lobby | Rewards | Wallet          │
│         🔔 Notifications | 👤 Profile | Balance │
├─────────────────────────────────────────────────┤
│ WELCOME BANNER                                   │
│ "Welcome back, Alex! 🎰"                        │
│ Daily Bonus: [Claim 1,200 Credits] (Day 12)     │
├─────────────────────────────────────────────────┤
│ BALANCE CARD              │ QUICK ACTIONS        │
│ ┌──────────────────────┐  │ [Buy Credits]        │
│ │ 💰 47,250 Credits    │  │ [Daily Bonus]        │
│ │ Purchased: 30,000    │  │ [Battle Pass]        │
│ │ Bonus: 17,250        │  │ [Invite Friends]     │
│ └──────────────────────┘  │                      │
├─────────────────────────────────────────────────┤
│ CONTINUE PLAYING (last 3 games)                  │
│ ┌────────┐ ┌────────┐ ┌────────┐               │
│ │Blackjck│ │ Crash  │ │ Slots  │               │
│ │Last: 2h│ │Last: 1d│ │Last: 3d│               │
│ └────────┘ └────────┘ └────────┘               │
├─────────────────────────────────────────────────┤
│ YOUR FAVORITES (★ saved games)                   │
│ ┌────────┐ ┌────────┐ ┌────────┐               │
│ │ Roulet │ │ Plinko │ │ Dice   │               │
│ └────────┘ └────────┘ └────────┘               │
├─────────────────────────────────────────────────┤
│ LOYALTY PROGRESS                                 │
│ ████████████░░░░░ Silver Tier — 650/1000 XP     │
│ Next: Gold (2x daily bonus, exclusive games)     │
├─────────────────────────────────────────────────┤
│ ACTIVE PROMOTIONS                                │
│ ┌───────────────────┐ ┌───────────────────┐     │
│ │ Weekend Boost     │ │ New: Mines Game   │     │
│ │ 2x XP until Sun   │ │ Try it now!       │     │
│ └───────────────────┘ └───────────────────┘     │
├─────────────────────────────────────────────────┤
│ LEADERBOARD PREVIEW                              │
│ 🥇 CryptoKing — 1.2M won | 🥈 LuckyAce — 980K │
│ Your rank: #847 | [View Full Leaderboard]        │
└─────────────────────────────────────────────────┘
```

**Above the fold**: Balance, daily bonus CTA, continue playing
**Personalized**: Recent games, favorites, loyalty progress, relevant promos
**Retention drivers**: Streak counter, XP progress bar, leaderboard rank
**Monetization balance**: "Buy Credits" is available but never intrusive — it's a quick action, not a popup

### Game Lobby (`/games`)

```
┌─────────────────────────────────────────────────┐
│ SEARCH: [🔍 Search games...]                    │
│ FILTERS: [All] [Slots] [Table] [Instant] [Card] │
│ SORT: [Popular] [New] [A-Z] [Favorites]         │
├─────────────────────────────────────────────────┤
│ JACKPOT BANNER                                   │
│ "Progressive Jackpot: 847,293 Credits"           │
│ [Play Jackpot Slots]                             │
├─────────────────────────────────────────────────┤
│ GAME GRID (responsive: 4col desktop, 2col mobile)│
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────┐ │
│ │ 🎰 Slots │ │ 🃏 BJ   │ │ 🎡 Roult│ │Crash│ │
│ │ RTP: 97% │ │ RTP: 99% │ │ RTP: 97%│ │97.5%│ │
│ │ ★★★★☆    │ │ ★★★★★    │ │ ★★★★☆   │ │★★★★ │ │
│ │ [Play]   │ │ [Play]   │ │ [Play]  │ │Play │ │
│ │ ♡ Fav    │ │ ♡ Fav    │ │ ♡ Fav   │ │♡Fav │ │
│ └──────────┘ └──────────┘ └──────────┘ └─────┘ │
│ ... (all 15+ games)                              │
├─────────────────────────────────────────────────┤
│ COMING SOON                                      │
│ ┌──────────┐ ┌──────────┐                       │
│ │ 🎲 Bingo │ │ 🎯 Wheel │ (greyed out)         │
│ │ Q2 2026  │ │ Q2 2026  │                       │
│ └──────────┘ └──────────┘                       │
└─────────────────────────────────────────────────┘
```

Each game card shows: icon, name, RTP, rating, play button, favorite toggle, "NEW" or "HOT" badge where applicable.

### Wallet Page (`/wallet`)

```
┌─────────────────────────────────────────────────┐
│ MY WALLET                                        │
├─────────────────────────────────────────────────┤
│ BALANCE BREAKDOWN                                │
│ ┌──────────────────────────────────────────────┐│
│ │ Total: 47,250 Credits                        ││
│ │ ├── Purchased: 30,000                        ││
│ │ ├── Bonus: 17,250                            ││
│ │ └── Promo (expires in 3 days): 5,000         ││
│ │                                               ││
│ │ ⓘ Credits are virtual and have no cash value ││
│ │   Entertainment purposes only.                ││
│ └──────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ BUY CREDITS                                      │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐│
│ │ Starter │ │ Popular │ │ Premium │ │ VIP    ││
│ │ 1,500   │ │ 10,000  │ │ 50,000  │ │300,000 ││
│ │ $0.99   │ │ $4.99   │ │ $19.99  │ │$99.99  ││
│ │         │ │ +25%    │ │ +50%    │ │+100%   ││
│ │ [Buy]   │ │★[Buy]   │ │ [Buy]   │ │ [Buy]  ││
│ └─────────┘ └─────────┘ └─────────┘ └────────┘│
├─────────────────────────────────────────────────┤
│ FREE CREDITS                                     │
│ ┌──────────────────────┐ ┌─────────────────┐   │
│ │ Daily Bonus          │ │ Invite Friends  │   │
│ │ Day 12 Streak 🔥     │ │ Get 1,000 per   │   │
│ │ [Claim 1,200]        │ │ referral signup  │   │
│ │ Next: 1,300 tomorrow │ │ [Copy Link]      │   │
│ └──────────────────────┘ └─────────────────┘   │
├─────────────────────────────────────────────────┤
│ TRANSACTION HISTORY                              │
│ ┌──────────────────────────────────────────────┐│
│ │ Date       │ Type    │ Amount   │ Balance    ││
│ │ Mar 16 2pm │ Bet     │ -500     │ 47,250    ││
│ │ Mar 16 2pm │ Win     │ +1,200   │ 47,750    ││
│ │ Mar 16 1pm │ Bonus   │ +1,200   │ 47,050    ││
│ │ Mar 15 8pm │ Bet     │ -1,000   │ 45,850    ││
│ │ Mar 15 8pm │ Purchase│ +10,000  │ 46,850    ││
│ │ [Load More]                                   ││
│ └──────────────────────────────────────────────┘│
├─────────────────────────────────────────────────┤
│ ⓘ All transactions are final. Credits cannot    │
│   be withdrawn or exchanged for real money.      │
│   See Terms of Service for details.              │
└─────────────────────────────────────────────────┘
```

### Responsible Gambling Page (`/responsible-gambling`)

```
┌─────────────────────────────────────────────────┐
│ PLAY RESPONSIBLY                                 │
├─────────────────────────────────────────────────┤
│ We want you to enjoy Fortuna as entertainment.   │
│ These tools help you stay in control.            │
├─────────────────────────────────────────────────┤
│ SESSION LIMITS                                   │
│ Daily play time limit: [None ▾] (30m/1h/2h/4h) │
│ Daily spending limit:  [None ▾] ($5/$10/$25/$50)│
│ Daily loss limit:      [None ▾] (5K/10K/25K/50K)│
│                                                  │
│ ⓘ Limits take effect immediately. Increases     │
│   require a 24-hour cooling period.              │
├─────────────────────────────────────────────────┤
│ REALITY CHECK                                    │
│ Remind me every: [None ▾] (30m/1h/2h)          │
│ Shows: time played, credits spent, net result    │
├─────────────────────────────────────────────────┤
│ SELF-EXCLUSION                                   │
│ ⚠ Take a break from Fortuna                     │
│ Duration: [24 hours] [7 days] [30 days] [90 days]│
│ [Activate Self-Exclusion]                        │
│                                                  │
│ ⓘ During exclusion you cannot play, purchase,   │
│   or access game features. This is irreversible  │
│   until the period expires.                      │
├─────────────────────────────────────────────────┤
│ RESOURCES                                        │
│ • National Problem Gambling Helpline: 1-800-XXX │
│ • GamTrak Self-Assessment Tool                   │
│ • BeGambleAware.org                              │
└─────────────────────────────────────────────────┘
```

## 3.3 Design Principles — Premium Without Dark Patterns

| DO | DON'T |
|----|-------|
| Show balance prominently and honestly | Hide losses or inflate "winnings" |
| Use celebration animations on wins | Create near-miss false excitement |
| Let users set their own limits | Make limits hard to find or set |
| Show RTP and house edge per game | Hide odds or use misleading stats |
| Make "stop playing" easy | Use friction to prevent leaving |
| Label credits as virtual entertainment | Use $ symbols or money imagery |
| Offer free daily play (daily bonus) | Gate all play behind purchases |
| Show session time and spend | Hide play duration |
| Use "Credits" or "Coins" language | Use "Dollars", "Cash", "Money" |

---

# 4. USER ACCOUNT SETUP AND AUTHENTICATION SYSTEM

## 4.1 Auth Methods

| Method | Implementation | Priority |
|--------|---------------|----------|
| Email + Password | Supabase Auth native | P0 (launch) |
| Google OAuth | Supabase Auth Google provider | P0 (launch) |
| Apple Sign-In | Supabase Auth Apple provider | P1 (if iOS app) |
| Discord OAuth | Supabase Auth Discord provider | P2 (community) |
| Magic Link | Supabase Auth magic link | P2 (optional) |

## 4.2 Auth State Machine

```
                    ┌──────────┐
          signup    │          │  verify email
    ┌──────────────▶│  PENDING │──────────────┐
    │               │          │              │
    │               └──────────┘              ▼
┌───────┐                              ┌──────────┐
│ ANON  │         login                │ VERIFIED │◀──── unsuspend
│(guest)│──────────────────────────────│ (active) │
└───────┘                              └──────────┘
                                        │  │  │  │
                              suspend   │  │  │  │  self-exclude
                         ┌──────────────┘  │  │  └──────────────┐
                         ▼                 │  │                  ▼
                   ┌──────────┐           │  │           ┌──────────────┐
                   │SUSPENDED │           │  │           │SELF-EXCLUDED │
                   │(by admin)│           │  │           │(by user, TTL)│
                   └──────────┘           │  │           └──────────────┘
                                    ban   │  │  delete request
                                   ┌──────┘  └──────┐
                                   ▼                 ▼
                             ┌──────────┐    ┌──────────────┐
                             │  BANNED  │    │PENDING_DELETE│
                             │(permanent)│    │(30-day grace)│
                             └──────────┘    └──────────────┘
```

## 4.3 User Lifecycle States

| State | Can Login | Can Play | Can Purchase | Can Support | Transition To |
|-------|-----------|----------|-------------|-------------|---------------|
| `pending` | No | No | No | No | `verified` (email confirm) |
| `verified` | Yes | Yes | Yes | Yes | `suspended`, `self_excluded`, `banned`, `pending_delete` |
| `suspended` | Yes (read-only) | No | No | Yes | `verified` (admin action) |
| `self_excluded` | No | No | No | Yes (email only) | `verified` (after TTL expires) |
| `banned` | No | No | No | No (appeal only) | `verified` (admin appeal) |
| `pending_delete` | No | No | No | Yes | deleted (after 30 days) |

## 4.4 Session Management

- **Token type**: Supabase JWT (access token) + refresh token
- **Access token TTL**: 15 minutes
- **Refresh token TTL**: 7 days (30 days for "Remember me")
- **Concurrent sessions**: Max 5 per user (oldest auto-revoked)
- **Device tracking**: Fingerprint (UA + screen + timezone + language) stored per session
- **Suspicious login detection**: New device + new IP + new geo → trigger email verification challenge

## 4.5 2FA / MFA

- **Method**: TOTP (Google Authenticator / Authy) via Supabase MFA
- **Enrollment**: Optional, encouraged with "secure your account" prompt after first purchase
- **Recovery**: 10 one-time backup codes generated at enrollment, stored bcrypt-hashed
- **Enforcement**: Required for admin/support roles, optional for users

## 4.6 Account Lockout Rules

| Trigger | Action | Duration |
|---------|--------|----------|
| 5 failed logins | Account locked + CAPTCHA required | 15 minutes |
| 10 failed logins | Account locked + email notification | 1 hour |
| 20 failed logins | Account locked + requires email reset | Until reset |
| Password reset from unknown device | Email confirmation required | N/A |
| Login from new country | Email challenge + notification | N/A |

## 4.7 Age Gate

- **Registration**: Mandatory checkbox "I confirm I am 18 years of age or older"
- **Legal effect**: User attests to being 18+ as part of ToS acceptance
- **No ID verification needed** (free-to-play platform, not gambling)
- **If discovered underage**: Account suspended, all purchases refunded, data deleted per COPPA-like best practice

## 4.8 RBAC Roles

| Role | Permissions | Assignment |
|------|------------|------------|
| `player` | Play games, manage own profile, purchase credits, open tickets | Default on registration |
| `vip` | All player + priority support, exclusive games | Auto-upgrade via loyalty or subscription |
| `support` | View user profiles (read-only), manage tickets, view transactions | Admin assignment |
| `finance_reviewer` | View purchases, process refunds, review chargebacks | Admin assignment |
| `risk_analyst` | View fraud flags, device data, risk scores, take review actions | Admin assignment |
| `admin` | All above + user management, wallet adjustments, promo management | Super-admin assignment |
| `super_admin` | All above + role management, system config, audit log export | Hardcoded at DB level |

## 4.9 Database Tables for Auth

```sql
-- Managed by Supabase Auth (do not modify directly)
-- auth.users: id, email, encrypted_password, email_confirmed_at, ...

-- Our extension tables:
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'player'
    CHECK (role IN ('player','vip','support','finance_reviewer','risk_analyst','admin','super_admin')),
  status TEXT NOT NULL DEFAULT 'verified'
    CHECK (status IN ('pending','verified','suspended','self_excluded','banned','pending_delete')),
  balance BIGINT NOT NULL DEFAULT 10000,
  purchased_balance BIGINT NOT NULL DEFAULT 0,  -- tracked separately
  bonus_balance BIGINT NOT NULL DEFAULT 10000,   -- welcome bonus
  total_wagered BIGINT NOT NULL DEFAULT 0,
  total_won BIGINT NOT NULL DEFAULT 0,
  games_played BIGINT NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  exp BIGINT NOT NULL DEFAULT 0,
  vip_tier TEXT NOT NULL DEFAULT 'bronze',
  loyalty_points BIGINT NOT NULL DEFAULT 0,
  daily_deposit_limit BIGINT DEFAULT NULL,
  daily_loss_limit BIGINT DEFAULT NULL,
  session_time_limit INTEGER DEFAULT NULL,
  self_excluded_until TIMESTAMPTZ DEFAULT NULL,
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  login_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT profiles_balance_non_negative CHECK (balance >= 0)
);

CREATE TABLE public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,          -- hashed device fingerprint
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  is_trusted BOOLEAN NOT NULL DEFAULT false,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, fingerprint)
);

CREATE TABLE public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.user_devices(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  credits_wagered BIGINT NOT NULL DEFAULT 0,
  credits_won BIGINT NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  ip_address INET
);

CREATE TABLE public.consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('terms','privacy','marketing','age_confirmation')),
  version TEXT NOT NULL,           -- e.g., "tos_v2.1"
  granted BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

# 5. USER PORTAL AND DASHBOARD

## 5.1 Dashboard Layout (Above the Fold)

The dashboard prioritizes three things in order:
1. **Balance + Daily Bonus** — show what they have, give them something free
2. **Continue Playing** — reduce friction to next session
3. **Loyalty Progress** — show progress toward next reward

```
Priority Stack (above fold):
┌──────────────────────────────────────┐
│ 1. Balance Card + Claim Daily Bonus  │  ← Immediate value
│ 2. Continue Playing (3 recent games) │  ← Reduce friction
│ 3. Loyalty Progress Bar              │  ← Retention hook
└──────────────────────────────────────┘

Below fold:
┌──────────────────────────────────────┐
│ 4. Active Promotions                 │  ← Monetization (soft)
│ 5. Favorites Grid                    │  ← Personalization
│ 6. Leaderboard Preview              │  ← Social proof
│ 7. Achievements (recent unlocks)     │  ← Engagement
│ 8. Account Security Widget           │  ← Trust
└──────────────────────────────────────┘
```

## 5.2 What Improves Retention

| Element | Mechanism | Metric Impact |
|---------|-----------|---------------|
| Daily bonus streak | Loss aversion (don't break streak) | +40% D7 retention |
| XP progress bar | Goal gradient effect (closer = more motivated) | +15% session frequency |
| Leaderboard rank | Social comparison | +20% wagering volume |
| "New!" game badge | Novelty seeking | +25% game variety |
| Personalized game recs | Reduced decision fatigue | +10% sessions/user |
| Achievements | Completionism | +30% feature exploration |
| Session time display | Responsible play (builds trust) | -5% churn (trust) |

## 5.3 Wallet and Transaction UI Compliance

**Every screen showing balance MUST include**:

```
⚠ Credits are virtual entertainment tokens with no monetary value.
  They cannot be withdrawn, exchanged, or redeemed for cash or prizes.
```

**Specific requirements**:
- Use "Credits" or "Coins" — NEVER "dollars", "cash", "money", "funds"
- Use coin icon (🪙) — NEVER dollar sign ($) for virtual balance
- Transaction history uses "Credits" as unit
- Purchase history shows real currency ($) only for the payment amount
- Balance display: "47,250 Credits" not "$47,250"
- Win display: "You won 2,500 Credits!" not "You won $2,500!"

---

# 6. VIRTUAL COIN / GAME TOKEN SYSTEM

## 6.1 Wallet Architecture

### Balance Buckets

```
Total Balance = Purchased Credits + Bonus Credits + Promotional Credits

┌─────────────────────────────────────────┐
│ WALLET                                   │
│ ┌──────────────┐  Priority: Spend       │
│ │  Promotional │  first (may expire)    │
│ │  Credits     │  Source: promos, codes  │
│ │  (bucket 3)  │  Expiry: 7-30 days    │
│ ├──────────────┤                        │
│ │  Bonus       │  Spend second          │
│ │  Credits     │  Source: daily bonus,  │
│ │  (bucket 2)  │  referrals, welcome    │
│ │              │  Expiry: never         │
│ ├──────────────┤                        │
│ │  Purchased   │  Spend last            │
│ │  Credits     │  Source: IAP only      │
│ │  (bucket 1)  │  Expiry: never         │
│ └──────────────┘                        │
└─────────────────────────────────────────┘
```

**Spend order**: Promo → Bonus → Purchased (spend expiring credits first, protect purchased credits)

### Why Buckets Matter
- **Refund clarity**: If user requests refund, we know which credits are purchased vs gifted
- **Promo abuse prevention**: "Bonus" credits can have wagering requirements before they count toward purchase-eligible balance
- **Expiry management**: Promo credits can expire; purchased credits never do
- **Financial reporting**: Separates revenue-backed balance from cost-of-acquisition balance

## 6.2 Ledger Schema

```sql
CREATE TABLE public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Transaction identification
  tx_type TEXT NOT NULL CHECK (tx_type IN (
    'purchase',          -- bought with real money
    'bonus',             -- daily bonus, welcome, level-up
    'promo',             -- promotional credit grant
    'referral',          -- referral reward
    'bet',               -- game wager (debit)
    'win',               -- game payout (credit)
    'refund',            -- admin refund
    'admin_credit',      -- manual admin credit
    'admin_debit',       -- manual admin debit
    'promo_expire',      -- promotional credits expired
    'adjustment'         -- reconciliation adjustment
  )),

  -- Bucket tracking
  bucket TEXT NOT NULL CHECK (bucket IN ('purchased', 'bonus', 'promo')),

  -- Amounts (signed: positive = credit, negative = debit)
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,        -- total balance after this tx
  bucket_balance_after BIGINT NOT NULL,  -- bucket balance after this tx

  -- References
  game_id UUID REFERENCES public.games(id),
  purchase_id UUID,                      -- references purchases table
  promo_id UUID,                         -- references promotions table

  -- Idempotency
  idempotency_key TEXT UNIQUE,           -- prevents duplicate processing

  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',           -- extra context (admin notes, promo code, etc.)

  -- Audit
  created_by UUID,                       -- who initiated (user or admin)
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_ledger_user_id ON public.wallet_ledger(user_id);
CREATE INDEX idx_wallet_ledger_created ON public.wallet_ledger(created_at DESC);
CREATE INDEX idx_wallet_ledger_type ON public.wallet_ledger(tx_type);
CREATE INDEX idx_wallet_ledger_idempotency ON public.wallet_ledger(idempotency_key);
```

## 6.3 Balance Calculation

**Source of truth**: The `profiles.balance` column is the cached total. It MUST always equal:
```sql
SELECT SUM(amount) FROM wallet_ledger WHERE user_id = ?
```

**Reconciliation job** (runs hourly):
```sql
-- Find discrepancies
SELECT p.id, p.balance AS cached_balance,
       COALESCE(SUM(wl.amount), 0) AS ledger_balance,
       p.balance - COALESCE(SUM(wl.amount), 0) AS discrepancy
FROM profiles p
LEFT JOIN wallet_ledger wl ON wl.user_id = p.id
GROUP BY p.id
HAVING p.balance != COALESCE(SUM(wl.amount), 0);
```

Any discrepancy triggers an alert to the finance team.

## 6.4 Concurrency Handling

```sql
-- All balance-changing operations use SELECT ... FOR UPDATE
CREATE OR REPLACE FUNCTION public.process_bet(
  p_player_id UUID,
  p_game_type TEXT,
  p_bet_amount BIGINT,
  ...
) RETURNS UUID AS $$
DECLARE
  v_current_balance BIGINT;
BEGIN
  -- Lock the row to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM public.profiles
  WHERE id = p_player_id
  FOR UPDATE;  -- ← This is the critical line

  IF v_current_balance < p_bet_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Debit happens atomically within this transaction
  UPDATE public.profiles
  SET balance = balance - p_bet_amount
  WHERE id = p_player_id;

  -- ... create game record, ledger entry, etc.
END;
$$ LANGUAGE plpgsql;
```

**Why this works**: `FOR UPDATE` acquires a row-level lock. If two bets arrive simultaneously, the second one blocks until the first completes. This prevents double-spend without requiring application-level distributed locks.

## 6.5 Anti-Abuse Controls

| Control | Implementation |
|---------|---------------|
| **Minimum bet** | 1 credit (prevents dust attacks) |
| **Maximum bet** | 1,000,000 credits (prevents whale exploitation bugs) |
| **Rate limit** | Max 60 bets/minute per user (prevents bot grinding) |
| **Balance floor** | CHECK constraint: `balance >= 0` (prevents negative balance) |
| **Idempotent settlement** | `settle_game` checks `settled` flag before paying |
| **Double-spend prevention** | `FOR UPDATE` row locks on all balance operations |
| **Promo wagering requirement** | Bonus credits require 5x wagering before counting as "real" balance |
| **Self-deposit limit** | User-configurable daily credit purchase cap |

## 6.6 Sample API Endpoints

```
GET  /api/wallet              → { balance, purchased, bonus, promo, promo_expiry }
GET  /api/wallet/transactions → { transactions: [...], pagination }
POST /api/wallet/deposit      → { amount } → { new_balance, tx_id }
POST /api/wallet/purchase     → Stripe checkout → webhook → credit
POST /api/bonus/claim         → { action: 'collect' } → { amount, streak, new_balance }
```

---

# 7. GAME PLATFORM ARCHITECTURE

## 7.1 Game Catalog Service

```sql
CREATE TABLE public.game_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,              -- 'blackjack', 'golden-slots'
  game_type TEXT NOT NULL,                 -- 'slots', 'blackjack', 'roulette', etc.
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('slots','table','instant','card','jackpot')),

  -- Game configuration
  min_bet BIGINT NOT NULL DEFAULT 1,
  max_bet BIGINT NOT NULL DEFAULT 1000000,
  house_edge_bps INTEGER NOT NULL,         -- basis points (250 = 2.5%)
  rtp_bps INTEGER NOT NULL,                -- basis points (9750 = 97.5%)
  volatility TEXT CHECK (volatility IN ('low','medium','high')),

  -- Feature flags
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  is_jackpot_eligible BOOLEAN NOT NULL DEFAULT false,
  requires_vip_tier TEXT DEFAULT NULL,     -- null = everyone, 'gold' = gold+

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  provider TEXT DEFAULT 'internal',        -- 'internal' or third-party name
  release_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  play_count BIGINT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 7.2 Game Session Lifecycle

```
Player clicks "Play"
        │
        ▼
┌──────────────────┐
│ 1. INIT SESSION  │  Create game_session record
│    - validate    │  Check: auth, balance, limits,
│      user state  │  self-exclusion, VIP tier
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 2. PLACE BET     │  POST /api/games
│    - process_bet │  Atomic: lock → validate → debit
│      RPC call    │  Returns: game_id, server_seed_hash
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 3. GENERATE      │  Server-side only:
│    RESULT        │  HMAC-SHA256(server_seed:client_seed:nonce)
│    - provably    │  Deterministic → same seeds = same result
│      fair RNG    │  Result computed, multiplier calculated
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 4. SETTLE GAME   │  settle_game RPC:
│    - idempotent  │  Check settled flag → credit payout
│    - atomic      │  Update balance, XP, stats
│                  │  Create ledger entry
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 5. RETURN RESULT │  Response: { result, payout,
│    TO CLIENT     │  multiplier, newBalance,
│                  │  serverSeed (revealed) }
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ 6. CLIENT        │  Animate result, update UI,
│    RENDERS       │  show win/loss, update balance
│                  │  display from server response
└──────────────────┘
```

## 7.3 Provably Fair System

```
BEFORE GAME:
  Server generates: serverSeed = crypto.randomBytes(32)
  Server computes:  serverSeedHash = SHA256(serverSeed)
  Client provides:  clientSeed (user-provided or auto-generated)
  Nonce:            incrementing counter per seed pair

  Player sees: serverSeedHash (commitment — proves seed was chosen before play)

DURING GAME:
  combinedSeed = HMAC-SHA256(serverSeed, clientSeed + ":" + nonce)
  result = deriveGameResult(combinedSeed, gameType, gameData)

AFTER GAME:
  Server reveals: serverSeed (plaintext)
  Player can verify: SHA256(serverSeed) === serverSeedHash they saw before
  Player can recompute: HMAC-SHA256(serverSeed, clientSeed + ":" + nonce) → same result

VERIFICATION PAGE (/provably-fair):
  Input: serverSeed, serverSeedHash, clientSeed, nonce, gameType
  Output: computed result + "VERIFIED ✓" or "MISMATCH ✗"
```

## 7.4 Game Event Schema

```sql
CREATE TABLE public.game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'bet_placed', 'result_generated', 'game_settled',
    'bonus_triggered', 'jackpot_contribution', 'jackpot_won',
    'free_spin_awarded', 'cashout_requested'    -- crash game
  )),
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Example events:
-- { event_type: 'bet_placed', payload: { amount: 500, game_type: 'blackjack' } }
-- { event_type: 'result_generated', payload: { multiplier: 2.5, result: {...} } }
-- { event_type: 'jackpot_won', payload: { pool: 'slots', amount: 847293 } }
```

## 7.5 Anti-Tampering Measures

| Measure | What It Prevents |
|---------|-----------------|
| Server-side RNG only | Client cannot influence randomness |
| Server-seed commitment (hash shown before play) | Server cannot change result after seeing bet |
| `FOR UPDATE` locks on balance | Double-spend via concurrent requests |
| `settled` flag with idempotency | Double-payout via replay |
| Game-specific parameter validation | Impossible game states (e.g., mineCount: 0) |
| Rate limiting (60 bets/min) | Bot grinding |
| Min/max bet enforcement in DB | Bet amount manipulation |
| Server-seed rotation every 1000 games | Reduces exposure of any single seed |

## 7.6 Demo vs Production Mode

```typescript
// In each game page:
if (!user && !authLoading) {
  // DEMO MODE
  // - Client-side RNG (Math.random seeded)
  // - Balance in localStorage (starts at 10,000)
  // - No API calls, no DB writes
  // - Banner: "🎮 Demo Mode — Sign up to save progress"
  // - "Buy Credits" button → redirects to /register
} else {
  // REAL MODE
  // - All bets via POST /api/games
  // - Server-side RNG (HMAC-SHA256)
  // - Balance from DB via useBalance() hook
  // - Provably fair seeds shown
  // - Responsible gambling limits enforced
}
```

## 7.7 Responsible-Use Cooldown Tools

| Tool | Behavior |
|------|----------|
| **Reality Check** | After N minutes of play, modal shows: "You've been playing for 45 minutes. Credits wagered: 5,000. Net result: -1,200." Options: [Continue] [Take a Break] |
| **Session Timer** | Visible clock in game header showing elapsed time |
| **Loss Limit** | If daily loss exceeds user-set limit → "You've reached your daily loss limit. Come back tomorrow." → game disabled |
| **Self-Exclusion** | Cannot access any game page during exclusion period |
| **Cool-Off Period** | After large loss streak (10 consecutive losses) → "Want to take a break?" prompt |

---

# 8. PAYMENTS AND COMMERCE SYSTEM

## 8.1 Payment Architecture

**Provider**: Stripe (primary) with abstraction layer for future Adyen/PayPal.

**Important**: This is standard e-commerce — we sell virtual goods (credits). MCC code: 5816 (Digital Goods). NOT gambling MCC codes (7995). This means standard processing rates (~2.9% + $0.30) and no gambling-specific restrictions.

```
┌───────────────┐     ┌──────────────┐     ┌─────────────┐
│  Frontend     │────▶│  Checkout    │────▶│  Stripe     │
│  Store Page   │     │  Service     │     │  Checkout   │
└───────────────┘     └──────────────┘     └──────┬──────┘
                                                   │
                      ┌──────────────┐             │ webhook
                      │  Entitlement │◀────────────┘
                      │  Service     │
                      └──────┬───────┘
                             │
                      ┌──────▼───────┐
                      │  Wallet      │
                      │  Ledger      │
                      └──────────────┘
```

## 8.2 Product Catalog

```sql
CREATE TABLE public.coin_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,           -- 'starter-pack'
  name TEXT NOT NULL,                   -- 'Starter Pack'
  description TEXT,
  credits BIGINT NOT NULL,              -- base credits: 1500
  bonus_credits BIGINT NOT NULL DEFAULT 0, -- bonus: 0
  bonus_pct INTEGER NOT NULL DEFAULT 0, -- display: "+25%"
  price_cents INTEGER NOT NULL,         -- 99 = $0.99
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_price_id TEXT,                 -- Stripe Price object ID
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  max_purchases_per_day INTEGER DEFAULT NULL,  -- anti-abuse
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO coin_packages (slug, name, credits, bonus_credits, bonus_pct, price_cents, is_featured, sort_order) VALUES
  ('starter',  'Starter Pack',  1500,   0,      0,   99,    false, 1),
  ('popular',  'Popular Pack',  10000,  2500,   25,  499,   true,  2),
  ('premium',  'Premium Pack',  50000,  25000,  50,  1999,  false, 3),
  ('vip',      'VIP Pack',      300000, 300000, 100, 9999,  false, 4);
```

## 8.3 Checkout Flow

```
1. User clicks "Buy" on a package
2. Frontend → POST /api/store/checkout { packageId, promoCode? }
3. Backend validates:
   - User authenticated and verified
   - Package exists and is active
   - Daily purchase limit not exceeded
   - Self-exclusion not active
   - Daily deposit limit not exceeded
   - Promo code valid (if provided)
4. Backend creates Stripe Checkout Session:
   - line_items: [{ price: stripe_price_id, quantity: 1 }]
   - mode: 'payment'
   - success_url: /store/success?session_id={CHECKOUT_SESSION_ID}
   - cancel_url: /store
   - metadata: { user_id, package_id, promo_code, idempotency_key }
5. Backend stores pending purchase record
6. Frontend redirects to Stripe Checkout
7. User completes payment
8. Stripe sends webhook → POST /api/webhooks/stripe
9. Backend verifies webhook signature (STRIPE_WEBHOOK_SECRET)
10. Backend processes checkout.session.completed:
    - Validate idempotency_key (no double-credit)
    - Credit user wallet: purchased credits + bonus credits
    - Create wallet_ledger entry (bucket: 'purchased')
    - Create wallet_ledger entry for bonus (bucket: 'bonus')
    - Update purchase record: status = 'completed'
    - Send confirmation email with receipt
11. User's balance updates via Supabase Realtime
```

## 8.4 Purchase Records

```sql
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  package_id UUID NOT NULL REFERENCES public.coin_packages(id),

  -- Payment details
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Credits
  credits_granted BIGINT NOT NULL,
  bonus_credits_granted BIGINT NOT NULL DEFAULT 0,
  promo_code TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','completed','failed','refunded','disputed')),

  -- Idempotency
  idempotency_key TEXT UNIQUE NOT NULL,

  -- Audit
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT
);

CREATE TABLE public.payment_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id),
  stripe_event_type TEXT NOT NULL,
  stripe_event_id TEXT UNIQUE NOT NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 8.5 Subscription Management

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  plan TEXT NOT NULL CHECK (plan IN ('silver_pass','gold_pass','diamond_pass')),
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','past_due','canceled','expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  entitlement_type TEXT NOT NULL,  -- 'daily_bonus_2x', 'exclusive_game_access', 'priority_support'
  source TEXT NOT NULL,            -- 'subscription:gold_pass', 'purchase:cosmetic_123'
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,          -- NULL = permanent
  revoked_at TIMESTAMPTZ
);
```

## 8.6 Refund Workflow

```
1. User contacts support: "I want a refund"
2. Support agent opens refund review in admin portal
3. System checks:
   - Purchase < 14 days old (refund window)
   - Credits from purchase not fully spent
   - No chargeback already filed
   - User not flagged for refund abuse (>3 refunds in 90 days)
4. If eligible:
   a. Calculate refund: full refund if <10% of credits used, partial otherwise
   b. Debit user wallet for credited amount
   c. Process Stripe refund via API
   d. Update purchase status → 'refunded'
   e. Create wallet_ledger entry (type: 'refund', negative amount)
   f. Send refund confirmation email
5. If not eligible:
   - Support explains policy
   - Offers alternative (bonus credits, etc.)
```

## 8.7 Chargeback Handling

```
1. Stripe webhook: charge.dispute.created
2. System auto-responds:
   - Freeze user account (status: 'suspended')
   - Compile evidence: purchase record, IP/device info, usage data
   - Submit evidence to Stripe (dispute.evidence)
3. If dispute won: unfreeze account, log incident
4. If dispute lost:
   - Debit user wallet for disputed amount
   - Flag user account for risk review
   - If repeat offender (2+ chargebacks): ban account
```

## 8.8 Tax Handling Hooks

```typescript
// Stripe handles tax calculation and collection
// We configure Stripe Tax with:
const checkoutSession = await stripe.checkout.sessions.create({
  automatic_tax: { enabled: true },
  // ...
});

// For receipts, we store the tax breakdown:
interface TaxRecord {
  purchase_id: string;
  tax_amount_cents: number;
  tax_rate_pct: number;
  jurisdiction: string;    // "US-CA", "EU-DE", etc.
  tax_type: string;        // "sales_tax", "vat", "gst"
}
```

---

# 9. PROMOTIONS, CRM, AND RETENTION SYSTEM

## 9.1 Promotion Types

| Type | Trigger | Reward | Frequency | Anti-Abuse |
|------|---------|--------|-----------|-----------|
| **Welcome Bonus** | Registration complete | 10,000 credits | Once per account | IP + device dedup |
| **Daily Login** | Login each day | 100-5,000 credits (streak-based) | Daily | Auth required, 1 claim/day |
| **First Purchase Bonus** | First IAP | 100% match (up to 10,000) | Once | Purchase verification |
| **Referral Reward** | Referred user registers + plays 5 games | 1,000 credits each | Per referral (max 50) | Unique email, different device |
| **Level-Up Bonus** | Reach new level | 500 × level credits | Per level | XP is server-computed |
| **VIP Tier Bonus** | Reach new VIP tier | Tier-specific package | Per tier | Wagering is server-tracked |
| **Seasonal Event** | Time-limited event | Event tokens → rewards | Per event | Event participation tracked |
| **Promo Code** | Enter valid code | Varies | Per code config | Usage limits, expiry |
| **Streak Milestone** | 7/14/30 day streaks | 2,000/5,000/15,000 credits | Per milestone | Server-tracked streaks |
| **Return Bonus** | Inactive 7+ days | 2,000 credits | Once per absence | Last login tracked |

## 9.2 Battle Pass System

```
Season 1: "Fortune's Frontier" (8 weeks)

FREE TRACK:                    PREMIUM TRACK ($9.99):
Tier 1:  500 credits           Tier 1:  1,500 credits + avatar frame
Tier 5:  1,000 credits         Tier 5:  3,000 credits + card back
Tier 10: 2,000 credits         Tier 10: 5,000 credits + table theme
Tier 15: Mystery Bonus         Tier 15: 10,000 credits + sound pack
Tier 20: 3,000 credits         Tier 20: 15,000 credits + animated avatar
Tier 30: 5,000 credits         Tier 30: 25,000 credits + exclusive game
Tier 50: 10,000 credits        Tier 50: 50,000 credits + Diamond badge

XP Sources:
- Play any game: 10 XP per 100 credits wagered
- Daily login: 50 XP
- Complete mission: 100-500 XP
- Win streak (3+): 200 XP bonus
```

## 9.3 Mission System

```sql
CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,                    -- "High Roller"
  description TEXT NOT NULL,              -- "Wager 10,000 credits in a single session"
  category TEXT NOT NULL CHECK (category IN ('daily','weekly','challenge','event')),
  requirement_type TEXT NOT NULL,         -- 'wager_total', 'games_played', 'win_streak', 'play_game_type'
  requirement_value BIGINT NOT NULL,      -- 10000
  requirement_game_type TEXT,             -- NULL = any, 'blackjack' = specific
  reward_type TEXT NOT NULL DEFAULT 'credits',
  reward_amount BIGINT NOT NULL,
  xp_reward BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  mission_id UUID NOT NULL REFERENCES public.missions(id),
  progress BIGINT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  claimed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, mission_id)
);
```

## 9.4 Anti-Promo-Farming Controls

| Risk | Control |
|------|---------|
| Multi-account welcome bonus | Device fingerprint + IP dedup. Same device = no second welcome bonus |
| Referral self-farming | Referred user must have different device fingerprint, different IP subnet, and play 5+ real games |
| Daily bonus bot | Rate-limited to 1 claim per calendar day, requires valid auth session |
| Promo code sharing | Per-user usage limits, total redemption caps, time-limited |
| Wagering requirement bypass | Bonus credits require 5x wagering before counting toward "real" balance bucket |
| VPN bonus stacking | Geo-check doesn't affect bonuses (we don't geo-restrict), but device fingerprint prevents duplication |

## 9.5 Ethical Personalization

**DO**: Show relevant promos based on play history (slot player sees slot promos).
**DO**: Remind users of unclaimed daily bonus.
**DO**: Show loyalty progress and next milestone.

**DON'T**: Use urgency manipulation ("Only 2 minutes left!" when there's no real deadline).
**DON'T**: Show personalized purchase prompts immediately after a loss streak.
**DON'T**: Hide responsible gambling tools behind settings.
**DON'T**: Use push notifications more than 1/day (configurable, opt-out easy).
**DON'T**: Send "we miss you" emails more than once per inactive period.

---

# 10. ADMIN PORTAL / BACK OFFICE

## 10.1 Module Overview

```
/admin
├── /dashboard          ← Overview: DAU, revenue, active promos, alerts
├── /users              ← User search, profile view, actions
├── /users/[id]         ← Individual user detail page
├── /wallets            ← Wallet adjustments with approval queue
├── /games              ← Game catalog management
├── /promotions         ← Promo creation, management, analytics
├── /support            ← Support ticket queue
├── /fraud              ← Fraud review queue, risk dashboard
├── /payments           ← Payment history, refunds, chargebacks
├── /analytics          ← Detailed analytics dashboards
├── /audit-logs         ← Immutable audit trail viewer
├── /settings           ← Platform settings, feature flags
└── /roles              ← Role management (super_admin only)
```

## 10.2 Admin Actions and Permissions

| Action | support | finance_reviewer | risk_analyst | admin | super_admin |
|--------|---------|-----------------|-------------|-------|-------------|
| View user profiles | ✓ | ✓ | ✓ | ✓ | ✓ |
| View transactions | ✓ | ✓ | ✓ | ✓ | ✓ |
| Respond to tickets | ✓ | ✗ | ✗ | ✓ | ✓ |
| Close tickets | ✓ | ✗ | ✗ | ✓ | ✓ |
| View payment details | ✗ | ✓ | ✗ | ✓ | ✓ |
| Process refunds | ✗ | ✓ | ✗ | ✓ | ✓ |
| View fraud flags | ✗ | ✗ | ✓ | ✓ | ✓ |
| Take fraud action (suspend) | ✗ | ✗ | ✓ | ✓ | ✓ |
| Wallet adjustment (<10K) | ✗ | ✗ | ✗ | ✓ | ✓ |
| Wallet adjustment (>10K) | ✗ | ✗ | ✗ | ✗ | ✓ (requires 2nd approval) |
| Ban user | ✗ | ✗ | ✗ | ✓ | ✓ |
| Unban user | ✗ | ✗ | ✗ | ✗ | ✓ |
| Manage promotions | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage game catalog | ✗ | ✗ | ✗ | ✓ | ✓ |
| Manage roles | ✗ | ✗ | ✗ | ✗ | ✓ |
| Export audit logs | ✗ | ✗ | ✗ | ✗ | ✓ |
| System settings | ✗ | ✗ | ✗ | ✗ | ✓ |

## 10.3 Wallet Adjustment Flow

```
1. Admin clicks "Adjust Balance" on user profile
2. Form: { amount: ±N, reason: text, category: dropdown }
   Categories: 'compensation', 'error_correction', 'promo_manual', 'investigation'
3. If amount > 10,000: requires second admin approval
4. On submit:
   a. Create admin_actions record (status: 'pending' if needs approval)
   b. If approved: call admin_adjust_balance() RPC
   c. RPC atomically: update balance, create ledger entry with admin_id
   d. Create audit_log entry with full context
5. Notification sent to user: "Your account has been credited 5,000 credits. Reason: Compensation for service disruption."
```

## 10.4 Audit Logging

```sql
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,                -- who performed the action
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,                   -- 'user.suspend', 'wallet.adjust', 'promo.create'
  target_type TEXT NOT NULL,              -- 'user', 'wallet', 'promo', 'game', 'ticket'
  target_id UUID,
  details JSONB NOT NULL DEFAULT '{}',   -- full context
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- This table is APPEND-ONLY. No UPDATE or DELETE policies.
-- RLS: only super_admin can SELECT
CREATE POLICY "Super admin can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- No UPDATE or DELETE policies exist = immutable
```

## 10.5 Admin Dashboard Widgets

```
┌─────────────────────────────────────────────────┐
│ ADMIN DASHBOARD                                  │
├──────────────────────┬──────────────────────────┤
│ TODAY'S METRICS       │ ALERTS                   │
│ DAU: 892             │ ⚠ 3 fraud reviews pending│
│ Revenue: $1,247      │ ⚠ 2 chargebacks received │
│ Games Played: 12,847 │ ⚠ 5 support tickets >24h │
│ New Users: 47        │ ✓ All systems operational │
│ ARPPU: $18.20        │                          │
├──────────────────────┼──────────────────────────┤
│ REVENUE CHART        │ RETENTION COHORT         │
│ (7-day line graph)   │ (weekly heatmap)         │
├──────────────────────┼──────────────────────────┤
│ TOP GAMES TODAY       │ RECENT ADMIN ACTIONS     │
│ 1. Slots (4,200)     │ • John adjusted wallet   │
│ 2. Blackjack (2,100) │ • Sarah closed ticket    │
│ 3. Crash (1,800)     │ • Mike banned user       │
└──────────────────────┴──────────────────────────┘
```

---

# 11. CUSTOMER SUPPORT AND DISPUTE HANDLING

## 11.1 Support Ticket System

```sql
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,     -- 'TKT-2026-00001' (human-readable)
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  assigned_to UUID REFERENCES public.profiles(id),

  category TEXT NOT NULL CHECK (category IN (
    'account', 'payment', 'missing_credits', 'game_issue',
    'bug_report', 'abuse_report', 'self_exclusion',
    'refund_request', 'ban_appeal', 'other'
  )),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_user', 'escalated', 'resolved', 'closed')),

  subject TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,

  -- SLA tracking
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id),
  sender_id UUID NOT NULL REFERENCES public.profiles(id),
  is_internal BOOLEAN NOT NULL DEFAULT false,  -- internal notes not visible to user
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 11.2 SLAs

| Priority | First Response | Resolution Target |
|----------|---------------|-------------------|
| Urgent | 1 hour | 4 hours |
| High | 4 hours | 24 hours |
| Medium | 12 hours | 48 hours |
| Low | 24 hours | 72 hours |

Auto-escalation: If first response SLA breached → auto-assign to next available agent + alert admin.

## 11.3 Support Macros/Templates

```
MACRO: missing_credits_investigation
Subject: Re: Missing Credits - Investigation Started

Hi {user.display_name},

Thank you for reaching out about the missing credits on your account.

I've started an investigation into your account activity. Here's what I can see:
- Current Balance: {user.balance} credits
- Last 5 transactions: {recent_transactions}

I'm reviewing the game logs now and will follow up within {sla_target}.

If you have any additional details (approximate time of the issue, which game you were playing), please reply to this ticket.

Best,
{agent.name}
Fortuna Support Team
```

## 11.4 Missing Credits Dispute Process

```
1. User opens ticket: "I bet 500 on Blackjack but didn't get my 1,000 payout"
2. Support agent reviews:
   a. game_id from user's recent games
   b. game result in games table (settled? payout amount?)
   c. wallet_ledger entries for that game_id
   d. Server logs for that API call
3. Possible findings:
   a. Game was settled correctly → explain result to user
   b. Game not settled (server error) → manually settle via admin_adjust_balance
   c. Ledger discrepancy → escalate to finance_reviewer
4. Resolution: credit + apology if our error, explanation if not
5. All investigation notes logged as internal ticket messages
```

## 11.5 Self-Exclusion Support Flow

```
1. User requests self-exclusion (via /responsible-gambling page or support ticket)
2. System immediately:
   a. Sets self_excluded_until on profile
   b. Terminates all active sessions
   c. Disables game access
   d. Cancels any active subscriptions (with prorated refund)
   e. Sends confirmation email
3. During exclusion:
   - User cannot log in to play
   - User CAN contact support (email only)
   - User CANNOT reverse exclusion early (by design)
4. When exclusion expires:
   - User receives email: "Your self-exclusion has ended. If you'd like to play again, log in."
   - 24-hour cooling period before games re-enabled
```

---

# 12. FRAUD, RISK, TRUST & SAFETY

## 12.1 Risk Scoring Model

Each user gets a **risk_score** (0-100):

```
risk_score = Σ(signal_weight × signal_value)

Signals:
├── account_age_days < 1                  → +15
├── email_is_disposable                   → +20
├── multiple_accounts_same_device         → +25
├── multiple_accounts_same_ip             → +15
├── vpn_or_proxy_detected                 → +10
├── rapid_bet_pattern (>30/min)           → +15
├── suspiciously_perfect_play_pattern     → +20
├── chargeback_filed                      → +30
├── refund_count_90d > 2                  → +15
├── promo_claim_velocity_anomaly          → +20
├── login_from_multiple_countries_24h     → +15
└── behavioral_session_anomaly            → +10

Thresholds:
├── 0-25:   Normal (green)     → no action
├── 26-50:  Elevated (yellow)  → enhanced monitoring
├── 51-75:  High (orange)      → auto-flag for review
└── 76-100: Critical (red)     → auto-suspend + immediate review
```

## 12.2 Fraud Detection Rules

```sql
CREATE TABLE public.fraud_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,    -- 'threshold', 'pattern', 'velocity', 'correlation'
  condition JSONB NOT NULL,   -- machine-readable rule definition
  action TEXT NOT NULL CHECK (action IN ('flag', 'block', 'suspend', 'notify')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Example rules:
INSERT INTO fraud_rules (name, rule_type, condition, action, severity) VALUES
  ('Multi-account device', 'correlation',
   '{"check": "same_device_fingerprint", "threshold": 2, "window": "all_time"}',
   'flag', 'high'),

  ('Rapid bonus claiming', 'velocity',
   '{"event": "bonus_claimed", "max_count": 5, "window_minutes": 60}',
   'block', 'medium'),

  ('Stolen card pattern', 'pattern',
   '{"check": "purchase_then_immediate_chargeback", "window_hours": 48}',
   'suspend', 'critical'),

  ('Bot-like play speed', 'velocity',
   '{"event": "game_completed", "max_count": 120, "window_minutes": 60}',
   'flag', 'medium'),

  ('Large balance anomaly', 'threshold',
   '{"check": "balance_increase", "amount": 500000, "window_hours": 24, "without_purchase": true}',
   'flag', 'high');
```

## 12.3 Fraud Flags Table

```sql
CREATE TABLE public.fraud_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  rule_id UUID REFERENCES public.fraud_rules(id),
  flag_type TEXT NOT NULL,              -- 'multi_account', 'bonus_abuse', 'stolen_card', etc.
  severity TEXT NOT NULL,
  evidence JSONB NOT NULL,              -- snapshot of evidence at flag time
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'investigating', 'confirmed', 'false_positive', 'resolved')),
  reviewed_by UUID REFERENCES public.profiles(id),
  review_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 12.4 Device Fingerprinting

```sql
CREATE TABLE public.device_fingerprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_hash TEXT UNIQUE NOT NULL,  -- SHA256 of composite fingerprint
  user_agent TEXT,
  screen_resolution TEXT,
  timezone TEXT,
  language TEXT,
  platform TEXT,
  webgl_renderer TEXT,
  canvas_hash TEXT,                        -- canvas fingerprint
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_device_links (
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  fingerprint_id UUID NOT NULL REFERENCES public.device_fingerprints(id),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, fingerprint_id)
);

-- Multi-account detection query:
SELECT fp.fingerprint_hash, COUNT(DISTINCT udl.user_id) AS account_count,
       ARRAY_AGG(DISTINCT udl.user_id) AS user_ids
FROM device_fingerprints fp
JOIN user_device_links udl ON udl.fingerprint_id = fp.id
GROUP BY fp.fingerprint_hash
HAVING COUNT(DISTINCT udl.user_id) > 1;
```

## 12.5 Manual Review Workflow

```
Fraud Queue → Analyst picks case → Reviews evidence:
  - User profile + history
  - Device fingerprint matches
  - IP history + geo
  - Transaction patterns
  - Game play patterns
  - Related accounts (same device/IP)

Actions available:
  [Clear — False Positive]  → Remove flag, restore normal
  [Warn User]               → Send warning, add internal note
  [Restrict]                → Disable purchases, flag future activity
  [Suspend]                 → Lock account pending investigation
  [Ban]                     → Permanent ban with reason
  [Escalate]                → Assign to admin for final decision
```

---

# 13. SECURITY ARCHITECTURE

## 13.1 Defense Layers

```
LAYER 1: EDGE (Vercel/Cloudflare)
├── WAF rules (OWASP Top 10)
├── DDoS protection
├── Bot detection (Cloudflare Turnstile)
├── Rate limiting (global: 100 req/s per IP)
├── Geo-blocking (if needed)
└── TLS 1.3 everywhere

LAYER 2: APPLICATION
├── Input validation (zod schemas on every endpoint)
├── Output encoding (React auto-escapes, CSP headers)
├── CSRF protection (SameSite cookies + origin check)
├── Auth middleware on all protected routes
├── Rate limiting (per-user: 60 bets/min, 10 purchases/day)
├── API key rotation for service-to-service
└── Dependency scanning (npm audit, Snyk)

LAYER 3: DATABASE
├── Row Level Security (RLS) on all tables
├── service_role key never exposed to client
├── Parameterized queries (Supabase SDK handles this)
├── Encrypted at rest (Supabase managed)
├── Connection pooling (PgBouncer)
└── Backup: daily automated, 30-day retention

LAYER 4: SECRETS
├── Environment variables in Vercel (encrypted)
├── SUPABASE_SERVICE_ROLE_KEY → server-only
├── STRIPE_SECRET_KEY → server-only
├── STRIPE_WEBHOOK_SECRET → server-only
├── Never in client bundle (NEXT_PUBLIC_ prefix only for public keys)
└── Rotation: quarterly, immediate on suspected compromise
```

## 13.2 Security Headers (Already Implemented)

```typescript
// next.config.ts
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

// To add:
{ key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com; frame-src https://js.stripe.com;" },
{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
```

## 13.3 API Authentication Flow

```
Public endpoints:    No auth needed        GET /, /about, /faq
Authenticated:       Supabase JWT          GET /api/wallet, POST /api/games
Admin:               JWT + role check      GET /api/admin/*
Webhook:             Signature verification POST /api/webhooks/stripe
Internal:            service_role key       Server-side Supabase calls
```

## 13.4 Incident Response Plan

```
SEVERITY 1 (Data Breach / Funds Manipulation):
  0-15 min:  Detect → Page on-call → Assess scope
  15-30 min: Contain → Disable affected systems → Preserve evidence
  30-60 min: Notify leadership → Begin forensics
  1-4 hours: Fix root cause → Deploy patch → Verify
  4-24 hours: User notification (if PII affected) → Post-mortem

SEVERITY 2 (Service Down / Game Bug):
  0-5 min:   Auto-alert from monitoring
  5-15 min:  On-call investigates → Rolls back if needed
  15-60 min: Fix deployed → Verify → All-clear

SEVERITY 3 (Minor Bug / UI Issue):
  Queue in next sprint → Fix → Deploy in next release
```

## 13.5 Penetration Testing Plan

| Test | Frequency | Scope |
|------|-----------|-------|
| Automated DAST (OWASP ZAP) | Weekly | All API endpoints |
| Dependency scan (Snyk/npm audit) | Every deploy | All packages |
| Manual pentest (external firm) | Annually | Full platform |
| Bug bounty program | Ongoing | Public-facing surfaces |
| Red team exercise | Bi-annually | Social engineering + technical |

---

# 14. COMPLIANCE, LEGAL, AND POLICY LAYER

## 14.1 Free-to-Play Legal Framework

Since Fortuna is NOT real-money gambling:
- No gambling license required
- No KYC/AML requirements
- No fund segregation requirements
- No regulatory reporting obligations
- Standard e-commerce terms apply

**However**, we voluntarily implement responsible-use tools because:
1. It's the ethical thing to do
2. It builds user trust
3. It preempts regulatory scrutiny
4. App stores (Apple/Google) require them for "simulated gambling" category

## 14.2 Required Disclosures and Placement

| Disclosure | Text | Where |
|-----------|------|-------|
| **No Cash Value** | "Credits are virtual entertainment tokens with no monetary value." | Wallet page, store page, purchase confirmation, ToS |
| **No Withdrawal** | "Credits cannot be withdrawn, exchanged, or redeemed for cash or prizes." | Wallet page, ToS, purchase flow |
| **Entertainment Only** | "This platform is for entertainment purposes only. No real money is wagered." | Footer (every page), registration, ToS |
| **Age Restriction** | "You must be 18 years or older to use this platform." | Registration, footer, ToS |
| **Purchase Disclosure** | "You are purchasing virtual credits for entertainment use only. All purchases are final." | Checkout page (before payment) |
| **Odds Disclosure** | "Each game displays its Return to Player (RTP) percentage. This is a long-term statistical average." | Game lobby, individual game pages |
| **Responsible Play** | "Play responsibly. Set limits, take breaks, and remember this is entertainment." | Footer, game pages, post-session |

## 14.3 Terms of Service Key Clauses

```
Section 3: Virtual Credits
3.1 Credits ("Fortuna Credits") are a virtual entertainment currency with no
    real-world monetary value.
3.2 Credits cannot be sold, transferred, traded, or exchanged for real
    currency, goods, or services outside the Platform.
3.3 Credits cannot be withdrawn or redeemed for cash under any circumstances.
3.4 Credits are a limited license to use a feature of the Platform, not
    property that you own.
3.5 We reserve the right to modify credit values, pricing, and availability
    at any time.
3.6 Upon account termination, all credits are forfeited.

Section 7: Responsible Use
7.1 This Platform is intended for entertainment only.
7.2 If you feel your use of the Platform is becoming problematic, please
    use our self-exclusion and limit-setting tools at /responsible-gambling.
7.3 We reserve the right to limit, suspend, or close accounts where we
    detect patterns suggestive of problematic use.

Section 9: Purchases and Refunds
9.1 All credit purchases are final.
9.2 Refund requests may be submitted within 14 days of purchase.
9.3 Refunds are at our sole discretion and may be issued as credits
    rather than monetary refund.
9.4 Credits obtained through promotional offers are not eligible for
    monetary refund.
```

## 14.4 Privacy and Consent

| Consent Type | Required? | UI Location | Recorded? |
|-------------|-----------|-------------|-----------|
| Terms of Service | Yes (blocking) | Registration form | consent_records table |
| Privacy Policy | Yes (blocking) | Registration form | consent_records table |
| Age Confirmation (18+) | Yes (blocking) | Registration form | consent_records table |
| Marketing emails | No (opt-in) | Registration form + settings | consent_records table |
| Push notifications | No (opt-in) | Post-registration prompt | consent_records table |
| Cookie consent | Yes (if EU) | Cookie banner | Cookie storage |

## 14.5 Items Requiring Legal Review Before Launch

1. Terms of Service — full document
2. Privacy Policy — full document (GDPR-ready if targeting EU)
3. Virtual currency disclaimers — wording approval
4. Refund policy — compliance with consumer protection laws
5. Age gate mechanism — sufficiency per jurisdiction
6. App store category classification — "simulated gambling" rules
7. Marketing materials — no misleading "win money" language
8. Stripe MCC code confirmation — ensure 5816, not 7995
9. Tax nexus analysis — where to collect/remit sales tax
10. COPPA compliance — handling if underage user discovered
11. Cookie policy — GDPR/ePrivacy compliance
12. Data retention policy — how long we keep user data
13. Third-party data sharing disclosures
14. Intellectual property review — game names, visuals, sounds

---

# 15. SYSTEM ARCHITECTURE

## 15.1 Stack Selection and Justification

| Layer | Choice | Why |
|-------|--------|-----|
| **Frontend** | Next.js 16 + React 19 + TypeScript | App Router SSR/SSG, React Compiler for perf, full-stack in one framework |
| **Styling** | Tailwind CSS 4 + Framer Motion | Utility-first = fast iteration, Framer = premium game animations |
| **State** | Zustand + React Context | Zustand for game state (persist to localStorage), Context for auth/balance |
| **Backend** | Next.js API Routes (Route Handlers) | Co-located with frontend, Vercel Edge for low latency, no separate server |
| **Database** | PostgreSQL via Supabase | ACID transactions for wallet ops, RLS for security, Realtime for live updates |
| **Auth** | Supabase Auth | JWT + refresh tokens, OAuth providers, MFA, session management built-in |
| **Cache** | Vercel KV (Redis) | Rate limiting, session cache, leaderboard cache |
| **Queue** | Vercel Cron + Supabase Edge Functions | Daily bonus reset, promo expiry, reconciliation jobs |
| **Storage** | Supabase Storage (S3-backed) | Avatar uploads, support ticket attachments |
| **CDN** | Vercel Edge Network | Global CDN, automatic image optimization, edge caching |
| **Payments** | Stripe | Best-in-class for IAP, Checkout Sessions, webhooks, subscriptions |
| **Analytics** | PostHog (self-hosted or cloud) | Event tracking, funnels, retention, feature flags |
| **Observability** | Vercel Analytics + Sentry | Performance monitoring, error tracking, source maps |
| **Email** | Resend | Transactional emails (verification, receipts, support) |
| **Deployment** | Vercel | Zero-config Next.js deploys, preview URLs, edge functions |
| **CI/CD** | GitHub Actions | Lint, type-check, test, deploy on push to main |
| **IaC** | Supabase CLI + Vercel CLI | Database migrations + deployment automation |

## 15.2 Architecture Diagram

```
                           ┌──────────────────┐
                           │   Cloudflare      │
                           │   WAF + DDoS      │
                           └────────┬─────────┘
                                    │
                           ┌────────▼─────────┐
                           │   Vercel Edge     │
                           │   CDN + SSR       │
                           └────────┬─────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
           ┌────────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
           │ Next.js Pages │ │ API Routes │ │ Middleware  │
           │ (SSR/SSG)     │ │ /api/*     │ │ (auth,rls) │
           └───────────────┘ └─────┬──────┘ └────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
           ┌────────▼──────┐ ┌────▼─────┐ ┌─────▼────┐
           │ Supabase      │ │ Stripe   │ │ Vercel   │
           │ (Postgres +   │ │ Payments │ │ KV/Redis │
           │  Auth +       │ │ Webhooks │ │ Cache    │
           │  Realtime +   │ └──────────┘ └──────────┘
           │  Storage)     │
           └───────────────┘
                    │
           ┌────────▼──────┐
           │ Background    │
           │ Jobs:         │
           │ - Cron tasks  │
           │ - Edge Funcs  │
           │ - Webhooks    │
           └───────────────┘
                    │
           ┌────────▼──────┐
           │ Analytics:    │
           │ - PostHog     │
           │ - Sentry      │
           │ - Vercel      │
           └───────────────┘
```

## 15.3 Monolith vs Microservices

**Recommendation: Modular Monolith** (Phase 1-3), extract services only when needed (Phase 4).

Why:
- Next.js API routes are a natural modular monolith — each route file is an isolated handler
- Supabase RPCs encapsulate business logic at the DB level (process_bet, settle_game)
- Team is small (1-5 engineers) — microservices add operational overhead without benefit
- Vercel handles scaling automatically (serverless functions scale to zero)
- **When to extract**: If game processing needs >10s compute (unlikely), or if we add real-time multiplayer that needs WebSocket servers

Module boundaries within the monolith:
```
src/app/api/
├── games/        → Game service (bet, settle, catalog)
├── wallet/       → Wallet service (deposit, withdraw, balance)
├── store/        → Commerce service (checkout, webhooks)
├── bonus/        → Bonus service (daily, promos)
├── admin/        → Admin service (user mgmt, adjustments)
├── support/      → Support service (tickets)
└── webhooks/     → Webhook handlers (Stripe, etc.)
```

Each "service" is a folder of route handlers that share types and utilities from `src/lib/`. They communicate through the database (Supabase), not HTTP calls to each other.

## 15.4 Scaling Model

| Component | Scaling Strategy | Trigger |
|-----------|-----------------|---------|
| Frontend (SSR) | Vercel auto-scales serverless functions | Automatic |
| API Routes | Vercel auto-scales (1000 concurrent by default) | Automatic |
| Database | Supabase Pro plan → 4GB RAM, 2 CPUs; upgrade to custom for more | >500 concurrent connections |
| Realtime | Supabase Realtime scales with plan | >10K concurrent subscribers |
| Redis (KV) | Vercel KV scales with plan | >100K ops/day |
| Storage | S3-backed, effectively unlimited | N/A |
| Stripe | Stripe handles scaling | N/A |

**Bottleneck analysis**: The database is the bottleneck. `FOR UPDATE` locks on profiles serializes bets per user (by design — prevents double-spend). Different users are not serialized. At 10K concurrent users each making 1 bet/second = 10K TPS — Supabase Pro handles this. Above 50K TPS, consider read replicas + connection pooling upgrade.

---

# 16. DATABASE DESIGN

## 16.1 Entity-Relationship Summary

```
auth.users (Supabase managed)
    │ 1:1
    ▼
profiles ──────┬──── 1:N ──── games
    │          │               │
    │ 1:N      │ 1:N           │ 1:N
    ▼          ▼               ▼
wallet_ledger  transactions   game_events
    │
    │          profiles ──── 1:N ──── purchases ──── 1:N ──── payment_attempts
    │              │
    │              │ 1:1
    │              ▼
    │          login_bonuses
    │
    │          profiles ──── 1:N ──── support_tickets ──── 1:N ──── ticket_messages
    │              │
    │              │ 1:N
    │              ▼
    │          fraud_flags
    │
    │          profiles ──── 1:N ──── user_devices
    │              │
    │              │ 1:N
    │              ▼
    │          user_sessions
    │
    │          profiles ──── 1:N ──── favorites
    │              │
    │              │ 1:N
    │              ▼
    │          entitlements
    │
    │          profiles ──── 1:N ──── subscriptions
    │              │
    │              │ 1:N
    │              ▼
    │          mission_progress
    │
    ▼
  audit_logs (append-only)
```

## 16.2 Core Table Specifications

### profiles
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | References auth.users(id) |
| username | TEXT UNIQUE | Display name, immutable after set |
| display_name | TEXT | Optional friendly name |
| avatar_url | TEXT | Supabase Storage URL |
| role | TEXT | 'player', 'vip', 'support', 'admin', 'super_admin' |
| status | TEXT | 'pending', 'verified', 'suspended', 'banned', etc. |
| balance | BIGINT | Total balance (cached, reconciled from ledger) |
| purchased_balance | BIGINT | Purchased credits subtotal |
| bonus_balance | BIGINT | Bonus credits subtotal |
| total_wagered | BIGINT | Lifetime wagering total |
| total_won | BIGINT | Lifetime winnings total |
| games_played | BIGINT | Lifetime games count |
| level | INTEGER | Computed from XP |
| exp | BIGINT | Experience points |
| vip_tier | TEXT | 'bronze'→'diamond', computed from total_wagered |
| loyalty_points | BIGINT | Redeemable loyalty currency |
| daily_deposit_limit | BIGINT | User-set responsible play limit |
| daily_loss_limit | BIGINT | User-set responsible play limit |
| session_time_limit | INTEGER | Minutes, user-set |
| self_excluded_until | TIMESTAMPTZ | NULL = not excluded |
| last_login_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Indexes**: PK, username (unique), vip_tier, status, created_at
**Sensitive**: email (in auth.users), IP (in user_devices), balance
**RLS**: Users see own profile, public sees username only, service_role full access

### games
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| player_id | UUID FK→profiles | |
| game_type | TEXT | 'slots', 'blackjack', etc. |
| bet_amount | BIGINT | CHECK > 0 |
| server_seed_hash | TEXT | SHA256 commitment (shown before play) |
| server_seed | TEXT | Revealed after settlement |
| client_seed | TEXT | Player-provided or auto |
| nonce | INTEGER | Incrementing counter |
| result | JSONB | Game-specific result data |
| payout | BIGINT | Credits paid out |
| multiplier | NUMERIC(10,4) | Win multiplier |
| settled | BOOLEAN | Idempotency flag |
| created_at | TIMESTAMPTZ | |

**Indexes**: player_id, game_type, created_at DESC, (id, player_id) for settle lookups
**Retention**: Indefinite (needed for provably fair verification)

### wallet_ledger
(Defined in Section 6.2)
**Indexes**: user_id, created_at DESC, tx_type, idempotency_key (unique)
**Retention**: Indefinite (financial audit trail)

### purchases
(Defined in Section 8.4)
**Indexes**: user_id, stripe_session_id (unique), status, created_at
**Sensitive**: stripe_payment_intent_id, ip_address
**Retention**: 7 years (tax/accounting requirements)

### support_tickets
(Defined in Section 11.1)
**Indexes**: user_id, assigned_to, status, priority, created_at
**Retention**: 3 years after resolution

### fraud_flags
(Defined in Section 12.3)
**Indexes**: user_id, status, severity, created_at
**Retention**: Indefinite (fraud pattern analysis)

### audit_logs
(Defined in Section 10.4)
**Indexes**: actor_id, action, target_type, target_id, created_at
**Retention**: Indefinite, append-only, no DELETE policy

### game_catalog
(Defined in Section 7.1)
**Indexes**: slug (unique), category, is_active, sort_order

---

# 17. API DESIGN

## 17.1 API Versioning Strategy

All APIs live under `/api/` (Next.js Route Handlers). No version prefix for V1. Future breaking changes would use `/api/v2/`.

**Auth**: All authenticated endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header, validated server-side via `createClient()` → `supabase.auth.getUser()`.

## 17.2 Endpoint Catalog

### Authentication

```
POST /api/auth/signup
  Auth: None
  Body: { email, password, username, age_confirmed: true, terms_accepted: true }
  Response: { user: { id, email }, message: "Verification email sent" }
  Errors: 400 (validation), 409 (email/username taken)

POST /api/auth/login
  Auth: None
  Body: { email, password }
  Response: { session: { access_token, refresh_token, expires_at }, user: { id, email, username } }
  Errors: 401 (invalid credentials), 423 (locked), 403 (banned/suspended)

POST /api/auth/refresh
  Auth: Refresh token
  Body: { refresh_token }
  Response: { access_token, expires_at }
  Errors: 401 (invalid/expired token)

POST /api/auth/logout
  Auth: Required
  Body: {}
  Response: { success: true }

POST /api/auth/forgot-password
  Auth: None
  Body: { email }
  Response: { message: "Reset email sent if account exists" }  // always 200

POST /api/auth/reset-password
  Auth: Reset token (from email link)
  Body: { token, new_password }
  Response: { success: true }
  Errors: 400 (weak password), 401 (invalid/expired token)
```

### User Profile

```
GET /api/profile
  Auth: Required
  Response: { id, username, display_name, avatar_url, level, exp, vip_tier,
              games_played, total_wagered, total_won, loyalty_points, created_at }

PATCH /api/profile
  Auth: Required
  Body: { display_name?, avatar_url? }
  Response: { ...updated profile }
  Validation: display_name max 30 chars, avatar_url must be Supabase Storage URL

GET /api/profile/security
  Auth: Required
  Response: { mfa_enabled, devices: [...], active_sessions: [...] }

POST /api/profile/change-password
  Auth: Required
  Body: { current_password, new_password }
  Response: { success: true }
  Errors: 401 (wrong current password), 400 (weak new password)
```

### Wallet

```
GET /api/wallet
  Auth: Required
  Response: { balance, purchased_balance, bonus_balance, promo_balance, promo_expiry }

GET /api/wallet/transactions
  Auth: Required
  Query: ?type=bet&limit=20&offset=0
  Response: { transactions: [...], total, has_more }

POST /api/wallet
  Auth: Required
  Body: { action: 'deposit', amount: 5000 } | { action: 'withdraw', amount: 1000 }
  Response: { new_balance, tx_id }
  Errors: 400 (invalid amount), 403 (limit exceeded)
```

### Games

```
GET /api/games/catalog
  Auth: None
  Response: { games: [{ slug, title, category, rtp_bps, min_bet, max_bet, is_new, is_featured }] }

POST /api/games
  Auth: Required
  Body: { gameType, betAmount, clientSeed?, gameData: { ...game-specific params } }
  Response: { gameId, result: {...}, payout, multiplier, newBalance,
              serverSeed, serverSeedHash, clientSeed, nonce }
  Errors: 400 (validation), 402 (insufficient balance), 403 (self-excluded/limit), 429 (rate limit)

GET /api/games/history
  Auth: Required
  Query: ?gameType=blackjack&limit=20&offset=0
  Response: { games: [...], total, has_more }

GET /api/games/verify
  Auth: None
  Query: ?serverSeed=X&clientSeed=Y&nonce=1&gameType=slots
  Response: { result: {...}, verified: true }
```

### Store / Commerce

```
GET /api/store/packages
  Auth: None
  Response: { packages: [{ slug, name, credits, bonus_credits, price_cents, is_featured }] }

POST /api/store/checkout
  Auth: Required
  Body: { packageId, promoCode? }
  Response: { checkoutUrl: "https://checkout.stripe.com/..." }
  Errors: 400 (invalid package), 403 (purchase limit), 429 (rate limit)

POST /api/webhooks/stripe
  Auth: Stripe signature verification
  Body: Stripe event payload
  Response: { received: true }

GET /api/store/purchases
  Auth: Required
  Response: { purchases: [...] }
```

### Bonuses & Rewards

```
GET /api/bonus
  Auth: Required
  Response: { streak, can_collect, next_amount, total_collected, last_collected }

POST /api/bonus
  Auth: Required
  Body: { action: 'collect' }
  Response: { success: true, amount, new_streak, new_balance }
  Errors: 400 (already collected today), 429 (rate limit)

GET /api/rewards/missions
  Auth: Required
  Response: { missions: [{ id, title, progress, target, completed, reward }] }

POST /api/rewards/missions/claim
  Auth: Required
  Body: { missionId }
  Response: { success: true, reward_amount, new_balance }
```

### Support

```
POST /api/support/tickets
  Auth: Required
  Body: { category, subject, message }
  Response: { ticket: { id, ticket_number, status } }

GET /api/support/tickets
  Auth: Required
  Response: { tickets: [...] }

GET /api/support/tickets/:id
  Auth: Required
  Response: { ticket: {...}, messages: [...] }

POST /api/support/tickets/:id/messages
  Auth: Required
  Body: { message }
  Response: { message: {...} }
```

### Admin

```
GET /api/admin/stats
  Auth: admin+
  Response: { dau, revenue_today, games_today, new_users_today, ... }

GET /api/admin/users
  Auth: support+
  Query: ?search=email&status=verified&page=1
  Response: { users: [...], total, pages }

GET /api/admin/users/:id
  Auth: support+
  Response: { profile, recent_games, recent_transactions, devices, fraud_flags }

POST /api/admin/users/:id/adjust-balance
  Auth: admin+
  Body: { amount, reason, category }
  Response: { old_balance, new_balance, adjustment }
  Validation: amount != 0, |amount| <= 10000 for admin (unlimited for super_admin)

POST /api/admin/users/:id/suspend
  Auth: admin+
  Body: { reason }
  Response: { success: true }

POST /api/admin/users/:id/ban
  Auth: admin+
  Body: { reason }
  Response: { success: true }

GET /api/admin/fraud/queue
  Auth: risk_analyst+
  Response: { flags: [...] }

POST /api/admin/fraud/:flagId/review
  Auth: risk_analyst+
  Body: { action: 'clear' | 'warn' | 'suspend' | 'ban', notes }
  Response: { success: true }
```

### Responsible Gambling

```
GET /api/responsible-gambling
  Auth: Required
  Response: { daily_deposit_limit, daily_loss_limit, session_time_limit, self_excluded_until }

POST /api/responsible-gambling
  Auth: Required
  Body: { action: 'set_limits', daily_deposit_limit?, daily_loss_limit?, session_time_limit? }
       | { action: 'self_exclude', duration: '24h' | '7d' | '30d' | '90d' }
  Response: { success: true, ...updated limits }
```

---

# 18. EVENT-DRIVEN AND BACKGROUND JOBS

## 18.1 Job Types

| Job | Trigger | Frequency | Implementation |
|-----|---------|-----------|---------------|
| **Email verification** | User signup | On-demand | Supabase Auth (built-in) |
| **Welcome credits** | User verified | On-demand | DB trigger (handle_new_user) |
| **Transaction receipt email** | Purchase completed | On-demand | Stripe webhook → Resend API |
| **Daily bonus reset** | Calendar day change | Daily at midnight UTC | Vercel Cron |
| **Promo credit expiry** | Credits reach TTL | Hourly | Vercel Cron |
| **Ledger reconciliation** | Scheduled | Hourly | Vercel Cron → Supabase RPC |
| **Loyalty tier recalculation** | XP/wagering change | On-demand | DB trigger (update_level) |
| **Fraud scoring** | Game completed | On-demand | After settle_game, async |
| **Inactive user re-engagement** | User absent 5+ days | Daily | Vercel Cron → Resend email |
| **Jackpot pool update** | Any eligible game | On-demand | In settle_game RPC |
| **SLA breach check** | Ticket age | Every 15 min | Vercel Cron |
| **Subscription renewal** | Stripe event | On-demand | Stripe webhook |
| **Self-exclusion expiry** | TTL reached | Hourly | Vercel Cron |
| **Analytics event flush** | Event buffer full | Every 5 min | PostHog SDK auto-flush |

## 18.2 Cron Job Definitions

```typescript
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-reset",
      "schedule": "0 0 * * *"           // midnight UTC daily
    },
    {
      "path": "/api/cron/promo-expiry",
      "schedule": "0 * * * *"           // every hour
    },
    {
      "path": "/api/cron/reconciliation",
      "schedule": "30 * * * *"          // every hour at :30
    },
    {
      "path": "/api/cron/sla-check",
      "schedule": "*/15 * * * *"        // every 15 minutes
    },
    {
      "path": "/api/cron/re-engagement",
      "schedule": "0 10 * * *"          // 10am UTC daily
    },
    {
      "path": "/api/cron/self-exclusion-expiry",
      "schedule": "0 * * * *"           // every hour
    }
  ]
}
```

## 18.3 Idempotency Strategy

Every background job that modifies state uses idempotency keys:

```typescript
// Example: promo expiry job
async function expirePromoCredits() {
  const expiredPromos = await supabaseAdmin
    .from('wallet_ledger')
    .select('*')
    .eq('bucket', 'promo')
    .lt('metadata->>expires_at', new Date().toISOString())
    .eq('metadata->>expired', null);

  for (const entry of expiredPromos) {
    const idempotencyKey = `promo_expire:${entry.id}`;

    // Idempotency: if this key already exists, skip
    const { error } = await supabaseAdmin
      .from('wallet_ledger')
      .insert({
        user_id: entry.user_id,
        tx_type: 'promo_expire',
        bucket: 'promo',
        amount: -entry.amount, // debit the expired promo credits
        idempotency_key: idempotencyKey,
        description: 'Promotional credits expired',
      });

    if (error?.code === '23505') continue; // unique violation = already processed
  }
}
```

## 18.4 Dead Letter / Retry Strategy

| Job Type | Max Retries | Backoff | DLQ Action |
|----------|-------------|---------|-----------|
| Stripe webhook | 3 | Stripe auto-retries (exponential) | Alert finance team |
| Email send | 3 | 1min, 5min, 15min | Log failure, alert support |
| Ledger reconciliation | 1 | N/A (will run again next hour) | Alert if discrepancy persists 3 hours |
| Fraud scoring | 2 | 30s, 2min | Flag for manual review |
| Cron jobs | 1 | Next scheduled run | Alert if 2 consecutive failures |

---

# 19. ANALYTICS, REPORTING, AND BUSINESS INTELLIGENCE

## 19.1 Event Taxonomy

```
user.signup                    { method: 'email'|'google', source: 'organic'|'referral' }
user.login                     { method, device_type, is_new_device }
user.logout                    { session_duration_minutes }
user.profile_updated           { fields_changed: [...] }

wallet.purchase                { package_id, amount_cents, credits, promo_code }
wallet.daily_bonus_claimed     { streak, amount }
wallet.promo_redeemed          { promo_id, amount }
wallet.balance_low             { balance, threshold }

game.bet_placed                { game_type, amount, is_demo }
game.result                    { game_type, multiplier, payout, won }
game.session_started           { game_type }
game.session_ended             { game_type, duration_seconds, bets, net_result }

store.checkout_started         { package_id }
store.checkout_completed       { package_id, amount_cents }
store.checkout_abandoned       { package_id, step }

support.ticket_created         { category }
support.ticket_resolved        { category, resolution_minutes }

fraud.flag_created             { flag_type, severity }
fraud.flag_resolved            { flag_type, resolution: 'confirmed'|'false_positive' }

responsible_play.limit_set     { limit_type, value }
responsible_play.self_excluded  { duration }
responsible_play.reality_check_shown { session_duration, response: 'continue'|'break' }
```

## 19.2 Key Dashboards

### Product Dashboard
- DAU/WAU/MAU trend
- Signup funnel (visit → register → verify → first game → first purchase)
- Retention cohort heatmap (D1, D7, D14, D30)
- Session frequency and duration distributions
- Game popularity ranking
- Feature adoption rates

### Finance Dashboard
- Daily/weekly/monthly revenue
- ARPPU (Average Revenue Per Paying User)
- Conversion rate (free → paid)
- Revenue by package
- Refund rate and reasons
- Chargeback rate
- LTV projection by cohort

### Operations Dashboard
- Active users (real-time)
- Games in progress
- API latency (p50, p95, p99)
- Error rate by endpoint
- Support ticket volume and SLA compliance
- Jackpot pool sizes

### Risk Dashboard
- New fraud flags (by type, severity)
- False positive rate
- Multi-account detection hits
- Chargeback pipeline
- Risk score distribution
- Anomalous betting patterns

### Executive Dashboard
- Revenue vs target
- User growth vs target
- Retention vs benchmark
- Unit economics (LTV, CAC, payback period)
- Top-line health score (composite metric)

## 19.3 Warehouse Approach

**Phase 1-2**: PostHog for event tracking + Supabase views for financial metrics. All in one stack.

**Phase 3+**: If data volume exceeds PostHog limits or we need complex joins:
- ETL: Supabase → BigQuery (via scheduled export or Fivetran)
- Dashboards: Metabase or Looker on BigQuery
- Keep PostHog for product analytics, BigQuery for financial/operational

---

# 20. DEVOPS, SRE, AND OPERATIONS

## 20.1 Environments

| Environment | URL | Branch | Database | Purpose |
|-------------|-----|--------|----------|---------|
| Local | localhost:3000 | feature/* | Local Supabase (Docker) | Development |
| Preview | *.vercel.app | PR branches | Supabase staging project | PR review |
| Staging | staging.fortuna.casino | staging | Supabase staging project | QA + integration |
| Production | fortuna.casino | main | Supabase production project | Live users |

## 20.2 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI/CD
on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-type-check, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run build

  deploy-staging:
    if: github.ref == 'refs/heads/staging'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: vercel --token $VERCEL_TOKEN

  deploy-production:
    if: github.ref == 'refs/heads/main'
    needs: build
    runs-on: ubuntu-latest
    steps:
      - run: vercel --prod --token $VERCEL_TOKEN

  db-migrate:
    if: github.ref == 'refs/heads/main'
    needs: deploy-production
    runs-on: ubuntu-latest
    steps:
      - run: supabase db push --include-all
```

## 20.3 Monitoring and SLOs

| SLO | Target | Alert Threshold |
|-----|--------|----------------|
| API Availability | 99.9% (8.7h downtime/year) | <99.5% over 1 hour |
| API Latency (p95) | <500ms | >1000ms for 5 minutes |
| Game API Latency (p95) | <200ms | >500ms for 5 minutes |
| Error Rate | <0.1% | >1% for 5 minutes |
| Wallet Reconciliation | 0 discrepancies | Any discrepancy |
| Support First Response | <12h (medium) | Approaching SLA deadline |

## 20.4 Alerting

```
CRITICAL (page on-call immediately):
- API down (5xx rate >10% for 2+ minutes)
- Database unreachable
- Wallet ledger discrepancy detected
- Payment webhook processing failure

WARNING (Slack notification):
- API latency degraded
- Error rate elevated
- Support SLA approaching breach
- Fraud queue growing (>20 unreviewed)

INFO (dashboard only):
- Deployment completed
- Cron job ran successfully
- Daily metrics summary
```

## 20.5 Backup and Recovery

| Data | Backup | Retention | RTO | RPO |
|------|--------|-----------|-----|-----|
| Database | Supabase daily auto-backup + PITR | 30 days | 1 hour | 5 minutes (PITR) |
| User uploads | Supabase Storage (S3-backed, replicated) | Indefinite | 1 hour | 0 (replicated) |
| Application code | GitHub (Git history) | Indefinite | 5 minutes (redeploy) | 0 |
| Secrets | Vercel encrypted env vars | N/A | 15 minutes (re-enter) | 0 |
| Analytics | PostHog cloud (managed) | Per plan | N/A | N/A |

---

# 21. IMPLEMENTATION ROADMAP

## Phase 1: MVP (Weeks 1-6)

**Goal**: Core platform live — users can register, play games, buy credits, claim daily bonus.

| Week | Deliverable |
|------|------------|
| 1-2 | Auth system (email, Google, age gate), profile creation, session management |
| 2-3 | Wallet system (ledger, balance display, demo mode), all 15 games calling API |
| 3-4 | Store (Stripe checkout for 4 credit packages), webhook processing, receipts |
| 4-5 | Daily bonus system, XP/level progression, VIP tier auto-calculation |
| 5-6 | Admin portal (user lookup, wallet adjustment, basic analytics dashboard) |

**Staffing**: 2 full-stack engineers, 1 designer (part-time)
**Major risks**: Stripe approval delay, Supabase scaling for concurrent bets
**Go-live criteria**: Zero TypeScript errors, all games hit API, ledger reconciles, Stripe webhook tested end-to-end

## Phase 2: Beta (Weeks 7-12)

**Goal**: Polish, security hardening, support system, fraud basics.

| Week | Deliverable |
|------|------------|
| 7-8 | Support ticket system, knowledge base, email notifications |
| 8-9 | Fraud detection v1 (multi-account, bonus abuse, rate limiting) |
| 9-10 | Responsible gambling tools (limits, self-exclusion, reality check) |
| 10-11 | Battle pass v1, mission system, referral program |
| 11-12 | Performance optimization, load testing, security audit |

**Staffing**: Add 1 QA engineer, 1 part-time security consultant
**Major risks**: Fraud patterns emerging, performance under load
**Go-live criteria**: <500ms p95 latency, fraud rules catching test scenarios, support SLAs achievable

## Phase 3: Growth (Weeks 13-20)

**Goal**: Retention, monetization optimization, scale.

| Week | Deliverable |
|------|------------|
| 13-14 | Push notifications, email campaigns (re-engagement, streak reminders) |
| 15-16 | Subscription system (Silver/Gold/Diamond Pass), entitlements |
| 17-18 | Advanced analytics (PostHog integration, cohort analysis, funnel tracking) |
| 19-20 | New games (4-6 additional games), seasonal events framework, cosmetics store |

**Staffing**: Add 1 data analyst, 1 marketing/growth person
**Major risks**: Low conversion rate, high churn
**Go-live criteria**: D7 retention >30%, conversion >2%, ARPPU >$10

## Phase 4: Enterprise Hardening (Weeks 21-30)

**Goal**: Scale, compliance, advanced fraud, multi-region.

| Week | Deliverable |
|------|------------|
| 21-23 | Advanced fraud engine (behavioral scoring, ML-based anomaly detection) |
| 24-25 | Full compliance review (legal audit, GDPR readiness, app store submission) |
| 26-27 | Performance: read replicas, CDN optimization, edge caching |
| 28-29 | Mobile app (React Native or PWA), multi-language support |
| 30 | Disaster recovery drill, penetration test, SOC 2 preparation |

**Staffing**: Add 1 DevOps/SRE, 1 fraud analyst
**Major risks**: Regulatory attention, scaling bottlenecks
**Go-live criteria**: 99.9% uptime for 30 days, pentest clean, legal sign-off

---

# 22. TEAM STRUCTURE

## Ideal Team (Growth Stage)

| Role | Count | Responsibilities |
|------|-------|-----------------|
| **Product Manager** | 1 | Roadmap, prioritization, user research, metrics |
| **UX/UI Designer** | 1 | All design, prototyping, design system maintenance |
| **Frontend Engineer** | 2 | Next.js pages, game UIs, animations, accessibility |
| **Backend Engineer** | 2 | API routes, Supabase RPCs, Stripe integration, security |
| **DevOps/SRE** | 1 | CI/CD, monitoring, infrastructure, incident response |
| **Data Engineer** | 1 | Analytics pipeline, dashboards, event taxonomy |
| **QA Engineer** | 1 | Test automation, load testing, wallet integrity testing |
| **Fraud/Risk Analyst** | 1 | Rule authoring, manual review, false positive tuning |
| **Support Operations** | 2 | Ticket resolution, player communication, escalation |
| **Security Lead** | 0.5 | Pentest coordination, code review, compliance (consultant) |

**Total**: ~12.5 FTEs

## Lean Startup (MVP)

| Combined Role | Responsibilities |
|---------------|-----------------|
| **Founder/PM** | Product, design direction, business decisions |
| **Full-Stack Engineer #1** | Frontend, game UI, user-facing features |
| **Full-Stack Engineer #2** | Backend, database, payments, security |
| **Part-time Designer** | UI mockups, design system, assets |

**Total**: 3.5 FTEs — enough to ship MVP in 6 weeks

---

# 23. TESTING STRATEGY

## 23.1 Test Pyramid

```
         ┌───────────┐
         │   E2E     │  5% — Playwright
         │  (slow)   │  Critical user flows only
         ├───────────┤
         │Integration│  25% — Vitest + Supabase local
         │  (medium) │  API routes, RPC calls, webhooks
         ├───────────┤
         │  Unit     │  70% — Vitest
         │  (fast)   │  Game logic, utilities, components
         └───────────┘
```

## 23.2 Test Categories

### Unit Tests (Vitest)
```typescript
// Game logic tests
describe('Blackjack engine', () => {
  it('deals two cards to player and dealer', () => { ... });
  it('calculates hand value correctly with aces', () => { ... });
  it('identifies blackjack on initial deal', () => { ... });
  it('bust if hand exceeds 21', () => { ... });
});

// Plinko multiplier tests
describe('Plinko multipliers', () => {
  it('has EV between 0.97 and 0.99 for all risk levels', () => {
    for (const risk of ['low', 'medium', 'high']) {
      const ev = calculateExpectedValue(PLINKO_MULTIPLIERS[risk]);
      expect(ev).toBeGreaterThan(0.97);
      expect(ev).toBeLessThan(0.99);
    }
  });
});

// Provably fair verification
describe('Provably fair', () => {
  it('produces deterministic results from same seeds', () => { ... });
  it('hash matches server seed', () => { ... });
});
```

### Integration Tests (Vitest + Supabase local)
```typescript
// Wallet integrity
describe('Wallet operations', () => {
  it('process_bet atomically deducts balance', async () => { ... });
  it('settle_game is idempotent (no double-pay)', async () => { ... });
  it('concurrent bets on same user are serialized', async () => { ... });
  it('balance never goes negative', async () => { ... });
  it('ledger sum matches cached balance', async () => { ... });
});

// Payment webhook
describe('Stripe webhook', () => {
  it('credits wallet on checkout.session.completed', async () => { ... });
  it('rejects invalid webhook signature', async () => { ... });
  it('handles duplicate webhook idempotently', async () => { ... });
});

// Auth and permissions
describe('Admin permissions', () => {
  it('player cannot access admin endpoints', async () => { ... });
  it('support can view users but not adjust wallets', async () => { ... });
  it('admin can adjust wallets under 10K', async () => { ... });
  it('only super_admin can adjust wallets over 10K', async () => { ... });
});
```

### E2E Tests (Playwright)
```typescript
// Critical user flows
test('new user signup → verify → first game', async ({ page }) => { ... });
test('user buys credits → balance updates', async ({ page }) => { ... });
test('user claims daily bonus', async ({ page }) => { ... });
test('demo mode plays without API calls', async ({ page }) => { ... });
test('self-exclusion blocks game access', async ({ page }) => { ... });
```

### Load Tests (k6 or Artillery)
```
Scenario 1: Normal load (100 concurrent users)
  - 50% playing games (1 bet/5s)
  - 30% browsing lobby
  - 15% viewing wallet/history
  - 5% purchasing credits
  Target: p95 < 200ms, 0% errors

Scenario 2: Peak load (1000 concurrent users)
  - Same distribution
  Target: p95 < 500ms, <0.1% errors

Scenario 3: Spike test (0 → 2000 users in 30s)
  Target: No 5xx errors, graceful degradation
```

### Wallet Integrity Tests (scheduled, production)
```sql
-- Run hourly: verify ledger matches cached balance
SELECT COUNT(*) AS discrepancies
FROM profiles p
LEFT JOIN (
  SELECT user_id, SUM(amount) AS ledger_total
  FROM wallet_ledger GROUP BY user_id
) wl ON wl.user_id = p.id
WHERE p.balance != COALESCE(wl.ledger_total, 0);
-- Expected: 0. If >0: alert immediately.
```

---

# 24. SAMPLE USER FLOWS

## Flow 1: New User Signup and Verification

```
1. User visits fortuna.casino
2. Clicks "Play Free"
3. Redirected to /register
4. Fills form: username "LuckyAlex", email "alex@example.com", password "S3cur3P@ss!"
5. Checks: ☑ I am 18+, ☑ Terms of Service
6. Clicks "Create Account"
7. Backend: creates auth.users row → triggers handle_new_user → creates profile (10K credits) + welcome transaction
8. User sees: "Check your email for verification link"
9. User clicks email link → /verify-email?token=xxx
10. Backend: marks email_confirmed_at → status = 'verified'
11. User redirected to dashboard with 10,000 credits
12. Onboarding tooltip: "Try your luck! Pick a game to start playing."
```

## Flow 2: User Buying Virtual Coins

```
1. User's balance: 200 credits (low)
2. Header shows amber balance warning
3. User clicks "Top Up" → /wallet
4. Sees 4 packages. "Popular Pack" highlighted with ★
5. Clicks "Buy" on Popular Pack ($4.99 = 10,000 + 2,500 bonus)
6. Frontend: POST /api/store/checkout { packageId: 'popular' }
7. Backend: creates pending purchase, creates Stripe Checkout Session
8. User redirected to Stripe Checkout page
9. Enters card → pays $4.99
10. Stripe sends checkout.session.completed webhook
11. Backend: verifies signature, idempotency check, credits 12,500 to wallet
    - 10,000 to 'purchased' bucket
    - 2,500 to 'bonus' bucket
12. User's balance updates via Supabase Realtime: 12,700 credits
13. Receipt email sent
```

## Flow 3: User Claiming Daily Reward

```
1. User logs in → dashboard shows "Day 12 Streak 🔥 — Claim 1,200 Credits"
2. User clicks [Claim]
3. Frontend: POST /api/bonus { action: 'collect' }
4. Backend: calls collect_bonus RPC
   - Locks login_bonuses row FOR UPDATE
   - Checks last_collected != today
   - Streak continues (collected yesterday): new_streak = 12
   - Amount = min(12 * 100, 5000) = 1,200
   - Credits profile, creates ledger entry
5. Response: { amount: 1200, new_streak: 12, new_balance: 13900 }
6. Frontend: celebration animation, balance counter counts up
7. Button changes to "Come back tomorrow for 1,300 Credits"
```

## Flow 4: User Launching a Game

```
1. User on /games, clicks "Blackjack"
2. Redirected to /games/blackjack
3. Page loads: useAuth() → user is logged in → REAL mode
4. useBalance() → subscribes to Realtime → shows 13,900 credits
5. User sets bet to 500, clicks "Deal"
6. Frontend: POST /api/games { gameType: 'blackjack', betAmount: 500 }
7. Backend:
   a. Auth check ✓
   b. Responsible gambling check (self-exclusion? daily limit?) ✓
   c. Bet validation (500 >= 1, 500 <= 1000000) ✓
   d. Generate server seed, hash it
   e. process_bet RPC: lock → check balance (13900 >= 500) → debit 500
   f. Generate result: HMAC-SHA256(serverSeed:clientSeed:1) → cards
   g. Player: [K♠, 7♥] = 17. Dealer: [10♦, ?]
   h. Player stands. Dealer reveals: [10♦, 5♣] = 15. Dealer hits: [10♦, 5♣, 8♠] = bust!
   i. Player wins! Multiplier: 2x. Payout: 1000.
   j. settle_game RPC: check settled flag → credit 1000 → update XP/stats
8. Response: { result: { playerCards, dealerCards, won: true }, payout: 1000, multiplier: 2, newBalance: 14400 }
9. Frontend: animate card deal → reveal → win celebration → balance counts up to 14,400
```

## Flow 5: User Opening Support Ticket for Missing Credits

```
1. User notices balance seems wrong after a crash game
2. Goes to /support → clicks "New Ticket"
3. Category: "Missing Credits"
4. Subject: "Didn't receive payout from Crash game"
5. Message: "I cashed out at 3.5x on a 1000 bet but only got 2000 back instead of 3500"
6. Frontend: POST /api/support/tickets { category: 'missing_credits', subject: '...', message: '...' }
7. Backend: creates ticket TKT-2026-00042, status: 'open', priority: 'medium'
8. User sees: "Ticket #TKT-2026-00042 created. We'll respond within 12 hours."
9. Support agent sees ticket in queue → claims it
10. Agent reviews: games table → finds game_id → result shows multiplier 2.0 (not 3.5)
11. Agent checks: player cashed out at 2.0x, not 3.5x (UI may have shown 3.5x when they clicked but server recorded 2.0x due to crash timing)
12. Agent responds: explains the cashout was registered at 2.0x, provides game verification link
13. User receives email notification of response
```

## Flow 6: Admin Adjusting Wallet After Investigation

```
1. Support escalates ticket to admin: "User claims 500 credits lost due to server error during Plinko game"
2. Admin opens /admin/users/[userId]
3. Reviews: game_id shows settled=false (server crashed before settlement)
4. Admin clicks "Adjust Balance"
5. Form: amount=+500, reason="Compensation for unsettled Plinko game TKT-2026-00042", category="error_correction"
6. Amount < 10000 → admin can approve directly
7. POST /api/admin/users/[id]/adjust-balance { amount: 500, reason: '...', category: 'error_correction' }
8. Backend: admin_adjust_balance RPC → credit 500, create ledger entry with admin_id
9. audit_logs entry created: { actor: admin_id, action: 'wallet.adjust', target: user_id, details: {...} }
10. User receives notification: "500 credits have been added to your account"
11. Admin resolves the support ticket with internal note documenting the adjustment
```

## Flow 7: Fraud System Flagging Suspicious User

```
1. User "BonusHunter99" creates account, claims welcome bonus (10,000 credits)
2. Same device fingerprint matches 3 other accounts created this week
3. Fraud rule triggers: "multi_account_device" → severity: high
4. System creates fraud_flag: { user_id, flag_type: 'multi_account', severity: 'high', evidence: { matching_users: [...], device_hash: '...' } }
5. Risk analyst sees flag in /admin/fraud queue
6. Reviews evidence: 4 accounts, same device, all claimed welcome bonus, minimal play
7. Pattern: classic multi-account bonus farming
8. Actions taken:
   a. Suspend all 4 accounts
   b. Flag "confirmed" with notes
   c. Debit bonus credits from all accounts
   d. Add device fingerprint to "known abuser" watch list
9. audit_logs: 4 entries documenting each suspension
10. If any account appeals via support → support sees fraud flag → explains violation
```

---

# 25. RECOMMENDED STACK

## Final Stack Selection

| Component | Technology | Justification |
|-----------|-----------|--------------|
| **Frontend** | Next.js 16 + React 19 + TypeScript 5 | Already built. App Router for SSR/SSG, React Compiler for performance, TypeScript for safety |
| **Styling** | Tailwind CSS 4 + Framer Motion | Already built. Fast iteration, premium animations |
| **State** | Zustand | Already built. Simple, performant, persist to localStorage for demo mode |
| **Backend** | Next.js Route Handlers | Co-located with frontend, serverless scaling on Vercel, no separate server to maintain |
| **Database** | PostgreSQL via Supabase | ACID for financial operations, RLS for row-level security, Realtime for live balance updates, managed service |
| **Auth** | Supabase Auth | JWT + refresh tokens, OAuth, MFA, email verification — all managed |
| **Cache** | Vercel KV (Redis) | Rate limiting, leaderboard cache, session data |
| **Queue** | Vercel Cron + Supabase Edge Functions | Simple scheduled tasks; no need for RabbitMQ/SQS at this scale |
| **Object Storage** | Supabase Storage (S3-backed) | Avatar uploads, attachments |
| **CDN** | Vercel Edge Network | Automatic, global, optimized for Next.js |
| **Payments** | Stripe | Industry standard for IAP. Checkout Sessions, webhooks, subscriptions, tax calculation |
| **Analytics** | PostHog | Open-source, self-hostable, feature flags, funnels, retention analysis |
| **Error Tracking** | Sentry | Source maps, breadcrumbs, performance monitoring |
| **Email** | Resend | Developer-friendly, good deliverability, React Email templates |
| **Deployment** | Vercel | Zero-config Next.js deployments, preview URLs, edge functions, cron |
| **CI/CD** | GitHub Actions | Native GitHub integration, matrix builds, deployment automation |
| **IaC** | Supabase CLI (migrations) + Vercel CLI | Database version control + deployment automation |

**Why NOT microservices**: At this scale (sub-100K users), microservices add operational complexity without benefit. Next.js API routes are naturally modular. Supabase RPCs encapsulate critical business logic at the DB level. Extract services only when you have a specific scaling bottleneck (e.g., real-time multiplayer needing dedicated WebSocket infrastructure).

**Why NOT a separate backend (NestJS, Go, etc.)**: Next.js Route Handlers provide the same functionality with zero network hop between SSR and API. Vercel handles scaling. Adding a separate backend doubles deployment complexity, adds latency, and requires CORS configuration — all for no benefit at this stage.

---

# 26. OUTPUT REQUIREMENTS SUMMARY

This document covers:
- Complete product vision with business model and unit economics
- 12 platform modules with dependencies and service mappings
- Page-by-page UI/UX design with wireframes, states, and mobile considerations
- Full auth system with state machine, RBAC, 2FA, device tracking
- User portal with retention-optimized dashboard layout
- Robust virtual wallet with buckets, ledger, reconciliation, anti-abuse
- Game platform with provably fair RNG, session lifecycle, demo/real mode
- Commerce stack with Stripe integration, checkout flow, refund/chargeback handling
- Retention system with battle pass, missions, referrals, ethical personalization
- Admin portal with RBAC, approval workflows, audit logging
- Support system with SLAs, macros, dispute resolution flows
- Fraud framework with risk scoring, device fingerprinting, rules engine
- Enterprise security architecture with defense layers, incident response
- Compliance framework with disclaimers, consent management, legal checklist
- System architecture with justification for every technology choice
- Comprehensive database design with 20+ tables
- Full API catalog with 40+ endpoints
- Background job system with cron definitions and idempotency
- Analytics event taxonomy and 5 dashboard designs
- DevOps pipeline with CI/CD, environments, SLOs, backup strategy
- 4-phase implementation roadmap with staffing and go-live criteria
- Team structure for both lean startup and growth stage
- Test strategy with unit, integration, E2E, load, and wallet integrity tests
- 7 detailed user flow walkthroughs
- Justified technology stack selection

---

# APPENDICES

## A. Top 15 Architectural Mistakes to Avoid

1. **Client-side balance manipulation** — NEVER trust the client with balance math. All credits must flow through server-side atomic RPCs with `FOR UPDATE` locks.
2. **Missing idempotency on settlement** — Without a `settled` flag check, network retries cause double-payouts. Every state mutation needs an idempotency guard.
3. **Exposing `service_role` key to the client** — This key bypasses all RLS. It must ONLY exist in server-side environment variables, never in `NEXT_PUBLIC_*`.
4. **Single balance column without ledger** — A single `balance` field with no transaction log is unauditable, unreconcilable, and undebuggable. Always maintain a ledger.
5. **No rate limiting on game endpoints** — Without rate limits, bots can make thousands of bets per minute, grinding through statistical anomalies.
6. **Trusting client-provided game parameters** — If the client sends `mineCount: 0` and you don't validate, you've given them a guaranteed win. Validate every parameter server-side.
7. **Using `Math.random()` for real bets** — Client-side RNG is manipulable. All real-money (or real-credit) game outcomes must use server-side cryptographic RNG.
8. **No database constraints** — Without `CHECK (balance >= 0)`, a race condition can push balance negative. Database constraints are your last line of defense.
9. **Hardcoded admin checks** — `if (email === 'admin@example.com')` breaks when you add admins. Use a role column and proper RBAC.
10. **Monolithic game result computation** — If result generation and settlement are not atomic, a crash between them leaves the game in an inconsistent state.
11. **No webhook signature verification** — Without verifying Stripe's signature, anyone can POST fake payment events and credit themselves.
12. **Storing PII alongside analytics** — Keep personally identifiable information separate from analytics data. Use pseudonymous IDs for analytics events.
13. **No graceful degradation** — If Supabase Realtime drops, the UI should fall back to polling, not show stale data indefinitely.
14. **Synchronous email sending in API routes** — Sending emails synchronously in game/payment handlers adds latency. Queue them asynchronously.
15. **No reconciliation job** — Without periodic checks that `SUM(ledger) == cached balance`, silent data corruption goes undetected.

## B. Top 15 Fraud and Abuse Risks

1. **Multi-accounting** — Creating multiple accounts to farm welcome bonuses. Detect via device fingerprint + IP correlation.
2. **Bonus abuse** — Claiming daily bonuses across alt accounts. Detect via shared device/IP patterns.
3. **Stolen credit cards** — Purchasing credits with stolen cards → grinding → account abandonment before chargeback. Detect via velocity + Stripe Radar.
4. **Chargeback fraud** — Buying credits, spending them, then filing "unauthorized" chargeback. Evidence: usage data + device fingerprint.
5. **Bot grinding** — Automated play to exploit statistical edges or bonus systems. Detect via play speed, session patterns, input timing.
6. **API manipulation** — Sending crafted API requests with invalid game parameters. Prevent with server-side validation.
7. **Refund abuse** — Buying credits, spending them, requesting refund. Track: credits used vs credits refunded.
8. **Referral fraud** — Self-referring with fake accounts. Prevent: unique device + IP + email domain checks.
9. **Session manipulation** — Trying to replay or modify game results. Prevent: server-side RNG, immutable game records.
10. **Promo code sharing** — Distributing limited promo codes publicly. Prevent: per-user limits, IP limits, short TTLs.
11. **Timing attacks on RNG** — Trying to predict outcomes based on timing. Prevent: HMAC-SHA256 with secret server seed.
12. **Account takeover** — Compromising accounts to steal credits or abuse privileges. Prevent: 2FA, device tracking, suspicious login alerts.
13. **Collusion in multiplayer** — Players coordinating in poker to unfairly advantage one player. Detect: win pattern analysis between related accounts.
14. **Exploitation of unsettled games** — If a game crashes before settlement, players may try to re-bet while the original is still pending. Prevent: check for unsettled games before allowing new bets.
15. **Admin credential compromise** — An attacker with admin access can grant unlimited credits. Prevent: 2FA mandatory for admins, large adjustments require dual approval, all actions audit-logged.

## C. Top 15 Legal/Compliance Review Items Before Launch

1. **Terms of Service** — Full legal review, especially Sections on virtual currency, no-cash-value, and dispute resolution
2. **Privacy Policy** — GDPR-ready if targeting EU, CCPA-ready if targeting California
3. **Virtual currency classification** — Confirm credits are NOT securities, NOT money transmitter territory
4. **Age restriction mechanism** — Is self-declared 18+ sufficient? Varies by jurisdiction
5. **Stripe MCC code** — Confirm classification as 5816 (Digital Goods), NOT 7995 (Gambling)
6. **App store guidelines** — Apple/Google "simulated gambling" category requirements
7. **No-cash-value disclaimers** — Sufficient placement and wording across all surfaces
8. **Purchase disclosure** — "All purchases are final" + clear virtual-goods language before payment
9. **Refund policy** — Consumer protection compliance (EU 14-day cooling-off right for digital goods?)
10. **Marketing/advertising** — No "win money" or "cash prizes" language anywhere
11. **Responsible gambling branding** — Even voluntary, check if "gambling" terminology triggers regulatory attention
12. **Cookie/tracking consent** — ePrivacy compliance if EU audience
13. **Data retention and deletion** — GDPR right to erasure, CCPA right to delete
14. **Intellectual property** — Game names, visual assets, sounds — no trademark conflicts
15. **Tax nexus** — Where to collect sales tax/VAT on credit purchases (Stripe Tax handles this, but legal should confirm jurisdictions)

## D. Suggested MVP Database Schema

```sql
-- Core tables for MVP (Phase 1)
-- Full schemas defined in Sections 4, 6, 7, 8

-- 1. profiles (Section 4.9)
-- 2. games (Section 16.2)
-- 3. wallet_ledger (Section 6.2)
-- 4. transactions (existing, kept for backward compat)
-- 5. login_bonuses (existing migration V3)
-- 6. jackpots (existing)
-- 7. favorites (existing)
-- 8. coin_packages (Section 8.2)
-- 9. purchases (Section 8.4)
-- 10. consent_records (Section 4.9)
-- 11. audit_logs (Section 10.4)

-- Phase 2 additions:
-- 12. support_tickets + ticket_messages (Section 11.1)
-- 13. fraud_flags + fraud_rules (Section 12.2-12.3)
-- 14. user_devices + device_fingerprints (Section 12.4)
-- 15. user_sessions (Section 4.9)

-- Phase 3 additions:
-- 16. missions + mission_progress (Section 9.3)
-- 17. subscriptions + entitlements (Section 8.5)
-- 18. game_catalog (Section 7.1)
-- 19. game_events (Section 7.4)
-- 20. notifications + notification_preferences
```

## E. Suggested Folder Structure

### Frontend + Backend (Next.js Monolith)

```
CASINO/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (auth)/                    # Auth layout group
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── verify-email/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (main)/                    # Main app layout group
│   │   │   ├── games/
│   │   │   │   ├── page.tsx           # Game lobby
│   │   │   │   ├── [slug]/page.tsx    # Individual game (dynamic)
│   │   │   │   └── layout.tsx
│   │   │   ├── wallet/page.tsx
│   │   │   ├── store/
│   │   │   │   ├── page.tsx           # Credit packages
│   │   │   │   ├── checkout/page.tsx
│   │   │   │   └── success/page.tsx
│   │   │   ├── rewards/
│   │   │   │   ├── page.tsx           # Daily bonus + missions
│   │   │   │   ├── battle-pass/page.tsx
│   │   │   │   └── referrals/page.tsx
│   │   │   ├── profile/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── security/page.tsx
│   │   │   │   └── history/page.tsx
│   │   │   ├── support/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [ticketId]/page.tsx
│   │   │   ├── leaderboards/page.tsx
│   │   │   ├── vip/page.tsx
│   │   │   └── layout.tsx
│   │   ├── admin/                     # Admin portal
│   │   │   ├── page.tsx               # Dashboard
│   │   │   ├── users/
│   │   │   │   ├── page.tsx           # User list
│   │   │   │   └── [id]/page.tsx      # User detail
│   │   │   ├── wallets/page.tsx
│   │   │   ├── fraud/page.tsx
│   │   │   ├── support/page.tsx
│   │   │   ├── payments/page.tsx
│   │   │   ├── promotions/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   ├── audit-logs/page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/                       # API Route Handlers
│   │   │   ├── auth/
│   │   │   │   ├── signup/route.ts
│   │   │   │   ├── login/route.ts
│   │   │   │   └── forgot-password/route.ts
│   │   │   ├── games/
│   │   │   │   ├── route.ts           # POST: place bet + get result
│   │   │   │   ├── catalog/route.ts   # GET: game list
│   │   │   │   └── verify/route.ts    # GET: provably fair verify
│   │   │   ├── wallet/route.ts
│   │   │   ├── store/
│   │   │   │   ├── packages/route.ts
│   │   │   │   └── checkout/route.ts
│   │   │   ├── webhooks/
│   │   │   │   └── stripe/route.ts
│   │   │   ├── bonus/route.ts
│   │   │   ├── rewards/
│   │   │   │   ├── missions/route.ts
│   │   │   │   └── claim/route.ts
│   │   │   ├── support/
│   │   │   │   └── tickets/route.ts
│   │   │   ├── responsible-gambling/route.ts
│   │   │   ├── admin/
│   │   │   │   ├── stats/route.ts
│   │   │   │   ├── users/route.ts
│   │   │   │   └── fraud/route.ts
│   │   │   └── cron/
│   │   │       ├── daily-reset/route.ts
│   │   │       ├── promo-expiry/route.ts
│   │   │       ├── reconciliation/route.ts
│   │   │       └── sla-check/route.ts
│   │   ├── about/page.tsx
│   │   ├── faq/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── responsible-gambling/page.tsx
│   │   ├── provably-fair/page.tsx
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Homepage
│   │   ├── error.tsx                  # Error boundary
│   │   ├── not-found.tsx              # 404
│   │   └── globals.css
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── AdminLayout.tsx
│   │   │   └── ClientProviders.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── DataTable.tsx
│   │   │   └── Pagination.tsx
│   │   ├── game/
│   │   │   ├── GameCard.tsx
│   │   │   ├── BetControls.tsx
│   │   │   ├── BalanceDisplay.tsx
│   │   │   ├── GameResult.tsx
│   │   │   ├── DemoBanner.tsx
│   │   │   └── RealityCheck.tsx
│   │   ├── wallet/
│   │   │   ├── BalanceBreakdown.tsx
│   │   │   ├── TransactionList.tsx
│   │   │   └── CreditDisclaimer.tsx
│   │   └── admin/
│   │       ├── UserDetail.tsx
│   │       ├── FraudReviewCard.tsx
│   │       └── AuditLogViewer.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useBalance.ts
│   │   ├── useGame.ts
│   │   ├── useGameState.ts
│   │   ├── useFavorites.ts
│   │   ├── useSound.ts
│   │   ├── useNotifications.ts
│   │   └── useRealityCheck.ts
│   ├── lib/
│   │   ├── games/
│   │   │   ├── catalog.ts
│   │   │   ├── slots.ts
│   │   │   ├── blackjack.ts
│   │   │   ├── roulette.ts
│   │   │   ├── dice.ts
│   │   │   ├── crash.ts
│   │   │   ├── plinko.ts
│   │   │   ├── poker.ts
│   │   │   ├── coinflip.ts
│   │   │   ├── mines.ts
│   │   │   ├── keno.ts
│   │   │   ├── hilo.ts
│   │   │   ├── limbo.ts
│   │   │   └── provably-fair.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   ├── admin.ts
│   │   │   ├── middleware.ts
│   │   │   └── database.types.ts
│   │   ├── stripe/
│   │   │   ├── client.ts
│   │   │   ├── webhooks.ts
│   │   │   └── products.ts
│   │   ├── email/
│   │   │   ├── client.ts
│   │   │   └── templates/
│   │   │       ├── welcome.tsx
│   │   │       ├── receipt.tsx
│   │   │       └── support-reply.tsx
│   │   ├── fraud/
│   │   │   ├── rules.ts
│   │   │   ├── scoring.ts
│   │   │   └── device-fingerprint.ts
│   │   ├── analytics/
│   │   │   └── posthog.ts
│   │   ├── rate-limit.ts
│   │   ├── validation.ts              # Zod schemas
│   │   └── types.ts
│   └── middleware.ts                   # Next.js middleware (auth, routing)
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 20260315_initial_schema.sql
│       ├── 20260316_v3_production_hardening.sql
│       ├── 20260317_wallet_ledger.sql
│       └── 20260318_support_fraud.sql
├── public/
│   ├── images/
│   ├── sounds/
│   └── favicon.ico
├── tests/
│   ├── unit/
│   │   ├── games/
│   │   └── lib/
│   ├── integration/
│   │   ├── api/
│   │   └── wallet/
│   └── e2e/
│       ├── auth.spec.ts
│       ├── game.spec.ts
│       └── purchase.spec.ts
├── .github/
│   └── workflows/
│       └── ci.yml
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── vercel.json
├── .env.example
├── .env.local                         # Local dev only, git-ignored
├── BLUEPRINT.md                       # This document
└── README.md
```

## F. Claude-Code Implementation Order

If implementing this blueprint using Claude Code (AI-assisted development), follow this order for maximum efficiency:

```
SESSION 1: Foundation (2-3 hours)
  1. Set up project scaffold (already done)
  2. Implement auth system with Supabase Auth
  3. Create profile creation trigger + welcome bonus
  4. Build login/register/verify pages
  5. Commit + deploy

SESSION 2: Wallet & Games (3-4 hours)
  6. Create wallet_ledger table + migration
  7. Implement wallet API (deposit/withdraw via RPCs)
  8. Wire all 15 game pages to POST /api/games (already done)
  9. Verify provably fair system works end-to-end
  10. Commit + deploy

SESSION 3: Commerce (2-3 hours)
  11. Set up Stripe account + products
  12. Create coin_packages table + seed data
  13. Build /api/store/checkout + Stripe Checkout Session
  14. Build /api/webhooks/stripe with signature verification
  15. Build store page UI
  16. Commit + deploy

SESSION 4: Retention (2-3 hours)
  17. Build mission system (tables + API + UI)
  18. Build battle pass (tables + progress tracking + UI)
  19. Build referral system (unique links + tracking)
  20. Wire push notifications (PostHog or OneSignal)
  21. Commit + deploy

SESSION 5: Admin & Support (2-3 hours)
  22. Build support ticket system (tables + API + UI)
  23. Expand admin portal (fraud queue, payment review)
  24. Add audit logging to all admin actions
  25. Build admin analytics dashboard
  26. Commit + deploy

SESSION 6: Security & Polish (2-3 hours)
  27. Add CSP headers and HSTS
  28. Implement device fingerprinting
  29. Build fraud detection rules engine
  30. Add Vercel Cron jobs (reconciliation, expiry, SLA)
  31. Performance optimization pass
  32. Commit + deploy

SESSION 7: Testing & Launch (2-3 hours)
  33. Write unit tests for all game engines
  34. Write integration tests for wallet operations
  35. Write E2E tests for critical flows
  36. Load test with k6
  37. Final security review
  38. Production deploy + monitoring setup
```

## G. First 20 Tickets to Create in Jira

| # | Title | Type | Priority | Sprint | Story Points |
|---|-------|------|----------|--------|-------------|
| 1 | Set up Stripe account and configure products for 4 credit packages | Task | P0 | Sprint 1 | 2 |
| 2 | Create `wallet_ledger` table with bucket support and idempotency | Story | P0 | Sprint 1 | 5 |
| 3 | Build `/api/store/checkout` endpoint with Stripe Checkout Session | Story | P0 | Sprint 1 | 5 |
| 4 | Build `/api/webhooks/stripe` with signature verification and idempotent credit | Story | P0 | Sprint 1 | 8 |
| 5 | Build store page UI with 4 credit packages and promo code input | Story | P0 | Sprint 1 | 3 |
| 6 | Migrate wallet page to use wallet_ledger-backed balance buckets | Story | P0 | Sprint 1 | 5 |
| 7 | Add CSP header and Strict-Transport-Security to next.config.ts | Task | P0 | Sprint 1 | 1 |
| 8 | Build support ticket system (tables, API, user-facing UI) | Story | P1 | Sprint 2 | 8 |
| 9 | Build admin support ticket queue with response and close actions | Story | P1 | Sprint 2 | 5 |
| 10 | Implement device fingerprinting on login and game play | Story | P1 | Sprint 2 | 5 |
| 11 | Build multi-account detection rule using device fingerprint correlation | Story | P1 | Sprint 2 | 5 |
| 12 | Create fraud flags table and admin fraud review queue | Story | P1 | Sprint 2 | 5 |
| 13 | Build mission system (tables, progress tracking API, claim endpoint) | Story | P1 | Sprint 2 | 8 |
| 14 | Build missions UI page with progress bars and claim buttons | Story | P1 | Sprint 2 | 3 |
| 15 | Set up Vercel Cron for ledger reconciliation (hourly) | Task | P0 | Sprint 2 | 3 |
| 16 | Set up Vercel Cron for promo credit expiry (hourly) | Task | P1 | Sprint 2 | 2 |
| 17 | Build referral system (unique links, tracking, reward on 5 games played) | Story | P2 | Sprint 3 | 5 |
| 18 | Build battle pass system (seasonal tiers, free + premium tracks, XP tracking) | Story | P2 | Sprint 3 | 8 |
| 19 | Implement subscription system (Silver/Gold/Diamond Pass) with Stripe | Story | P2 | Sprint 3 | 8 |
| 20 | Write integration tests for wallet operations (concurrency, idempotency, reconciliation) | Task | P0 | Sprint 2 | 5 |

---

*End of FORTUNA CASINO Production Blueprint v1.0*
*Total estimated implementation: 16-22 engineering weeks for full platform*
*MVP deployable in 6 weeks with 2-3 engineers*
