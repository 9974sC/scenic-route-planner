'use client'

import { useEffect, useId } from 'react'
import type { LatLng } from '@/lib/types'
import type { DirectionStep } from '@/lib/directions'
import { formatDistanceM } from '@/lib/directions'
import { TurnIcon } from '@/components/turn-icon'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ChevronRight, LocateFixed, X } from 'lucide-react'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  steps: DirectionStep[]
  startLabel: string
  endLabel: string
  activeStepIndex: number
  currentPosition: LatLng | null
  currentPositionLabel: string
  distanceToNextM: number | null
  hasRoute: boolean
}

export function DirectionsPanel({
  open,
  onOpenChange,
  steps,
  startLabel,
  endLabel,
  activeStepIndex,
  currentPosition,
  currentPositionLabel,
  distanceToNextM,
  hasRoute,
}: Props) {
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  if (!hasRoute) return null

  if (!open) return null

  return (
    <aside
      id={panelId}
      role="region"
      aria-label="Turn-by-turn directions"
      className="absolute inset-y-0 right-0 z-[1000] flex w-full max-w-[min(100%,20rem)] flex-col border-l border-border bg-background/95 shadow-xl backdrop-blur-sm"
    >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Directions</h2>
              <p className="truncate text-xs text-muted-foreground">
                {startLabel} → {endLabel}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              aria-label="Close directions"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </header>

          <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-2">
            <div className="flex items-start gap-2">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <LocateFixed className="size-4 text-primary" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                  Current position
                </p>
                <p className="truncate text-sm font-semibold text-foreground">
                  {currentPositionLabel}
                </p>
                {currentPosition ? (
                  <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
                  </p>
                ) : null}
                {distanceToNextM !== null && steps[activeStepIndex] ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatDistanceM(distanceToNextM)}
                    </span>{' '}
                    to {steps[activeStepIndex].text.toLowerCase()}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <ol className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            {steps.map((step, index) => {
              const active = index === activeStepIndex
              const done = index < activeStepIndex
              return (
                <li key={step.id} className="list-none">
                  <div
                    className={cn(
                      'flex items-start gap-2 rounded-lg px-2 py-2',
                      active && 'bg-primary/10 ring-1 ring-primary/20',
                      done && 'opacity-55',
                    )}
                    aria-current={active ? 'step' : undefined}
                  >
                    <div
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-lg',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <TurnIcon
                        sign={step.sign}
                        size={15}
                        className={active ? 'text-primary-foreground' : undefined}
                      />
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p
                        className={cn(
                          'text-sm leading-snug',
                          active
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground/90',
                        )}
                      >
                        {step.text}
                      </p>
                      <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                        {formatDistanceM(step.distanceM)}
                      </p>
                    </div>
                    {active ? (
                      <ChevronRight
                        className="mt-1 size-4 shrink-0 text-primary"
                        aria-hidden
                      />
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
    </aside>
  )
}
