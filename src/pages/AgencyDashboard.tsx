import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/Header';
import { 
  FileText, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  TrendingUp,
  Eye
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Timesheet {
  id: string;
  submitted_by: string;
  employee_first_name: string;
  employee_last_name: string;
  company_name: string;
  company_email: string;
  week_start: string;
  week_number: number;
  year: number;
  total_hours: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  validated_at: string | null;
}

interface Stats {
  totalInterimaires: number;
  totalTimesheets: number;
  pendingTimesheets: number;
  approvedTimesheets: number;
  rejectedTimesheets: number;
  hoursThisMonth: number;
}

export function AgencyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [filteredTimesheets, setFilteredTimesheets] = useState<Timesheet[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalInterimaires: 0,
    totalTimesheets: 0,
    pendingTimesheets: 0,
    approvedTimesheets: 0,
    rejectedTimesheets: 0,
    hoursThisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Filtrer les relevés selon le statut
    if (statusFilter === 'all') {
      setFilteredTimesheets(timesheets);
    } else {
      setFilteredTimesheets(timesheets.filter(ts => ts.status === statusFilter));
    }
  }, [statusFilter, timesheets]);

  const fetchDashboardData = async () => {
    try {
      // 1. Récupérer les relevés
      const { data: timesheetsData, error: timesheetsError } = await supabase
        .from('timesheets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (timesheetsError) throw timesheetsError;
      setTimesheets(timesheetsData || []);
      setFilteredTimesheets(timesheetsData || []);

      // 2. Récupérer les statistiques
      const { data: interimairesData, error: interimairesError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'interimaire')
        .eq('agency_id', user?.id);

      if (interimairesError) throw interimairesError;

      // Calculer les stats
      const pending = timesheetsData?.filter(ts => ts.status === 'pending').length || 0;
      const approved = timesheetsData?.filter(ts => ts.status === 'approved').length || 0;
      const rejected = timesheetsData?.filter(ts => ts.status === 'rejected').length || 0;

      // Heures ce mois
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const hoursThisMonth = timesheetsData
        ?.filter(ts => new Date(ts.created_at) >= firstDayOfMonth)
        .reduce((sum, ts) => sum + (ts.total_hours || 0), 0) || 0;

      setStats({
        totalInterimaires: interimairesData?.length || 0,
        totalTimesheets: timesheetsData?.length || 0,
        pendingTimesheets: pending,
        approvedTimesheets: approved,
        rejectedTimesheets: rejected,
        hoursThisMonth: hoursThisMonth
      });

    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    color, 
    bgColor 
  }: { 
    icon: any; 
    label: string; 
    value: number | string; 
    color: string; 
    bgColor: string; 
  }) => (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className={`p-2 sm:p-3 ${bgColor} rounded-lg`}>
          <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-neutral-600 truncate">{label}</p>
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 mt-1">{value}</p>
        </div>
      </div>
    </div>
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Validé</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            <span className="hidden sm:inline">Rejeté</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            <span className="hidden sm:inline">En attente</span>
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Header title="Dashboard Agence" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Bienvenue */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">
            Bienvenue, {user?.agencyName || user?.email}
          </h1>
          <p className="text-neutral-600 mt-1">
            Voici un aperçu de votre activité
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Statistiques */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <StatCard
                icon={Users}
                label="Intérimaires"
                value={stats.totalInterimaires}
                color="text-blue-600"
                bgColor="bg-blue-50"
              />
              <StatCard
                icon={FileText}
                label="Relevés totaux"
                value={stats.totalTimesheets}
                color="text-purple-600"
                bgColor="bg-purple-50"
              />
              <StatCard
                icon={Clock}
                label="En attente"
                value={stats.pendingTimesheets}
                color="text-yellow-600"
                bgColor="bg-yellow-50"
              />
              <StatCard
                icon={TrendingUp}
                label="Heures ce mois"
                value={`${stats.hoursThisMonth.toFixed(0)}h`}
                color="text-green-600"
                bgColor="bg-green-50"
              />
            </div>

            {/* Actions rapides */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 sm:mb-8">
              <button
                onClick={() => navigate('/manage-interimaires')}
                className="bg-white border-2 border-primary rounded-xl p-4 sm:p-6 hover:bg-primary/5 transition-colors text-left"
              >
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary mb-2 sm:mb-3" />
                <h3 className="font-semibold text-base sm:text-lg mb-1">Gérer mes intérimaires</h3>
                <p className="text-xs sm:text-sm text-neutral-600">
                  Ajouter, consulter et gérer vos intérimaires
                </p>
              </button>

              <button
                onClick={() => navigate('/nouveau-releve')}
                className="bg-white border-2 border-neutral-200 rounded-xl p-4 sm:p-6 hover:border-primary hover:bg-primary/5 transition-colors text-left"
              >
                <FileText className="w-6 h-6 sm:w-8 sm:h-8 text-neutral-600 mb-2 sm:mb-3" />
                <h3 className="font-semibold text-base sm:text-lg mb-1">Nouveau relevé</h3>
                <p className="text-xs sm:text-sm text-neutral-600">
                  Créer un relevé d'heures pour un intérimaire
                </p>
              </button>
            </div>

            {/* Liste des relevés */}
            <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-neutral-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Relevés récents ({filteredTimesheets.length})
                  </h2>
                  
                  {/* Filtres */}
                  <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        statusFilter === 'all'
                          ? 'bg-primary text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      Tous
                    </button>
                    <button
                      onClick={() => setStatusFilter('pending')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        statusFilter === 'pending'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      En attente
                    </button>
                    <button
                      onClick={() => setStatusFilter('approved')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        statusFilter === 'approved'
                          ? 'bg-green-500 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      Validés
                    </button>
                    <button
                      onClick={() => setStatusFilter('rejected')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        statusFilter === 'rejected'
                          ? 'bg-red-500 text-white'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                      }`}
                    >
                      Rejetés
                    </button>
                  </div>
                </div>
              </div>

              {filteredTimesheets.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
                  <p className="font-medium">Aucun relevé pour le moment</p>
                  <p className="text-sm mt-2">
                    Les relevés soumis par vos intérimaires apparaîtront ici
                  </p>
                </div>
              ) : (
                <>
                  {/* Vue Desktop - Tableau */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-neutral-50">
                        <tr>
                          <th className="text-left p-4 font-semibold text-sm">Intérimaire</th>
                          <th className="text-left p-4 font-semibold text-sm">Entreprise</th>
                          <th className="text-left p-4 font-semibold text-sm">Semaine</th>
                          <th className="text-left p-4 font-semibold text-sm">Heures</th>
                          <th className="text-left p-4 font-semibold text-sm">Statut</th>
                          <th className="text-left p-4 font-semibold text-sm">Date soumission</th>
                          <th className="text-left p-4 font-semibold text-sm">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTimesheets.map((ts) => (
                          <tr 
                            key={ts.id} 
                            className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors"
                          >
                            <td className="p-4">
                              <div className="font-medium text-neutral-900">
                                {ts.employee_first_name} {ts.employee_last_name}
                              </div>
                              <div className="text-xs text-neutral-500">{ts.submitted_by}</div>
                            </td>
                            <td className="p-4">
                              <div className="font-medium text-neutral-900">{ts.company_name}</div>
                              <div className="text-xs text-neutral-500">{ts.company_email}</div>
                            </td>
                            <td className="p-4">
                              <div className="text-sm">
                                Semaine {ts.week_number} / {ts.year}
                              </div>
                              <div className="text-xs text-neutral-500">
                                {new Date(ts.week_start).toLocaleDateString('fr-FR')}
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="font-semibold text-primary">
                                {ts.total_hours}h
                              </span>
                            </td>
                            <td className="p-4">{getStatusBadge(ts.status)}</td>
                            <td className="p-4 text-sm text-neutral-600">
                              {new Date(ts.created_at).toLocaleDateString('fr-FR')}
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => navigate(`/releve/${ts.id}`)}
                                className="flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <Eye className="w-4 h-4" />
                                Voir
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Vue Mobile - Cards */}
                  <div className="md:hidden divide-y divide-neutral-100">
                    {filteredTimesheets.map((ts) => (
                      <div key={ts.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-neutral-900 truncate">
                              {ts.employee_first_name} {ts.employee_last_name}
                            </h3>
                            <p className="text-sm text-neutral-600 truncate">{ts.company_name}</p>
                          </div>
                          {getStatusBadge(ts.status)}
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-600">Semaine :</span>
                            <span className="font-medium">S{ts.week_number} / {ts.year}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-600">Heures :</span>
                            <span className="font-semibold text-primary">{ts.total_hours}h</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-neutral-600">Soumis le :</span>
                            <span>{new Date(ts.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate(`/releve/${ts.id}`)}
                          className="w-full mt-3 py-2 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                        >
                          <Eye className="w-4 h-4" />
                          Voir le détail
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}