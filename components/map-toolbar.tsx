'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LayoutGrid, Navigation, Navigation2 } from 'lucide-react'

type Props = {
  directionsOpen: boolean
  onDirectionsToggle: () => void
  hasDirections: boolean
  showCoverage: boolean
  onCoverageToggle: () => void
  headingUp: boolean
  onHeadingToggle: () => void
  canUseHeading: boolean
  /** When the directions drawer is open, keep controls visible beside it. */
  directionsPanelOpen?: boolean
}

export function MapToolbar({
  directionsOpen,
  onDirectionsToggle,
  hasDirections,
  showCoverage,
  onCoverageToggle,
  headingUp,
  onHeadingToggle,
  canUseHeading,
  directionsPanelOpen = false,
}: Props) {
  return (
    <div
      className={cn(
        'absolute top-3 z-[1000] flex items-center gap-2 transition-[right]',
        directionsPanelOpen
          ? 'right-[calc(min(100%,20rem)+0.75rem)]'
          : 'right-3',
      )}
    >
      <Button
        type="button"
        size="sm"
        variant="default"
        className="shadow-md"
        aria-expanded={directionsOpen}
        disabled={!hasDirections}
        onClick={onDirectionsToggle}
      >
        <Navigation className="size-4" aria-hidden />
        Directions
      </Button>

      <div
        className="flex items-center gap-0.5 rounded-lg border border-border bg-background/95 p-0.5 shadow-md backdrop-blur-sm"
        role="group"
        aria-label="Map options"
      >
        <Button
          type="button"
          size="icon-sm"
          variant={headingUp ? 'secondary' : 'ghost'}
          className="size-8"
          aria-pressed={headingUp}
          aria-label={
            headingUp
              ? 'Map aligned to travel direction'
              : 'Rotate map to travel direction'
          }
          disabled={!canUseHeading}
          onClick={onHeadingToggle}
        >
          <Navigation2
            className={cn('size-4', headingUp && 'fill-current')}
            aria-hidden
          />
        </Button>
        <Button
          type="button"
          size="icon-sm"
          variant={showCoverage ? 'secondary' : 'ghost'}
          className="size-8"
          aria-pressed={showCoverage}
          aria-label={showCoverage ? 'Hide coverage grid' : 'Show coverage grid'}
          onClick={onCoverageToggle}
        >
          <LayoutGrid className="size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
