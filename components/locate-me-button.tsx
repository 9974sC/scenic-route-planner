'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Locate, LocateFixed } from 'lucide-react'

type Props = {
  active: boolean
  onLocate: () => void
  directionsPanelOpen?: boolean
}

export function LocateMeButton({
  active,
  onLocate,
  directionsPanelOpen = false,
}: Props) {
  const Icon = active ? LocateFixed : Locate

  return (
    <div
      className={cn(
        'absolute bottom-4 z-[1000] transition-[right]',
        directionsPanelOpen
          ? 'right-[calc(min(100%,20rem)+0.75rem)]'
          : 'right-4',
      )}
    >
      <Button
        type="button"
        size="icon"
        variant="secondary"
        className={cn(
          'size-11 rounded-full border border-border bg-background/95 shadow-md backdrop-blur-sm',
          active && 'border-primary bg-primary text-primary-foreground hover:bg-primary/90',
        )}
        aria-pressed={active}
        aria-label={
          active ? 'Following your location' : 'Show your location on the map'
        }
        onClick={onLocate}
      >
        <Icon className={cn('size-5', active && 'fill-current')} aria-hidden />
      </Button>
    </div>
  )
}
