import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim().replace(/\/+$/, '') || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || '';

// Any HTTPS project URL (including Supabase custom domains). Plain HTTP is
// accepted only for a local Supabase stack on this machine during development.
const isValidSupabaseUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && import.meta.env.DEV && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  isValidSupabaseUrl(supabaseUrl) &&
  !supabaseUrl.includes('your-project') &&
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
