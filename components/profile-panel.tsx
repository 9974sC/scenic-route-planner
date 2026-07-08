'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { avatarUrlForUser } from '@/lib/profile'
import { ChevronDown, Loader2, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass =
  'w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring/50 focus-visible:ring-[3px]'

const textareaClass =
  'min-h-[4.5rem] w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none ring-ring/50 focus-visible:ring-[3px]'

function formatCooldown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'now'
  const min = Math.ceil(ms / 60_000)
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h} h ${m} min` : `${h} h`
}

export function ProfilePanel() {
  const { user, updateProfile, updateColor, uploadAvatar } = useAuth()
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [colorHex, setColorHex] = useState('#2563eb')

  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName ?? '')
    setBio(user.bio ?? '')
    setLocation(user.location ?? '')
    setColorHex(user.colorHex)
  }, [user])

  const avatarSrc = useMemo(() => {
    if (!user?.hasAvatar) return null
    return `${avatarUrlForUser(user.id)}?v=${user.avatarVersion}`
  }, [user])

  const colorLocked = Boolean(user?.colorChangeAvailableAt)

  if (!user) return null

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)
    const result = await updateProfile({
      displayName,
      bio,
      location,
    })
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess('Profile saved')
  }

  async function handleColorSave() {
    setError(null)
    setSuccess(null)
    setBusy(true)
    const result = await updateColor(colorHex)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess('Map color updated')
  }

  async function handleAvatarChange(file: File | null) {
    if (!file) return
    setError(null)
    setSuccess(null)
    setBusy(true)
    const result = await uploadAvatar(file)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess('Profile photo updated')
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt=""
            className="size-10 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
          />
        ) : (
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: user.colorHex }}
          >
            {user.username.slice(0, 2).toUpperCase()}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {user.displayName || `@${user.username}`}
          </span>
          <span className="block truncate font-mono text-xs text-muted-foreground">
            {user.displayId}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <form
          onSubmit={handleSaveProfile}
          className="flex flex-col gap-3 border-t border-border px-4 pb-4 pt-3"
        >
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="text-sm text-primary" role="status">
              {success}
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt=""
                className="size-16 rounded-full object-cover ring-1 ring-foreground/10"
              />
            ) : (
              <span
                className="flex size-16 items-center justify-center rounded-full text-lg font-semibold text-white"
                style={{ backgroundColor: user.colorHex }}
              >
                <User className="size-7" aria-hidden />
              </span>
            )}
            <div className="flex flex-col gap-1.5">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  'Upload photo'
                )}
              </Button>
              <span className="text-[11px] text-muted-foreground">
                JPEG, PNG, or WebP up to 1.5 MB
              </span>
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Username
            <input className={inputClass} value={`@${user.username}`} disabled />
          </label>

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

          <label className="flex flex-col gap-1.5 text-xs text-muted-foreground">
            Map color
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                disabled={colorLocked || busy}
                className="size-10 cursor-pointer rounded-lg border border-input bg-background p-1 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <input
                className={inputClass}
                value={colorHex}
                onChange={(e) => setColorHex(e.target.value.toUpperCase())}
                pattern="#[0-9A-Fa-f]{6}"
                maxLength={7}
                disabled={colorLocked || busy}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={
                  colorLocked || busy || colorHex === user.colorHex
                }
                onClick={handleColorSave}
              >
                Apply
              </Button>
            </div>
            {colorLocked && user.colorChangeAvailableAt ? (
              <span className="text-[11px] text-muted-foreground">
                Color can be changed again in{' '}
                {formatCooldown(user.colorChangeAvailableAt)}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                You can change your map color once per hour
              </span>
            )}
          </label>

          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : 'Save profile'}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
