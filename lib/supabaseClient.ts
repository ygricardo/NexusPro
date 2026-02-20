
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase Config Check:', {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase variables missing! Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
