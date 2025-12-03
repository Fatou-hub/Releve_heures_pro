import { useState, useEffect } from 'react';
import { Search, Calendar, User, Building2 } from 'lucide-react';
import { Header } from '../components/Header';
import { useAuth } from '../hooks/useAuth';
import { Timesheet, TimesheetStatus } from '../types';

export function Dashboard() {
  const { user } = useAuth();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | TimesheetStatus>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimesheets();
  }, []);

  const loadTimesheets = async () => {
    // TODO: Charger depuis Supabase ou n8n
    // Pour le moment, données de démo
    const demoData: Timesheet[] = [
      {
        id: '1',
        employee: {
          firstName: 'Jean',
          lastName: 'Dupont',
          pluriRH: 'RH001'
        },
        company: {
          name: 'Entreprise ABC',
          email: 'contact@abc.com',
          contractNumber: 'CT-2024-001',
          location: 'Paris'
        },
        weekStart: '2024-01-08',
        status: 'waiting',
        submittedAt: '2024-01-14T10:30:00Z',
        submittedBy: 'jean.dupont@example.com',
        agencyId: user?.agencyId || '',
        totalHours: '40.00'
      },
      {
        id: '2',
        employee: {
          firstName: 'Marie',
          lastName: 'Martin',
          pluriRH: 'RH002'
        },
        company: {
          name: 'Société XYZ',
          email: 'rh@xyz.com',
          contractNumber: 'CT-2024-002',
          location: 'Lyon'
        },
        weekStart: '2024-01-08',
        status: 'validated',
        submittedAt: '2024-01-14T14:20:00Z',
        submittedBy: 'marie.martin@example.com',
        agencyId: user?.agencyId || '',
        totalHours: '35.50'
      }
    ];
    
    setTimesheets(demoData);
    setLoading(false);
  };

  const filteredTimesheets = timesheets.filter(ts => {
    const matchesSearch = 
      ts.employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ts.employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ts.company.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ts.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: TimesheetStatus) => {
    const badges = {
      waiting: { class: 'bg-yellow-50 text-yellow-800', label: 'En attente' },
      validated: { class: 'bg-green-50 text-green-800', label: 'Validé' },
      rejected: { class: 'bg-red-50 text-red-800', label: 'Rejeté' },
      ongoing: { class: 'bg-blue-50 text-blue-800', label: 'En cours' }
    };
    return badges[status];
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header 
        title="Tableau de Bord" 
        subtitle={user?.agencyName || 'Gestion des relevés'}
        showNewButton 
      />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-neutral-900">
              Relevés d'Heures
            </h2>
            <span className="text-sm text-neutral-500">
              {filteredTimesheets.length} relevé(s)
            </span>
          </div>
          
          {/* Filtres */}
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="flex-1 min-w-[300px] relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                className="w-full px-3.5 py-2.5 pl-10 border border-neutral-200 rounded-md text-sm transition-all bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
                placeholder="Rechercher par nom ou entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-3.5 py-2.5 border border-neutral-200 rounded-md text-sm cursor-pointer transition-all bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <option value="all">Tous les statuts</option>
              <option value="waiting">En attente</option>
              <option value="validated">Validé</option>
              <option value="rejected">Rejeté</option>
              <option value="ongoing">En cours</option>
            </select>
          </div>

          {/* Liste des relevés */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-neutral-500">Chargement...</p>
            </div>
          ) : filteredTimesheets.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-neutral-400" />
              </div>
              <p className="text-base text-neutral-900 mb-1">Aucun relevé trouvé</p>
              <p className="text-sm text-neutral-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Essayez de modifier vos filtres' 
                  : 'Les relevés apparaîtront ici une fois soumis'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTimesheets.map((ts) => {
                const badge = getStatusBadge(ts.status);
                return (
                  <div
                    key={ts.id}
                    className="bg-white border border-neutral-200 rounded-lg p-5 hover:border-neutral-300 hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-2 mb-3">
                          <User className="w-4 h-4 text-neutral-400" />
                          <h3 className="text-base font-semibold text-neutral-900">
                            {ts.employee.firstName} {ts.employee.lastName}
                          </h3>
                          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-medium ${badge.class}`}>
                            {badge.label}
                          </span>
                        </div>
                        
                        <div className="space-y-1.5 text-sm text-neutral-600">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-neutral-400" />
                            <span>{ts.company.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-neutral-400" />
                            <span>Semaine du {new Date(ts.weekStart).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-2xl font-bold text-neutral-900 mb-1">
                          {ts.totalHours}h
                        </div>
                        <p className="text-xs text-neutral-500">
                          Soumis le {new Date(ts.submittedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
