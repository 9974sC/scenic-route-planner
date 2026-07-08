import { NextResponse } from 'next/server'
import type { LatLng, RouteCandidate, RouteResponse } from '@/lib/types'
import {
  curvinessScore,
  elevationStats,
  greennessScore,
  viewpointsScore,
  pathLength,
  hash01,
  simulatedElevations,
} from '@/lib/geo'
import {
  buildTurnMarkersFromInstructions,
  inferTurnMarkersFromCoords,
  type GraphHopperInstruction,
} from '@/lib/turn-markers'
import { outboundBulgeSide } from '@/lib/route-overlap'
import type { TurnMarker } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Body = {
  start: LatLng
  end: LatLng
  avoidPath?: [number, number][]
}

export async function POST(req: Request) {
  const body = (await req.json()) as Body
  const { start, end, avoidPath } = body
  if (!start || !end) {
    return NextResponse.json({ error: 'start and end required' }, { status: 400 })
  }

  const key = process.env.GRAPHHOPPER_API_KEY
  try {
    if (key) {
      const data = await fetchGraphHopper(start, end, key)
      return NextResponse.json(data)
    }
  } catch (err) {
    console.log('[v0] GraphHopper failed, using simulated routes:', (err as Error).message)
  }

  return NextResponse.json(simulate(start, end, avoidPath))
}

async function fetchGraphHopper(
  start: LatLng,
  end: LatLng,
  key: string,
): Promise<RouteResponse> {
  const url = new URL('https://graphhopper.com/api/1/route')
  url.searchParams.set('point', `${start.lat},${start.lng}`)
  url.searchParams.append('point', `${end.lat},${end.lng}`)
  url.searchParams.set('profile', 'car')
  url.searchParams.set('points_encoded', 'false')
  url.searchParams.set('elevation', 'true')
  url.searchParams.set('instructions', 'true')
  url.searchParams.set('algorithm', 'alternative_route')
  url.searchParams.set('alternative_route.max_paths', '6')
  url.searchParams.set('alternative_route.max_weight_factor', '5')
  url.searchParams.set('alternative_route.max_share_factor', '0.35')
  url.searchParams.set('key', key)

  const res = await fetch(url.toString(), { cache: 'no-store' })
  if (!res.ok) throw new Error(`GraphHopper ${res.status}`)
  const json = await res.json()

  const paths: any[] = json.paths ?? []
  if (!paths.length) throw new Error('no paths')

  const candidates: RouteCandidate[] = paths.map((p, i) => {
    const raw: number[][] = p.points?.coordinates ?? []
    const coords: [number, number][] = raw.map(
      (c) => [c[1], c[0]] as [number, number],
    )
    const elevations = raw.map((c) => c[2]).filter((v) => Number.isFinite(v))
    const instructions = (p.instructions ?? []) as GraphHopperInstruction[]
    const turnMarkers = buildTurnMarkersFromInstructions(instructions, raw)
    return score(`gh-${i}`, coords, p.distance, p.time / 1000, elevations, turnMarkers)
  })

  const directIndex = indexOfMin(candidates.map((c) => c.duration))
  return { source: 'graphhopper', candidates, directIndex }
}

/** Build several plausible routes with varying waviness when no API key. */
function simulate(
  start: LatLng,
  end: LatLng,
  avoidPath?: [number, number][],
): RouteResponse {
  const straight = buildPath(start, end, 0, 0, 1)
  const directDist = pathLength(straight)
  // ~40 km/h average city speed
  const speed = 40000 / 3600

  const returnSide =
    avoidPath && avoidPath.length > 2
      ? -outboundBulgeSide(start, end, avoidPath)
      : 1

  const variants: {
    id: string
    wobble: number
    detour: number
    phase: number
    side: number
  }[] = [
    { id: 'direct', wobble: 0.12, detour: 1.0, phase: 0, side: returnSide },
    { id: 'river', wobble: 0.85, detour: 1.24, phase: 4.1 + Math.PI * 0.15, side: returnSide },
    { id: 'green', wobble: 1.15, detour: 1.42, phase: 1.3 + Math.PI * 0.2, side: returnSide },
    { id: 'scenic', wobble: 1.65, detour: 1.72, phase: 2.4 + Math.PI * 0.25, side: returnSide },
    { id: 'wild', wobble: 2.0, detour: 2.35, phase: 0.9 + Math.PI * 0.3, side: returnSide },
    { id: 'epic', wobble: 2.35, detour: 3.2, phase: 3.8 + Math.PI * 0.35, side: returnSide },
    { id: 'grand', wobble: 2.6, detour: 4.25, phase: 5.2 + Math.PI * 0.4, side: returnSide },
  ]

  const candidates = variants.map((v) => {
    const coords = buildPath(start, end, v.wobble, v.phase, v.side)
    const dist = directDist * v.detour * (0.94 + hash01(v.id) * 0.14)
    const dur = dist / speed
    const elevations = simulatedElevations(coords, v.id)
    const turnMarkers = inferTurnMarkersFromCoords(coords)
    return score(v.id, coords, dist, dur, elevations, turnMarkers)
  })

  const directIndex = indexOfMin(candidates.map((c) => c.duration))
  return { source: 'simulated', candidates, directIndex }
}

/** create a curved path between two points via perpendicular sine offset */
function buildPath(
  start: LatLng,
  end: LatLng,
  wobble: number,
  phase: number,
  side = 1,
): [number, number][] {
  const n = 60
  const dLat = end.lat - start.lat
  const dLng = end.lng - start.lng
  // perpendicular direction (rough, unnormalized is fine for small areas)
  const perpLat = -dLng
  const perpLng = dLat
  const len = Math.hypot(perpLat, perpLng) || 1
  const amp = 0.028 * wobble
  const coords: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    // taper offset to 0 at both ends
    const taper = Math.sin(Math.PI * t)
    const wave =
      Math.sin(t * Math.PI * 2.4 + phase) * 0.7 +
      Math.sin(t * Math.PI * 5.1 + phase * 1.7) * 0.3
    const off = amp * taper * wave * side
    const lat = start.lat + dLat * t + (perpLat / len) * off
    const lng = start.lng + dLng * t + (perpLng / len) * off
    coords.push([lat, lng])
  }
  return coords
}

function score(
  id: string,
  coords: [number, number][],
  distance: number,
  duration: number,
  elevations: number[],
  turnMarkers: TurnMarker[],
): RouteCandidate {
  const elevation =
    elevations.length > 0 ? elevationStats(elevations) : null

  return {
    id,
    coords,
    distance,
    duration,
    greenness: greennessScore(coords),
    curviness: curvinessScore(coords),
    viewpoints: viewpointsScore(coords),
    scenicScore: 0,
    elevation,
    turnMarkers,
  }
}

function indexOfMin(arr: number[]): number {
  let idx = 0
  for (let i = 1; i < arr.length; i++) if (arr[i] < arr[idx]) idx = i
  return idx
}
