
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uujldxxeziaeberdtiwf.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1amxkeHhlemlhZWJlcmR0aXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1MTgxMjksImV4cCI6MjA4MjA5NDEyOX0.JhWF9oV8OjeGsNmXjikjuxn_YFvdlkNcQzHva3D2VUI'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testLogin() {
    console.log('Attempting login...')
    const startDate = Date.now()
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@nexuspro.com',
        password: 'adminNexus2025!',
    })

    if (error) {
        console.error('Login failed after', Date.now() - startDate, 'ms')
        console.error('Error:', error.message)
        console.error('Full error:', error)
    } else {
        console.log('Login successful after', Date.now() - startDate, 'ms')
        console.log('User ID:', data.user.id)
        console.log('Session exists:', !!data.session)
    }
}

testLogin()
