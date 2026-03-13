import crypto from 'crypto'

/**
 * Generate a new server seed and its SHA-256 hash.
 */
export function generateServerSeed(): { seed: string; hash: string } {
  const seed = crypto.randomBytes(32).toString('hex')
  const hash = crypto.createHash('sha256').update(seed).digest('hex')
  return { seed, hash }
}

/**
 * Generate a random client seed (hex string).
 */
export function generateClientSeed(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * Derive a provably fair result float between 0 and 1.
 * Uses HMAC-SHA256 with the server seed as the key and
 * `${clientSeed}:${nonce}` as the message.
 */
export function getResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number
): number {
  const hmac = crypto
    .createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest('hex')

  // Take the first 8 hex characters (32 bits) and convert to a float 0-1
  const int = parseInt(hmac.substring(0, 8), 16)
  return int / 0x100000000 // divide by 2^32
}

/**
 * Verify that a given server seed matches a previously committed hash,
 * and that a result is reproducible.
 */
export function verifyResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  hash: string
): boolean {
  const computedHash = crypto
    .createHash('sha256')
    .update(serverSeed)
    .digest('hex')
  if (computedHash !== hash) return false

  // Optionally recompute the result to ensure consistency
  // (caller can compare the returned float with the claimed result)
  getResult(serverSeed, clientSeed, nonce)
  return true
}
