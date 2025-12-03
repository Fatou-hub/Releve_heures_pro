import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// URLs des webhooks n8n
export const WEBHOOKS = {
  SUBMISSION: import.meta.env.VITE_WEBHOOK_SUBMISSION_URL,
  VALIDATION: import.meta.env.VITE_WEBHOOK_VALIDATION_URL,
  READ: import.meta.env.VITE_WEBHOOK_READ_URL,
};

if (!WEBHOOKS.SUBMISSION || !WEBHOOKS.VALIDATION || !WEBHOOKS.READ) {
  console.warn('Warning: Some webhook URLs are not configured');
}