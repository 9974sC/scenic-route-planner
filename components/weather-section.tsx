'use client'

import type { WeatherResponse } from '@/lib/weather-types'
import {
  fmtHourLabel,
  WEATHER_HOURS_EXTENDED,
} from '@/lib/weather'
import { CloudRain, Droplets, Loader2, Wind } from 'lucide-react'

type Props = {
  weather: WeatherResponse | null
  loading: boolean
  error: string | null
}

function wetnessColor(level: string): string {
  switch (level) {
    case 'soaked':
      return 'text-sky-600 dark:text-sky-300'
    case 'wet':
      return 'text-blue-600 dark:text-blue-300'
    case 'damp':
      return 'text-amber-600 dark:text-amber-200'
    default:
      return 'text-muted-foreground'
  }
}

export function WeatherSection({ weather, loading, error }: Props) {
  const hours = weather?.hours.slice(0, WEATHER_HOURS_EXTENDED) ?? []

  return (
    <div className="px-2.5 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <CloudRain className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        Weather — next {WEATHER_HOURS_EXTENDED} hours
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Loading…
        </div>
      ) : error ? (
        <p className="text-xs text-muted-foreground">{error}</p>
      ) : weather ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-col gap-0.5 border-b border-border/60 pb-1.5 text-[11px]">
            <span
              className={`inline-flex items-center gap-1 font-medium ${wetnessColor(weather.roadWetness)}`}
            >
              <Droplets className="size-3 shrink-0" aria-hidden />
              {weather.roadWetnessLabel}
            </span>
            {weather.hours[0] ? (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Wind className="size-3 shrink-0" aria-hidden />
                {weather.hours[0].windKmh} km/h {weather.hours[0].windLabel}
              </span>
            ) : null}
          </div>

          <ul className="flex flex-col gap-1">
            {hours.map((hour) => (
              <li
                key={hour.time}
                className="rounded-md border border-border/60 bg-background/80 px-2 py-1 text-[10px] leading-snug"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="shrink-0 font-medium text-foreground">
                    {fmtHourLabel(hour.time)}
                  </span>
                  <span className="truncate text-right tabular-nums text-muted-foreground">
                    {hour.tempC}°C · {hour.summary}
                  </span>
                </div>
                <div className="mt-0.5 flex items-baseline justify-between gap-2 text-muted-foreground">
                  <span className="tabular-nums">
                    {hour.windKmh} km/h {hour.windLabel}
                  </span>
                  <span
                    className={`truncate text-right font-medium ${wetnessColor(hour.roadWetness)}`}
                  >
                    {hour.precipitationMm > 0
                      ? `${hour.precipitationMm.toFixed(1)} mm`
                      : hour.precipProbability > 0
                        ? `${hour.precipProbability}% rain`
                        : 'Dry'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
