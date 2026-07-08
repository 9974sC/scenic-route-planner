'use client'

import { useState } from 'react'
import type { WeatherResponse } from '@/lib/weather-types'
import {
  fmtHourLabel,
  WEATHER_HOURS_COLLAPSED,
  WEATHER_HOURS_EXTENDED,
} from '@/lib/weather'
import { Button } from '@/components/ui/button'
import { ChevronDown, CloudRain, Droplets, Loader2, Wind } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  weather: WeatherResponse | null
  loading: boolean
  error: string | null
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

export function WeatherSection({ weather, loading, error }: Props) {
  const [extended, setExtended] = useState(false)

  const visibleCount = extended
    ? WEATHER_HOURS_EXTENDED
    : WEATHER_HOURS_COLLAPSED
  const visibleHours = weather?.hours.slice(0, visibleCount) ?? []
  const canExtend =
    (weather?.hours.length ?? 0) > WEATHER_HOURS_COLLAPSED

  return (
    <div className="px-3 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <CloudRain className="size-3.5 text-muted-foreground" aria-hidden />
          Weather — next {visibleCount} hours
        </div>
        {canExtend ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px]"
            aria-expanded={extended}
            onClick={() => setExtended((open) => !open)}
          >
            {extended ? 'Less' : '12 hrs'}
            <ChevronDown
              className={cn(
                'size-3 transition-transform',
                extended && 'rotate-180',
              )}
              aria-hidden
            />
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground">{error}</p>
      ) : weather ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1 border-b border-border/60 pb-2 text-xs">
            <span
              className={`inline-flex items-center gap-1 font-medium ${wetnessColor(weather.roadWetness)}`}
            >
              <Droplets className="size-3.5 shrink-0" aria-hidden />
              {weather.roadWetnessLabel}
            </span>
            {weather.hours[0] ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Wind className="size-3.5 shrink-0" aria-hidden />
                {weather.hours[0].windKmh} km/h {weather.hours[0].windLabel}
              </span>
            ) : null}
          </div>

          <ul className="flex flex-col gap-1.5">
            {visibleHours.map((hour) => (
              <li
                key={hour.time}
                className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-background/80 px-2 py-1.5 text-[11px]"
              >
                <span className="font-medium text-foreground">
                  {fmtHourLabel(hour.time)}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {hour.tempC}°C · {hour.summary}
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {hour.windKmh} km/h {hour.windLabel}
                </span>
                <span
                  className={`font-medium ${wetnessColor(hour.roadWetness)}`}
                >
                  {hour.precipitationMm > 0
                    ? `${hour.precipitationMm.toFixed(1)} mm rain`
                    : hour.precipProbability > 0
                      ? `${hour.precipProbability}% rain chance`
                      : 'Dry roads'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
