import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_SUPABASE_');
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if ((url || key) && (URL.parse(url)?.protocol !== 'https:' || !key?.startsWith('sb_publishable_'))) {
    throw new Error('Configure both an HTTPS Supabase project URL and its publishable key.');
  }

  return {};
});
