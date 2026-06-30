import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eyqlgdlovvipidpdraqb.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_sCJKh6sxy1B12EdtFsSiWg_pXrWG_nN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Server-side only — uses service role key to bypass RLS
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || key === 'your-service-role-key-here') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set in .env.local');
  }
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}
