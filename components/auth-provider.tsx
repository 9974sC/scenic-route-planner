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
import type {
  LoginInput,
  MeResponse,
  ProfileUpdateInput,
  PublicUser,
  RegisterInput,
  TripSummary,
} from '@/lib/auth-types'
import type { SavedRouteSummary } from '@/lib/saved-routes'

type AuthState = {
  user: PublicUser | null
  claimedTiles: string[]
  trips: TripSummary[]
  savedRoutes: SavedRouteSummary[]
  loading: boolean
  error: string | null
}

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>
  register: (
    input: RegisterInput,
  ) => Promise<{ error?: string; displayId?: string }>
  login: (input: LoginInput) => Promise<{ error?: string }>
  logout: () => Promise<void>
  updateProfile: (
    input: ProfileUpdateInput,
  ) => Promise<{ error?: string; user?: PublicUser }>
  updateColor: (
    colorHex: string,
  ) => Promise<{
    error?: string
    colorChangeAvailableAt?: string | null
    user?: PublicUser
  }>
  uploadAvatar: (
    file: File,
  ) => Promise<{ error?: string; user?: PublicUser }>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function applyUserToState(
  setState: React.Dispatch<React.SetStateAction<AuthState>>,
  user: PublicUser,
) {
  setState((s) => ({ ...s, user, error: null }))
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    claimedTiles: [],
    trips: [],
    savedRoutes: [],
    loading: true,
    error: null,
  })

  const applyMe = useCallback((data: MeResponse) => {
    setState({
      user: data.user,
      claimedTiles: data.claimedTiles,
      trips: data.trips,
      savedRoutes: data.savedRoutes ?? [],
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
          savedRoutes: [],
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
    async (input: RegisterInput) => {
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
    async (input: LoginInput) => {
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
      savedRoutes: [],
      loading: false,
      error: null,
    })
  }, [])

  const updateProfile = useCallback(async (input: ProfileUpdateInput) => {
    const res = await fetch('/api/me', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(input),
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? 'Could not save profile' }
    applyUserToState(setState, data.user as PublicUser)
    return { user: data.user as PublicUser }
  }, [])

  const updateColor = useCallback(async (colorHex: string) => {
    const res = await fetch('/api/me?action=color', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ colorHex }),
    })
    const data = await res.json()
    if (!res.ok) {
      return {
        error: data.error ?? 'Could not update color',
        colorChangeAvailableAt: data.colorChangeAvailableAt as
          | string
          | null
          | undefined,
      }
    }
    applyUserToState(setState, data.user as PublicUser)
    return { user: data.user as PublicUser }
  }, [])

  const uploadAvatar = useCallback(async (file: File) => {
    const form = new FormData()
    form.set('avatar', file)
    const res = await fetch('/api/me?action=avatar', {
      method: 'POST',
      credentials: 'include',
      body: form,
    })
    const data = await res.json()
    if (!res.ok) return { error: data.error ?? 'Could not upload photo' }
    applyUserToState(setState, data.user as PublicUser)
    return { user: data.user as PublicUser }
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      refresh,
      register,
      login,
      logout,
      updateProfile,
      updateColor,
      uploadAvatar,
    }),
    [
      state,
      refresh,
      register,
      login,
      logout,
      updateProfile,
      updateColor,
      uploadAvatar,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
