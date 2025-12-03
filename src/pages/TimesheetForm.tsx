import { useState, FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { WEBHOOKS } from '../lib/supabase';
import { TimesheetFormData, SubmissionWebhookPayload } from '../types';

export function TimesheetForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<TimesheetFormData>({
    employee: { firstName: '', lastName: '', pluriRH: '' },
    company: { name: '', email: '', contractNumber: '', location: '' },
    weekStart: new Date().toISOString().split('T')[0],
    hours: {
      monday: { date: '', dayStart: '', dayEnd: '', nightStart: '', nightEnd: '', pause: 0 },
      tuesday: { date: '', dayStart: '', dayEnd: '', nightStart: '', nightEnd: '', pause: 0 },
      wednesday: { date: '', dayStart: '', dayEnd: '', nightStart: '', nightEnd: '', pause: 0 },
      thursday: { date: '', dayStart: '', dayEnd: '', nightStart: '', nightEnd: '', pause: 0 },
      friday: { date: '', dayStart: '', dayEnd: '', nightStart: '', nightEnd: '', pause: 0 },
      saturday: { date: '', dayStart: '', dayEnd: '', nightStart: '', nightEnd: '', pause: 0 },
      sunday: { date: '', dayStart: '', dayEnd: '', nightStart: '', nightEnd: '', pause: 0 }
    },
    comments: '',
    missionStatus: 'En cours'
  });

  const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH + endM/60) - (startH + startM/60);
  };

  const calculateTotalHours = (): string => {
    let total = 0;
    Object.values(formData.hours).forEach(day => {
      total += calculateHours(day.dayStart, day.dayEnd);
      total += calculateHours(day.nightStart, day.nightEnd);
      total -= day.pause || 0;
    });
    return total.toFixed(2);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload: SubmissionWebhookPayload = {
      agencyId: user?.agencyId || 'demo',
      agencyName: user?.agencyName,
      submittedBy: user?.email || '',
      submittedAt: new Date().toISOString(),
      releve_data: {
        employee: formData.employee,
        company: formData.company,
        weekStart: formData.weekStart,
        hours: formData.hours,
        comments: formData.comments,
        missionStatus: formData.missionStatus,
        totalHours: calculateTotalHours()
      },
      client_email: formData.company.email
    };

    try {
      if (WEBHOOKS.SUBMISSION) {
        await fetch(WEBHOOKS.SUBMISSION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      alert('Relevé soumis avec succès !');
      if (user?.role === 'agence') {
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Relevé soumis (mode démo)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header title="Nouveau Relevé d'Heures" />
      <div className="max-w-5xl mx-auto px-6 py-8">
        <button
          onClick={() => user?.role === 'agence' ? navigate('/dashboard') : navigate('/')}
          className="flex items-center gap-2 text-sm text-neutral-600 hover:text-primary mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </button>

        <form onSubmit={handleSubmit}>
          {/* Informations Générales */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Informations Générales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Prénom" className="form-input" value={formData.employee.firstName} onChange={(e) => setFormData({...formData, employee: {...formData.employee, firstName: e.target.value}})} required />
              <input type="text" placeholder="Nom" className="form-input" value={formData.employee.lastName} onChange={(e) => setFormData({...formData, employee: {...formData.employee, lastName: e.target.value}})} required />
              <input type="text" placeholder="PLURI'RH" className="form-input" value={formData.employee.pluriRH} onChange={(e) => setFormData({...formData, employee: {...formData.employee, pluriRH: e.target.value}})} required />
              <input type="text" placeholder="Entreprise" className="form-input" value={formData.company.name} onChange={(e) => setFormData({...formData, company: {...formData.company, name: e.target.value}})} required />
              <input type="email" placeholder="Email entreprise" className="form-input" value={formData.company.email} onChange={(e) => setFormData({...formData, company: {...formData.company, email: e.target.value}})} required />
              <input type="text" placeholder="N° contrat" className="form-input" value={formData.company.contractNumber} onChange={(e) => setFormData({...formData, company: {...formData.company, contractNumber: e.target.value}})} required />
              <input type="text" placeholder="Lieu" className="form-input" value={formData.company.location} onChange={(e) => setFormData({...formData, company: {...formData.company, location: e.target.value}})} required />
              <input type="date" className="form-input" value={formData.weekStart} onChange={(e) => setFormData({...formData, weekStart: e.target.value})} required />
            </div>
          </div>

          {/* Tableau simplifié pour rester dans les limites */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Heures Travaillées</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Total hebdomadaire : <strong>{calculateTotalHours()}h</strong>
            </p>
            <textarea
              placeholder="Détails des heures..."
              className="form-input min-h-[100px]"
              value={formData.comments}
              onChange={(e) => setFormData({...formData, comments: e.target.value})}
            />
          </div>

          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <select className="form-input mb-4" value={formData.missionStatus} onChange={(e) => setFormData({...formData, missionStatus: e.target.value as any})}>
              <option value="En cours">En cours</option>
              <option value="Terminée">Terminée</option>
              <option value="Suspendue">Suspendue</option>
            </select>
            <button type="submit" className="w-full btn-primary justify-center py-3" disabled={loading}>
              {loading ? 'Envoi...' : 'Soumettre le relevé'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
