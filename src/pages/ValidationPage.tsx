import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CheckCircle, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface TimesheetData {
  id: string;
  employee_first_name: string;
  employee_last_name: string;
  company_name: string;
  week_start: string;
  total_hours: number;
  hours: any;
  status: string;
  comments?: string;
}

interface TokenData {
  token: string;
  timesheet_id: string;
  expires_at: string;
  used: boolean;
  timesheets: TimesheetData;
}

type ValidationStatus = 'loading' | 'valid' | 'expired' | 'used' | 'notfound' | 'success' | 'error';

export function ValidationPage() {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const action = searchParams.get('action'); // 'approve' ou 'reject'
  
  const [status, setStatus] = useState<ValidationStatus>('loading');
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    try {
      console.log('🔍 Vérification du token:', token);

      // Récupérer le token et le relevé associé
      const { data, error } = await supabase
        .from('validation_tokens')
        .select(`
          *,
          timesheets (*)
        `)
        .eq('token', token)
        .single();

      if (error || !data) {
        console.error('❌ Token non trouvé:', error);
        setStatus('notfound');
        return;
      }

      console.log('✅ Token trouvé:', data);

      // Vérifier si le token a déjà été utilisé
      if (data.used) {
        console.log('⚠️ Token déjà utilisé');
        setStatus('used');
        return;
      }

      // Vérifier si le token a expiré
      const expiresAt = new Date(data.expires_at);
      if (expiresAt < new Date()) {
        console.log('⚠️ Token expiré');
        setStatus('expired');
        return;
      }

      // Token valide
      setTokenData(data as TokenData);
      setStatus('valid');

    } catch (err) {
      console.error('❌ Erreur vérification token:', err);
      setStatus('error');
    }
  };

  const handleValidation = async (approved: boolean) => {
    if (!tokenData) return;

    setSubmitting(true);

    try {
      console.log(`📝 ${approved ? 'Approbation' : 'Rejet'} du relevé...`);

      // 1. Mettre à jour le relevé dans Supabase
      const { error: updateError } = await supabase
        .from('timesheets')
        .update({
          status: approved ? 'approved' : 'rejected',
          validation_comment: comment || null,
          validated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenData.timesheet_id);

      if (updateError) throw updateError;

      console.log('✅ Relevé mis à jour');

      // 2. Marquer le token comme utilisé
      const { error: tokenError } = await supabase
        .from('validation_tokens')
        .update({
          used: true,
          used_at: new Date().toISOString()
        })
        .eq('token', token);

      if (tokenError) throw tokenError;

      console.log('✅ Token marqué comme utilisé');

      // 3. NOUVEAU : Déclencher webhook n8n pour notification
      try {
        const webhookUrl = 'http://localhost:5678/webhook/notification-validation';
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timesheet_id: tokenData.timesheet_id,
            status: approved ? 'approved' : 'rejected',
            comment: comment || null,
            validated_at: new Date().toISOString(),
            employee_name: `${tokenData.timesheets.employee_first_name} ${tokenData.timesheets.employee_last_name}`,
            company_name: tokenData.timesheets.company_name
          })
        });
        console.log('✅ Notification envoyée via n8n');
      } catch (webhookError) {
        console.warn('⚠️ Erreur webhook notification (non bloquant):', webhookError);
        // Ne pas bloquer si le webhook échoue
      }

      // 4. Afficher le succès
      setStatus('success');

    } catch (err: any) {
      console.error('❌ Erreur validation:', err);
      alert('Une erreur est survenue : ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // LOADING
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-neutral-600">Vérification du lien...</p>
        </div>
      </div>
    );
  }

  // TOKEN INVALIDE / EXPIRÉ / UTILISÉ
  if (status === 'notfound' || status === 'expired' || status === 'used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-neutral-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            {status === 'expired' ? (
              <Clock className="w-8 h-8 text-red-600" />
            ) : (
              <AlertCircle className="w-8 h-8 text-red-600" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            {status === 'notfound' && 'Lien invalide'}
            {status === 'expired' && 'Lien expiré'}
            {status === 'used' && 'Relevé déjà validé'}
          </h1>
          
          <p className="text-neutral-600">
            {status === 'notfound' && 'Ce lien de validation n\'existe pas ou est incorrect.'}
            {status === 'expired' && 'Ce lien de validation a expiré. Veuillez contacter l\'agence.'}
            {status === 'used' && 'Ce relevé d\'heures a déjà été validé précédemment.'}
          </p>
        </div>
      </div>
    );
  }

  // SUCCÈS
  if (status === 'success') {
    const approved = action === 'approve';
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-neutral-200 p-8 text-center">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            approved ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {approved ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <XCircle className="w-8 h-8 text-red-600" />
            )}
          </div>
          
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            {approved ? 'Relevé approuvé !' : 'Relevé rejeté'}
          </h1>
          
          <p className="text-neutral-600 mb-6">
            {approved 
              ? 'Le relevé d\'heures a été approuvé avec succès. L\'agence et l\'intérimaire ont été notifiés.'
              : 'Le relevé d\'heures a été rejeté. L\'agence et l\'intérimaire ont été notifiés.'
            }
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              📧 Un email de confirmation vous a été envoyé.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // FORMULAIRE DE VALIDATION
  if (status === 'valid' && tokenData) {
    const timesheet = tokenData.timesheets;
    const isApprove = action === 'approve';

    return (
      <div className="min-h-screen bg-neutral-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Header */}
            <div className={`p-6 ${isApprove ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                {isApprove ? (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-600" />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-neutral-900">
                    {isApprove ? 'Approuver le relevé' : 'Rejeter le relevé'}
                  </h1>
                  <p className="text-sm text-neutral-600">
                    Vérifiez les informations avant de confirmer
                  </p>
                </div>
              </div>
            </div>

            {/* Détails du relevé */}
            <div className="p-6 space-y-6">
              {/* Informations principales */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase">
                    Intérimaire
                  </label>
                  <p className="text-lg font-semibold text-neutral-900">
                    {timesheet.employee_first_name} {timesheet.employee_last_name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase">
                    Entreprise
                  </label>
                  <p className="text-lg font-semibold text-neutral-900">
                    {timesheet.company_name}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase">
                    Semaine du
                  </label>
                  <p className="text-lg font-semibold text-neutral-900">
                    {new Date(timesheet.week_start).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-neutral-500 uppercase">
                    Heures totales
                  </label>
                  <p className="text-lg font-semibold text-green-600">
                    {timesheet.total_hours}h
                  </p>
                </div>
              </div>

              {/* Détail des heures par jour */}
              <div>
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">
                  Détail des heures
                </h3>
                <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
                  {timesheet.hours && Object.entries(timesheet.hours).map(([day, data]: [string, any]) => {
                    const dayHours = data.dayStart && data.dayEnd
                      ? calculateHours(data.dayStart, data.dayEnd, data.pause || 0)
                      : 0;
                    
                    if (dayHours === 0) return null;

                    return (
                      <div key={day} className="flex justify-between items-center py-2 border-b border-neutral-200 last:border-0">
                        <span className="font-medium text-neutral-700 capitalize">
                          {translateDay(day)}
                        </span>
                        <span className="text-neutral-900">
                          {dayHours}h ({data.dayStart} - {data.dayEnd}, pause {data.pause}h)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Commentaire (optionnel) */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 mb-2">
                  Commentaire (optionnel)
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  rows={3}
                  placeholder={isApprove 
                    ? "Ajoutez un commentaire si nécessaire..."
                    : "Indiquez la raison du rejet..."
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => window.history.back()}
                  className="flex-1 px-4 py-3 border border-neutral-300 rounded-lg font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleValidation(isApprove)}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium text-white transition-colors flex items-center justify-center gap-2 ${
                    isApprove
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Traitement...</span>
                    </>
                  ) : (
                    <>
                      {isApprove ? (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Confirmer l'approbation</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-5 h-5" />
                          <span>Confirmer le rejet</span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Fonction utilitaire pour calculer les heures
function calculateHours(start: string, end: string, pause: number): number {
  if (!start || !end) return 0;
  
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  const totalMinutes = endMinutes - startMinutes - (pause * 60);
  return Math.max(0, totalMinutes / 60);
}

// Traduire les jours en français
function translateDay(day: string): string {
  const days: Record<string, string> = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche',
  };
  return days[day.toLowerCase()] || day;
}