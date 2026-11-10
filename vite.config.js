import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (env.VITE_RELEASE_CHANNEL === 'public-preview' && URL.parse(url)?.hostname === 'baqiyclhuuqhmdknouif.supabase.co') {
    throw new Error('Public preview must use its own Supabase project. The v1 backend is protected.');
  }

  if ((url || key) && (URL.parse(url)?.protocol !== 'https:' || !key?.startsWith('sb_publishable_'))) {
    throw new Error('Configure both an HTTPS Supabase project URL and its publishable key.');
  }

  return {};
});
