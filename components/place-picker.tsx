'use client'

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Loader2, MapPin, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LocationNotFoundDialog } from '@/components/location-not-found-dialog'
import type { RouteEndpoint } from '@/lib/places'
import type { LatLng } from '@/lib/types'
import {
  endpointsEqual,
  filterPresets,
  isBlankEndpoint,
  isLocationEndpoint,
  locationEndpoint,
  parseCoordinateQuery,
} from '@/lib/places'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: RouteEndpoint
  onChange: (endpoint: RouteEndpoint) => void
  dotClass: string
  menuContainer?: HTMLElement | null
  mapPickActive?: boolean
  onMapPickRequest?: () => void
  /** When set, show "Your location" as the first picker option */
  userPosition?: LatLng | null
  /** Label left of the field instead of above (saves vertical space). */
  inlineLabel?: boolean
}

function usePopupStyle(
  anchorRef: React.RefObject<HTMLButtonElement | null>,
  open: boolean,
) {
  const [style, setStyle] = useState<React.CSSProperties>({})

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return

    const update = () => {
      const rect = anchorRef.current!.getBoundingClientRect()
      setStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 60,
      })
    }

    update()
    window.addEventListener('scroll', update, true)
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update, true)
      window.removeEventListener('resize', update)
    }
  }, [anchorRef, open])

  return style
}

