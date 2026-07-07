'use client'

import type { RouteCandidate } from '@/lib/types'
import {
  fmtBiggestHill,
  fmtDistance,
  fmtDuration,
  fmtElevationRange,
} from '@/lib/scenic'
import {
  Clock,
  Route as RouteIcon,
  Leaf,
  Waves,
  Mountain,
  TrendingUp,
} from 'lucide-react'

type Props = {
  chosen: RouteCandidate
  direct: RouteCandidate
}

function Meter({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
    </div>
  )
}

export function RouteSummary({ chosen, direct }: Props) {
  const extraSec = chosen.duration - direct.duration
  const extraMin = Math.round(extraSec / 60)
  const isDirect = chosen.id === direct.id

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Clock className="size-5 shrink-0 text-time" aria-hidden />
          <span className="font-display text-3xl font-semibold tabular-nums text-time">
            {fmtDuration(chosen.duration)}
          </span>
          {isDirect ? (
            <span className="text-sm font-medium text-muted-foreground">
              Fastest way
            </span>
          ) : (
            <span className="rounded-full bg-time/15 px-2.5 py-0.5 text-sm font-medium text-time">
              {extraMin <= 0 ? 'about the same' : `+${extraMin} min`} of exploring
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <RouteIcon className="size-4 shrink-0" aria-hidden />
            {fmtDistance(chosen.distance)}
          </span>
          {chosen.elevation && (
            <>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Mountain className="size-4 shrink-0" aria-hidden />
                {fmtElevationRange(chosen.elevation)}
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <TrendingUp className="size-4 shrink-0" aria-hidden />
                {fmtBiggestHill(chosen.elevation)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Meter
          icon={<Leaf className="size-3.5" aria-hidden />}
          label="Green"
          value={chosen.greenness}
        />
        <Meter
          icon={<Waves className="size-3.5" aria-hidden />}
          label="Curves"
          value={chosen.curviness}
        />
        <Meter
          icon={<Mountain className="size-3.5" aria-hidden />}
          label="Views"
          value={chosen.viewpoints}
        />
      </div>
    </div>
  )
}
