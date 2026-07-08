'use client'

import type { RouteCandidate } from '@/lib/types'
import {
  fmtBiggestHill,
  fmtDistance,
  fmtDuration,
  fmtElevationRange,
} from '@/lib/scenic'

type Props = {
  route: RouteCandidate
  direct: RouteCandidate
}

export function RoutePreviewTooltip({ route, direct }: Props) {
  const extraMin = Math.round((route.duration - direct.duration) / 60)
  const isDirect = route.id === direct.id

  return (
    <div className="min-w-[10rem] space-y-1.5 text-xs leading-snug">
      <div className="font-semibold text-foreground">
        {fmtDuration(route.duration)}
        {!isDirect && (
          <span className="ml-1.5 font-medium text-time">
            {extraMin <= 0 ? '· same time' : `· +${extraMin} min`}
          </span>
        )}
      </div>
      <div className="tabular-nums text-muted-foreground">
        {fmtDistance(route.distance)}
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
