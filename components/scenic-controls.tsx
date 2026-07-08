'use client'

import {
  EXTRA_KM_MIN_OPTIONS,
  EXTRA_KM_MAX_OPTIONS,
  MAX_SPARE_MINUTES,
  MAX_USER_SPEED_KMH,
  MIN_USER_SPEED_KMH,
  DEFAULT_MAX_EXTRA_KM,
  clampMaxExtraKm,
  clampUserSpeedKmh,
  fmtExtraKmLabel,
  fmtSpareMinutes,
  MIN_EXTRA_KM_TO_LOCATION,
  SPARE_TIME_PRESETS,
} from '@/lib/scenic'
import type { LatLng } from '@/lib/types'
import type { RouteEndpoint } from '@/lib/places'
import { isBlankEndpoint, isHomeEndpoint, isScenicDetourEndpoint, isWorkEndpoint } from '@/lib/places'
import {
  SCENIC_PREFERENCE_LEVELS,
  indexToPreference,
  preferenceLabel,
  preferenceToIndex,
  type ScenicPreference,
  type ScenicPreferenceSet,
} from '@/lib/scenic-preferences'
import { PlacePicker } from '@/components/place-picker'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeftRight, Leaf, Waves, Mountain, Clock, Route as RouteIcon, Home, Briefcase, ChevronDown, Navigation } from 'lucide-react'

type Props = {
  start: RouteEndpoint
  end: RouteEndpoint
  preferences: ScenicPreferenceSet
  budget: number
  minExtraKm: number
  maxExtraKm: number
  userSpeedKmh: number
  onStart: (endpoint: RouteEndpoint) => void
  onEnd: (endpoint: RouteEndpoint) => void
  onPreferences: (p: ScenicPreferenceSet) => void
  onBudget: (n: number) => void
  onMinExtraKm: (n: number) => void
  onMaxExtraKm: (n: number) => void
  onUserSpeedKmh: (n: number) => void
  onSwap: () => void
  menuContainer?: HTMLElement | null
  mapPickTarget?: 'start' | 'end' | null
  onMapPickRequest?: (target: 'start' | 'end') => void
  userPosition?: LatLng | null
  onRouteFromLocation?: () => void
  onRouteHome?: () => void
  onRouteWork?: () => void
  showRouteHome?: boolean
  showRouteWork?: boolean
}

