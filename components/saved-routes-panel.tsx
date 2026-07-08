'use client'

import { useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { fmtDistance, fmtDuration } from '@/lib/scenic'
import type { SavedRouteSummary } from '@/lib/saved-routes'
import { Button } from '@/components/ui/button'
import { Bookmark, ChevronDown, Route as RouteIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  onLoadRoute?: (route: SavedRouteSummary) => void
}

export function SavedRoutesPanel({ onLoadRoute }: Props) {
  const { user, savedRoutes } = useAuth()
  const [expanded, setExpanded] = useState(false)

  if (!user || !savedRoutes.length) return null

  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
      >
        <Bookmark className="size-4 shrink-0 text-primary" aria-hidden />
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
          Saved routes
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {savedRoutes.length}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto border-t border-border px-3 py-3">
          {savedRoutes.map((route) => (
            <li
              key={route.id}
              className="flex items-start gap-2 rounded-lg border border-border/70 bg-muted/20 p-2.5"
            >
              <RouteIcon
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {route.label}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {route.startName} → {route.endName}
                  {route.isRoundTrip ? ' (loop)' : ''}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {fmtDistance(route.distanceM)} · {fmtDuration(route.durationS)}
                </p>
              </div>
              {onLoadRoute ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => onLoadRoute(route)}
                >
                  Load
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
