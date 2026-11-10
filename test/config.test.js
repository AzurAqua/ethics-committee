import test from 'node:test';
import assert from 'node:assert/strict';
import config from '../vite.config.js';

test('public preview build refuses the stable v1 backend even when overridden in the environment', () => {
  const keys = ['VITE_RELEASE_CHANNEL', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  try {
    process.env.VITE_RELEASE_CHANNEL = 'public-preview';
    process.env.VITE_SUPABASE_URL = 'https://baqiyclhuuqhmdknouif.supabase.co';
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    assert.throws(() => config({ mode: 'production' }), /v1 backend is protected/);
    process.env.VITE_SUPABASE_URL = 'https://separate-test.supabase.co';
    assert.doesNotThrow(() => config({ mode: 'production' }));
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});
