import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const root = new URL('../', import.meta.url);
const privateDirectory = new URL('.local-secrets/', root);
const backend = 'https://baqiyclhuuqhmdknouif.supabase.co';
const browserKey = 'sb_publishable_R3GWnX0fyASozJG-wfw_tA_DjUP6Bq_';
const credentialsFile = new URL('acceptance-users.json', privateDirectory);
const results = [];
const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
const adminKey = (await readFile(new URL('supabase-admin-key.txt', privateDirectory), 'utf8')).trim();
assert.match(adminKey, /^sb_secret_[A-Za-z0-9_-]+$/, 'Save the Supabase secret key in the local file first.');
const admin = createClient(backend, adminKey, { auth });
await mkdir(privateDirectory, { recursive: true });

let accounts;
try {
  accounts = JSON.parse(await readFile(credentialsFile, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  accounts = ['A', 'B'].map((label) => ({
    label,
    email: 'acceptance-' + randomUUID() + '@example.com',
    password: randomBytes(24).toString('base64url')
  }));
  await writeFile(credentialsFile, JSON.stringify(accounts, null, 2) + '\n', { flag: 'wx' });
}

// Persist each created ID immediately so an interrupted run resumes with the same fixtures.
for (const account of accounts) {
  if (account.id) continue;
  const { data, error } = await admin.auth.admin.createUser({
    email: account.email, password: account.password, email_confirm: true,
    app_metadata: { purpose: 'ethics-committee-acceptance' }
  });
  if (error) throw new Error('Test account creation failed: ' + error.code);
  account.id = data.user.id;
  await writeFile(credentialsFile, JSON.stringify(accounts, null, 2) + '\n');
}

async function signIn(account) {
  const client = createClient(backend, browserKey, { auth });
  const { error } = await client.auth.signInWithPassword(account);
  if (error) throw new Error('Test login failed: ' + error.code);
  return client;
}

async function read(client, account) {
  const { data, error } = await client.from('player_records')
    .select('lit, grey, revision').eq('player_id', account.id).maybeSingle();
  assert.equal(error, null);
  return data ?? { lit: [0, 0, 0, 0], grey: [0, 0, 0, 0], revision: 0 };
}

async function mutate(client, account, track, cell, action, revision) {
  const { data, error } = await client.rpc('apply_track_action', {
    p_player: account.id, p_track: track, p_cell: cell, p_action: action, p_revision: revision
  });
  assert.equal(error, null, 'Legal mutation must succeed');
  return data;
}

async function clearTestRecord(client, account) {
  let state = await read(client, account);
  for (let track = 1; track <= 4; track++) {
    while (state.lit[track - 1]) {
      state = await mutate(client, account, track, state.lit[track - 1], 'unlight', state.revision);
    }
    while (state.grey[track - 1]) {
      const size = track === 4 ? 15 : 30;
      state = await mutate(client, account, track, size - state.grey[track - 1] + 1, 'ungray', state.revision);
    }
  }
  return state;
}

function passed(name) {
  results.push({ name, passed: true });
  console.log('PASS ' + name);
}

const [accountA, accountB] = accounts;
const a = await signIn(accountA);
const secondDevice = await signIn(accountA);
const b = await signIn(accountB);
passed('Two confirmed accounts and independent device sessions can log in');
let state = await clearTestRecord(a, accountA);
await clearTestRecord(b, accountB);

state = await mutate(a, accountA, 1, 1, 'light', state.revision);
assert.deepEqual((await read(secondDevice, accountA)).lit, [1, 0, 0, 0]);
passed('Saved progress is read from a separate authenticated session');

const revision = state.revision;
state = await mutate(a, accountA, 4, 15, 'gray', revision);
const stale = await mutate(secondDevice, accountA, 1, 2, 'light', revision);
assert.equal(stale.conflict, true);
assert.deepEqual(stale.lit, [1, 0, 0, 0]);
assert.deepEqual(stale.grey, [0, 0, 0, 1]);
assert.equal(stale.revision, state.revision);
passed('Stale device write returns the latest state without overwriting progress');

const concurrent = await Promise.all([
  mutate(a, accountA, 1, 2, 'light', state.revision),
  mutate(secondDevice, accountA, 2, 1, 'light', state.revision)
]);
assert.equal(concurrent.filter((result) => result.conflict).length, 1);
assert.equal((await read(a, accountA)).revision, state.revision + 1);
passed('Concurrent writes accept one revision and reject the stale competitor');

const isolated = await b.from('player_records').select('player_id').eq('player_id', accountA.id);
assert.equal(isolated.error, null);
assert.deepEqual(isolated.data, []);
const forbidden = await b.rpc('apply_track_action', {
  p_player: accountA.id, p_track: 1, p_cell: 2, p_action: 'light', p_revision: state.revision
});
assert.equal(forbidden.error?.code, '42501');
assert.deepEqual((await read(b, accountB)).lit, [0, 0, 0, 0]);
passed('Account B cannot read or mutate account A');

state = await read(a, accountA);
const illegal = await a.rpc('apply_track_action', {
  p_player: accountA.id, p_track: 1, p_cell: 10, p_action: 'light', p_revision: state.revision
});
assert.equal(illegal.error?.code, '22023');
assert.equal((await read(a, accountA)).revision, state.revision);
passed('Illegal cell changes leave the stored revision unchanged');

const anonymous = createClient(backend, browserKey, { auth });
assert.ok((await anonymous.from('player_records').select('revision')).error);
await a.auth.signOut({ scope: 'local' });
assert.ok((await a.from('player_records').select('revision')).error);
passed('Anonymous and signed-out clients cannot read player data');

await clearTestRecord(secondDevice, accountA);
await writeFile(new URL('acceptance-api-result.json', privateDirectory),
  JSON.stringify({ checkedAt: new Date().toISOString(), backend, results }, null, 2) + '\n');
console.log('Test fixtures are ready for browser acceptance. Credentials stay in .local-secrets/.');
