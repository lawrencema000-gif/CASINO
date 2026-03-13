'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const LOCAL_STORAGE_KEY = 'fortuna-favorites'

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Check auth state on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsLoggedIn(true)
        setUserId(user.id)
      } else {
        setIsLoggedIn(false)
        setUserId(null)
      }
    })
  }, [])

  // Load favorites from appropriate source
  useEffect(() => {
    if (isLoggedIn && userId) {
      // Fetch from Supabase
      fetch('/api/favorites')
        .then((res) => {
          if (res.ok) return res.json()
          return { favorites: [] }
        })
        .then((data) => {
          setFavorites(data.favorites ?? [])
        })
        .catch(() => {
          setFavorites([])
        })
    } else if (!isLoggedIn) {
      // Load from localStorage
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
        if (stored) {
          setFavorites(JSON.parse(stored))
        }
      } catch {
        setFavorites([])
      }
    }
  }, [isLoggedIn, userId])

  const toggleFavorite = useCallback(
    async (slug: string) => {
      const isFav = favorites.includes(slug)
      const action = isFav ? 'remove' : 'add'
      const newFavorites = isFav
        ? favorites.filter((f) => f !== slug)
        : [...favorites, slug]

      // Optimistic update
      setFavorites(newFavorites)

      if (isLoggedIn) {
        // Sync with Supabase
        try {
          const res = await fetch('/api/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ slug, action }),
          })
          if (!res.ok) {
            // Revert on failure
            setFavorites(favorites)
          }
        } catch {
          setFavorites(favorites)
        }
      } else {
        // Save to localStorage
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newFavorites))
        } catch {
          // localStorage full or unavailable
        }
      }
    },
    [favorites, isLoggedIn]
  )

  const isFavorite = useCallback(
    (slug: string) => favorites.includes(slug),
    [favorites]
  )

  return { favorites, toggleFavorite, isFavorite }
}
