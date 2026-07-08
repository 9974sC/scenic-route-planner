import type { ScenicWeights } from './types'

export type ScenicPreference = 'no' | 'idc' | 'yes'

export type ScenicPreferenceSet = {
  greenness: ScenicPreference
  curviness: ScenicPreference
  viewpoints: ScenicPreference
}

export const DEFAULT_PREFERENCES: ScenicPreferenceSet = {
  greenness: 'yes',
  curviness: 'idc',
  viewpoints: 'idc',
}

const PREFERENCE_WEIGHT: Record<ScenicPreference, number> = {
  no: 0.08,
  idc: 0.45,
  yes: 0.92,
}

export function preferenceToWeight(p: ScenicPreference): number {
  return PREFERENCE_WEIGHT[p]
}

export function preferencesToWeights(prefs: ScenicPreferenceSet): ScenicWeights {
  return {
    greenness: preferenceToWeight(prefs.greenness),
    curviness: preferenceToWeight(prefs.curviness),
    viewpoints: preferenceToWeight(prefs.viewpoints),
  }
}

export function weightToPreference(weight: number): ScenicPreference {
  if (weight < 0.3) return 'no'
  if (weight > 0.65) return 'yes'
  return 'idc'
}

export function weightsToPreferences(weights: ScenicWeights): ScenicPreferenceSet {
  return {
    greenness: weightToPreference(weights.greenness),
    curviness: weightToPreference(weights.curviness),
    viewpoints: weightToPreference(weights.viewpoints),
  }
}

export const SCENIC_PREFERENCE_OPTIONS: {
  value: ScenicPreference
  label: string
}[] = [
  { value: 'no', label: 'No' },
  { value: 'idc', label: "Don't care" },
  { value: 'yes', label: 'Yes' },
]
