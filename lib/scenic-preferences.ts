import type { ScenicWeights } from './types'

export type ScenicPreference = 'no' | 'idc' | 'yes'

export type ScenicPreferenceSet = {
  greenness: ScenicPreference
  curviness: ScenicPreference
  viewpoints: ScenicPreference
}

export const DEFAULT_PREFERENCES: ScenicPreferenceSet = {
  greenness: 'idc',
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

export const SCENIC_PREFERENCE_LEVELS: {
  value: ScenicPreference
  label: string
}[] = [
  { value: 'no', label: 'Not important' },
  { value: 'idc', label: 'Nice to have' },
  { value: 'yes', label: 'Very important' },
]

/** @deprecated Use SCENIC_PREFERENCE_LEVELS */
export const SCENIC_PREFERENCE_OPTIONS = SCENIC_PREFERENCE_LEVELS

export function preferenceToIndex(p: ScenicPreference): number {
  if (p === 'no') return 0
  if (p === 'yes') return 2
  return 1
}

export function indexToPreference(index: number): ScenicPreference {
  if (index <= 0) return 'no'
  if (index >= 2) return 'yes'
  return 'idc'
}

export function preferenceLabel(p: ScenicPreference): string {
  return (
    SCENIC_PREFERENCE_LEVELS.find((level) => level.value === p)?.label ??
    'Nice to have'
  )
}
