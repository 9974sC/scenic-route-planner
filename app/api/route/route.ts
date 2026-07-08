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
import {
  CYCLING_SPEED_MS,
  getGraphHopperApiKey,
  graphHopperAlternativesEnabled,
  graphHopperCyclingUrl,
  isGraphHopperAuthError,
  isGraphHopperQuotaError,
} from '@/lib/cycling-routing'
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

  const key = getGraphHopperApiKey()
  if (!key) {
    console.warn('[route] GRAPHHOPPER_API_KEY is not configured')
    return NextResponse.json(
      simulate(start, end, avoidPath, {
        routingWarning:
          'Live routing is off — set GRAPHHOPPER_API_KEY in your deployment environment.',
      }),
    )
  }

  try {
    const data = await fetchGraphHopper(start, end, key)
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.warn('[route] GraphHopper unavailable, using simulated routes:', message)
    const routingWarning = isGraphHopperAuthError(message)
      ? 'GraphHopper rejected the API key — check GRAPHHOPPER_API_KEY on the server.'
      : isGraphHopperQuotaError(message)
        ? 'GraphHopper credit limit reached — routes are simulated until the limit resets.'
        : `GraphHopper error: ${message}`
    return NextResponse.json(simulate(start, end, avoidPath, { routingWarning }))
  }
}

async function fetchGraphHopper(
  start: LatLng,
  end: LatLng,
  key: string,
): Promise<RouteResponse> {
  return fetchGraphHopperGet(start, end, key)
}

async function fetchGraphHopperGet(
  start: LatLng,
  end: LatLng,
  key: string,
): Promise<RouteResponse> {
  const wantAlternatives = graphHopperAlternativesEnabled()

  if (wantAlternatives) {
    try {
      return await requestGraphHopperGet(start, end, key, true)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (isGraphHopperAuthError(message)) throw err
      console.warn('[route] alternate paths failed, retrying single route:', message)
    }
  }

  return requestGraphHopperGet(start, end, key, false)
}

async function requestGraphHopperGet(
  start: LatLng,
  end: LatLng,
  key: string,
  alternatives: boolean,
): Promise<RouteResponse> {
  const res = await fetch(
    graphHopperCyclingUrl(start, end, key, { alternatives }),
    { cache: 'no-store' },
  )

  const body = await res.text()
  if (!res.ok) {
    throw new Error(
      `GraphHopper ${res.status}${body ? `: ${body.slice(0, 240)}` : ''}`,
    )
  }

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    throw new Error('GraphHopper returned invalid JSON')
  }

  if (
    json &&
    typeof json === 'object' &&
    'message' in json &&
    typeof (json as { message?: string }).message === 'string'
  ) {
    throw new Error((json as { message: string }).message)
  }

  return parseGraphHopperResponse(
    json as {
      paths?: Array<{
        points?: { coordinates?: number[][] }
        distance?: number
        time?: number
        instructions?: GraphHopperInstruction[]
      }>
    },
  )
}

function parseGraphHopperResponse(json: {
  paths?: Array<{
    points?: { coordinates?: number[][] }
    distance?: number
    time?: number
    instructions?: GraphHopperInstruction[]
  }>
}): RouteResponse {
  const paths: any[] = json.paths ?? []
  if (!paths.length) throw new Error('GraphHopper returned no paths')

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
  options?: { routingWarning?: string },
): RouteResponse {
  const straight = buildPath(start, end, 0, 0, 1)
  const directDist = pathLength(straight)
  const speed = CYCLING_SPEED_MS

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
  return {
    source: 'simulated',
    candidates,
    directIndex,
    routingWarning: options?.routingWarning,
  }
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
