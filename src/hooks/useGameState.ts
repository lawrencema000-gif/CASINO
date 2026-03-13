import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

interface GameState {
  profile: Profile | null
  isLoading: boolean
  isMuted: boolean
  fetchProfile: () => Promise<void>
  updateBalance: (newBalance: number) => void
  toggleMute: () => void
}

export const useGameState = create<GameState>((set) => ({
  profile: null,
  isLoading: true,
  isMuted: false,
  fetchProfile: async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      set({ profile: null, isLoading: false })
      return
    }
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    set({ profile: data as Profile | null, isLoading: false })
  },
  updateBalance: (newBalance) =>
    set((state) => ({
      profile: state.profile
        ? { ...state.profile, balance: newBalance }
        : null,
    })),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}))
