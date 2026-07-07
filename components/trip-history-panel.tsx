'use client'

import { useAuth } from '@/components/auth-provider'
import { fmtDistance, fmtDuration } from '@/lib/scenic'
import { MapPin } from 'lucide-react'

export function TripHistoryPanel() {
  const { user, trips } = useAuth()
  if (!user || !trips.length) return null

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <MapPin className="size-4 text-primary" aria-hidden />
        <span className="text-sm font-semibold text-foreground">Past drives</span>
      </div>
      <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto">
        {trips.slice(0, 8).map((trip) => (
          <li
            key={trip.id}
            className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs"
          >
            <p className="font-medium text-foreground">
              {trip.startName} → {trip.endName}
            </p>
            <p className="text-muted-foreground">
              {fmtDistance(trip.distanceM)} · {fmtDuration(trip.durationS)}
              {trip.tilesAdded.length > 0
                ? ` · +${trip.tilesAdded.length} tiles`
                : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
