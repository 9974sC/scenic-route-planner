'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronDown, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring/50 focus-visible:ring-[3px]'

const textareaClass =
  'min-h-[4.5rem] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring/50 focus-visible:ring-[3px]'

export function AuthPanel() {
  const { user, loading, register, login } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(null)

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [colorHex, setColorHex] = useState('#2563eb')

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Checking account…
      </div>
    )
  }

  if (user) return null

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const result = await login({ username, password })
    setBusy(false)
    if (result.error) setError(result.error)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessId(null)
    if (password !== passwordConfirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    const result = await register({
      username,
      password,
      colorHex,
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      location: location.trim() || undefined,
    })
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.displayId) setSuccessId(result.displayId)
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        <User className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
          Account
        </span>
        <span className="text-xs text-muted-foreground">Sign in or register</span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <Tabs
            value={tab}
            onValueChange={(v) => {
              setTab(v as 'login' | 'register')
              setError(null)
              setSuccessId(null)
            }}
          >
            <TabsList className="mb-3 w-full">
              <TabsTrigger value="login" className="flex-1">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1">
                Register
              </TabsTrigger>
            </TabsList>

            {error ? (
              <p className="mb-3 text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            {successId ? (
              <p className="mb-3 rounded-lg bg-primary/10 px-3 py-2 text-sm text-foreground">
                Welcome, <span className="font-semibold">@{username}</span>! Your
                rider ID is{' '}
                <span className="font-mono font-semibold">{successId}</span>.
              </p>
            ) : null}

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Username
                  <input
                    className={inputClass}
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                      )
                    }
                    placeholder="your_name"
                    autoComplete="username"
                    minLength={3}
                    maxLength={24}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Password
                  <input
                    className={inputClass}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    minLength={8}
                    required
                  />
                </label>
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Sign in'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Username
                  <input
                    className={inputClass}
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''),
                      )
                    }
                    placeholder="your_name"
                    autoComplete="username"
                    minLength={3}
                    maxLength={24}
                    required
                  />
                  <span className="text-[11px] text-muted-foreground/80">
                    3–24 characters: letters, numbers, underscore
                  </span>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Password
                  <input
                    className={inputClass}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Confirm password
                  <input
                    className={inputClass}
                    type="password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    autoComplete="new-password"
                    minLength={8}
                    required
                  />
                </label>

                <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-medium text-foreground">
                    Profile (optional)
                  </p>
                  <div className="flex flex-col gap-3">
                    <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      Display name
                      <input
                        className={inputClass}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={48}
                        placeholder="How you want to appear"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      Bio
                      <textarea
                        className={textareaClass}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={280}
                        placeholder="A line about your riding"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                      Area / city
                      <input
                        className={inputClass}
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        maxLength={80}
                        placeholder="e.g. Mokotów, Warsaw"
                      />
                    </label>
                  </div>
                </div>

                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Your color on the map
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                      className="size-10 cursor-pointer rounded-lg border border-input bg-background p-1"
                    />
                    <input
                      className={inputClass}
                      value={colorHex}
                      onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                      pattern="#[0-9A-Fa-f]{6}"
                      maxLength={7}
                      required
                    />
                  </div>
                </label>
                <Button type="submit" disabled={busy}>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    'Create account'
                  )}
                </Button>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Email sign-in may be added later. For now, use your username
                  and password.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  )
}
