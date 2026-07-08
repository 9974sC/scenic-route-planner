'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { fmtDistance, fmtDuration } from '@/lib/scenic'
import {
  aggregateTripStats,
  fmtCoveragePct,
  fmtSpeedKmh,
  tripCoveragePct,
  type TripWindowDays,
} from '@/lib/trip-stats'
import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

function StatBlock({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/80">
        {label}
      </div>
      <div className="truncate text-sm font-semibold tabular-nums text-foreground">
        {value}
      </div>
    </div>
  )
}

export function TripHistoryPanel() {
  const { user, trips } = useAuth()
  const [windowDays, setWindowDays] = useState<TripWindowDays>(7)

  const periodStats = useMemo(
    () => aggregateTripStats(trips, windowDays),
    [trips, windowDays],
  )

  if (!user || !trips.length) return null

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <MapPin className="size-4 shrink-0 text-primary" aria-hidden />
          <span className="text-sm font-semibold text-foreground">Past drives</span>
        </div>
        <div
          className="flex shrink-0 gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5"
          role="group"
          aria-label="Stats window"
        >
          {([3, 7] as const).map((days) => (
            <Button
              key={days}
              type="button"
              size="xs"
              variant={windowDays === days ? 'default' : 'ghost'}
              className="h-6 px-2 text-[10px]"
              onClick={() => setWindowDays(days)}
              aria-pressed={windowDays === days}
            >
              {days}d
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg border border-border/60 bg-muted/25 p-2.5 sm:grid-cols-4">
        <StatBlock label="Distance" value={fmtDistance(periodStats.distanceM)} />
        <StatBlock label="Time" value={fmtDuration(periodStats.durationS)} />
        <StatBlock
          label="Avg speed"
          value={
            periodStats.avgSpeedKmh != null
              ? fmtSpeedKmh(periodStats.avgSpeedKmh)
              : '—'
          }
        />
        <StatBlock
          label={`Avg coverage (${windowDays}d)`}
          value={fmtCoveragePct(periodStats.avgCoveragePct)}
        />
      </div>

      <ul className="flex max-h-44 flex-col gap-2 overflow-y-auto">
        {trips.slice(0, 8).map((trip) => {
          const coveragePct = tripCoveragePct(trip.tilesAdded)
          return (
            <li
              key={trip.id}
              className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 font-medium text-foreground">
                  {trip.startName} → {trip.endName}
                </p>
                {coveragePct > 0 ? (
                  <span className="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-primary">
                    +{fmtCoveragePct(coveragePct)}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 text-muted-foreground">
                {fmtDistance(trip.distanceM)} · {fmtDuration(trip.durationS)}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
