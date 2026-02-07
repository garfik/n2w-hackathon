import { createHash } from 'crypto';

/**
 * Compute SHA-256 hash and return as hex string.
 */
export function sha256(input: string | Buffer | Uint8Array): string {
  const h = createHash('sha256');
  return (typeof input === 'string' ? h.update(input, 'utf8') : h.update(input)).digest('hex');
}
