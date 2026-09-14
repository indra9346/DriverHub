import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hhqadycmsxsedlvdfcnn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocWFkeWNtc3hzZWRsdmRmY25uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMjE0MDksImV4cCI6MjA3Mjg5NzQwOX0.rOuX2YBS4S8jHhB0ayLTl4R25pstE5twiiQLNp8uc4o';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
