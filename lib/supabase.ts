import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kicjyrmadhkozwganhbi.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpY2p5cm1hZGhrb3p3Z2FuaGJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1Mjk5MDIsImV4cCI6MjA3OTEwNTkwMn0.uVhc7OyncTsFXoxJP3Wuaqto64oZH1g-N9sRAle2Xec'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

