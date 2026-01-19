import { supabase } from '../lib/supabase';
// import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  email: string;
  role: 'agence' | 'interimaire' | 'client';
  agency_id?: string;
  agency_name?: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Récupère le profil d'un utilisateur
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data;
}

/**
 * Met à jour la date de dernière connexion
 */
export async function updateLastLogin(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.warn('Could not update last_login_at:', error);
  }
}

/**
 * Crée ou met à jour un profil
 */
export async function upsertProfile(
  userId: string,
  email: string,
  role: 'agence' | 'interimaire' | 'client'
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'id',
    });

  if (error) {
    throw error;
  }
}