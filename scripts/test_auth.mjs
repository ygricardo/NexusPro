import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// DEBUGGING VERSION 2
const envPath = path.resolve(process.cwd(), '.env');
console.log('CWD:', process.cwd());
console.log('Trying to read:', envPath);

let fileContent;
try {
    fileContent = fs.readFileSync(envPath, 'utf-8');
    console.log('Read .env, length:', fileContent.length);
} catch (err) {
    console.log('Could not read .env, trying .env.local');
    const localEnvPath = path.resolve(process.cwd(), '.env.local');
    try {
        fileContent = fs.readFileSync(localEnvPath, 'utf-8');
        console.log('Read .env.local, length:', fileContent.length);
    } catch (err2) {
        console.error('Error reading .env and .env.local:', err2.message);
        process.exit(1);
    }
}

const envVars = {};
if (fileContent) {
    // robust split
    const lines = fileContent.split(/\r?\n|\r/);
    console.log('Total lines found:', lines.length);

    lines.forEach((line, index) => {
        if (line.trim()) {
            console.log(`Line ${index} starts: "${line.substring(0, 5)}", length: ${line.length}`);
        }

        const match = line.match(/^\s*([^=]+?)\s*=\s*(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["'](.*)["']$/, '$1').replace(/\r$/, '');
            envVars[key] = value;
        }
    });
}
console.log('Parsed keys:', Object.keys(envVars));

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) console.error("MISSING VITE_SUPABASE_URL");
if (!supabaseKey) console.error("MISSING VITE_SUPABASE_ANON_KEY");

if (!supabaseUrl || !supabaseKey) {
    process.exit(1);
}

console.log('Connecting to Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAuth() {
    const timestamp = Date.now();
    const email = `test_user_${timestamp}@example.com`;
    const password = 'TestPassword123!';
    const fullName = `Test User ${timestamp}`;

    console.log(`\n--- Starting Auth Test ---`);
    console.log(`Email: ${email}`);

    // 1. Sign Up
    console.log('\n[1/2] Attempting Sign Up...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: 'rbt',
                plan: 'rbt_starter'
            }
        }
    });

    if (signUpError) {
        console.error('❌ Sign Up Failed:', signUpError.message);
        process.exit(1);
    }

    console.log('✅ Sign Up Successful:', signUpData.user ? `User ID: ${signUpData.user.id}` : 'No User Object Returned');

    // 2. Sign In
    console.log('\n[2/2] Attempting Sign In...');
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (signInError) {
        console.error('❌ Sign In Failed:', signInError.message);
        if (signInError.message.includes("Email not confirmed")) {
            console.log("\n--- DIAGNOSIS: EMAIL CONFIRMATION REQUIRED ---");
        }
        process.exit(1);
    }

    console.log('✅ Sign In Successful:', signInData.session ? 'Session Active' : 'No Session');
    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY.');
}

testAuth();
