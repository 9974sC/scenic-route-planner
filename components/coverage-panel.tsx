'use client'

import { totalTiles } from '@/lib/geo'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Map, Plus, RotateCcw, Trophy } from 'lucide-react'

type Props = {
  coverageCount: number
  showCoverage: boolean
  onToggle: (v: boolean) => void
  onAddRoute: () => void
  onReset: () => void
  justAdded: number | null
  signedIn?: boolean
  canRide?: boolean
  onOpenLeaderboard?: () => void
  leaderboardOpen?: boolean
}

export function CoveragePanel({
  coverageCount,
  showCoverage,
  onToggle,
  onAddRoute,
  onReset,
  justAdded,
  signedIn = false,
  canRide = true,
  onOpenLeaderboard,
  leaderboardOpen = false,
}: Props) {
  const total = totalTiles()
  const pct = total ? (coverageCount / total) * 100 : 0

  const pctLabel =
    pct === 0
      ? '0%'
      : pct < 0.01
        ? '<0.01%'
        : pct < 1
          ? `${pct.toFixed(2)}%`
          : `${pct.toFixed(1)}%`

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Map className="size-4 text-primary" aria-hidden />
          <span className="text-sm font-semibold text-foreground">
            Your coverage
          </span>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Show coverage
          <Switch checked={showCoverage} onCheckedChange={onToggle} />
        </label>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="font-display text-3xl font-semibold tabular-nums text-foreground">
            {pctLabel}
          </div>
          <div className="text-xs text-muted-foreground">
            {coverageCount.toLocaleString()} of {total.toLocaleString()} tiles
            lit
          </div>
        </div>
        {justAdded ? (
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
            +{justAdded} new tiles
          </span>
        ) : null}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            size="lg"
            className="h-12 flex-1 text-base font-semibold"
            disabled={!canRide}
            onClick={onAddRoute}
          >
            <Plus className="size-5" />
            Ride this route
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReset}
            aria-label="Reset coverage"
          >
            <RotateCcw className="size-4" />
          </Button>
        </div>
        {onOpenLeaderboard ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="w-full"
            onClick={onOpenLeaderboard}
          >
            <Trophy className="size-4" />
            Leaderboard
          </Button>
        ) : null}
      </div>
      <p className="text-pretty text-xs leading-relaxed text-muted-foreground">
        Every road you actually ride fills in the grid. Come back to chase the
        blank squares in your own neighborhood.
        {!signedIn ? (
          <>
            {' '}
            Sign in to save tiles and trips across devices.
          </>
        ) : null}
      </p>
    </div>
  )
}
