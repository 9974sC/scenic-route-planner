'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Navigation } from 'lucide-react'

type Props = {
  directionsOpen: boolean
  onDirectionsToggle: () => void
  hasDirections: boolean
  /** When the directions drawer is open, keep controls visible beside it. */
  directionsPanelOpen?: boolean
}

export function MapToolbar({
  directionsOpen,
  onDirectionsToggle,
  hasDirections,
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
    </div>
  )
}
