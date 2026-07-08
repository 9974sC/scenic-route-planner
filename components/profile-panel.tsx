'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { PlacePicker } from '@/components/place-picker'
import { Button } from '@/components/ui/button'
import { avatarUrlForUser } from '@/lib/profile'
import type { RouteEndpoint } from '@/lib/places'
import { addressPickerPlaceholder, defaultStartPreset } from '@/lib/places'
import {
  endpointToSavedAddress,
  isSavedAddressSet,
  savedAddressToPickerValue,
} from '@/lib/saved-address'
import { fmtDistance, fmtDuration } from '@/lib/scenic'
import {
  computeLifetimeStats,
  fmtCoveragePct,
  fmtMemberSince,
} from '@/lib/user-stats'
import {
  ChevronDown,
  Flame,
  Briefcase,
  Home,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  Route as RouteIcon,
  User,
  X,
} from 'lucide-react'
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

function StatTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-foreground">
        {value}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  )
}

export function ProfilePanel() {
  const { user, trips, claimedTiles, updateProfile, updateColor, uploadAvatar, logout } =
    useAuth()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [location, setLocation] = useState('')
  const [homeEndpoint, setHomeEndpoint] = useState<RouteEndpoint>(
    savedAddressToPickerValue('home', null),
  )
  const [workEndpoint, setWorkEndpoint] = useState<RouteEndpoint>(
    savedAddressToPickerValue('work', null),
  )
  const [addingHome, setAddingHome] = useState(false)
  const [addingWork, setAddingWork] = useState(false)
  const [colorHex, setColorHex] = useState('#2563eb')

  const homeSaved = isSavedAddressSet(endpointToSavedAddress(homeEndpoint))
  const workSaved = isSavedAddressSet(endpointToSavedAddress(workEndpoint))
  const showHomePicker = homeSaved || addingHome
  const showWorkPicker = workSaved || addingWork

  useEffect(() => {
    if (!user) return
    setDisplayName(user.displayName ?? '')
    setBio(user.bio ?? '')
    setLocation(user.location ?? '')
    setHomeEndpoint(savedAddressToPickerValue('home', user.home))
    setWorkEndpoint(savedAddressToPickerValue('work', user.work))
    setColorHex(user.colorHex)
  }, [user])

  const avatarSrc = useMemo(() => {
    if (!user?.hasAvatar) return null
    return `${avatarUrlForUser(user.id)}?v=${user.avatarVersion}`
  }, [user])

  const stats = useMemo(
    () => computeLifetimeStats(trips, claimedTiles.length),
    [trips, claimedTiles.length],
  )

  const colorLocked = Boolean(user?.colorChangeAvailableAt)

  if (!user) return null

  function closeEdit() {
    setEditing(false)
    setAddingHome(false)
    setAddingWork(false)
    setError(null)
    setSuccess(null)
    setDisplayName(user!.displayName ?? '')
    setBio(user!.bio ?? '')
    setLocation(user!.location ?? '')
    setHomeEndpoint(savedAddressToPickerValue('home', user!.home))
    setWorkEndpoint(savedAddressToPickerValue('work', user!.work))
    setColorHex(user!.colorHex)
  }

  function toggleExpanded() {
    setExpanded((open) => {
      if (open) {
        setEditing(false)
        setError(null)
        setSuccess(null)
      }
      return !open
    })
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)
    const result = await updateProfile({
      displayName,
      bio,
      location,
      home: endpointToSavedAddress(homeEndpoint),
      work: endpointToSavedAddress(workEndpoint),
    })
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSuccess('Profile saved')
    setEditing(false)
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
        onClick={toggleExpanded}
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
            {user.displayName || user.username}
          </span>
          <span className="block truncate font-mono text-xs text-muted-foreground">
            @{user.username} · {user.displayId}
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
        <div className="border-t border-border px-4 pb-4 pt-3">
          {error ? (
            <p className="mb-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mb-3 text-sm text-primary" role="status">
              {success}
            </p>
          ) : null}

          {!editing ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Member since {fmtMemberSince(user.createdAt)}
                  </p>
                  {user.bio ? (
                    <p className="mt-1 text-sm text-foreground">{user.bio}</p>
                  ) : null}
                  {user.location ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" aria-hidden />
                      {user.location}
                    </p>
                  ) : null}
                  {isSavedAddressSet(user.home) ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Home className="size-3 shrink-0" aria-hidden />
                      Home: {user.home.name}
                    </p>
                  ) : null}
                  {isSavedAddressSet(user.work) ? (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Briefcase className="size-3 shrink-0" aria-hidden />
                      Work: {user.work.name}
                    </p>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 shrink-0 gap-1 px-2 text-xs"
                  onClick={() => {
                    setEditing(true)
                    setAddingHome(false)
                    setAddingWork(false)
                    setError(null)
                    setSuccess(null)
                  }}
                >
                  <Pencil className="size-3" aria-hidden />
                  Edit
                </Button>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/15 px-2.5 py-2">
                <Flame
                  className={cn(
                    'size-4 shrink-0',
                    stats.usageStreakDays > 0
                      ? 'text-orange-400 dark:text-orange-200'
                      : 'text-muted-foreground',
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {stats.usageStreakDays > 0
                      ? `${stats.usageStreakDays} day streak`
                      : 'No active streak'}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {stats.usageStreakDays > 0
                      ? 'Keep riding to extend it'
                      : 'Log a ride today to start one'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <StatTile
                  label="Rides"
                  value={String(stats.tripCount)}
                />
                <StatTile
                  label="Coverage"
                  value={fmtCoveragePct(stats.coveragePct)}
                  hint={`${stats.tilesClaimed} tiles`}
                />
                <StatTile
                  label="Distance"
                  value={fmtDistance(stats.totalDistanceM)}
                />
                <StatTile
                  label="Ride time"
                  value={fmtDuration(stats.totalDurationS)}
                />
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <RouteIcon className="size-3.5 shrink-0" aria-hidden />
                <span>
                  Map color{' '}
                  <span
                    className="inline-block size-2.5 translate-y-px rounded-full ring-1 ring-foreground/15"
                    style={{ backgroundColor: user.colorHex }}
                    aria-hidden
                  />{' '}
                  {user.colorHex}
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => logout()}
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Edit profile
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={closeEdit}
                >
                  <X className="size-3" aria-hidden />
                  Cancel
                </Button>
              </div>

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
                    onChange={(e) =>
                      handleAvatarChange(e.target.files?.[0] ?? null)
                    }
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

              <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/15 p-2.5">
                  <p className="text-xs font-medium text-foreground">
                    Saved addresses
                  </p>

                  {showHomePicker ? (
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <PlacePicker
                          label="Home"
                          value={homeEndpoint}
                          onChange={(endpoint) => {
                            setHomeEndpoint(endpoint)
                            if (isSavedAddressSet(endpointToSavedAddress(endpoint))) {
                              setAddingHome(false)
                            }
                          }}
                          dotClass="bg-primary"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-xs"
                        onClick={() => {
                          setHomeEndpoint(addressPickerPlaceholder('home'))
                          setAddingHome(false)
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="justify-start gap-2"
                      onClick={() => {
                        setAddingHome(true)
                        setHomeEndpoint(defaultStartPreset())
                      }}
                    >
                      <Home className="size-4" aria-hidden />
                      Add home address
                    </Button>
                  )}

                  {showWorkPicker ? (
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <PlacePicker
                          label="Work"
                          value={workEndpoint}
                          onChange={(endpoint) => {
                            setWorkEndpoint(endpoint)
                            if (isSavedAddressSet(endpointToSavedAddress(endpoint))) {
                              setAddingWork(false)
                            }
                          }}
                          dotClass="bg-accent"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="shrink-0 text-xs"
                        onClick={() => {
                          setWorkEndpoint(addressPickerPlaceholder('work'))
                          setAddingWork(false)
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="justify-start gap-2"
                      onClick={() => {
                        setAddingWork(true)
                        setWorkEndpoint(defaultStartPreset())
                      }}
                    >
                      <Briefcase className="size-4" aria-hidden />
                      Add work address
                    </Button>
                  )}

                  <p className="text-[11px] text-muted-foreground">
                    Saved addresses unlock Route home and Route to work on the
                    map.
                  </p>
                </div>

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
          )}
        </div>
      ) : null}
    </div>
  )
}
