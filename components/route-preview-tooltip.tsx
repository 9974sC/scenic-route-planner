'use client'

import type { RouteCandidate } from '@/lib/types'
import {
  adjustedDuration,
  deltaTone,
  deltaToneClass,
  fmtBiggestHill,
  fmtDistance,
  fmtDistanceDelta,
  fmtDuration,
  fmtDurationDelta,
  fmtElevationRange,
} from '@/lib/scenic'
import { cn } from '@/lib/utils'

type Props = {
  route: RouteCandidate
  reference: RouteCandidate
  userSpeedKmh: number
  showSelectHint?: boolean
}

function DeltaLine({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'more' | 'less' | 'same'
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-semibold tabular-nums', deltaToneClass(tone))}>
        {value}
      </span>
    </div>
  )
}

export function RoutePreviewTooltip({
  route,
  reference,
  userSpeedKmh,
  showSelectHint = true,
}: Props) {
  const routeSec = adjustedDuration(route, userSpeedKmh)
  const referenceSec = adjustedDuration(reference, userSpeedKmh)
  const deltaSec = routeSec - referenceSec
  const deltaM = route.distance - reference.distance
  const isReference = route.id === reference.id

  const timeTone = deltaTone(deltaSec, 30)
  const distTone = deltaTone(deltaM, 50)

  return (
    <div className="min-w-[11rem] space-y-2 text-xs leading-snug">
      {isReference ? (
        <div className="font-semibold text-foreground">Selected route</div>
      ) : (
        <div className="space-y-1 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            vs selected
          </p>
          <DeltaLine
            label="Time"
            value={fmtDurationDelta(deltaSec)}
            tone={timeTone}
          />
          <DeltaLine
            label="Distance"
            value={fmtDistanceDelta(deltaM)}
            tone={distTone}
          />
        </div>
      )}
      <div className="tabular-nums text-muted-foreground">
        {fmtDuration(routeSec)} · {fmtDistance(route.distance)}
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
      {showSelectHint ? (
        <p className="text-[10px] text-muted-foreground/80">Click to select this route</p>
      ) : null}
    </div>
  )
}
