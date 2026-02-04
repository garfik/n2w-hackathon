import { createHash } from 'crypto';

/**
 * Compute SHA-256 hash of a buffer and return as hex string.
 */
export function sha256(buffer: Buffer | Uint8Array): string {
  return createHash('sha256').update(buffer).digest('hex');
}
