'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { MeResponse, PublicUser, TripSummary } from '@/lib/auth-types'

type AuthState = {
  user: PublicUser | null
  claimedTiles: string[]
  trips: TripSummary[]
  loading: boolean
  error: string | null
}

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>
  register: (input: {
    email: string
    pin: string
    colorHex: string
  }) => Promise<{ error?: string; displayId?: string }>
  login: (input: {
    code: string
    pin: string
  }) => Promise<{ error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    claimedTiles: [],
    trips: [],
    loading: true,
    error: null,
  })

  const applyMe = useCallback((data: MeResponse) => {
    setState({
      user: data.user,
      claimedTiles: data.claimedTiles,
      trips: data.trips,
      loading: false,
      error: null,
    })
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { credentials: 'include' })
      if (res.status === 401) {
        setState({
          user: null,
          claimedTiles: [],
          trips: [],
          loading: false,
          error: null,
        })
        return
      }
      if (!res.ok) throw new Error('Could not load account')
      applyMe((await res.json()) as MeResponse)
    } catch (e) {
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : 'Could not load account',
      }))
    }
  }, [applyMe])

  useEffect(() => {
    refresh()
  }, [refresh])

  const register = useCallback(
    async (input: { email: string; pin: string; colorHex: string }) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) return { error: data.error ?? 'Registration failed' }
      applyMe(data as MeResponse)
      return { displayId: data.user.displayId as string }
    },
    [applyMe],
  )

  const login = useCallback(
    async (input: { code: string; pin: string }) => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(input),
      })
      const data = await res.json()
      if (!res.ok) return { error: data.error ?? 'Login failed' }
      await refresh()
      return {}
    },
    [refresh],
  )

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    setState({
      user: null,
      claimedTiles: [],
      trips: [],
      loading: false,
      error: null,
    })
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      refresh,
      register,
      login,
      logout,
    }),
    [state, refresh, register, login, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