function ListOption({
  item,
  selected,
  onSelect,
}: {
  item: RouteEndpoint
  selected: boolean
  onSelect: (item: RouteEndpoint) => void
}) {
  return (
    <li role="presentation">
      <button
        type="button"
        role="option"
        aria-selected={selected}
        onClick={() => onSelect(item)}
        className={cn(
          'flex min-h-9 w-full items-center gap-2 rounded-md px-2 py-1 text-left outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground',
          selected && 'bg-accent/60',
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {item.name}
          </span>
          <span className="block truncate text-[11px] text-muted-foreground/80">
            {item.hint}
          </span>
        </span>
        {item.custom && !isLocationEndpoint(item) ? (
          <MapPin
            className="size-3.5 shrink-0 text-muted-foreground/70"
            aria-hidden
          />
        ) : null}
        {isLocationEndpoint(item) ? (
          <Navigation
            className="size-3.5 shrink-0 text-sky-600 dark:text-sky-300"
            aria-hidden
          />
        ) : null}
      </button>
    </li>
  )
}

export function PlacePicker({
  label,
  value,
  onChange,
  dotClass,
  menuContainer,
  mapPickActive = false,
  onMapPickRequest,
  userPosition = null,
  inlineLabel = false,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [remote, setRemote] = useState<RouteEndpoint[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [locationNotFoundOpen, setLocationNotFoundOpen] = useState(false)
  const [locationNotFoundQuery, setLocationNotFoundQuery] = useState('')
  const [locationNotFoundTitle, setLocationNotFoundTitle] = useState<string>()
  const [locationNotFoundMessage, setLocationNotFoundMessage] = useState<string>()
  const lastNotFoundKeyRef = useRef<string | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const triggerId = `${listId}-trigger`
  const popupStyle = usePopupStyle(triggerRef, open)

  const presets = useMemo(() => filterPresets(query), [query])

  const locationOption = useMemo(
    () => (userPosition ? locationEndpoint(userPosition) : null),
    [userPosition],
  )

  const items = useMemo(() => {
    const seen = new Set<string>()
    const merged = [...presets, ...remote].filter((item) => {
      if (seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
    if (
      locationOption &&
      !merged.some((item) => isLocationEndpoint(item) || item.id === locationOption.id)
    ) {
      return [locationOption, ...merged]
    }
    return merged
  }, [presets, remote, locationOption])

  const selectItem = useCallback(
    (item: RouteEndpoint) => {
      onChange(item)
      setOpen(false)
    },
    [onChange],
  )

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (rootRef.current?.contains(target)) return
      const portal = document.getElementById(`place-picker-${listId}`)
      if (portal?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [listId, open])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setRemote([])
    setSearchError(null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (!open) {
      lastNotFoundKeyRef.current = null
      setLocationNotFoundOpen(false)
    }
  }, [open])

  const closeLocationNotFound = useCallback(() => {
    setLocationNotFoundOpen(false)
    setSearchError(null)
  }, [])

  useEffect(() => {
    if (!open) return

    const q = query.trim()
    if (searchError) {
      const key = `err:${q}:${searchError}`
      if (lastNotFoundKeyRef.current === key) return
      lastNotFoundKeyRef.current = key
      setLocationNotFoundQuery(q)
      setLocationNotFoundTitle('Search failed')
      setLocationNotFoundMessage(searchError)
      setLocationNotFoundOpen(true)
      return
    }

    if (searching || q.length < 2) return

    const coord = parseCoordinateQuery(query)
    if (items.length > 0 || coord) {
      lastNotFoundKeyRef.current = null
      return
    }

    const key = `empty:${q}`
    if (lastNotFoundKeyRef.current === key) return
    lastNotFoundKeyRef.current = key
    setLocationNotFoundQuery(q)
    setLocationNotFoundTitle(undefined)
    setLocationNotFoundMessage(undefined)
    setLocationNotFoundOpen(true)
  }, [open, searching, query, items.length, searchError])

  useEffect(() => {
    if (!open) return
    const q = query.trim()
    if (q.length < 2) {
      setRemote([])
      setSearchError(null)
      setSearching(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setSearching(true)
      setSearchError(null)
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`)
        const data = (await res.json()) as {
          results?: RouteEndpoint[]
          error?: string
        }
        if (cancelled) return
        if (!res.ok) throw new Error(data.error ?? 'Search failed')
        setRemote(data.results ?? [])
      } catch (err) {
        if (!cancelled) {
          setRemote([])
          setSearchError(err instanceof Error ? err.message : 'Search failed')
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 320)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [open, query])

  const coordCandidate = parseCoordinateQuery(query)
  const popupRoot =
    menuContainer ?? (typeof document === 'undefined' ? null : document.body)
  const isBlank = isBlankEndpoint(value)

  const popup =
    open && popupRoot
      ? createPortal(
          <div
            id={`place-picker-${listId}`}
            style={popupStyle}
            className="rounded-lg border border-border bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10"
          >
            <div className="border-b border-border p-2">
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault()
                    setOpen(false)
                    triggerRef.current?.focus()
                  }
                  if (e.key === 'Enter' && coordCandidate) {
                    e.preventDefault()
                    selectItem(coordCandidate)
                  }
                }}
                placeholder="Search Warsaw or enter lat, lng"
                aria-controls={listId}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>

            <ul
              id={listId}
              role="listbox"
              aria-label={`${label} options`}
              className="max-h-48 overflow-y-auto p-1"
            >
              {items.map((item) => (
                <ListOption
                  key={item.id}
                  item={item}
                  selected={endpointsEqual(item, value)}
                  onSelect={selectItem}
                />
              ))}

              {coordCandidate &&
              !items.some((item) => endpointsEqual(item, coordCandidate)) ? (
                <ListOption
                  item={{ ...coordCandidate, name: 'Use coordinates' }}
                  selected={false}
                  onSelect={selectItem}
                />
              ) : null}

              {searching ? (
                <li className="flex min-h-9 items-center gap-2 px-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Searching…
                </li>
              ) : null}
            </ul>
          </div>,
          popupRoot,
        )
      : null

  return (
    <div
      ref={rootRef}
      className={cn(
        inlineLabel ? 'flex items-center gap-2' : 'flex flex-col gap-1',
      )}
    >
      <label
        htmlFor={triggerId}
        className={cn(
          'text-xs font-medium text-muted-foreground',
          inlineLabel && 'w-9 shrink-0 leading-none',
        )}
      >
        {label}
      </label>

      <div className="flex min-w-0 flex-1 items-stretch gap-1.5">
        <button
          id={triggerId}
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          onClick={() => setOpen((prev) => !prev)}
          title={inlineLabel ? `${value.name} — ${value.hint}` : undefined}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-input bg-background px-2 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
            inlineLabel ? 'h-9' : 'h-10',
            mapPickActive && 'border-primary/40 bg-primary/5',
          )}
        >
          <span
            className={cn('size-2 shrink-0 rounded-full', dotClass)}
            aria-hidden
          />
          <span className="min-w-0 flex-1 leading-none">
            <span
              className={cn(
                'block truncate text-sm font-semibold',
                isBlank ? 'text-muted-foreground' : 'text-foreground',
              )}
            >
              {value.name}
            </span>
            {!inlineLabel ? (
              <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/75">
                {value.hint}
              </span>
            ) : (
              <span className="sr-only">{value.hint}</span>
            )}
          </span>
          <ChevronDown
            className={cn(
              'size-4 shrink-0 text-muted-foreground/60 transition-transform',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        {onMapPickRequest ? (
          <Button
            type="button"
            variant={mapPickActive ? 'default' : 'outline'}
            size="icon"
            className={cn('shrink-0', inlineLabel ? 'size-9' : 'size-10')}
            aria-pressed={mapPickActive}
            aria-label={
              mapPickActive ? 'Click the map to set point' : 'Pick on map'
            }
            title={mapPickActive ? 'Click the map to set point' : 'Pick on map'}
            onClick={onMapPickRequest}
          >
            <MapPin className="size-4" aria-hidden />
          </Button>
        ) : null}
      </div>

      {popup}

      <LocationNotFoundDialog
        open={locationNotFoundOpen}
        onClose={closeLocationNotFound}
        query={locationNotFoundQuery}
        title={locationNotFoundTitle}
        message={locationNotFoundMessage}
      />
    </div>
  )
}
