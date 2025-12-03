import { useState, useEffect } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { User, UserProfile, UserRole } from '../types';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer la session initiale
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Écouter les changements d'auth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Charger le profil utilisateur depuis la table profiles
  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        setLoading(false);
        return;
      }

      const profile = data as UserProfile;
      setUser({
        id: profile.id,
        email: profile.email,
        role: profile.role,
        agencyId: profile.agency_id,
        agencyName: profile.agency_id ? `Agence ${profile.agency_id}` : undefined,
      });
    } catch (error) {
      console.error('Error in loadUserProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fonction de login
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  // Fonction de signup
  const signUp = async (email: string, password: string, role: UserRole, agencyId?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          agency_id: agencyId,
        },
      },
    });

    // Si le signup réussit, créer le profil
    if (data.user && !error) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: data.user.id,
            email: data.user.email!,
            role,
            agency_id: agencyId || null,
          }
        ]);
      
      if (insertError) {
        console.error('Error creating profile:', insertError);
      }
    }

    return { data, error };
  };

  // Fonction de logout
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setSession(null);
    }
    return { error };
  };

  // Mettre à jour le profil
  const updateProfile = async (updates: {
    email?: string;
    role?: UserRole;
    agency_id?: string | null;
  }) => {
    if (!user) return { error: new Error('No user logged in') };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error && session) {
      await loadUserProfile(session.user);
    }

    return { error };
  };

  return {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
}