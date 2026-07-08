export type RoadWetness = 'dry' | 'damp' | 'wet' | 'soaked'

export type WeatherHour = {
  time: string
  tempC: number
  precipitationMm: number
  precipProbability: number
  windKmh: number
  windDirectionDeg: number
  windLabel: string
  weatherCode: number
  summary: string
  roadWetness: RoadWetness
}

export type WeatherResponse = {
  lat: number
  lng: number
  hours: WeatherHour[]
  /** Current / next-hour road surface estimate */
  roadWetness: RoadWetness
  roadWetnessLabel: string
}
