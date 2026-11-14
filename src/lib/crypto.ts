// Web Crypto helpers for the browser: checksums, contact codes, feature check.
// Byte/base64 helpers come from shared/encoding so the app and the relay encode identically.

import { CONTACT_CODE_PREFIX } from '../../shared/config';
import { b64, randomBytes as rand, unb64, utf8 as enc } from '../../shared/encoding';

/** Bytes backed by a plain ArrayBuffer, as Web Crypto wants them. */
export type Bytes = Uint8Array<ArrayBuffer>;

export const toB64 = (data: ArrayBuffer | Uint8Array): string => b64(data instanceof Uint8Array ? data : new Uint8Array(data));
export const fromB64 = (s: string): Bytes => unb64(s) as Bytes;
export const utf8 = (text: string): Bytes => enc(text) as Bytes;
export const randomBytes = (n: number): Bytes => rand(n) as Bytes;

export async function sha256(data: Bytes | ArrayBuffer | string): Promise<Bytes> {
  const input = typeof data === 'string' ? utf8(data) : data;
  return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
}

export function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A contact code people can share: veyra:<handle>:<public key>. */
export function contactCode(handle: string, publicKey: string): string {
  return `${CONTACT_CODE_PREFIX}:${handle}:${publicKey}`;
}

const CODE_RE = new RegExp(`^${CONTACT_CODE_PREFIX}:([a-z0-9._-]{2,24}):([A-Za-z0-9+/=]{40,200})$`, 'i');

export function parseContactCode(code: string): { handle: string; publicKey: string } | null {
  const m = code.trim().match(CODE_RE);
  if (!m) return null;
  try {
    fromB64(m[2]);
  } catch {
    return null;
  }
  return { handle: m[1].toLowerCase(), publicKey: m[2] };
}

export function isWebCryptoAvailable(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}
