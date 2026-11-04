import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { applyAction, cellState, emptyRecord, legalActions } from '../src/tracks.js';

test('both ends can advance and retreat without skipping a cell', () => {
  let record = emptyRecord();
  assert.deepEqual(legalActions(record, 0, 1), ['light']);
  assert.deepEqual(legalActions(record, 0, 30), ['gray']);
  assert.deepEqual(legalActions(record, 0, 2), []);
  record = applyAction(record, 0, 1, 'light');
  record = applyAction(record, 0, 30, 'gray');
  assert.deepEqual([1, 2, 29, 30].map((cell) => legalActions(record, 0, cell)), [
    ['unlight'], ['light'], ['gray'], ['ungray']
  ]);
  record = applyAction(record, 0, 30, 'ungray');
  record = applyAction(record, 0, 1, 'unlight');
  assert.deepEqual(record.lit, [0, 0, 0, 0]);
  assert.deepEqual(record.grey, [0, 0, 0, 0]);
  assert.throws(() => applyAction(record, 0, 2, 'light'));
});

test('only the last empty cell offers a choice and a filled track can still retreat', () => {
  const record = { lit: [0, 0, 0, 7], grey: [0, 0, 0, 7], revision: 14 };
  assert.deepEqual(legalActions(record, 3, 8), ['light', 'gray']);
  const left = applyAction(record, 3, 8, 'light');
  const right = applyAction(record, 3, 8, 'gray');
  assert.equal(cellState(left, 3, 8), 'lit');
  assert.equal(cellState(right, 3, 8), 'grey');
  assert.deepEqual(legalActions(left, 3, 8), ['unlight']);
  assert.deepEqual(legalActions(right, 3, 8), ['ungray']);
  assert.deepEqual(right.grey.slice(0, 3), [0, 0, 0]);
});

test('production SQL isolates player records and rejects stale or illegal changes', async () => {
  const db = new PGlite();
  const player = '00000000-0000-0000-0000-000000000001';
  const other = '00000000-0000-0000-0000-000000000002';
  const unverified = '00000000-0000-0000-0000-000000000003';
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create schema auth;
      create table auth.users (id uuid primary key, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable as
        'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
      grant usage on schema auth to authenticated;
      insert into auth.users values ('${player}', now()), ('${other}', now()), ('${unverified}', null);
    `);
    await db.exec(await readFile(new URL('../supabase/migrations/20261104000000_player_records.sql', import.meta.url), 'utf8'));
    const identity = (id) => db.query("select set_config('request.jwt.claim.sub', $1, false)", [id]);
    const mutation = async (track, cell, action, revision, expectedPlayer = player) => (
      await db.query('select public.apply_track_action($1, $2, $3, $4, $5) as result',
        [track, cell, action, revision, expectedPlayer])
    ).rows[0].result;
    const records = () => db.query('select player_id, lit, grey, revision from public.player_records');

    await db.exec('set role anon');
    await assert.rejects(records);
    await assert.rejects(() => mutation(1, 1, 'light', 0));
    await db.exec('set role authenticated');
    await identity(unverified);
    await assert.rejects(() => mutation(1, 1, 'light', 0, unverified), /Verified account/);
    await identity(player);
    assert.deepEqual(await mutation(1, 1, 'light', 0), {
      lit: [1, 0, 0, 0], grey: [0, 0, 0, 0], revision: 1, conflict: false
    });
    assert.deepEqual(await mutation(1, 30, 'gray', 0), {
      lit: [1, 0, 0, 0], grey: [0, 0, 0, 0], revision: 1, conflict: true
    });
    await assert.rejects(() => mutation(1, 3, 'light', 1), /legal boundary/);
    await assert.rejects(() => db.query('update public.player_records set revision = 0'));
    const updated = await mutation(4, 15, 'gray', 1);
    assert.deepEqual(updated.grey, [0, 0, 0, 1]);
    assert.equal(updated.revision, 2);
    await identity(other);
    assert.equal((await records()).rows.length, 0);
    await assert.rejects(() => mutation(1, 30, 'gray', 0), /Verified account/);
    await mutation(1, 30, 'gray', 0, other);
    assert.deepEqual((await records()).rows.map((row) => row.player_id), [other]);
    await identity(player);
    assert.deepEqual((await records()).rows.map((row) => row.player_id), [player]);
    assert.equal((await records()).rows[0].revision, 2);
  } finally {
    await db.close();
  }
});
