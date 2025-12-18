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
    console.log('👤 === DÉBUT loadUserProfile ===');
    console.log('👤 Email:', supabaseUser.email);
    console.log('👤 ID:', supabaseUser.id);
    
    console.log('📡 Appel Supabase profiles avec timeout 3s...');
    
    // Créer une promesse de timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      const id = setTimeout(() => {
        console.warn('⏰ TIMEOUT atteint (3s)');
        reject(new Error('Timeout'));
      }, 3000);
      return id;
    });
    
    // Créer la promesse de requête Supabase  
    const fetchPromise = (async () => {
      const result = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();
      console.log('📊 Requête terminée:', result);
      return result;
    })();
    
    // Course entre les deux
    const { data: profile, error } = await Promise.race([
      fetchPromise, 
      timeoutPromise
    ]) as any;

    console.log('📊 Résultat final:', { profile, error });

    if (error) {
      console.error('❌ Erreur chargement profil:', error);
      throw error;
    }

    if (!profile) {
      console.error('❌ Profil est null !');
      throw new Error('Profil null');
    }

    console.log('✅ Profil récupéré:', profile);

    // Update last_login (non bloquant) - VERSION CORRIGÉE
    (async () => {
      try {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', supabaseUser.id);
        console.log('✅ last_login_at mis à jour');
      } catch (e) {
        console.warn('⚠️ Erreur update last_login:', e);
      }
    })();

    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email!,
      role: profile.role,
      agencyId: profile.agency_id,
      agencyName: profile.agency_name,
      firstName: profile.first_name,
      lastName: profile.last_name,
    });
    
    console.log('✅ User state mis à jour, rôle:', profile.role);
    console.log('👤 === FIN loadUserProfile SUCCÈS ===');
    
  } catch (err: any) {
    console.error('❌ === EXCEPTION loadUserProfile ===');
    console.error('❌ Message:', err?.message || err);
    
    // FALLBACK : Profil temporaire pour débloquer la connexion
    console.warn('⚠️ FALLBACK - Création profil temporaire');
    
    setUser({
      id: supabaseUser.id,
      email: supabaseUser.email!,
      role: 'agence',
      agencyId: undefined,
      agencyName: 'Agence (temporaire)',
      firstName: undefined,
      lastName: undefined,
    });
    
    console.log('✅ Profil temporaire créé - VOUS POUVEZ VOUS CONNECTER');
    console.log('⚠️ Rechargez la page dans quelques secondes pour retry');
  }
};

  // Vérifier la session au chargement
  useEffect(() => {
    const checkSession = async () => {
     try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    // NOUVEAU : Si erreur ou pas de session, nettoyer
    if (error || !session) {
      console.log('🧹 Nettoyage de la session invalide');
      localStorage.removeItem('supabase.auth.token');
      sessionStorage.clear();
    }
    
    if (session?.user) {
      await loadUserProfile(session.user);
    }
  } catch (err) {
    console.error('Erreur vérification session:', err);
    // Nettoyer en cas d'erreur
    localStorage.clear();
    sessionStorage.clear();
  } finally {
    setLoading(false);
  }
};

    checkSession();

    // Écouter les changements d'auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
     async (event, session) => {
    try {
      console.log('🔄 Auth state change:', event);
      console.log('📦 Session:', session ? 'Présente' : 'Absente');
      
      if (event === 'SIGNED_OUT') {
        console.log('🧹 Nettoyage après déconnexion');
        setUser(null);
        localStorage.clear();
        sessionStorage.clear();
      } 
      else if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔐 SIGNED_IN détecté, chargement du profil...');
        await loadUserProfile(session.user);
      }
      else if (event === 'INITIAL_SESSION' && session?.user) {
        console.log('🔄 Session initiale détectée, chargement du profil...');
        await loadUserProfile(session.user);
      }
      else if (session?.user) {
        console.log('👤 Session user présente, chargement du profil...');
        await loadUserProfile(session.user);
      } 
      else {
        console.log('❌ Pas de session user, nettoyage...');
        setUser(null);
      }
      
      console.log('✅ onAuthStateChange terminé');
    } catch (error) {
      console.error('❌ ERREUR dans onAuthStateChange:', error);
    }
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
  try {
    console.log('🚪 Déconnexion...');
    
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    setUser(null);
    
    // NOUVEAU : Nettoyer localStorage et sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    
    console.log('✅ Déconnexion réussie');
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
    throw error;
  }
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