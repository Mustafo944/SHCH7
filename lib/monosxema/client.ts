import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_QORLITOG_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_QORLITOG_SUPABASE_ANON_KEY

// Boshqa (alohida deploy qilingan) qorlitog_server loyihasining Supabase
// bazasidan faqat o'qish uchun ulanamiz — bu loyihaga hech qanday yozish
// amalga oshirilmaydi (yozish ESP32 -> Vercel serverless funksiyasi orqali).
export const monosxemaSupabase = url && anonKey ? createClient(url, anonKey) : null
