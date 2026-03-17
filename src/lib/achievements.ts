export interface Achievement {
  id: string
  name: string
  description: string
  icon: string // emoji
  category: 'games' | 'social' | 'milestones' | 'vip'
  requirement: {
    type: 'games_played' | 'total_wagered' | 'total_won' | 'biggest_win' | 'win_streak' | 'level' | 'vip_tier' | 'referrals' | 'missions_completed' | 'tournaments_won'
    value: number
    gameType?: string
  }
  reward: number // credits
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'
}

export const ACHIEVEMENTS: Achievement[] = [
  // Games Played
  { id: 'first_bet', name: 'First Steps', description: 'Place your first bet', icon: '🎲', category: 'games', requirement: { type: 'games_played', value: 1 }, reward: 100, tier: 'bronze' },
  { id: 'games_50', name: 'Getting Started', description: 'Play 50 games', icon: '🎮', category: 'games', requirement: { type: 'games_played', value: 50 }, reward: 500, tier: 'bronze' },
  { id: 'games_500', name: 'Regular Player', description: 'Play 500 games', icon: '🕹️', category: 'games', requirement: { type: 'games_played', value: 500 }, reward: 2500, tier: 'silver' },
  { id: 'games_5000', name: 'Dedicated Gamer', description: 'Play 5,000 games', icon: '🏆', category: 'games', requirement: { type: 'games_played', value: 5000 }, reward: 10000, tier: 'gold' },
  { id: 'games_50000', name: 'Casino Legend', description: 'Play 50,000 games', icon: '👑', category: 'games', requirement: { type: 'games_played', value: 50000 }, reward: 50000, tier: 'diamond' },

  // Total Wagered
  { id: 'wager_10k', name: 'Small Spender', description: 'Wager a total of 10,000 credits', icon: '💰', category: 'milestones', requirement: { type: 'total_wagered', value: 10000 }, reward: 500, tier: 'bronze' },
  { id: 'wager_100k', name: 'High Roller', description: 'Wager a total of 100,000 credits', icon: '💎', category: 'milestones', requirement: { type: 'total_wagered', value: 100000 }, reward: 5000, tier: 'silver' },
  { id: 'wager_1m', name: 'Whale Status', description: 'Wager a total of 1,000,000 credits', icon: '🐋', category: 'milestones', requirement: { type: 'total_wagered', value: 1000000 }, reward: 25000, tier: 'gold' },
  { id: 'wager_10m', name: 'Casino Mogul', description: 'Wager a total of 10,000,000 credits', icon: '🏛️', category: 'milestones', requirement: { type: 'total_wagered', value: 10000000 }, reward: 100000, tier: 'platinum' },

  // Biggest Win
  { id: 'win_1k', name: 'Lucky Break', description: 'Win 1,000+ credits in a single game', icon: '🍀', category: 'milestones', requirement: { type: 'biggest_win', value: 1000 }, reward: 200, tier: 'bronze' },
  { id: 'win_10k', name: 'Big Winner', description: 'Win 10,000+ credits in a single game', icon: '🌟', category: 'milestones', requirement: { type: 'biggest_win', value: 10000 }, reward: 2000, tier: 'silver' },
  { id: 'win_100k', name: 'Jackpot!', description: 'Win 100,000+ credits in a single game', icon: '💫', category: 'milestones', requirement: { type: 'biggest_win', value: 100000 }, reward: 10000, tier: 'gold' },
  { id: 'win_1m', name: 'Millionaire', description: 'Win 1,000,000+ credits in a single game', icon: '🤑', category: 'milestones', requirement: { type: 'biggest_win', value: 1000000 }, reward: 50000, tier: 'diamond' },

  // VIP Tiers
  { id: 'vip_silver', name: 'Silver Member', description: 'Reach Silver VIP tier', icon: '🥈', category: 'vip', requirement: { type: 'vip_tier', value: 2 }, reward: 1000, tier: 'silver' },
  { id: 'vip_gold', name: 'Gold Member', description: 'Reach Gold VIP tier', icon: '🥇', category: 'vip', requirement: { type: 'vip_tier', value: 3 }, reward: 5000, tier: 'gold' },
  { id: 'vip_platinum', name: 'Platinum Elite', description: 'Reach Platinum VIP tier', icon: '💠', category: 'vip', requirement: { type: 'vip_tier', value: 4 }, reward: 15000, tier: 'platinum' },
  { id: 'vip_diamond', name: 'Diamond Royalty', description: 'Reach Diamond VIP tier', icon: '💎', category: 'vip', requirement: { type: 'vip_tier', value: 5 }, reward: 50000, tier: 'diamond' },

  // Level
  { id: 'level_5', name: 'Rising Star', description: 'Reach level 5', icon: '⭐', category: 'milestones', requirement: { type: 'level', value: 5 }, reward: 500, tier: 'bronze' },
  { id: 'level_10', name: 'Experienced', description: 'Reach level 10', icon: '🌟', category: 'milestones', requirement: { type: 'level', value: 10 }, reward: 2000, tier: 'silver' },
  { id: 'level_25', name: 'Veteran', description: 'Reach level 25', icon: '✨', category: 'milestones', requirement: { type: 'level', value: 25 }, reward: 10000, tier: 'gold' },
  { id: 'level_50', name: 'Master', description: 'Reach level 50', icon: '🔥', category: 'milestones', requirement: { type: 'level', value: 50 }, reward: 25000, tier: 'platinum' },

  // Social
  { id: 'referral_1', name: 'Friendly Invite', description: 'Refer your first friend', icon: '🤝', category: 'social', requirement: { type: 'referrals', value: 1 }, reward: 1000, tier: 'bronze' },
  { id: 'referral_10', name: 'Social Butterfly', description: 'Refer 10 friends', icon: '🦋', category: 'social', requirement: { type: 'referrals', value: 10 }, reward: 5000, tier: 'silver' },
  { id: 'referral_50', name: 'Community Builder', description: 'Refer 50 friends', icon: '🏗️', category: 'social', requirement: { type: 'referrals', value: 50 }, reward: 25000, tier: 'gold' },
]

const VIP_TIER_MAP: Record<string, number> = {
  bronze: 1, silver: 2, gold: 3, platinum: 4, diamond: 5,
}

export interface UserStats {
  games_played: number
  total_wagered: number
  total_won: number
  biggest_win: number
  level: number
  vip_tier: string
  referral_count: number
}

export function checkAchievements(stats: UserStats, unlockedIds: string[]): Achievement[] {
  const newlyUnlocked: Achievement[] = []

  for (const achievement of ACHIEVEMENTS) {
    if (unlockedIds.includes(achievement.id)) continue

    const { type, value } = achievement.requirement
    let currentValue = 0

    switch (type) {
      case 'games_played': currentValue = stats.games_played; break
      case 'total_wagered': currentValue = stats.total_wagered; break
      case 'total_won': currentValue = stats.total_won; break
      case 'biggest_win': currentValue = stats.biggest_win; break
      case 'level': currentValue = stats.level; break
      case 'vip_tier': currentValue = VIP_TIER_MAP[stats.vip_tier] || 1; break
      case 'referrals': currentValue = stats.referral_count; break
    }

    if (currentValue >= value) {
      newlyUnlocked.push(achievement)
    }
  }

  return newlyUnlocked
}
