import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getProfile, updateLastLogin, upsertProfile } from '../services/profileService';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  role: 'agence' | 'interimaire' | 'client';
  agencyId?: string;
  agencyName?: string;
  firstName?: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: 'agence' | 'interimaire' | 'client') => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Charge le profil depuis le service
   */
const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      console.log('👤 Loading profile:', supabaseUser.email);
      const profile = await getProfile(supabaseUser.id);

      // 1. Mise à jour de l'état local
      if (!profile) {
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: 'interimaire',
          agencyId: '6b8dad1a-0b90-4da2-8471-e1f91fa969a2',
          agencyName: 'LoomAgency',
        });
      } else {
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: profile.role,
          agencyId: profile.agency_id,
          agencyName: profile.agency_name,
          firstName: profile.first_name,
          lastName: profile.last_name,
        });
      }

      console.log('✅ User state updated');

      // ✅ FIX ts(6133) : On appelle enfin la fonction importée
      updateLastLogin(supabaseUser.id).catch((e) => 
        console.warn('⚠️ Erreur discrète lors de updateLastLogin:', e)
      );

      // 2. Redirection avec le petit délai de sécurité
      setTimeout(() => {
        if (!profile || profile.role === 'interimaire') {
          navigate('/nouveau-releve', { replace: true });
        } else if (profile.role === 'agence') {
          navigate('/dashboard', { replace: true });
        }
      }, 100);

    } catch (err) {
      console.error('❌ Error loading profile:', err);
    }
  };

  // Vérifier session initiale
  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth event:', event);

        if (event === 'SIGNED_OUT') {
          setUser(null);
          navigate('/login', { replace: true });
        } else if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // LOGIN
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) throw error;
    if (data.user) await loadUserProfile(data.user);
  };

  // SIGNUP
  const signUp = async (
    email: string, 
    password: string, 
    role: 'agence' | 'interimaire' | 'client'
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Signup failed');

    // Utiliser le service pour créer/mettre à jour le profil
    await upsertProfile(data.user.id, email, role);
  };

  // LOGOUT
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login', { replace: true });
  };

  // RESET PASSWORD
  const resetPassword = async (email: string) => {
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  };

  // UPDATE PASSWORD
  const updatePassword = async (newPassword: string) => {
    await supabase.auth.updateUser({ password: newPassword });
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword, 
      updatePassword 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}