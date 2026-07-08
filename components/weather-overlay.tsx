'use client'

import type { WeatherResponse } from '@/lib/weather-types'
import { fmtHourLabel } from '@/lib/weather'
import { cn } from '@/lib/utils'
import { CloudRain, Droplets, Loader2, Wind } from 'lucide-react'

type Props = {
  weather: WeatherResponse | null
  loading: boolean
  error: string | null
  directionsPanelOpen?: boolean
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

export function WeatherOverlay({
  weather,
  loading,
  error,
  directionsPanelOpen = false,
}: Props) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-3 z-[1000] max-w-[11rem] transition-[left]',
        directionsPanelOpen ? 'left-[calc(min(100%,20rem)+0.75rem)]' : 'left-3',
      )}
    >
      <div className="pointer-events-auto rounded-xl border border-border bg-background/95 p-2.5 shadow-md backdrop-blur-sm">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <CloudRain className="size-3.5 text-muted-foreground" aria-hidden />
          Next 6 hours
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-2 text-xs text-muted-foreground">
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
              {weather.hours.map((hour) => (
                <li
                  key={hour.time}
                  className="flex flex-col gap-0.5 rounded-md border border-border/60 bg-muted/25 px-2 py-1.5 text-[11px]"
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
    </div>
  )
}
