'use client'

import type { LeaderboardEntry } from '@/lib/leaderboard-types'
import { fmtDistance } from '@/lib/scenic'
import { fmtCoveragePct } from '@/lib/trip-stats'
import { Button } from '@/components/ui/button'
import { Loader2, Trophy, X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  entries: LeaderboardEntry[]
  loading: boolean
  error: string | null
  currentUserId?: string
}

export function LeaderboardDialog({
  open,
  onClose,
  entries,
  loading,
  error,
  currentUserId,
}: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close leaderboard"
        onClick={onClose}
      />
      <div className="relative flex max-h-[min(85dvh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-time" aria-hidden />
            <h2 id="leaderboard-title" className="text-sm font-semibold text-foreground">
              Leaderboard
            </h2>
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

        <div className="overflow-y-auto px-4 py-3">
          <p className="mb-3 text-xs text-muted-foreground">
            The dashed coverage grid appears on the map. Top riders&apos; tiles
            are filled with their map colors.
          </p>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading ranks…
            </div>
          ) : error ? (
            <p className="py-4 text-sm text-destructive">{error}</p>
          ) : entries.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No coverage yet — be the first to light up the grid.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((entry) => (
                <li
                  key={entry.userId}
                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                    entry.userId === currentUserId
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-border/70 bg-muted/25'
                  }`}
                >
                  <span
                    className="mt-0.5 size-3 shrink-0 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: entry.colorHex }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-semibold tabular-nums text-foreground">
                        #{entry.rank}
                      </span>
                      <span className="font-medium text-foreground">
                        {entry.displayId}
                      </span>
                    </div>
                    <div className="mt-0.5 tabular-nums text-xs text-muted-foreground">
                      {fmtCoveragePct(entry.coveragePct)} ·{' '}
                      {entry.tileCount.toLocaleString()} tiles · {entry.tripCount}{' '}
                      rides · {fmtDistance(entry.totalDistanceM)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
