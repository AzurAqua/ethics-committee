import test from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { authErrorMessage, confirmEmailLink, readEmailLink, submitAuth } from '../src/auth-flow.js';

const redirectUrl = 'https://azuraqua.github.io/ethics-committee-preview/';
const user = { id: '11111111-1111-4111-8111-111111111111', email: 'player@example.test', email_confirmed_at: '2026-11-09T00:00:00Z' };
const accessToken = [
  { alg: 'HS256', typ: 'JWT' },
  { sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 },
].map((part) => Buffer.from(JSON.stringify(part)).toString('base64url')).join('.') + '.test-signature';
const sessionResponse = { access_token: accessToken, refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer', user };

function makeClient(responder) {
  const calls = [];
  const client = createClient('https://test.supabase.co', 'sb_publishable_test', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, flowType: 'pkce' },
    global: { fetch: async (input, options) => {
      const url = new URL(input);
      const call = { path: url.pathname, query: url.searchParams, method: options.method, body: options.body ? JSON.parse(options.body) : null };
      calls.push(call);
      const reply = responder(call);
      return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { 'Content-Type': 'application/json', 'X-Supabase-Api-Version': '2024-01-01' } });
    } }
  });
  return { auth: client.auth, calls };
}

test('signup, resend and password recovery use the isolated site redirect with the actual SDK', async () => {
  const { auth, calls } = makeClient(() => ({ body: { id: user.id, email: user.email } }));
  await submitAuth(auth, 'signup', { email: user.email, password: 'example-test-password', redirectUrl });
  await submitAuth(auth, 'resend', { email: user.email, redirectUrl });
  await submitAuth(auth, 'forgot', { email: user.email, redirectUrl });
  assert.deepEqual(calls.map((call) => call.path), ['/auth/v1/signup', '/auth/v1/resend', '/auth/v1/recover']);
  for (const call of calls) assert.equal(call.query.get('redirect_to'), redirectUrl);
  assert.equal(calls[1].body.type, 'signup');
  assert.equal(calls[1].body.email, user.email);
  assert.equal(calls[1].body.password, undefined);
  assert.equal(calls[2].body.password, undefined);
});

test('unconfirmed email and expired links show recovery instructions rather than a generic network error', async () => {
  const { auth } = makeClient((call) => ({ status: 400, body: {
    code: call.path.endsWith('/verify') ? 'otp_expired' : 'email_not_confirmed', msg: 'test error'
  } }));
  await assert.rejects(submitAuth(auth, 'login', { email: user.email, password: 'test-password' }), (error) => {
    assert.match(authErrorMessage(error, 'login'), /重发验证邮件/);
    return true;
  });
  await assert.rejects(confirmEmailLink(auth, { token: 'expired-test-token', type: 'recovery' }), (error) => {
    assert.match(authErrorMessage(error, 'confirm'), /过期或已使用/);
    return true;
  });
  assert.match(authErrorMessage({ status: 500 }, 'signup'), /发信服务/);
  assert.match(authErrorMessage(new TypeError('Failed to fetch'), 'forgot'), /检查网络/);
});

test('recovery links work without same-browser PKCE storage and only change the account password', async () => {
  const { auth, calls } = makeClient((call) => ({ body: call.path.endsWith('/user') ? { user } : sessionResponse }));
  const link = readEmailLink(redirectUrl + '?token_hash=test-token&type=recovery');
  const session = await confirmEmailLink(auth, link);
  assert.equal(session.user.id, user.id);
  await submitAuth(auth, 'reset', { password: 'changed-test-password' });
  assert.deepEqual(calls.map((call) => call.path), ['/auth/v1/verify', '/auth/v1/user']);
  assert.equal(calls[0].body.type, 'recovery');
  assert.equal(calls[0].body.token_hash, 'test-token');
  assert.equal(calls[1].method, 'PUT');
  assert.equal(calls[1].body.password, 'changed-test-password');
});

test('signup links accept the email type, reject unrelated token types, and never verify just by parsing', async () => {
  const { auth, calls } = makeClient(() => ({ body: sessionResponse }));
  assert.equal(readEmailLink(redirectUrl), null);
  const link = readEmailLink(redirectUrl + '?token_hash=test-token&type=signup');
  assert.equal(link.type, 'email');
  assert.equal(calls.length, 0);
  assert.equal((await confirmEmailLink(auth, link)).user.id, user.id);
  const invalid = readEmailLink(redirectUrl + '?token_hash=test-token&type=invite');
  await assert.rejects(confirmEmailLink(auth, invalid), { code: 'otp_expired' });
  assert.equal(calls.length, 1);
});

test('unexpected signup sessions are signed out when backend email confirmation was disabled', async () => {
  const { auth, calls } = makeClient((call) => ({ body: call.path.endsWith('/logout') ? {} : sessionResponse }));
  await assert.rejects(submitAuth(auth, 'signup', { email: user.email, password: 'test-password', redirectUrl }), { code: 'email_confirmation_disabled' });
  assert.equal(calls.at(-1).path, '/auth/v1/logout');
  assert.equal((await auth.getSession()).data.session, null);
});
