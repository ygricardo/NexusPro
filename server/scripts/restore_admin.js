import { supabaseAdmin } from '../shared/lib/supabase.js';

async function fixNames() {
    const usersToFix = [
        { id: 'db75bc7a-7cdf-4617-b88c-649ae35426a7', email: 'admin@nexuspro.com', full_name: 'System Admin' },
        { id: '8a33e238-2504-43bc-858b-6c65d06d8099', email: 'yeikelguerra098@gmail.com', full_name: 'Yeikel Guerra' },
        { id: 'acacdb27-654d-4844-a0dc-a5b6fd3f5206', email: 'ygricardo1990@gmail.com', full_name: 'Yeikel Guerra' }
    ];

    console.log('Fixing null emails and names...');

    for (const u of usersToFix) {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                email: u.email,
                full_name: u.full_name
            })
            .eq('id', u.id);

        if (error) {
            console.error(`Failed to fix user ${u.email}:`, error.message);
        } else {
            console.log(`Successfully restored name/email for ${u.email}`);
        }
    }
}

fixNames();
