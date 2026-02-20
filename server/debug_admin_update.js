
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testUpdate() {
    console.log('--- STARTING PERMISSION PERSISTENCE TEST ---');

    // 1. Find a test user (or list one)
    const { data: users } = await supabase.from('profiles').select('id, email, access, plan').limit(1);
    if (!users || users.length === 0) {
        console.log('No users found.');
        return;
    }
    const user = users[0];
    console.log('[1] Target User:', user.email);
    console.log('    Initial State:', { plan: user.plan, access: user.access });

    // 2. FORCE UPDATE to "Basic" plan and Access = ['rbt_generator'] ONLY
    const updates = {
        plan: 'basic',
        access: ['rbt_generator'] // Explicitly EXCLUDING bcba_generator
    };

    console.log('[2] Sending Update:', updates);

    const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

    if (updateError) {
        console.error('Update Failed:', updateError);
        return;
    }
    console.log('    Update command sent.');

    // 3. READ BACK IMMEDIATELY
    const { data: refreshedUser, error: readError } = await supabase
        .from('profiles')
        .select('plan, access')
        .eq('id', user.id)
        .single();

    if (readError) {
        console.error('Read Failed:', readError);
        return;
    }

    console.log('[3] Post-Update DB State:', refreshedUser);

    // 4. VERIFY
    const hasBCBA = refreshedUser.access.includes('bcba_generator');
    if (hasBCBA) {
        console.error('❌ FAIL: "bcba_generator" still present in access list!');
    } else {
        console.log('✅ SUCCESS: "bcba_generator" correctly removed.');
    }

    if (refreshedUser.plan !== 'basic') {
        console.error('❌ FAIL: Plan is not basic!');
    } else {
        console.log('✅ SUCCESS: Plan is basic.');
    }
}

testUpdate();
