'use client'

import { Button } from '@/components/ui/button'
import { MapPin, MapPinOff, X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  /** Search query that returned no results. */
  query?: string
  /** Override the default title. */
  title?: string
  /** Override the default body copy. */
  message?: string
  variant?: 'search' | 'geolocation'
}

export function LocationNotFoundDialog({
  open,
  onClose,
  query,
  title,
  message,
  variant = 'search',
}: Props) {
  if (!open) return null

  const heading =
    title ??
    (variant === 'geolocation' ? 'Location unavailable' : 'No location found')
  const body =
    message ??
    (variant === 'geolocation'
      ? 'Could not access your location. Allow location access in your browser settings, then try again.'
      : query
        ? `We couldn't find "${query}" in Mazowieckie. Try a street or landmark, enter coordinates like 52.23, 21.01, or pick a point on the map.`
        : 'Try a street or landmark, enter coordinates like 52.23, 21.01, or pick a point on the map.')

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-not-found-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MapPinOff className="size-5" aria-hidden />
            </span>
            <h2
              id="location-not-found-title"
              className="text-base font-semibold text-foreground"
            >
              {heading}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{body}</p>

        {variant === 'search' ? (
          <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>Use the map pin button to click a point on the map.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 font-mono text-xs text-foreground">52.23, 21.01</span>
              <span>Paste coordinates directly in the search field.</span>
            </li>
          </ul>
        ) : (
          <ul className="mt-4 flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>Check the location icon in your browser&apos;s address bar.</span>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span>Pick a start or end point on the map instead.</span>
            </li>
          </ul>
        )}

        <Button type="button" className="mt-5 w-full" onClick={onClose}>
          Got it
        </Button>
      </div>
    </div>
  )
}
