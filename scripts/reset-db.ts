// Wipes the local relay's database and creates one account with a known password.
//   npm run db:reset                      → @admin / 12345678
//   npm run db:reset -- <handle> <password>
// Stop the relay first: a running relay keeps its own copy in memory.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from '@noble/hashes/sha2.js';
import { b64, unb64 } from '../shared/encoding';
import { fingerprint, generateIdentity, generateOneTimePreKeys, generateSignedPreKey, uploadBundle } from '../shared/e2ee';
import { HANDLE_RE } from '../shared/protocol';
import { makeBackup, makeRecovery } from '../src/lib/account';
import { deriveAccountKeys, newDataKey } from '../src/lib/vault';
import { createState } from '../src/state/init';
import { colorFor, type Profile } from '../src/types';

const [handle = 'admin', password = '12345678'] = process.argv.slice(2);
if (!HANDLE_RE.test(handle) || password.length < 8) {
  console.error('Usage: npm run db:reset -- <handle> <password of 8+ characters>');
  process.exit(1);
}

const identity = generateIdentity();
const spk = generateSignedPreKey(1, identity);
const opks = generateOneTimePreKeys(1, 100);
const bundle = uploadBundle(identity, spk, opks);
const keys = await deriveAccountKeys(handle, password);
const dek = newDataKey();
const { code, recovery } = await makeRecovery(handle, dek);
const now = Date.now();
const profile: Profile = {
  displayName: handle[0].toUpperCase() + handle.slice(1),
  handle,
  bio: '',
  presence: 'online',
  avatar: { kind: 'identicon', seed: handle, color: colorFor(handle) },
  publicKey: identity.sign.pub,
  fingerprint: fingerprint(identity.sign.pub),
  createdAt: now,
  version: 1,
};
const state = { ...createState(profile, { identity, spk, opks, nextOpkId: 101 }), account: { dek, recovery } };
const backup = await makeBackup({ ...keys, syncedRev: 0 }, state);
const hash = (s: string) => b64(sha256(unb64(s)));

const data = {
  users: { [handle]: { ik: bundle.ik, ikDh: bundle.ikDh, ikDhSig: bundle.ikDhSig, spk: bundle.spk, opks: bundle.opks, createdAt: now, lastSeen: now } },
  mail: {},
  backups: {
    [handle]: { rev: 1, device: 'reset-db', at: now, blob: backup.blob, wrap: backup.wrap, authHash: hash(keys.auth), rcHash: hash(recovery.auth), rcWrap: recovery.wrap, fails: 0, failSince: 0 },
  },
};
const file = process.env.DATA_FILE ?? join(import.meta.dirname, '..', 'server', 'data', 'store.json');
writeFileSync(file, JSON.stringify(data));
console.log(`Database reset. Sign in as @${handle} / ${password}\nRecovery code: ${code}`);
