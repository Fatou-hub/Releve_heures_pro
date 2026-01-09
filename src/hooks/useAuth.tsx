// src/hooks/useAuth.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
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
  const navigate = useNavigate(); // 🚨 doit être sous <BrowserRouter>
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      // Timeout 3s pour éviter blocage
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 2000)
      );

      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      const { data: profile, error } = (await Promise.race([fetchPromise, timeoutPromise])) as any;

      if (error || !profile) {
        console.warn('⚠️ Profil introuvable, fallback temporaire');
        // fallback user temporaire AVEC agencyId
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: 'interimaire',
          agencyId: '6b8dad1a-0b90-4da2-8471-e1f91fa969a2',  // ← ID de LoomAgency
          agencyName: 'Agence (temporaire)',
        });
        return;
      }

      // Profil chargé avec succès
      setUser({
        id: supabaseUser.id,
        email: supabaseUser.email!,
        role: profile.role,
        agencyId: profile.agency_id,
        agencyName: profile.agency_name,
        firstName: profile.first_name,
        lastName: profile.last_name,
      });

      // Redirection automatique selon rôle
      if (profile.role === 'agence') navigate('/dashboard', { replace: true });
      else if (profile.role === 'interimaire') navigate('/nouveau-releve', { replace: true });
    } catch (err) {
      console.error('❌ loadUserProfile error:', err);
      setUser(null);
    }
  };

  // Vérifier session initiale
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } catch (err) {
        console.error('❌ Vérification session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.clear();
          sessionStorage.clear();
          navigate('/login', { replace: true });
        } else if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Connexion
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.user) await loadUserProfile(data.user);
  };

  // Inscription
  const signUp = async (email: string, password: string, role: 'agence' | 'interimaire' | 'client') => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error('Signup failed');

    // Créer ou mettre à jour profil
    const { data: existingProfile } = await supabase.from('profiles').select('id').eq('email', email).single();
    if (existingProfile) {
      await supabase.from('profiles').update({ id: data.user.id, updated_at: new Date().toISOString() }).eq('email', email);
    } else {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email,
        role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  };

  // Déconnexion
  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.clear();
    sessionStorage.clear();
    navigate('/login', { replace: true });
  };

  // Reset mot de passe
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  // Update mot de passe
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
