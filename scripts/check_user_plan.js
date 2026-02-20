
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUser() {
    console.log('Fetching user lf050594@gmail.com...');
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', 'lf050594@gmail.com');

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (profiles && profiles.length > 0) {
        console.log('User Found:', JSON.stringify(profiles[0], null, 2));
    } else {
        console.log('User NOT found in profiles table.');
        // Try searching by auth table? (Requires admin client usually, but let's stick to profiles first)
    }
}

checkUser();
