'use client'

import type { WeatherResponse } from '@/lib/weather-types'
import { WeatherSection } from '@/components/weather-section'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Navigation } from 'lucide-react'

type Props = {
  directionsOpen: boolean
  onDirectionsToggle: () => void
  hasDirections: boolean
  weather: WeatherResponse | null
  weatherLoading: boolean
  weatherError: string | null
}

export function MapToolbar({
  directionsOpen,
  onDirectionsToggle,
  hasDirections,
  weather,
  weatherLoading,
  weatherError,
}: Props) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute top-3 z-[1001] flex w-[12rem] flex-col gap-2 transition-[right] duration-200',
        directionsOpen
          ? 'right-[calc(min(100%,20rem)+1rem)]'
          : 'right-4',
      )}
    >
      <Button
        type="button"
        size="lg"
        variant="default"
        className="pointer-events-auto w-full shadow-md"
        aria-expanded={directionsOpen}
        disabled={!hasDirections}
        onClick={onDirectionsToggle}
      >
        <Navigation className="size-5" aria-hidden />
        Directions
      </Button>

      <div className="pointer-events-auto rounded-xl border border-border bg-background/95 shadow-md backdrop-blur-sm">
        <WeatherSection
          weather={weather}
          loading={weatherLoading}
          error={weatherError}
        />
      </div>
    </div>
  )
}
