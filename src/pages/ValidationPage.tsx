import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { WEBHOOKS } from '../lib/supabase';
import { Timesheet, ValidationWebhookPayload } from '../types';

export function ValidationPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (token) {
      loadTimesheet();
    } else {
      setError('Token manquant');
      setLoading(false);
    }
  }, [token]);

  const loadTimesheet = async () => {
    try {
      if (WEBHOOKS.READ) {
        const response = await fetch(`${WEBHOOKS.READ}?token=${token}`);
        const data = await response.json();
        if (data.success && data.timesheet) {
          setTimesheet(data.timesheet);
        } else {
          setError('Relevé non trouvé');
        }
      } else {
        // Mode démo
        setTimesheet({
          id: '1',
          employee: { firstName: 'Jean', lastName: 'Dupont', pluriRH: 'RH001' },
          company: { name: 'Entreprise ABC', email: 'contact@abc.com', contractNumber: 'CT-001', location: 'Paris' },
          weekStart: '2024-01-08',
          status: 'waiting',
          submittedAt: new Date().toISOString(),
          submittedBy: 'jean@example.com',
          agencyId: 'demo',
          totalHours: '40.00'
        });
      }
    } catch (err) {
      setError('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (status: 'validé' | 'rejeté') => {
    if (!token) return;
    setValidating(true);

    const payload: ValidationWebhookPayload = {
      token,
      status,
      validatedAt: new Date().toISOString()
    };

    try {
      if (WEBHOOKS.VALIDATION) {
        await fetch(WEBHOOKS.VALIDATION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      setValidated(true);
    } catch (err) {
      alert('Erreur lors de la validation');
    } finally {
      setValidating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-neutral-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md w-full text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Erreur</h2>
          <p className="text-neutral-600">{error}</p>
        </div>
      </div>
    );
  }

  if (validated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
        <div className="bg-white rounded-xl border border-green-200 p-8 max-w-md w-full text-center">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-neutral-900 mb-2">Merci !</h2>
          <p className="text-neutral-600">Votre réponse a bien été enregistrée.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 p-4">
      <div className="max-w-3xl mx-auto py-8">
        <div className="bg-white rounded-xl border border-neutral-200 p-8">
          <h1 className="text-2xl font-bold text-neutral-900 mb-6">
            Validation du Relevé d'Heures
          </h1>

          {timesheet && (
            <>
              <div className="bg-neutral-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-neutral-500">Employé</p>
                    <p className="font-semibold">{timesheet.employee.firstName} {timesheet.employee.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Entreprise</p>
                    <p className="font-semibold">{timesheet.company.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Semaine du</p>
                    <p className="font-semibold">{new Date(timesheet.weekStart).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Total</p>
                    <p className="font-semibold text-2xl text-primary">{timesheet.totalHours}h</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => handleValidation('validé')}
                  disabled={validating}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-md font-medium transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Valider
                </button>
                <button
                  onClick={() => handleValidation('rejeté')}
                  disabled={validating}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md font-medium transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Rejeter
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
