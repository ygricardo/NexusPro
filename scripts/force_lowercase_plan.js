
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

async function forceMigration() {
    console.log('Forcing Basic/Advanced to lowercase with trim...');

    // 1. Basic (any case, leading/trailing spaces)
    // Supabase doesn't easily do regex update via JS client without RPC, but we can try ilike with wildcards for common cases
    const { error: err1, count: count1 } = await supabase
        .from('profiles')
        .update({ plan: 'basic' })
        .or('plan.ilike.basic,plan.ilike.%basic%,plan.eq.Basic,plan.eq.Starter,plan.eq.starter')
        .neq('plan', 'basic')
        .select('*', { count: 'exact' });

    if (err1) console.error('Error fixing Basic:', err1);
    else console.log(`Fixed ${count1} users to 'basic'.`);

    // 2. Advanced
    const { error: err2, count: count2 } = await supabase
        .from('profiles')
        .update({ plan: 'advanced' })
        .or('plan.ilike.advanced,plan.ilike.%advanced%,plan.eq.Pro,plan.eq.pro')
        .neq('plan', 'advanced')
        .select('*', { count: 'exact' });

    if (err2) console.error('Error fixing Advanced:', err2);
    else console.log(`Fixed ${count2} users to 'advanced'.`);
}

forceMigration();
