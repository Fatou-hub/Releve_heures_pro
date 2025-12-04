import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clipboard, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Attendre que la page soit complètement chargée
    const checkSession = async () => {
      try {
        // Vérifier la session actuelle
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('Session:', session ? 'Présente' : 'Absente');
        
        if (!session) {
          // Pas de session = pas de token valide
          setError('Lien de réinitialisation invalide ou expiré');
        } else {
          // Session présente = token valide
          console.log('Token valide, formulaire prêt');
          setIsReady(true);
        }
      } catch (err) {
        console.error('Erreur vérification session:', err);
        setError('Une erreur est survenue');
      }
    };

    // Attendre un peu pour laisser Supabase gérer le token
    setTimeout(checkSession, 500);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    try {
      // Changer le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Succès !
      setSuccess(true);
      
      // Déconnecter l'utilisateur
      await supabase.auth.signOut();
      
      // Rediriger vers login après 2 secondes
      setTimeout(() => {
        navigate('/login', { 
          state: { 
            message: 'Mot de passe modifié avec succès ! Connectez-vous avec votre nouveau mot de passe.' 
          } 
        });
      }, 2000);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Une erreur est survenue lors de la réinitialisation');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-neutral-200 p-8">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
              <Clipboard className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-neutral-900 mb-2">
            Nouveau mot de passe
          </h1>
          <p className="text-center text-neutral-500 text-sm mb-8">
            Choisissez un nouveau mot de passe pour votre compte
          </p>

          {/* Message d'erreur */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-800">{error}</p>
                {!isReady && (
                  <button
                    onClick={() => navigate('/login')}
                    className="mt-3 text-sm text-primary hover:underline"
                  >
                    Retour à la connexion
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Message de succès */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  Mot de passe modifié avec succès !
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Redirection vers la page de connexion...
                </p>
              </div>
            </div>
          )}

          {/* Formulaire - Afficher seulement si prêt et pas de succès */}
          {isReady && !success && (
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-3.5 py-2.5 pr-10 border border-neutral-200 rounded-md text-sm transition-all bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Minimum 6 caractères
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="w-full px-3.5 py-2.5 pr-10 border border-neutral-200 rounded-md text-sm transition-all bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
                    disabled={loading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Modification...' : 'Modifier le mot de passe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}