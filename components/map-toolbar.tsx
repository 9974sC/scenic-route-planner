'use client'

import type { WeatherResponse } from '@/lib/weather-types'
import { WeatherSection } from '@/components/weather-section'
import { Button } from '@/components/ui/button'
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
    <div className="absolute top-3 right-3 z-[1001] flex w-full max-w-[11rem] flex-col gap-2">
      <Button
        type="button"
        size="lg"
        variant="default"
        className="w-full shadow-md"
        aria-expanded={directionsOpen}
        disabled={!hasDirections}
        onClick={onDirectionsToggle}
      >
        <Navigation className="size-5" aria-hidden />
        Directions
      </Button>

      <div className="overflow-y-auto rounded-xl border border-border bg-background/95 shadow-md backdrop-blur-sm max-h-[min(60vh,28rem)]">
        <WeatherSection
          weather={weather}
          loading={weatherLoading}
          error={weatherError}
        />
      </div>
    </div>
  )
}
