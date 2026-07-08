import { NextResponse } from 'next/server'
import { fetchWeatherForecast } from '@/lib/weather'
import { WARSAW_CENTER } from '@/lib/geo'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = Number(searchParams.get('lat') ?? WARSAW_CENTER.lat)
  const lng = Number(searchParams.get('lng') ?? WARSAW_CENTER.lng)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 })
  }
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json({ error: 'lat/lng out of range' }, { status: 400 })
  }

  try {
    const forecast = await fetchWeatherForecast(lat, lng)
    return NextResponse.json(forecast)
  } catch (err) {
    console.error('[weather GET]', err)
    return NextResponse.json({ error: 'Failed to load weather' }, { status: 502 })
  }
}
