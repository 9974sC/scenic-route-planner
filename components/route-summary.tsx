'use client'

import type { RouteCandidate } from '@/lib/types'
import type { ReturnPathPreference } from '@/lib/scenic'
import {
  adjustedDuration,
  fmtBiggestHill,
  fmtDistance,
  fmtDuration,
  fmtElevationRange,
} from '@/lib/scenic'
import { pathOverlapRatio } from '@/lib/route-overlap'
import { Button } from '@/components/ui/button'
import {
  Clock,
  Route as RouteIcon,
  Leaf,
  Waves,
  Mountain,
  TrendingUp,
  RotateCcw,
  Loader2,
  Bookmark,
} from 'lucide-react'

type Props = {
  chosen: RouteCandidate
  direct: RouteCandidate
  returnLeg?: RouteCandidate | null
  returnPreference?: ReturnPathPreference
  pathPreference?: ReturnPathPreference
  onFindReturn?: () => void
  onClearReturn?: () => void
  onChooseShortestReturn?: () => void
  onChooseLongestReturn?: () => void
  onSaveRoute?: () => void
  returnLoading?: boolean
  saveRouteLoading?: boolean
  saveRouteMessage?: string | null
  loopDisabled?: boolean
  userSpeedKmh?: number
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

export function RouteSummary({
  chosen,
  direct,
  returnLeg = null,
  returnPreference = 'scenic',
  pathPreference = 'scenic',
  onFindReturn,
  onClearReturn,
  onChooseShortestReturn,
  onChooseLongestReturn,
  onSaveRoute,
  returnLoading = false,
  saveRouteLoading = false,
  saveRouteMessage = null,
  loopDisabled = false,
  userSpeedKmh = 15,
}: Props) {
  const chosenDuration = adjustedDuration(chosen, userSpeedKmh)
  const directDuration = adjustedDuration(direct, userSpeedKmh)
  const extraSec = chosenDuration - directDuration
  const extraMin = Math.round(extraSec / 60)
  const isDirect = chosen.id === direct.id
  const overlapPct = returnLeg
    ? Math.round(pathOverlapRatio(chosen.coords, returnLeg.coords) * 100)
    : null
  const loopDistance = returnLeg ? chosen.distance + returnLeg.distance : null
  const loopDuration = returnLeg
    ? chosenDuration + adjustedDuration(returnLeg, userSpeedKmh)
    : null
  const activePreference = returnLeg ? returnPreference : pathPreference

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <Clock className="size-5 shrink-0 text-time" aria-hidden />
          <span className="font-display text-3xl font-semibold tabular-nums text-time">
            {fmtDuration(returnLeg && loopDuration ? loopDuration : chosenDuration)}
          </span>
          {returnLeg ? (
            <span className="rounded-full bg-green-600/15 px-2.5 py-0.5 text-sm font-medium text-green-800 dark:text-green-300">
              Round trip
            </span>
          ) : isDirect ? (
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
            {fmtDistance(returnLeg && loopDistance ? loopDistance : chosen.distance)}
          </span>
          {returnLeg && overlapPct !== null ? (
            <span className="text-xs text-muted-foreground/80">
              {overlapPct <= 8
                ? 'Clean loop — different roads back'
                : overlapPct <= 25
                  ? 'Mostly separate return route'
                  : `${overlapPct}% shared with outbound`}
            </span>
          ) : null}
          {!returnLeg && chosen.elevation && (
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

      {onChooseShortestReturn && onChooseLongestReturn ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={activePreference === 'shortest' ? 'secondary' : 'outline'}
            onClick={onChooseShortestReturn}
          >
            Choose shortest path
          </Button>
          <Button
            type="button"
            size="sm"
            variant={activePreference === 'longest' ? 'secondary' : 'outline'}
            onClick={onChooseLongestReturn}
          >
            Choose longest path
          </Button>
        </div>
      ) : null}

      {onFindReturn ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={returnLeg ? 'secondary' : 'outline'}
              disabled={returnLoading || loopDisabled}
              onClick={onFindReturn}
            >
              {returnLoading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="size-4" aria-hidden />
              )}
              {returnLoading
                ? 'Finding return…'
                : returnLeg
                  ? 'Try another return'
                  : 'Find loop return'}
            </Button>
            {returnLeg && onClearReturn ? (
              <Button type="button" size="sm" variant="ghost" onClick={onClearReturn}>
                Outbound only
              </Button>
            ) : null}
          </div>
          {loopDisabled ? (
            <p className="text-[11px] text-muted-foreground">
              Loop return is unavailable when start and destination are the same.
            </p>
          ) : null}
        </div>
      ) : null}

      {onSaveRoute ? (
        <div className="flex flex-col gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={saveRouteLoading}
            onClick={onSaveRoute}
          >
            {saveRouteLoading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Bookmark className="size-4" aria-hidden />
            )}
            Save route
          </Button>
          {saveRouteMessage ? (
            <p className="text-xs text-primary" role="status">
              {saveRouteMessage}
            </p>
          ) : null}
        </div>
      ) : null}

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
