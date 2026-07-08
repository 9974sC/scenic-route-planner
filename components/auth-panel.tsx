'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ChevronDown, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring/50 focus-visible:ring-[3px]'

export function AuthPanel() {
  const { user, loading, register, login } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [successId, setSuccessId] = useState<string | null>(null)

  const [code, setCode] = useState('')
  const [loginPin, setLoginPin] = useState('')

  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
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
    const result = await login({ code, pin: loginPin })
    setBusy(false)
    if (result.error) setError(result.error)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccessId(null)
    if (pin !== pinConfirm) {
      setError('PINs do not match')
      return
    }
    setBusy(true)
    const result = await register({ email, pin, colorHex })
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
                Welcome! Your ID is{' '}
                <span className="font-mono font-semibold">{successId}</span> —
                save it with your PIN.
              </p>
            ) : null}

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Your code
                  <div className="flex items-center gap-1">
                    <span className="shrink-0 font-mono text-sm text-muted-foreground">
                      SCENIC-
                    </span>
                    <input
                      className={inputClass}
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.toUpperCase().replace(/\s/g, ''))
                      }
                      placeholder="AA0001"
                      autoComplete="username"
                      maxLength={6}
                      required
                    />
                  </div>
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  PIN
                  <input
                    className={inputClass}
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4,6}"
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    placeholder="4–6 digits"
                    autoComplete="current-password"
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
                  Email
                  <input
                    className={inputClass}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  PIN
                  <input
                    className={inputClass}
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4,6}"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="4–6 digits"
                    autoComplete="new-password"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  Confirm PIN
                  <input
                    className={inputClass}
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4,6}"
                    value={pinConfirm}
                    onChange={(e) => setPinConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
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
              </form>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  )
}
