'use client'

import type { RouteCandidate } from '@/lib/types'
import {
  adjustedDuration,
  fmtBiggestHill,
  fmtDistance,
  fmtDuration,
  fmtDurationDelta,
  fmtElevationRange,
} from '@/lib/scenic'

type Props = {
  route: RouteCandidate
  reference: RouteCandidate
  userSpeedKmh: number
}

export function RoutePreviewTooltip({
  route,
  reference,
  userSpeedKmh,
}: Props) {
  const routeSec = adjustedDuration(route, userSpeedKmh)
  const referenceSec = adjustedDuration(reference, userSpeedKmh)
  const deltaSec = routeSec - referenceSec
  const isReference = route.id === reference.id

  return (
    <div className="min-w-[10rem] space-y-1.5 text-xs leading-snug">
      <div className="font-semibold text-foreground">
        {isReference ? (
          'Selected route'
        ) : (
          <>
            <span className="text-time">{fmtDurationDelta(deltaSec)}</span>
            <span className="ml-1 font-medium text-muted-foreground">
              vs selected
            </span>
          </>
        )}
      </div>
      <div className="tabular-nums text-muted-foreground">
        {fmtDuration(routeSec)} total · {fmtDistance(route.distance)}
        {route.elevation ? (
          <>
            {' · '}
            {fmtElevationRange(route.elevation)}
            {' · '}
            {fmtBiggestHill(route.elevation)}
          </>
        ) : null}
      </div>
      <div className="flex gap-2 text-muted-foreground">
        <span>Green {Math.round(route.greenness * 100)}%</span>
        <span>Curves {Math.round(route.curviness * 100)}%</span>
        <span>Views {Math.round(route.viewpoints * 100)}%</span>
      </div>
      <p className="text-[10px] text-muted-foreground/80">Click to select this route</p>
    </div>
  )
}
