'use client'

import type { ScenicWeights } from '@/lib/types'
import type { LatLng } from '@/lib/types'
import type { RouteEndpoint } from '@/lib/places'
import { PlacePicker } from '@/components/place-picker'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { ArrowLeftRight, Leaf, Waves, Mountain, Clock } from 'lucide-react'

type Props = {
  start: RouteEndpoint
  end: RouteEndpoint
  weights: ScenicWeights
  budget: number
  onStart: (endpoint: RouteEndpoint) => void
  onEnd: (endpoint: RouteEndpoint) => void
  onWeights: (w: ScenicWeights) => void
  onBudget: (n: number) => void
  onSwap: () => void
  menuContainer?: HTMLElement | null
  mapPickTarget?: 'start' | 'end' | null
  onMapPickRequest?: (target: 'start' | 'end') => void
  userPosition?: LatLng | null
}

function WeightSlider({
  icon,
  label,
  value,
  onChange,
}: {
  icon: React.ReactNode
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          {icon}
          {label}
        </div>
        <span className="text-xs tabular-nums text-muted-foreground/80">
          {Math.round(value * 100)}%
        </span>
      </div>
      <Slider
        value={[value * 100]}
        min={0}
        max={100}
        step={5}
        onValueChange={(v) => onChange((Array.isArray(v) ? v[0] : v) / 100)}
      />
    </div>
  )
}

export function ScenicControls({
  start,
  end,
  weights,
  budget,
  onStart,
  onEnd,
  onWeights,
  onBudget,
  onSwap,
  menuContainer,
  mapPickTarget,
  onMapPickRequest,
  userPosition = null,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="rounded-xl border border-border bg-card p-2 shadow-sm">
        <PlacePicker
          label="From"
          value={start}
          onChange={onStart}
          dotClass="bg-primary"
          menuContainer={menuContainer}
          mapPickActive={mapPickTarget === 'start'}
          onMapPickRequest={
            onMapPickRequest ? () => onMapPickRequest('start') : undefined
          }
          userPosition={userPosition}
        />

        <div className="relative z-10 flex items-center py-0.5">
          <div className="h-px flex-1 bg-border" aria-hidden />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mx-1.5 size-7 shrink-0 rounded-full bg-background shadow-sm transition-transform hover:bg-muted active:scale-95"
            onClick={onSwap}
            aria-label="Swap start and destination"
          >
            <ArrowLeftRight className="size-3.5" aria-hidden />
          </Button>
          <div className="h-px flex-1 bg-border" aria-hidden />
        </div>

        <div className="-mt-1.5">
          <PlacePicker
            label="To"
            value={end}
            onChange={onEnd}
            dotClass="bg-accent"
            menuContainer={menuContainer}
            mapPickActive={mapPickTarget === 'end'}
            onMapPickRequest={
              onMapPickRequest ? () => onMapPickRequest('end') : undefined
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-3">
        <div className="text-xs font-semibold tracking-wide text-muted-foreground/80 uppercase">
          What makes a good drive today?
        </div>
        <WeightSlider
          icon={<Leaf className="size-3.5 text-primary" aria-hidden />}
          label="Greenery"
          value={weights.greenness}
          onChange={(v) => onWeights({ ...weights, greenness: v })}
        />
        <WeightSlider
          icon={<Waves className="size-3.5 text-primary" aria-hidden />}
          label="Curves"
          value={weights.curviness}
          onChange={(v) => onWeights({ ...weights, curviness: v })}
        />
        <WeightSlider
          icon={<Mountain className="size-3.5 text-primary" aria-hidden />}
          label="Viewpoints"
          value={weights.viewpoints}
          onChange={(v) => onWeights({ ...weights, viewpoints: v })}
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-time/15"
              aria-hidden
            >
              <Clock className="size-4 text-time" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Time to spare</h3>
              <p className="text-[11px] leading-snug text-muted-foreground/80">
                How much longer a scenic route can take
              </p>
            </div>
          </div>

          <div className="shrink-0 text-right leading-none">
            {budget === 0 ? (
              <>
                <span className="font-display text-xl font-semibold text-foreground">
                  Direct
                </span>
                <p className="mt-1 text-[11px] text-muted-foreground/75">Fastest route</p>
              </>
            ) : (
              <>
                <span className="font-display text-2xl font-semibold tabular-nums text-time">
                  +{budget}
                </span>
                <span className="ml-0.5 text-xs text-time/80">min</span>
              </>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <Slider
            className="[&_[data-slot=slider-range]]:bg-time"
            value={[budget]}
            min={0}
            max={45}
            step={5}
            onValueChange={(v) => onBudget(Array.isArray(v) ? v[0] : v)}
            aria-label="Time to spare in minutes"
          />
          <div className="flex items-center justify-between text-[11px] text-muted-foreground/70">
            <span>Fastest way</span>
            <span>Up to +45 min</span>
          </div>
        </div>
      </div>
    </div>
  )
}
