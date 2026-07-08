import type { RoadWetness, WeatherHour, WeatherResponse } from '@/lib/weather-types'

export const WEATHER_HOURS_COLLAPSED = 6
export const WEATHER_HOURS_EXTENDED = 12

const CARDINALS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

export function windLabel(deg: number): string {
  const idx = Math.round(deg / 45) % 8
  return CARDINALS[idx]
}

/** WMO weather code → short label */
export function weatherSummary(code: number): string {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Cloudy'
  if (code <= 48) return 'Fog'
  if (code <= 57) return 'Drizzle'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Showers'
  if (code <= 86) return 'Snow showers'
  if (code <= 99) return 'Thunderstorm'
  return 'Mixed'
}

export function estimateRoadWetness(
  precipMm: number,
  precipProbability: number,
  weatherCode: number,
): RoadWetness {
  const raining = weatherCode >= 51 && weatherCode <= 67
  const heavy = precipMm >= 2 || (raining && precipMm >= 0.5)
  const moderate = precipMm >= 0.3 || precipProbability >= 55 || raining
  const light = precipMm >= 0.05 || precipProbability >= 30

  if (heavy) return 'soaked'
  if (moderate) return 'wet'
  if (light) return 'damp'
  return 'dry'
}

export function roadWetnessLabel(level: RoadWetness): string {
  switch (level) {
    case 'dry':
      return 'Dry roads'
    case 'damp':
      return 'Damp patches'
    case 'wet':
      return 'Wet roads'
    case 'soaked':
      return 'Soaked / slippery'
  }
}

type OpenMeteoHourly = {
  time: string[]
  temperature_2m: number[]
  precipitation: number[]
  precipitation_probability: number[]
  wind_speed_10m: number[]
  wind_direction_10m: number[]
  weather_code: number[]
}

type OpenMeteoPayload = {
  latitude: number
  longitude: number
  hourly: OpenMeteoHourly
}

export async function fetchWeatherForecast(
  lat: number,
  lng: number,
  forecastHours: number = WEATHER_HOURS_EXTENDED,
): Promise<WeatherResponse> {
  const hourCount = Math.min(
    WEATHER_HOURS_EXTENDED,
    Math.max(1, Math.round(forecastHours)),
  )
  const url = new URL('https://api.open-meteo.com/v1/forecast')
  url.searchParams.set('latitude', String(lat))
  url.searchParams.set('longitude', String(lng))
  url.searchParams.set(
    'hourly',
    'temperature_2m,precipitation,precipitation_probability,wind_speed_10m,wind_direction_10m,weather_code',
  )
  url.searchParams.set('forecast_hours', String(hourCount))
  url.searchParams.set('timezone', 'auto')

  const res = await fetch(url.toString(), { next: { revalidate: 900 } })
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`)

  const json = (await res.json()) as OpenMeteoPayload
  const h = json.hourly
  const count = Math.min(hourCount, h.time.length)

  const hours: WeatherHour[] = []
  for (let i = 0; i < count; i++) {
    const precipMm = h.precipitation[i] ?? 0
    const precipProbability = h.precipitation_probability[i] ?? 0
    const weatherCode = h.weather_code[i] ?? 0
    const windDirectionDeg = h.wind_direction_10m[i] ?? 0
    const roadWetness = estimateRoadWetness(
      precipMm,
      precipProbability,
      weatherCode,
    )

    hours.push({
      time: h.time[i],
      tempC: Math.round(h.temperature_2m[i] ?? 0),
      precipitationMm: precipMm,
      precipProbability,
      windKmh: Math.round(h.wind_speed_10m[i] ?? 0),
      windDirectionDeg,
      windLabel: windLabel(windDirectionDeg),
      weatherCode,
      summary: weatherSummary(weatherCode),
      roadWetness,
    })
  }

  const roadWetness = hours[0]?.roadWetness ?? 'dry'

  return {
    lat: json.latitude,
    lng: json.longitude,
    hours,
    roadWetness,
    roadWetnessLabel: roadWetnessLabel(roadWetness),
  }
}

export function fmtHourLabel(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
