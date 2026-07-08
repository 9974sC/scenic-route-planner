'use client'

import {
  EXTRA_KM_MIN_OPTIONS,
  EXTRA_KM_MAX_OPTIONS,
  MAX_SPARE_MINUTES,
  MAX_USER_SPEED_KMH,
  MIN_USER_SPEED_KMH,
  NO_MAX_EXTRA_KM,
  clampUserSpeedKmh,
  fmtExtraKmLabel,
  fmtSpareMinutes,
} from '@/lib/scenic'
import type { LatLng } from '@/lib/types'
import type { RouteEndpoint } from '@/lib/places'
import { isLocationEndpoint } from '@/lib/places'
import {
  SCENIC_PREFERENCE_OPTIONS,
  type ScenicPreference,
  type ScenicPreferenceSet,
} from '@/lib/scenic-preferences'
import { PlacePicker } from '@/components/place-picker'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeftRight, Leaf, Waves, Mountain, Clock, Route as RouteIcon, Navigation } from 'lucide-react'

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
  onRouteToLocation?: () => void
}

function PreferenceSelect({
  icon,
  label,
  value,
  onChange,
  menuContainer,
}: {
  icon: React.ReactNode
  label: string
  value: ScenicPreference
  onChange: (v: ScenicPreference) => void
  menuContainer?: HTMLElement | null
}) {
  return (
    <label className="flex items-center justify-between gap-2">
      <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ScenicPreference)}
      >
        <SelectTrigger className="h-8 w-[7.5rem] shrink-0" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent container={menuContainer ?? undefined}>
          {SCENIC_PREFERENCE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
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
  onRouteToLocation,
}: Props) {
  const headingToLocation = isLocationEndpoint(end)

  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
        <PlacePicker
          label="From"
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
          <div className="h-px flex-1 bg-border" aria-hidden />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mx-1.5 size-7 shrink-0 rounded-full bg-background shadow-sm transition-transform hover:bg-muted active:scale-95"
            onClick={onSwap}
            aria-label="Swap start and destination"
          >
            <ArrowLeftRight className="size-3.5" aria-hidden />
          </Button>
          <div className="h-px flex-1 bg-border" aria-hidden />
        </div>

        <div className="-mt-1.5">
          <PlacePicker
            label="To"
            value={end}
            onChange={onEnd}
            dotClass="bg-accent"
            menuContainer={menuContainer}
            mapPickActive={mapPickTarget === 'end'}
            onMapPickRequest={
              onMapPickRequest ? () => onMapPickRequest('end') : undefined
            }
          />
        </div>
      </div>

      {userPosition && onRouteToLocation ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={onRouteToLocation}
        >
          <Navigation className="size-4" aria-hidden />
          Route to my location (min 1 km extra)
        </Button>
      ) : null}

      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
          What makes a good ride today?
        </div>
        <PreferenceSelect
          icon={<Leaf className="size-3.5 text-primary" aria-hidden />}
          label="Greenery"
          value={preferences.greenness}
          onChange={(v) =>
            onPreferences({ ...preferences, greenness: v })
          }
          menuContainer={menuContainer}
        />
        <PreferenceSelect
          icon={<Waves className="size-3.5 text-primary" aria-hidden />}
          label="Curves"
          value={preferences.curviness}
          onChange={(v) =>
            onPreferences({ ...preferences, curviness: v })
          }
          menuContainer={menuContainer}
        />
        <PreferenceSelect
          icon={<Mountain className="size-3.5 text-primary" aria-hidden />}
          label="Viewpoints"
          value={preferences.viewpoints}
          onChange={(v) =>
            onPreferences({ ...preferences, viewpoints: v })
          }
          menuContainer={menuContainer}
        />
        {headingToLocation ? (
          <p className="text-[11px] text-muted-foreground">
            Routes to your location need at least 1 km of extra distance.
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
          <Slider
            className="[&_[data-slot=slider-range]]:bg-time"
            value={[budget]}
            min={0}
            max={MAX_SPARE_MINUTES}
            step={5}
            onValueChange={(v) => onBudget(Array.isArray(v) ? v[0] : v)}
            aria-label="Time to spare in minutes"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
            <span>Fastest way</span>
            <span>{fmtSpareMinutes(MAX_SPARE_MINUTES).replace(/^\+/, 'Up to +')}</span>
          </div>
        </div>

        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <RouteIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-xs font-medium text-foreground">Extra distance</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-muted-foreground">Min extra km</span>
              <Select
                value={String(minExtraKm)}
                onValueChange={(v) => {
                  const nextMin = Number(v)
                  onMinExtraKm(nextMin)
                  if (maxExtraKm < NO_MAX_EXTRA_KM && maxExtraKm < nextMin) {
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
                  const nextMax = Number(v)
                  onMaxExtraKm(nextMax)
                  if (nextMax < NO_MAX_EXTRA_KM && nextMax < minExtraKm) {
                    onMinExtraKm(nextMax)
                  }
                }}
              >
                <SelectTrigger className="w-full" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent container={menuContainer ?? undefined}>
                  {EXTRA_KM_MAX_OPTIONS.filter(
                    (km) => km >= minExtraKm || km >= NO_MAX_EXTRA_KM,
                  ).map((km) => (
                    <SelectItem key={km} value={String(km)}>
                      {fmtExtraKmLabel(km)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="flex flex-col gap-1">
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
        </div>
      </div>
    </div>
  )
}
