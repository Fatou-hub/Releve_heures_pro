import { useState, FormEvent } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { supabase, WEBHOOKS } from '../lib/supabase';
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
    { key: 'monday', label: 'Lundi', emoji: '📅' },
    { key: 'tuesday', label: 'Mardi', emoji: '📅' },
    { key: 'wednesday', label: 'Mercredi', emoji: '📅' },
    { key: 'thursday', label: 'Jeudi', emoji: '📅' },
    { key: 'friday', label: 'Vendredi', emoji: '📅' },
    { key: 'saturday', label: 'Samedi', emoji: '📅' },
    { key: 'sunday', label: 'Dimanche', emoji: '📅' }
  ];

  // Fonction pour obtenir le numéro de semaine ISO
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  // Fonction pour formater une date complète
  const formatFullDate = (dateStr: string, dayIndex: number): string => {
    const startDate = new Date(dateStr);
    const targetDate = new Date(startDate);
    targetDate.setDate(startDate.getDate() + dayIndex);
    
    const day = targetDate.getDate();
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const month = months[targetDate.getMonth()];
    const year = targetDate.getFullYear();
    
    return `${day} ${month} ${year}`;
  };

  // Calculer la période de la semaine
  const getWeekPeriod = (): { weekNumber: number; year: number; startDate: string; endDate: string } => {
    const startDate = new Date(formData.weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return {
      weekNumber: getWeekNumber(startDate),
      year: startDate.getFullYear(),
      startDate: formatFullDate(formData.weekStart, 0),
      endDate: formatFullDate(formData.weekStart, 6)
    };
  };

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
    
    // Vérifier qu'au moins un jour a des heures
    const totalHours = parseFloat(calculateTotalHours());
    if (totalHours === 0) {
      alert('⚠️ Veuillez remplir au moins un jour avec des heures travaillées avant de soumettre le relevé.');
      return;
    }

    setLoading(true);

    try {
      const weekPeriod = getWeekPeriod();

      // 1. Insérer dans Supabase (PRIORITÉ - Lien de cardinalité créé ici !)
      const { data: timesheetData, error: insertError } = await supabase
        .from('timesheets')
        .insert({
          submitted_by: user?.email || '',
          agency_id: user?.agencyId || null, // ← LIEN DE CARDINALITÉ !
          client_email: formData.company.email,
          
          employee_first_name: formData.employee.firstName,
          employee_last_name: formData.employee.lastName,
          employee_pluri_rh: formData.employee.pluriRH,
          
          company_name: formData.company.name,
          company_email: formData.company.email,
          company_contract_number: formData.company.contractNumber,
          company_location: formData.company.location,
          
          week_start: formData.weekStart,
          week_number: weekPeriod.weekNumber,
          year: weekPeriod.year,
          hours: formData.hours,
          comments: formData.comments,
          mission_status: formData.missionStatus,
          total_hours: totalHours,
          
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Envoyer le webhook n8n (OPTIONNEL - pour notifications)
      if (WEBHOOKS.SUBMISSION && timesheetData) {
        const payload: SubmissionWebhookPayload = {
          timesheetId: timesheetData.id,
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

        // Envoyer sans bloquer si ça échoue
        fetch(WEBHOOKS.SUBMISSION, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(err => console.error('Erreur webhook:', err));
      }

      alert('✅ Relevé soumis avec succès !');
      
      // Rediriger selon le rôle
      if (user?.role === 'agence') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
      
    } catch (error: any) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la soumission : ' + (error.message || 'Une erreur est survenue'));
    } finally {
      setLoading(false);
    }
  };

  // Composant Card Mobile pour un jour
  const DayCard = ({ dayKey, label, emoji, dayIndex }: { dayKey: keyof typeof formData.hours; label: string; emoji: string; dayIndex: number }) => {
    const dayData = formData.hours[dayKey];
    const total = calculateDayTotal(dayKey);
    const hasHours = parseFloat(total) > 0;
    const fullDate = formatFullDate(formData.weekStart, dayIndex);

    return (
      <div className={`bg-white rounded-xl border ${hasHours ? 'border-primary' : 'border-neutral-200'} p-5 mb-4 shadow-sm`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <span>{emoji}</span>
              <span>{label}</span>
            </h3>
            <p className="text-xs text-neutral-500 mt-1">{fullDate}</p>
          </div>
          <span className={`text-lg font-bold ${hasHours ? 'text-primary' : 'text-neutral-400'}`}>
            {total}h
          </span>
        </div>

        <div className="space-y-3">
          {/* Heures de Jour */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                ☀️ Début jour
              </label>
              <input
                type="time"
                aria-label="Heure de début de journée"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={dayData.dayStart}
                onChange={(e) => updateDayHours(dayKey, 'dayStart', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                ☀️ Fin jour
              </label>
              <input
                type="time"
                aria-label="Heure de fin de journée"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={dayData.dayEnd}
                onChange={(e) => updateDayHours(dayKey, 'dayEnd', e.target.value)}
              />
            </div>
          </div>

          {/* Heures de Nuit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                🌙 Début nuit
              </label>
              <input
                type="time"
                aria-label="Heure de début de nuit"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={dayData.nightStart}
                onChange={(e) => updateDayHours(dayKey, 'nightStart', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-600 mb-1">
                🌙 Fin nuit
              </label>
              <input
                type="time"
                aria-label="Heure de fin de nuit"
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={dayData.nightEnd}
                onChange={(e) => updateDayHours(dayKey, 'nightEnd', e.target.value)}
              />
            </div>
          </div>

          {/* Pause */}
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">
              ⏸️ Pause (heures)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              aria-label="Durée de la pause en heures"
              className="w-full px-3 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={dayData.pause}
              onChange={(e) => updateDayHours(dayKey, 'pause', parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {hasHours && (
          <div className="mt-3 pt-3 border-t border-neutral-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-600">Total du jour</span>
              <span className="text-lg font-bold text-primary">{total}h</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Composant Tableau Desktop
  const DaysTable = () => {
    const weekPeriod = getWeekPeriod();
    
    return (
      <div className="overflow-x-auto">
        {/* Numéro de Semaine */}
        <div className="bg-primary/10 rounded-lg px-4 py-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">SEMAINE {weekPeriod.weekNumber} / {weekPeriod.year}</p>
              <p className="text-xs text-neutral-600 mt-1">Du {weekPeriod.startDate} au {weekPeriod.endDate}</p>
            </div>
          </div>
        </div>

        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr className="bg-neutral-50">
              <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">📅 Jour</th>
              <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">☀️ Début Jour</th>
              <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">☀️ Fin Jour</th>
              <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">🌙 Début Nuit</th>
              <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">🌙 Fin Nuit</th>
              <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">⏸️ Pause (h)</th>
              <th className="border border-neutral-200 px-3 py-2 text-left text-sm font-semibold">✅ Total</th>
            </tr>
          </thead>
          <tbody>
            {days.map(({ key, label, emoji }, index) => (
              <tr key={key} className="hover:bg-neutral-50">
                <td className="border border-neutral-200 px-3 py-2 text-sm font-medium">
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2">
                      <span>{emoji}</span>
                      <span>{label}</span>
                    </span>
                    <span className="text-xs text-neutral-500 mt-1">
                      {formatFullDate(formData.weekStart, index)}
                    </span>
                  </div>
                </td>
                <td className="border border-neutral-200 px-2 py-1">
                  <input
                    type="time"
                    aria-label={`Heure de début de journée pour ${key}`}
                    className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-primary rounded"
                    value={formData.hours[key as keyof typeof formData.hours].dayStart}
                    onChange={(e) => updateDayHours(key as keyof typeof formData.hours, 'dayStart', e.target.value)}
                  />
                </td>
                <td className="border border-neutral-200 px-2 py-1">
                  <input
                    type="time"
                    aria-label={`Heure de fin de journée pour ${key}`}
                    className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-primary rounded"
                    value={formData.hours[key as keyof typeof formData.hours].dayEnd}
                    onChange={(e) => updateDayHours(key as keyof typeof formData.hours, 'dayEnd', e.target.value)}
                  />
                </td>
                <td className="border border-neutral-200 px-2 py-1">
                  <input
                    type="time"
                    aria-label={`Heure de début de nuit pour ${key}`}
                    className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-primary rounded"
                    value={formData.hours[key as keyof typeof formData.hours].nightStart}
                    onChange={(e) => updateDayHours(key as keyof typeof formData.hours, 'nightStart', e.target.value)}
                  />
                </td>
                <td className="border border-neutral-200 px-2 py-1">
                  <input
                    type="time"
                    aria-label={`Heure de fin de nuit pour ${key}`}
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
                    aria-label={`Durée de pause pour ${key}`}
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
    );
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
                placeholder="Nom de l'Agence Interim" 
                className="form-input" 
                value={formData.employee.pluriRH} 
                onChange={(e) => setFormData({...formData, employee: {...formData.employee, pluriRH: e.target.value}})} 
                required 
              />
              <input 
                type="text" 
                placeholder="Nom de l'Entreprise utilisatrice" 
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
                placeholder="N° contrat (optionnel)" 
                className="form-input" 
                value={formData.company.contractNumber} 
                onChange={(e) => setFormData({...formData, company: {...formData.company, contractNumber: e.target.value}})} 
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
                aria-label="Date de début de semaine"
                className="form-input" 
                value={formData.weekStart} 
                onChange={(e) => setFormData({...formData, weekStart: e.target.value})} 
                required 
              />
            </div>
          </div>

          {/* Heures Travaillées - Vue Adaptative */}
          <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Heures Travaillées</h2>
              <div className="text-right">
                <p className="text-xs text-neutral-500">Total hebdomadaire</p>
                <p className="text-2xl font-bold text-primary">{calculateTotalHours()}h</p>
              </div>
            </div>
            
            {/* Vue Desktop (Tableau) - Visible sur écrans >= 768px */}
            <div className="hidden md:block">
              <DaysTable />
            </div>

            {/* Vue Mobile (Cards) - Visible sur écrans < 768px */}
            <div className="md:hidden">
              {/* Numéro de Semaine Mobile */}
              <div className="bg-primary/10 rounded-lg px-4 py-3 mb-4">
                <p className="text-sm font-semibold text-primary">SEMAINE {getWeekPeriod().weekNumber} / {getWeekPeriod().year}</p>
                <p className="text-xs text-neutral-600 mt-1">Du {getWeekPeriod().startDate} au {getWeekPeriod().endDate}</p>
              </div>

              {days.map(({ key, label, emoji }, index) => (
                <DayCard 
                  key={key} 
                  dayKey={key as keyof typeof formData.hours} 
                  label={label}
                  emoji={emoji}
                  dayIndex={index}
                />
              ))}
              
              {/* Total Mobile */}
              <div className="bg-primary/10 rounded-xl p-4 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-neutral-700">Total Hebdomadaire</span>
                  <span className="text-2xl font-bold text-primary">{calculateTotalHours()}h</span>
                </div>
              </div>
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
              aria-label="Statut de la mission"
              className="form-input mb-4" 
              value={formData.missionStatus} 
              onChange={(e) => setFormData({...formData, missionStatus: e.target.value as any})}
            >
              <option value="En cours">Continue la semaine prochaine</option>
              <option value="Terminée">Mission terminée</option>
              <option value="Suspendue">Départ volontaire</option>
              <option value="Suspendue">Embauché(e) par le client</option>
            </select>
            <button 
              type="submit" 
              className="w-full btn-primary justify-center py-3 text-base font-semibold" 
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