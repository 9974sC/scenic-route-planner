import { NextResponse } from 'next/server'
import { HTTP_USER_AGENT } from '@/lib/brand'
import type { RouteEndpoint } from '@/lib/places'
import { customEndpoint } from '@/lib/places'
import { MAZOWIECKIE_BBOX } from '@/lib/geo'

export const dynamic = 'force-dynamic'

type NominatimResult = {
  lat: string
  lon: string
  display_name: string
}

function shortLabel(displayName: string): { name: string; hint: string } {
  const parts = displayName.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length <= 1) {
    return { name: displayName, hint: 'Custom location' }
  }
  return {
    name: parts[0],
    hint: parts.slice(1, 3).join(', ') || 'Custom location',
  }
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')?.trim()
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] as RouteEndpoint[] })
  }

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '6')
  url.searchParams.set(
    'viewbox',
    `${MAZOWIECKIE_BBOX.west},${MAZOWIECKIE_BBOX.north},${MAZOWIECKIE_BBOX.east},${MAZOWIECKIE_BBOX.south}`,
  )
  url.searchParams.set('bounded', '1')
  url.searchParams.set('countrycodes', 'pl')

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': HTTP_USER_AGENT },
    cache: 'no-store',
  })

  if (!res.ok) {
    return NextResponse.json(
      { error: `Geocoding failed (${res.status})` },
      { status: 502 },
    )
  }

  const json = (await res.json()) as NominatimResult[]
  const results: RouteEndpoint[] = json.map((row) => {
    const lat = Number(row.lat)
    const lng = Number(row.lon)
    const { name, hint } = shortLabel(row.display_name)
    return customEndpoint(name, hint, { lat, lng })
  })

  return NextResponse.json({ results })
}
