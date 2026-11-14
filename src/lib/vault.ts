// Account keys and the vault.
//
// Your password is stretched with PBKDF2-SHA-256 (310 000 rounds, salted with your handle) into a
// master secret, which is split with HKDF into two unrelated keys:
//
//   • the vault key (AES-256-GCM) — encrypts all your data: on this device, and the backup copy the
//     server keeps so you can sign in elsewhere. It never leaves the device.
//   • the login key — sent to the server to prove you know the password. The server stores only
//     its SHA-256 hash, and learns nothing about the vault key from it.
//
// Locally each account is one record in localStorage (ciphertext only).

import { fromB64, randomBytes, toB64, utf8 } from './crypto';
import { storage } from './storage';

const ITERATIONS = 310_000;
// Domain-separation labels below are part of the key derivation: changing one makes every existing
// password, backup and recovery code stop working.
const ACCOUNT = (handle: string) => `account.${handle}`;
const INDEX_KEY = 'accounts';
const DEVICE_KEY = 'device';

export interface AccountKeys {
  handle: string;
  key: CryptoKey; // vault key (AES-GCM, not extractable)
  auth: string; // login key, base64 (32 bytes)
}

/** An unlocked account. `syncedRev` = the server backup version this device last uploaded or downloaded. */
export interface VaultSession extends AccountKeys {
  syncedRev: number;
}

interface StoredAccount {
  v: 2;
  handle: string;
  iv: string;
  ct: string;
  savedAt: number;
  syncedRev: number;
}

export class WrongPassphraseError extends Error {
  constructor() {
    super('wrong passphrase');
  }
}

/* ------------------------------------------------------------- keys */

export async function deriveAccountKeys(handle: string, password: string): Promise<AccountKeys> {
  const base = await crypto.subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const master = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: utf8(`Veyra-login-v1|${handle}`), iterations: ITERATIONS, hash: 'SHA-256' }, base, 256);
  const hk = await crypto.subtle.importKey('raw', master, 'HKDF', false, ['deriveKey', 'deriveBits']);
  const salt = new Uint8Array(32);
  const key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt, info: utf8('Veyra vault key') }, hk, { name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);
  const auth = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: utf8('Veyra login key') }, hk, 256);
  return { handle, key, auth: toB64(auth) };
}

const aad = (handle: string) => utf8(`Veyra-vault|${handle}`);

/** Encrypts any JSON value. Output: base64(iv ‖ ciphertext). */
export async function sealData(keys: AccountKeys, data: unknown): Promise<string> {
  const iv = randomBytes(12);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(keys.handle) }, keys.key, utf8(JSON.stringify(data))));
  const out = new Uint8Array(12 + ct.length);
  out.set(iv);
  out.set(ct, 12);
  return toB64(out);
}

export async function openData<T>(keys: AccountKeys, blob: string): Promise<T> {
  const raw = fromB64(blob);
  return decrypt<T>(keys, raw.slice(0, 12), raw.slice(12));
}

async function decrypt<T>(keys: AccountKeys, iv: Uint8Array<ArrayBuffer>, ct: Uint8Array<ArrayBuffer>): Promise<T> {
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad(keys.handle) }, keys.key, ct);
  } catch {
    throw new WrongPassphraseError();
  }
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/* ------------------------------------------------------- this device */

/** A random id for this browser, so the server can tell which device uploaded a backup. */
export function deviceId(): string {
  let id = storage.get(DEVICE_KEY);
  if (!id) {
    id = toB64(randomBytes(12)).replace(/[+/=]/g, '');
    storage.trySet(DEVICE_KEY, id); // private mode: a new id each time is fine
  }
  return id;
}

/** Handles that have signed in on this device, most recent first. */
export function knownAccounts(): string[] {
  try {
    const list = JSON.parse(storage.get(INDEX_KEY) ?? '[]') as unknown;
    return Array.isArray(list) ? list.filter((h): h is string => typeof h === 'string' && storage.get(ACCOUNT(h)) !== null) : [];
  } catch {
    return [];
  }
}

export function rememberAccount(handle: string) {
  storage.trySet(INDEX_KEY, JSON.stringify([handle, ...knownAccounts().filter((h) => h !== handle)].slice(0, 8)));
}

function stored(handle: string): StoredAccount | null {
  try {
    const raw = storage.get(ACCOUNT(handle));
    const s = raw ? (JSON.parse(raw) as StoredAccount) : null;
    return s?.v === 2 ? s : null;
  } catch {
    return null;
  }
}

export function hasLocal(handle: string): boolean {
  return stored(handle) !== null;
}

/** Opens this device's copy. Throws WrongPassphraseError if the keys don't fit. */
export async function openLocal<T>(keys: AccountKeys): Promise<{ data: T; syncedRev: number }> {
  const s = stored(keys.handle);
  if (!s) throw new Error('no local copy');
  const data = await decrypt<T>(keys, fromB64(s.iv), fromB64(s.ct));
  return { data, syncedRev: s.syncedRev };
}

/** Re-encrypts and stores the data. A fresh IV is used for every save. Throws when storage is full. */
export async function saveVault(session: VaultSession, data: unknown): Promise<void> {
  const raw = fromB64(await sealData(session, data));
  const rec: StoredAccount = { v: 2, handle: session.handle, iv: toB64(raw.slice(0, 12)), ct: toB64(raw.slice(12)), savedAt: Date.now(), syncedRev: session.syncedRev };
  storage.set(ACCOUNT(session.handle), JSON.stringify(rec));
}

/** Notes which server backup version this device's copy matches (no re-encryption needed). */
export function markSynced(session: VaultSession, rev: number) {
  session.syncedRev = rev;
  const s = stored(session.handle);
  if (!s) return;
  storage.trySet(ACCOUNT(session.handle), JSON.stringify({ ...s, syncedRev: rev }));
}

/** Removes this device's copy of an account (the server backup is untouched). */
export function forgetAccount(handle: string) {
  storage.remove(ACCOUNT(handle));
  storage.trySet(INDEX_KEY, JSON.stringify(knownAccounts().filter((h) => h !== handle)));
}

/* ------------------------------------------------- data key, recovery */

/** A random data key. Account backups are encrypted with it; the password and the recovery code each lock a copy of it. */
export function newDataKey(): string {
  return toB64(randomBytes(32));
}

export async function dataKeys(handle: string, dek: string): Promise<AccountKeys> {
  const key = await crypto.subtle.importKey('raw', fromB64(dek), 'AES-GCM', false, ['encrypt', 'decrypt']);
  return { handle, key, auth: '' };
}

const RC_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // no I, L, O, U

/** A 120-bit recovery code like 7K2M-QX9D-… (6 groups of 4). */
export function newRecoveryCode(): string {
  const bytes = randomBytes(24);
  const chars = Array.from(bytes, (b) => RC_ALPHABET[b & 31]);
  return chars.join('').match(/.{4}/g)!.join('-');
}

export function normalizeRecoveryCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[OIL]/g, (c) => (c === 'O' ? '0' : '1'))
    .replace(/[^0-9A-Z]/g, '');
}

/** Keys from a recovery code (same derivation as a password, different input). */
export function recoveryKeys(handle: string, code: string): Promise<AccountKeys> {
  return deriveAccountKeys(handle, `recovery:${normalizeRecoveryCode(code)}`);
}
