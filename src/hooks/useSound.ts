'use client'

import { useCallback, useEffect } from 'react'
import { soundManager, type SoundName } from '@/lib/sounds/SoundManager'
import { useGameState } from '@/hooks/useGameState'

/**
 * Hook that wraps the SoundManager singleton and keeps its muted state
 * in sync with the global useGameState store.
 */
export function useSound() {
  const isMuted = useGameState((s) => s.isMuted)

  // Keep the SoundManager muted state in sync with the Zustand store
  useEffect(() => {
    soundManager.setMuted(isMuted)
  }, [isMuted])

  const play = useCallback((sound: SoundName) => {
    soundManager.play(sound)
  }, [])

  const setMuted = useCallback((muted: boolean) => {
    soundManager.setMuted(muted)
    // Also update the store so UI stays in sync
    const storeIsMuted = useGameState.getState().isMuted
    if (storeIsMuted !== muted) {
      useGameState.getState().toggleMute()
    }
  }, [])

  const getMuted = useCallback((): boolean => {
    return soundManager.isMuted()
  }, [])

  return {
    play,
    setMuted,
    isMuted: getMuted,
  }
}
