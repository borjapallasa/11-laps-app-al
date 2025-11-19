import { createClient } from '@supabase/supabase-js';

export function supabaseServer() {
  const url = process.env.SUPABASE_URL!;
  // IMPORTANT: Only use service role on the server, never in client bundles.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

