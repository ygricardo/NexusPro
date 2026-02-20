
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
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    console.log('Starting Plan Migration...');

    // 1. STARTER -> BASIC
    console.log('Migrating starter -> basic...');
    const { error: err1, count: count1 } = await supabase
        .from('profiles')
        .update({ plan: 'basic' })
        .or('plan.eq.starter,plan.eq.rbt_starter,plan.eq.Basic') // Handle case variants too just in case
        .select('*', { count: 'exact' });

    if (err1) console.error('Error migrating starter:', err1);
    else console.log(`Updated ${count1} users to Basic.`);

    // 2. PRO -> ADVANCED
    console.log('Migrating pro -> advanced...');
    const { error: err2, count: count2 } = await supabase
        .from('profiles')
        .update({ plan: 'advanced' })
        .or('plan.eq.pro,plan.eq.rbt_pro,plan.eq.analyst_pro,plan.eq.Advanced')
        .select('*', { count: 'exact' });

    if (err2) console.error('Error migrating pro:', err2);
    else console.log(`Updated ${count2} users to Advanced.`);

    // 3. ELITE (Ensure consistency)
    console.log('Standardizing elite...');
    const { error: err3, count: count3 } = await supabase
        .from('profiles')
        .update({ plan: 'elite' })
        .eq('plan', 'Elite') // Fix casing if exists
        .select('*', { count: 'exact' });

    if (err3) console.error('Error migrating elite:', err3);
    else console.log(`Updated ${count3} users to Elite (case fix).`);

    console.log('Migration Complete.');
}

migrate();
