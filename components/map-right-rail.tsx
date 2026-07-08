'use client'

import type { LatLng } from '@/lib/types'
import type { DirectionStep } from '@/lib/directions'
import type { WeatherResponse } from '@/lib/weather-types'
import { DirectionsPanel } from '@/components/directions-panel'
import { WeatherSection } from '@/components/weather-section'

type Props = {
  directionsOpen: boolean
  onDirectionsOpenChange: (open: boolean) => void
  steps: DirectionStep[]
  startLabel: string
  endLabel: string
  activeStepIndex: number
  currentPosition: LatLng | null
  currentPositionLabel: string
  distanceToNextM: number | null
  hasRoute: boolean
  weather: WeatherResponse | null
  weatherLoading: boolean
  weatherError: string | null
  onStepSelect?: (step: DirectionStep) => void
}

export function MapRightRail({
  directionsOpen,
  onDirectionsOpenChange,
  steps,
  startLabel,
  endLabel,
  activeStepIndex,
  currentPosition,
  currentPositionLabel,
  distanceToNextM,
  hasRoute,
  weather,
  weatherLoading,
  weatherError,
  onStepSelect,
}: Props) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 z-[1000] flex w-full max-w-[min(100%,20rem)] flex-col border-l border-border bg-background/95 shadow-xl backdrop-blur-sm"
      aria-label="Directions and weather"
    >
      {directionsOpen && hasRoute ? (
        <div className="pointer-events-auto flex min-h-0 flex-1 flex-col border-b border-border">
          <DirectionsPanel
            open={directionsOpen}
            onOpenChange={onDirectionsOpenChange}
            steps={steps}
            startLabel={startLabel}
            endLabel={endLabel}
            activeStepIndex={activeStepIndex}
            currentPosition={currentPosition}
            currentPositionLabel={currentPositionLabel}
            distanceToNextM={distanceToNextM}
            hasRoute={hasRoute}
            onStepSelect={onStepSelect}
          />
        </div>
      ) : null}

      <div className="pointer-events-auto mt-auto shrink-0 overflow-y-auto max-h-[min(70vh,32rem)]">
        <WeatherSection
          weather={weather}
          loading={weatherLoading}
          error={weatherError}
        />
      </div>
    </div>
  )
}
