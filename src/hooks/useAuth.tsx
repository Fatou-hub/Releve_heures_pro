import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

// Types
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

// Créer le contexte
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider Props
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider Component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fonction pour charger le profil utilisateur
  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Erreur chargement profil:', error);
        return;
      }

      if (profile) {
        // Mettre à jour la dernière connexion
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', supabaseUser.id);

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
    } catch (err) {
      console.error('Erreur lors du chargement du profil:', err);
    }
  };

  // Vérifier la session au chargement
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          await loadUserProfile(session.user);
        }
      } catch (err) {
        console.error('Erreur vérification session:', err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Connexion
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    if (data.user) {
      await loadUserProfile(data.user);
    }
  };

// Inscription
const signUp = async (
  email: string, 
  password: string, 
  role: 'agence' | 'interimaire' | 'client'
) => {
  console.log('🔧 useAuth.signUp() - Début');
  
  // 1. Créer le compte auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  console.log('📝 Résultat auth.signUp:', { data, error });

  if (error) {
    console.error('❌ Erreur auth.signUp:', error);
    throw error;
  }

  if (!data.user) {
    throw new Error('Erreur lors de la création du compte');
  }

console.log('✅ Compte auth créé:', data.user.id);

// 2. Créer ou mettre à jour le profil
console.log('📝 Vérification du profil dans la table profiles...');

// D'abord, vérifier si le profil existe déjà
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('id, role')
  .eq('email', email)
  .single();

if (existingProfile) {
  // Le profil existe déjà (cas intérimaire créé par l'agence)
  console.log('✅ Profil existant trouvé, mise à jour de l\'ID auth...');
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ 
      id: data.user.id,  // Mettre à jour avec le vrai ID auth
      updated_at: new Date().toISOString()
    })
    .eq('email', email);

  if (updateError) {
    console.error('❌ Erreur mise à jour profil:', updateError);
    throw new Error(`Erreur mise à jour profil: ${updateError.message}`);
  }
  
  console.log('✅ Profil mis à jour avec succès');
} else {
  // Le profil n'existe pas (cas agence qui s'inscrit)
  console.log('📝 Création du profil dans la table profiles...');
  
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: data.user.id,
      email: email,
      role: role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    console.error('❌ Erreur création profil:', profileError);
    throw new Error(`Erreur création profil: ${profileError.message}`);
  }
  
  console.log('✅ Profil créé avec succès');
}

  // 3. SKIP loadUserProfile - on le fera au prochain signIn
  console.log('⏭️  Skip loadUserProfile (sera chargé au login)');
  
  console.log('✅ signUp terminé avec succès');
};


  // Déconnexion
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setUser(null);
  };

  // Réinitialiser mot de passe
  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw error;
    }
  };

  // Mettre à jour le mot de passe
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook useAuth
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  
  return context;
}