'use client'

import type { LeaderboardEntry } from '@/lib/leaderboard-types'
import type { WeatherResponse } from '@/lib/weather-types'
import { fmtDistance } from '@/lib/scenic'
import { fmtCoveragePct } from '@/lib/trip-stats'
import { fmtHourLabel } from '@/lib/weather'
import { Button } from '@/components/ui/button'
import {
  CloudRain,
  Droplets,
  Loader2,
  Trophy,
  Wind,
  X,
} from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  entries: LeaderboardEntry[]
  loading: boolean
  error: string | null
  weather: WeatherResponse | null
  weatherLoading: boolean
  weatherError: string | null
  currentUserId?: string
}

function wetnessColor(level: string): string {
  switch (level) {
    case 'soaked':
      return 'text-sky-600 dark:text-sky-400'
    case 'wet':
      return 'text-blue-600 dark:text-blue-400'
    case 'damp':
      return 'text-amber-600 dark:text-amber-400'
    default:
      return 'text-muted-foreground'
  }
}

export function LeaderboardBar({
  open,
  onClose,
  entries,
  loading,
  error,
  weather,
  weatherLoading,
  weatherError,
  currentUserId,
}: Props) {
  if (!open) return null

  return (
    <div className="z-30 shrink-0 border-b border-border bg-card/95 backdrop-blur-sm">
      <div className="flex items-start gap-3 px-3 py-2.5 lg:px-4">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 shrink-0 text-time" aria-hidden />
            <span className="text-sm font-semibold text-foreground">Leaderboard</span>
            <span className="text-xs text-muted-foreground">
              Grid colored by rider
            </span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading ranks…
            </div>
          ) : error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No coverage yet — be the first to light up the grid.
            </p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {entries.map((entry) => (
                <div
                  key={entry.userId}
                  className={`flex min-w-[9.5rem] shrink-0 flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs ${
                    entry.userId === currentUserId
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/70 bg-muted/30'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                      style={{ backgroundColor: entry.colorHex }}
                      aria-hidden
                    />
                    <span className="font-semibold tabular-nums text-foreground">
                      #{entry.rank}
                    </span>
                    <span className="truncate font-medium text-foreground">
                      {entry.displayId}
                    </span>
                  </div>
                  <div className="tabular-nums text-muted-foreground">
                    {fmtCoveragePct(entry.coveragePct)} ·{' '}
                    {entry.tileCount.toLocaleString()} tiles
                  </div>
                  <div className="tabular-nums text-muted-foreground">
                    {entry.tripCount} rides · {fmtDistance(entry.totalDistanceM)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden w-px shrink-0 self-stretch bg-border sm:block" aria-hidden />

        <div className="flex min-w-0 max-w-md shrink-0 flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <CloudRain className="size-3.5 text-muted-foreground" aria-hidden />
            Next 6 hours
          </div>

          {weatherLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Loading weather…
            </div>
          ) : weatherError ? (
            <p className="text-xs text-muted-foreground">{weatherError}</p>
          ) : weather ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <span
                  className={`inline-flex items-center gap-1 font-medium ${wetnessColor(weather.roadWetness)}`}
                >
                  <Droplets className="size-3.5" aria-hidden />
                  {weather.roadWetnessLabel}
                </span>
                {weather.hours[0] ? (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Wind className="size-3.5" aria-hidden />
                    {weather.hours[0].windKmh} km/h {weather.hours[0].windLabel}
                  </span>
                ) : null}
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {weather.hours.map((hour) => (
                  <div
                    key={hour.time}
                    className="flex min-w-[4.5rem] shrink-0 flex-col rounded-md border border-border/60 bg-muted/25 px-1.5 py-1 text-center text-[10px]"
                  >
                    <span className="font-medium text-foreground">
                      {fmtHourLabel(hour.time)}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {hour.tempC}°C
                    </span>
                    <span className="truncate text-muted-foreground">
                      {hour.summary}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {hour.windKmh} km/h {hour.windLabel}
                    </span>
                    <span
                      className={`truncate font-medium ${wetnessColor(hour.roadWetness)}`}
                    >
                      {hour.precipitationMm > 0
                        ? `${hour.precipitationMm.toFixed(1)} mm`
                        : hour.precipProbability > 0
                          ? `${hour.precipProbability}% rain`
                          : 'Dry'}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={onClose}
          aria-label="Close leaderboard"
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  )
}
