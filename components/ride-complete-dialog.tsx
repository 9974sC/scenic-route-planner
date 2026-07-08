'use client'

import { APP_NAME } from '@/lib/brand'
import { Button } from '@/components/ui/button'
import { CheckCircle2, X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  completedAt: Date | null
  scorePct: number
  tilesAdded: number
  isRoundTrip?: boolean
  /** False for guests — tiles are not claimed until signed in. */
  tilesCounted?: boolean
}

function fmtCompletedTime(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function RideCompleteDialog({
  open,
  onClose,
  completedAt,
  scorePct,
  tilesAdded,
  isRoundTrip = false,
  tilesCounted = true,
}: Props) {
  if (!open || !completedAt) return null

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ride-complete-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close ride summary"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <CheckCircle2 className="size-5" aria-hidden />
            </span>
            <div>
              <h2
                id="ride-complete-title"
                className="text-base font-semibold text-foreground"
              >
                Path completed
              </h2>
              <p className="text-sm text-muted-foreground">
                {fmtCompletedTime(completedAt)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
              {APP_NAME} score
            </div>
            <div className="mt-0.5 font-display text-3xl font-semibold tabular-nums text-foreground">
              {scorePct}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
              New tiles
            </div>
            <div className="mt-0.5 font-display text-3xl font-semibold tabular-nums text-primary">
              {tilesCounted ? `+${tilesAdded}` : '—'}
            </div>
            {!tilesCounted ? (
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Sign in to claim tiles on the map.
              </p>
            ) : null}
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {tilesCounted
            ? isRoundTrip
              ? 'Round-trip route logged on your coverage map.'
              : 'Route logged on your coverage map.'
            : 'Ride scored locally. Sign in to save coverage and compete on the leaderboard.'}
        </p>

        <Button type="button" className="mt-4 w-full" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  )
}
