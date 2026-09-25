import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

export const isSupabaseConfigured = Boolean(
  /^https:\/\/.+\.supabase\.co$/.test(supabaseUrl) &&
  supabaseAnonKey &&
  supabaseAnonKey !== 'your-anon-key-here'
);

// VITE_ values are included in browser code. This is appropriate for the
// Supabase anon/publishable key, which depends on RLS for authorization.
// Never use a Supabase service_role or secret key in this client.
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);
