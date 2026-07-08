import { Slider as SliderPrimitive } from '@base-ui/react/slider'

import { cn } from '@/lib/utils'

export type SliderMark = {
  value: number
  label?: string
}

/** Matches `thumbAlignment="edge"` with `size-3` (12px) thumbs. */
const THUMB_SIZE_PX = 12

function edgeAlignedLeft(value: number, min: number, max: number): string {
  const span = max - min
  if (span <= 0) return `${THUMB_SIZE_PX / 2}px`
  const ratio = (value - min) / span
  const half = THUMB_SIZE_PX / 2
  return `calc(${half}px + ${ratio} * (100% - ${THUMB_SIZE_PX}px))`
}

type SliderProps = SliderPrimitive.Root.Props & {
  marks?: SliderMark[]
  onMarkClick?: (value: number) => void
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  marks,
  onMarkClick,
  ...props
}: SliderProps) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]

  const activeValue = _values[0] ?? min

  return (
    <SliderPrimitive.Root
      className={cn('data-horizontal:w-full data-vertical:h-full', className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center py-1 select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-visible rounded-full bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-primary select-none data-horizontal:h-full data-vertical:w-full"
          />
          {marks?.map((mark) => {
            const active = activeValue === mark.value
            return (
              <button
                key={mark.value}
                type="button"
                aria-label={mark.label ?? String(mark.value)}
                className={cn(
                  'absolute top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-[transform,background-color,border-color] hover:scale-110',
                  'h-3.5 w-2.5',
                  active
                    ? 'scale-110 border-time bg-time shadow-sm'
                    : 'border-muted-foreground/35 bg-background hover:border-time/50 hover:bg-time/15',
                )}
                style={{ left: edgeAlignedLeft(mark.value, min, max) }}
                onClick={() => onMarkClick?.(mark.value)}
              />
            )
          })}
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            className="relative z-[2] block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
      {marks?.some((mark) => mark.label) ? (
        <div className="pointer-events-none relative mt-1.5 h-3.5 w-full">
          {marks.map((mark) =>
            mark.label ? (
              <span
                key={mark.value}
                className={cn(
                  'absolute -translate-x-1/2 text-[10px] tabular-nums',
                  activeValue === mark.value
                    ? 'font-medium text-time'
                    : 'text-muted-foreground/70',
                )}
                style={{ left: edgeAlignedLeft(mark.value, min, max) }}
              >
                {mark.label}
              </span>
            ) : null,
          )}
        </div>
      ) : null}
    </SliderPrimitive.Root>
  )
}

export { Slider }
