export const COLOR_CHANGE_COOLDOWN_MS = 60 * 60 * 1000

export const AVATAR_MAX_BYTES = 1_500_000
export const AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const PROFILE_LIMITS = {
  displayName: 48,
  bio: 280,
  location: 80,
} as const

export function colorChangeStatus(colorChangedAt: Date | null, now = Date.now()) {
  if (!colorChangedAt) {
    return { allowed: true, availableAt: null as Date | null }
  }
  const elapsed = now - colorChangedAt.getTime()
  if (elapsed >= COLOR_CHANGE_COOLDOWN_MS) {
    return { allowed: true, availableAt: null }
  }
  return {
    allowed: false,
    availableAt: new Date(colorChangedAt.getTime() + COLOR_CHANGE_COOLDOWN_MS),
  }
}

export function validateDisplayName(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (v.length > PROFILE_LIMITS.displayName) {
    return `Display name must be ${PROFILE_LIMITS.displayName} characters or fewer`
  }
  return null
}

export function validateBio(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (v.length > PROFILE_LIMITS.bio) {
    return `Bio must be ${PROFILE_LIMITS.bio} characters or fewer`
  }
  return null
}

export function validateLocation(value: string): string | null {
  const v = value.trim()
  if (!v) return null
  if (v.length > PROFILE_LIMITS.location) {
    return `Location must be ${PROFILE_LIMITS.location} characters or fewer`
  }
  return null
}

export function validateAvatarBuffer(
  bytes: Uint8Array,
  mime: string,
): string | null {
  if (!AVATAR_MIME_TYPES.has(mime)) {
    return 'Use a JPEG, PNG, or WebP image'
  }
  if (bytes.byteLength > AVATAR_MAX_BYTES) {
    return 'Image must be 1.5 MB or smaller'
  }
  if (bytes.byteLength < 32) return 'Image file is too small'
  return null
}

export function avatarUrlForUser(userId: string): string {
  return `/api/users/${userId}/avatar`
}
