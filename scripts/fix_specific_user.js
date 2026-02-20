
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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixUser() {
    console.log('Forcing lf050594@gmail.com to basic...');
    const { data, error } = await supabase
        .from('profiles')
        .update({ plan: 'basic' })
        .eq('email', 'lf050594@gmail.com')
        .select();

    if (error) console.error(error);
    else console.log('Updated user:', data);
}

fixUser();
