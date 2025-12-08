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

  const days = [
    { key: 'monday', label: 'Lundi' },
    { key: 'tuesday', label: 'Mardi' },
    { key: 'wednesday', label: 'Mercredi' },
    { key: 'thursday', label: 'Jeudi' },
    { key: 'friday', label: 'Vendredi' },
    { key: 'saturday', label: 'Samedi' },
    { key: 'sunday', label: 'Dimanche' }
  ];

  const calculateHours = (start: string, end: string): number => {
    if (!start || !end) return 0;
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH + endM/60) - (startH + startM/60);
  };

  const calculateDayTotal = (day: keyof typeof formData.hours): string => {
    const dayData = formData.hours[day];
    const dayHours = calculateHours(dayData.dayStart, dayData.dayEnd);
    const nightHours = calculateHours(dayData.nightStart, dayData.nightEnd);
    const total = dayHours + nightHours - (dayData.pause || 0);
    return total > 0 ? total.toFixed(2) : '0.00';
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

  const updateDayHours = (day: keyof typeof formData.hours, field: string, value: string | number) => {
    setFormData({
      ...formData,
      hours: {
        ...formData.hours,
        [day]: {
          ...formData.hours[day],
          [field]: value
        }
      }
    });
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
      <div className="max-w-7xl mx-auto px-4 py-8">
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
              <input 
                type="text" 
                placeholder="Prénom" 
                className="form-input" 
                value={formData.employee.firstName} 
                onChange={(e) => setFormData({...formData, employee: {...formData.employee, firstName: e.target.value}})} 
                required 
              />
              <input 
                type="text" 
                placeholder="Nom" 
                className="form-input" 
                value={formData.employee.lastName} 
                onChange={(e) => setFormData({...formData, employee: {...formData.employee, lastName: e.target.value}})} 
                required 
              />
              <input 
                type="text" 
                placeholder="PLURI'RH" 
                className="form-input" 
                value={formData.employee.pluriRH} 
                onChange={(e) => setFormData({...formData, employee: {...formData.employee, pluriRH: e.target.value}})} 
                required 
              />
              <input 
                type="text" 
                placeholder="Entreprise" 
                className="form-input" 
                value={formData.company.name} 
                onChange={(e) => setFormData({...formData, company: {...formData.company, name: e.target.value}})} 
                required 
              />
              <input 
                type="email" 
                placeholder="Email entreprise" 
                className="form-input" 
                value={formData.company.email} 
                onChange={(e) => setFormData({...formData, company: {...formData.company, email: e.target.value}})} 
                required 
              />
              <input 
                type="text" 
                placeholder="N° contrat" 
                className="form-input" 
                value={formData.company.contractNumber} 
                onChange={(e) => setFormData({...formData, company: {...formData.company, contractNumber: e.target.value}})} 
                required 
              />
              <input 
                type="text" 
                placeholder="Lieu" 
                className="form-input" 
                value={formData.company.location} 
                onChange={(e) => setFormData({...formData, company: {...formData.company, location: e.target.value}})} 
                required 
              />
              <input 
                type="date" 
                className="form-input" 
                value={formData.weekStart} 
                onChange={(e) => setFormData({...formData, weekStart: e.target.value})} 
                required 
              />
            </div>
          </div>

          {/* Tableau des Heures Travaillées */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6 overflow-x-auto">
            <h2 className="text-lg font-semibold mb-4">Heures Travaillées</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Total hebdomadaire : <strong className="text-primary">{calculateTotalHours()}h</strong>
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse">
                <thead>
                  <tr className="bg-neutral-50">
                    <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">Jour</th>
                    <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">Début Jour</th>
                    <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">Fin Jour</th>
                    <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">Début Nuit</th>
                    <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">Fin Nuit</th>
                    <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">Pause (h)</th>
                    <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map(({ key, label }) => (
                    <tr key={key} className="hover:bg-neutral-50">
                      <td className="border border-neutral-200 px-3 py-2 text-sm font-medium">{label}</td>
                      <td className="border border-neutral-200 px-2 py-1">
                        <input
                          type="time"
                          className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-primary rounded"
                          value={formData.hours[key as keyof typeof formData.hours].dayStart}
                          onChange={(e) => updateDayHours(key as keyof typeof formData.hours, 'dayStart', e.target.value)}
                        />
                      </td>
                      <td className="border border-neutral-200 px-2 py-1">
                        <input
                          type="time"
                          className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-primary rounded"
                          value={formData.hours[key as keyof typeof formData.hours].dayEnd}
                          onChange={(e) => updateDayHours(key as keyof typeof formData.hours, 'dayEnd', e.target.value)}
                        />
                      </td>
                      <td className="border border-neutral-200 px-2 py-1">
                        <input
                          type="time"
                          className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-primary rounded"
                          value={formData.hours[key as keyof typeof formData.hours].nightStart}
                          onChange={(e) => updateDayHours(key as keyof typeof formData.hours, 'nightStart', e.target.value)}
                        />
                      </td>
                      <td className="border border-neutral-200 px-2 py-1">
                        <input
                          type="time"
                          className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-primary rounded"
                          value={formData.hours[key as keyof typeof formData.hours].nightEnd}
                          onChange={(e) => updateDayHours(key as keyof typeof formData.hours, 'nightEnd', e.target.value)}
                        />
                      </td>
                      <td className="border border-neutral-200 px-2 py-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          className="w-20 px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-primary rounded"
                          value={formData.hours[key as keyof typeof formData.hours].pause}
                          onChange={(e) => updateDayHours(key as keyof typeof formData.hours, 'pause', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="border border-neutral-200 px-3 py-2 text-sm font-semibold text-primary">
                        {calculateDayTotal(key as keyof typeof formData.hours)}h
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-neutral-50 font-semibold">
                    <td colSpan={6} className="border border-neutral-200 px-3 py-2 text-right text-sm">
                      Total Hebdomadaire :
                    </td>
                    <td className="border border-neutral-200 px-3 py-2 text-sm text-primary">
                      {calculateTotalHours()}h
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Commentaires et Statut */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Commentaires</h2>
            <textarea
              placeholder="Ajoutez des commentaires sur cette semaine de travail..."
              className="form-input min-h-[100px]"
              value={formData.comments}
              onChange={(e) => setFormData({...formData, comments: e.target.value})}
            />
          </div>

          {/* Statut et Soumission */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Statut de la Mission</h2>
            <select 
              className="form-input mb-4" 
              value={formData.missionStatus} 
              onChange={(e) => setFormData({...formData, missionStatus: e.target.value as any})}
            >
              <option value="En cours">En cours</option>
              <option value="Terminée">Terminée</option>
              <option value="Suspendue">Suspendue</option>
            </select>
            <button 
              type="submit" 
              className="w-full btn-primary justify-center py-3" 
              disabled={loading}
            >
              {loading ? 'Envoi en cours...' : 'Soumettre le relevé'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}