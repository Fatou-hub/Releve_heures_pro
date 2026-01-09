import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/Header';
import { Plus, Mail, Phone, Calendar, X, UserPlus, Search, Copy, Check, Send } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Interimaire {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  created_at: string;
  last_login_at: string | null;
}

export function ManageInterimaires() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interimaires, setInterimaires] = useState<Interimaire[]>([]);
  const [filteredInterimaires, setFilteredInterimaires] = useState<Interimaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // 🆕 Modale de succès
  const [invitationLink, setInvitationLink] = useState(''); // 🆕 Lien d'invitation
  const [newInterimaire, setNewInterimaire] = useState<{ firstName: string; lastName: string; email: string } | null>(null); // 🆕 Infos intérimaire créé
  const [copied, setCopied] = useState(false); // 🆕 État de copie
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: ''
  });

  useEffect(() => {
    fetchInterimaires();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredInterimaires(interimaires);
    } else {
      const filtered = interimaires.filter(int =>
        int.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        int.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        int.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredInterimaires(filtered);
    }
  }, [searchTerm, interimaires]);

  const fetchInterimaires = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'interimaire')
        .eq('agency_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInterimaires(data || []);
      setFilteredInterimaires(data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Fonction pour copier le lien
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback pour navigateurs anciens
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 🆕 Fonction pour envoyer par email
  const sendByEmail = () => {
    if (!newInterimaire) return;
    
    const subject = `Votre lien d'inscription - ${user?.agencyName || 'LoomAgency'}`;
    const body = `Bonjour ${newInterimaire.firstName},

Bienvenue dans notre plateforme de gestion des relevés d'heures !

Pour créer votre compte et commencer à soumettre vos relevés, cliquez sur le lien ci-dessous :

${invitationLink}

Si vous avez des questions, n'hésitez pas à nous contacter.

Cordialement,
${user?.agencyName || 'LoomAgency'}`;

    window.location.href = `mailto:${newInterimaire.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleCreateInterimaire = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Appeler la fonction Supabase
      const { error } = await supabase.rpc('create_interimaire_simple', {
        p_email: formData.email,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_phone: formData.phone || null
      });

      if (error) throw error;

      // 2. Créer le lien d'invitation
      const link = `${window.location.origin}/signup-interimaire?email=${encodeURIComponent(formData.email)}`;
      setInvitationLink(link);

      // 3. Sauvegarder les infos de l'intérimaire
      setNewInterimaire({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email
      });

      // 4. Fermer modale création et ouvrir modale succès
      setShowModal(false);
      setShowSuccessModal(true);

      // 5. Réinitialiser le formulaire
      setFormData({ email: '', firstName: '', lastName: '', phone: '' });

      // 6. Recharger la liste
      fetchInterimaires();

    } catch (error: any) {
      console.error('Erreur:', error);
      alert('❌ Erreur : ' + (error.message || 'Une erreur est survenue'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header title="Gestion des Intérimaires" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button
          onClick={() => user?.role === 'agence' ? navigate('/dashboard') : navigate('/')}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        {/* Header avec statistiques et bouton */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">Mes Intérimaires</h1>
              <p className="text-neutral-600 mt-1">
                {interimaires.length} intérimaire(s) dans votre agence
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter un intérimaire</span>
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Liste des intérimaires */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-2 text-neutral-600">Chargement...</p>
            </div>
          ) : filteredInterimaires.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              {searchTerm ? (
                <>
                  <p>Aucun intérimaire trouvé pour "{searchTerm}"</p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-primary hover:underline mt-2"
                  >
                    Réinitialiser la recherche
                  </button>
                </>
              ) : (
                <>
                  <UserPlus className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                  <p className="font-medium">Aucun intérimaire pour le moment</p>
                  <p className="text-sm mt-2">
                    Cliquez sur "Ajouter un intérimaire" pour commencer
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Vue Desktop - Tableau */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-50 border-b border-neutral-200">
                    <tr>
                      <th className="text-left p-4 font-semibold text-sm">Nom</th>
                      <th className="text-left p-4 font-semibold text-sm">Email</th>
                      <th className="text-left p-4 font-semibold text-sm">Téléphone</th>
                      <th className="text-left p-4 font-semibold text-sm">Créé le</th>
                      <th className="text-left p-4 font-semibold text-sm">Dernière connexion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInterimaires.map((int) => (
                      <tr
                        key={int.id}
                        className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                      >
                        <td className="p-4">
                          <div className="font-medium text-neutral-900">
                            {int.first_name} {int.last_name}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-neutral-600">
                            <Mail className="w-4 h-4" />
                            <span className="text-sm">{int.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-neutral-600">
                            <Phone className="w-4 h-4" />
                            <span className="text-sm">{int.phone || '-'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-neutral-600">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span className="text-sm">
                              {new Date(int.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          {int.last_login_at ? (
                            <span className="text-sm text-neutral-600">
                              {new Date(int.last_login_at).toLocaleDateString('fr-FR')}
                            </span>
                          ) : (
                            <span className="text-sm text-yellow-600 font-medium">
                              Jamais connecté
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vue Mobile - Cards */}
              <div className="md:hidden divide-y divide-neutral-100">
                {filteredInterimaires.map((int) => (
                  <div key={int.id} className="p-4 hover:bg-neutral-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-neutral-900">
                          {int.first_name} {int.last_name}
                        </h3>
                        {int.last_login_at ? (
                          <span className="text-xs text-neutral-500">
                            Dernière connexion : {new Date(int.last_login_at).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                          <span className="text-xs text-yellow-600 font-medium">
                            Jamais connecté
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Mail className="w-4 h-4 flex-shrink-0" />
                        <span className="break-all">{int.email}</span>
                      </div>

                      {int.phone && (
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                          <Phone className="w-4 h-4 flex-shrink-0" />
                          <span>{int.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        <span>
                          Créé le {new Date(int.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal Ajouter Intérimaire */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Ajouter un intérimaire</h2>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Fermer le modal"
                className="p-1 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInterimaire} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Jean"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Dupont"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="jean.dupont@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+33 6 12 34 56 78"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                  <span className="text-lg">ℹ️</span>
                  <span>
                    Un lien d'inscription sera généré pour que l'intérimaire puisse créer son compte.
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
                  disabled={loading}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary justify-center"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Création...
                    </span>
                  ) : (
                    'Créer l\'intérimaire'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🆕 Modal Succès avec Lien d'Invitation */}
      {showSuccessModal && newInterimaire && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            {/* Header avec icône de succès */}
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">
                Intérimaire créé avec succès !
              </h3>
              <p className="text-neutral-600">
                {newInterimaire.firstName} {newInterimaire.lastName} a été ajouté à votre agence
              </p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 font-medium mb-2">
                📧 Étape suivante : Envoyer le lien d'inscription
              </p>
              <p className="text-sm text-blue-800">
                Copiez le lien ci-dessous et envoyez-le à {newInterimaire.firstName} par email, SMS ou WhatsApp pour qu'il puisse créer son compte.
              </p>
            </div>

            {/* Lien dans un champ copiable */}
            <div className="bg-neutral-50 rounded-lg p-3 mb-4 border border-neutral-200">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={invitationLink}
                  className="flex-1 bg-transparent text-sm text-neutral-700 outline-none font-mono"
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              {/* Bouton Copier */}
              <button
                onClick={() => copyToClipboard(invitationLink)}
                className="flex-1 bg-primary text-white px-4 py-3 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                {copied ? (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" />
                    <span>Copier le lien</span>
                  </>
                )}
              </button>

              {/* Bouton Envoyer par Email */}
              <button
                onClick={sendByEmail}
                className="flex-1 bg-neutral-100 text-neutral-700 px-4 py-3 rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Send className="w-5 h-5" />
                <span>Envoyer par email</span>
              </button>
            </div>

            {/* Bouton Fermer */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setCopied(false);
              }}
              className="w-full text-neutral-600 hover:text-neutral-900 text-sm font-medium py-2"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}