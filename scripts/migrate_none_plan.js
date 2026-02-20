
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

async function migrateNone() {
    console.log('Migrating none -> no_plan...');

    // 1. none/null -> no_plan
    const { error: err1, count: count1 } = await supabase
        .from('profiles')
        .update({ plan: 'no_plan' })
        .or('plan.eq.none,plan.is.null,plan.eq.None')
        .select('*', { count: 'exact' });

    if (err1) console.error('Error migrating none:', err1);
    else console.log(`Updated ${count1} users to no_plan.`);
}

migrateNone();
