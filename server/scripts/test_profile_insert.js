import { supabaseAdmin } from '../shared/lib/supabase.js';

async function run() {
    console.log('Testing profile insertion for faux Google User...');

    // Get all users from auth to see who is missing
    const { data: authUsers, error: authErr } = await supabaseAdmin.auth.admin.listUsers();

    if (authErr) {
        console.error('Failed to list auth users:', authErr);
        return;
    }

    const { data: profiles, error: profErr } = await supabaseAdmin.from('profiles').select('id, email');

    if (profErr) {
        console.error('Failed to list profiles:', profErr);
        return;
    }

    const profileIds = new Set(profiles.map(p => p.id));
    const missingUsers = authUsers.users.filter(u => !profileIds.has(u.id));

    console.log(`Found ${missingUsers.length} users in Auth that are missing from Profiles.`);

    for (const user of missingUsers) {
        console.log(`Attempting to insert missing user: ${user.email} (${user.id})`);

        let userName = user.user_metadata?.name || user.user_metadata?.full_name || user.email.split('@')[0];

        const { error: upsertError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: user.id,
                email: user.email,
                full_name: userName,
                role_id: 'user',
                plan: 'no_plan',
                subscription_status: 'inactive',
                access: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (upsertError) {
            console.error(`[ERROR] Failed to insert profile for ${user.email}:`, upsertError.message, upsertError.details);
        } else {
            console.log(`[SUCCESS] Inserted profile for ${user.email}`);
        }
    }
}

run();
