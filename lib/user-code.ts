const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

/** AA0001, AA0002, … AB0001 as the sequence grows. */
export function formatUserCode(seq: number): string {
  if (!Number.isInteger(seq) || seq < 1) {
    throw new Error('user code sequence must be a positive integer')
  }
  const n = seq - 1
  const num = (n % 9999) + 1
  const letterIdx = Math.floor(n / 9999)
  const first = LETTERS[Math.floor(letterIdx / 26) % 26]
  const second = LETTERS[letterIdx % 26]
  return `${first}${second}${String(num).padStart(4, '0')}`
}

export function parseLoginCode(input: string): string | null {
  const raw = input.trim().toUpperCase().replace(/^SCENIC-/, '')
  return /^[A-Z]{2}\d{4}$/.test(raw) ? raw : null
}

export function displayUserId(publicCode: string): string {
  return `SCENIC-${publicCode}`
}
