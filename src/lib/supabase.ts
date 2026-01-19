import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement Supabase manquantes !');
}

console.log('🔗 Initialisation Supabase...');
console.log('🔗 URL:', supabaseUrl);
console.log('🔑 Anon Key (20 premiers caractères):', supabaseAnonKey?.substring(0, 20) + '...');

// ✅ FIX : Ajout des headers globaux
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
  },
  global: {
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
  },
  db: {
    schema: 'public',
  },
});

// Test de connexion
// (async () => {
//   try {
//     const { count, error } = await supabase
//       .from('profiles')
//       .select('*', { count: 'exact', head: true });
    
//     if (error) {
//       console.error('❌ Test connexion Supabase ÉCHEC:', error);
//     } else {
//       console.log('✅ Test connexion Supabase RÉUSSI');
//       console.log('✅ Nombre de profils dans la BDD:', count);
//     }
//   } catch (err) {
//     console.error('❌ Exception test connexion:', err);
//   }
// })();

export const WEBHOOKS = {
  SUBMISSION: import.meta.env.VITE_N8N_WEBHOOK_SUBMISSION || '',
  VALIDATION: import.meta.env.VITE_N8N_WEBHOOK_VALIDATION || '',
  CONSULTATION: import.meta.env.VITE_N8N_WEBHOOK_CONSULTATION || '',
};

// Types (gardez vos types existants)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'agence' | 'interimaire' | 'client';
          agency_id: string | null;
          agency_name: string | null;
          first_name: string | null;
          last_name: string | null;
          phone: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          last_login_at: string | null;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      timesheets: {
        Row: {
          id: string;
          submitted_by: string;
          agency_id: string;
          client_email: string | null;
          employee_first_name: string;
          employee_last_name: string;
          employee_pluri_rh: string | null;
          company_name: string;
          company_email: string;
          company_contract_number: string | null;
          company_location: string | null;
          week_start: string;
          week_number: number | null;
          year: number | null;
          hours: any;
          comments: string | null;
          mission_status: string | null;
          total_hours: number;
          status: 'pending' | 'approved' | 'rejected';
          validator_name: string | null;
          validator_email: string | null;
          validation_comment: string | null;
          validated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['timesheets']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['timesheets']['Insert']>;
      };
    };
  };
};