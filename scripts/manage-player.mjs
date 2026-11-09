import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const [action, inputEmail] = process.argv.slice(2);
const email = inputEmail?.trim().toLowerCase();
if (!['create', 'reset'].includes(action) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? '')) {
  throw new Error('Usage: node scripts/manage-player.mjs <create|reset> <email>');
}

const privateDirectory = new URL('../.local-secrets/', import.meta.url);
const key = (await readFile(new URL('supabase-admin-key.txt', privateDirectory), 'utf8')).trim();
if (!/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) throw new Error('Missing local Supabase secret key.');
const admin = createClient('https://baqiyclhuuqhmdknouif.supabase.co', key, {
  auth: { persistSession: false, autoRefreshToken: false }
});
const directory = new URL('players/', privateDirectory);
await mkdir(directory, { recursive: true });
const filename = createHash('sha256').update(email).digest('hex').slice(0, 16) + '.json';
const file = new URL(filename, directory);

if (action === 'create') {
  try {
    const existing = JSON.parse(await readFile(file, 'utf8'));
    if (existing.email !== email) throw new Error('Local credential filename collision.');
    console.log('Account already provisioned. Its local credential file is .local-secrets/players/' + filename);
    process.exit(0);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

let id;
if (action === 'reset') {
  let page = 1;
  while (!id) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error('Account lookup failed: ' + error.code);
    id = data.users.find((user) => user.email?.toLowerCase() === email)?.id;
    if (id || data.users.length < 100) break;
    page++;
  }
  if (!id) throw new Error('Account not found.');
}

// Record the proposed password before the request. Keep it if the response is lost.
const pendingFile = new URL(filename + '.pending', directory);
let pending;
try {
  pending = JSON.parse(await readFile(pendingFile, 'utf8'));
  if (pending.email !== email || pending.action !== action) {
    throw new Error('Resolve the existing pending operation before changing this account.');
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  pending = { email, password: randomBytes(18).toString('base64url'), id, action };
  await writeFile(pendingFile, JSON.stringify(pending, null, 2) + '\n', { flag: 'wx' });
}
const { password } = pending;
let { data, error } = action === 'create'
  ? await admin.auth.admin.createUser({ email, password, email_confirm: true })
  : await admin.auth.admin.updateUserById(id, { password });
if (action === 'create' && ['email_exists', 'user_already_exists'].includes(error?.code)) {
  // A prior response may have been lost. Recover only if that saved password works.
  ({ data, error } = await admin.auth.signInWithPassword({ email, password }));
}
if (error) throw new Error('Account operation failed: ' + error.code);
await writeFile(file, JSON.stringify({ email, password, id: data.user.id }, null, 2) + '\n');
await unlink(pendingFile);
console.log('Account ' + action + ' completed. Credentials are in .local-secrets/players/' + filename);
