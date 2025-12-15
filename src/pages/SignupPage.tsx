import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clipboard, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { signUp } = useAuth();
  const navigate = useNavigate();

const handleSubmit = async (e: FormEvent) => {
  e.preventDefault();
  console.log('🚀 Signup - Début du handleSubmit');
  console.log('📧 Email:', email);
  console.log('🔒 Password length:', password.length);
  
  setError('');
  setSuccess(false);
  setLoading(true);

  try {
    console.log('📞 Appel signUp avec timeout de 15 secondes...');
    
    // Créer une promesse de timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('⏰ Timeout : Le signup a pris trop de temps (>15s)')), 15000)
    );
    
    // Créer la promesse de signup
    const signUpPromise = signUp(email, password, 'agence');
    
    // Course entre les deux
    await Promise.race([signUpPromise, timeoutPromise]);
    
    console.log('✅ signUp réussi !');
    
    // Mettre à jour le nom de l'agence si fourni
    if (agencyName) {
      console.log('🏢 Agency name fourni:', agencyName);
      // TODO: Mettre à jour le profil avec agency_name
    }
    
    setSuccess(true);
    console.log('⏳ Redirection dans 2 secondes...');
    setTimeout(() => {
      console.log('➡️  Navigation vers /dashboard');
      navigate('/dashboard');
    }, 2000);
  } catch (err: any) {
    console.error('❌ Erreur signup:', err);
    console.error('❌ Message:', err.message);
    setError(err.message || 'Une erreur est survenue lors de l\'inscription');
  } finally {
    setLoading(false);
    console.log('🏁 Fin du handleSubmit');
  }
};

  // console.log('🔄 Render SignupPage - loading:', loading);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-50 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl border border-neutral-200 p-8">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center">
              <Clipboard className="w-6 h-6 text-white" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-center text-neutral-900 mb-2">
            Créer un compte Agence
          </h1>
          <p className="text-center text-neutral-500 text-sm mb-8">
            Inscrivez-vous pour gérer vos intérimaires
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">
                Compte créé avec succès ! Redirection...
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Nom de l'agence (optionnel)
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-md text-sm transition-all bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="Mon Agence Intérim"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-md text-sm transition-all bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="vous@agence.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-900 mb-2">
                Mot de passe
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
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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
                Minimum 8 caractères
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-md font-medium text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
              onClick={() => console.log('🖱️  Clic sur bouton submit')}
            >
              {loading ? 'Inscription...' : 'Créer mon compte agence'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-900">
              💡 <strong>Note :</strong> Les intérimaires n'ont pas besoin de s'inscrire. 
              Vous pourrez les créer depuis votre dashboard.
            </p>
          </div>

          <p className="text-center text-sm text-neutral-500 mt-4">
            Déjà un compte ?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}