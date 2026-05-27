// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

// Vite injects env variables via import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Defensive check – will throw a clear error if you forget to fill .env
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Supabase URL or anon key is missing. Populate the .env file with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
    );
}

// Export a ready‑to‑use client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