function PreferenceSlider({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  value: ScenicPreference
  onChange: (v: ScenicPreference) => void
}) {
  const index = preferenceToIndex(value)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-primary">
          {preferenceLabel(value)}
        </span>
      </div>
      <Slider
        value={[index]}
        min={0}
        max={2}
        step={1}
        onValueChange={(v) => {
          const next = Array.isArray(v) ? v[0] : v
          onChange(indexToPreference(next))
        }}
        aria-label={`${label}: ${preferenceLabel(value)}`}
      />
      <div className="flex justify-between gap-1 text-[10px] leading-tight text-muted-foreground/80">
        {SCENIC_PREFERENCE_LEVELS.map((level) => (
          <span
            key={level.value}
            className={
              level.value === value
                ? 'font-medium text-foreground'
                : undefined
            }
          >
            {level.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function ScenicControls({
  start,
  end,
  preferences,
  budget,
  minExtraKm,
  maxExtraKm,
  userSpeedKmh,
  onStart,
  onEnd,
  onPreferences,
  onBudget,
  onMinExtraKm,
  onMaxExtraKm,
  onUserSpeedKmh,
  onSwap,
  menuContainer,
  mapPickTarget,
  onMapPickRequest,
  userPosition = null,
  onRouteFromLocation,
  onRouteHome,
  onRouteWork,
  showRouteHome = false,
  showRouteWork = false,
}: Props) {
  const scenicDetourDestination =
    isScenicDetourEndpoint(end) && (isHomeEndpoint(end) || isWorkEndpoint(end))
  const swapDisabled = isBlankEndpoint(end)

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
        <div className="flex flex-col gap-1">
          <PlacePicker
            label="From"
            inlineLabel
            value={start}
            onChange={onStart}
            dotClass="bg-primary"
            menuContainer={menuContainer}
            mapPickActive={mapPickTarget === 'start'}
            onMapPickRequest={
              onMapPickRequest ? () => onMapPickRequest('start') : undefined
            }
            userPosition={userPosition}
          />

          <div className="relative z-10 flex items-center py-0.5">
            <div className="w-9 shrink-0" aria-hidden />
            <div className="flex min-w-0 flex-1 items-center">
              <div className="h-px flex-1 bg-border" aria-hidden />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="mx-1 size-6 shrink-0 rounded-full bg-background shadow-sm transition-transform hover:bg-muted active:scale-95"
                onClick={onSwap}
                disabled={swapDisabled}
                aria-label="Swap start and destination"
              >
                <ArrowLeftRight className="size-3" aria-hidden />
              </Button>
              <div className="h-px flex-1 bg-border" aria-hidden />
            </div>
          </div>

          <PlacePicker
            label="To"
            inlineLabel
            value={end}
            onChange={onEnd}
            dotClass="bg-accent"
            menuContainer={menuContainer}
            mapPickActive={mapPickTarget === 'end'}
            onMapPickRequest={
              onMapPickRequest ? () => onMapPickRequest('end') : undefined
            }
            userPosition={userPosition}
          />
        </div>
      </div>

      {userPosition && onRouteFromLocation ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onRouteFromLocation}
        >
          <Navigation className="size-4" aria-hidden />
          Route from my location
        </Button>
      ) : null}

      {showRouteHome && onRouteHome ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onRouteHome}
        >
          <Home className="size-4" aria-hidden />
          Route home
        </Button>
      ) : null}

      {showRouteWork && onRouteWork ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onRouteWork}
        >
          <Briefcase className="size-4" aria-hidden />
          Route to work
        </Button>
      ) : null}

      <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
          What makes a good ride today?
        </div>
        <PreferenceSlider
          icon={<Leaf className="size-3.5 text-primary" aria-hidden />}
          label="Greenery"
          value={preferences.greenness}
          onChange={(v) =>
            onPreferences({ ...preferences, greenness: v })
          }
        />
        <PreferenceSlider
          icon={<Waves className="size-3.5 text-primary" aria-hidden />}
          label="Curves"
          value={preferences.curviness}
          onChange={(v) =>
            onPreferences({ ...preferences, curviness: v })
          }
        />
        <PreferenceSlider
          icon={<Mountain className="size-3.5 text-primary" aria-hidden />}
          label="Viewpoints"
          value={preferences.viewpoints}
          onChange={(v) =>
            onPreferences({ ...preferences, viewpoints: v })
          }
        />
        {scenicDetourDestination ? (
          <p className="text-[11px] text-muted-foreground">
            Routes home or to work use at least {MIN_EXTRA_KM_TO_LOCATION} km of
            extra distance.
          </p>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-time/15"
              aria-hidden
            >
              <Clock className="size-4 text-time" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Time to spare</h3>
              <p className="text-[11px] leading-snug text-muted-foreground/80">
                How much longer a scenic route can take
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right leading-none">
            {budget === 0 ? (
              <>
                <span className="font-display text-xl font-semibold text-foreground">
                  Direct
                </span>
                <p className="mt-1 text-[11px] text-muted-foreground/75">Fastest route</p>
              </>
            ) : (
              <>
                <span className="font-display text-xl font-semibold tabular-nums text-time sm:text-2xl">
                  {budget >= 60
                    ? `+${Math.floor(budget / 60)}`
                    : `+${budget}`}
                </span>
                <span className="ml-0.5 text-xs text-time/80">
                  {budget >= 60
                    ? budget % 60 > 0
                      ? `h ${budget % 60}m`
                      : 'h'
                    : 'min'}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <div className="relative">
            <Slider
              className="[&_[data-slot=slider-range]]:bg-time"
              value={[budget]}
              min={0}
              max={MAX_SPARE_MINUTES}
              step={5}
              marks={SPARE_TIME_PRESETS.map((preset) => ({
                value: preset.minutes,
                label: preset.label,
              }))}
              onMarkClick={onBudget}
              onValueChange={(v) => onBudget(Array.isArray(v) ? v[0] : v)}
              aria-label="Time to spare in minutes"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
            <span>Fastest way</span>
            <span>{fmtSpareMinutes(MAX_SPARE_MINUTES).replace(/^\+/, 'Up to +')}</span>
          </div>
        </div>

        <details className="mt-3 border-t border-border pt-3 group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-medium text-foreground [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <RouteIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              Extra distance
              <span className="font-normal text-muted-foreground">
                ({fmtExtraKmLabel(minExtraKm)} – {fmtExtraKmLabel(maxExtraKm)})
              </span>
            </span>
            <ChevronDown
              className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">Min extra km</span>
              <Select
                value={String(minExtraKm)}
                onValueChange={(v) => {
                  const nextMin = Number(v)
                  onMinExtraKm(nextMin)
                  if (maxExtraKm < nextMin) {
                    onMaxExtraKm(nextMin)
                  }
                }}
              >
                <SelectTrigger className="w-full" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent container={menuContainer ?? undefined}>
                  {EXTRA_KM_MIN_OPTIONS.map((km) => (
                    <SelectItem key={km} value={String(km)}>
                      {fmtExtraKmLabel(km)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">Max extra km</span>
              <Select
                value={String(maxExtraKm)}
                onValueChange={(v) => {
                  const nextMax = clampMaxExtraKm(Number(v))
                  onMaxExtraKm(nextMax)
                  if (nextMax < minExtraKm) {
                    onMinExtraKm(nextMax)
                  }
                }}
              >
                <SelectTrigger className="w-full" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent container={menuContainer ?? undefined}>
                  {EXTRA_KM_MAX_OPTIONS.filter((km) => km >= minExtraKm).map(
                    (km) => (
                      <SelectItem key={km} value={String(km)}>
                        {fmtExtraKmLabel(km)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">
              Your avg speed (km/h)
            </span>
            <input
              type="number"
              min={MIN_USER_SPEED_KMH}
              max={MAX_USER_SPEED_KMH}
              step={0.5}
              value={userSpeedKmh}
              onChange={(e) =>
                onUserSpeedKmh(clampUserSpeedKmh(Number(e.target.value)))
              }
              className="h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm tabular-nums outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
              aria-label="Average cycling speed in kilometers per hour"
            />
          </label>
        </details>
      </div>
    </div>
  )
}
