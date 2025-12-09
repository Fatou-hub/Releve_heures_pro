// Types pour les rôles utilisateur
export type UserRole = 'agence' | 'interimaire' | 'client';

// Profile utilisateur Supabase
export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  agency_id: string | null;
  created_at?: string;
  updated_at?: string;
}

// Informations utilisateur enrichies
export interface User {
  id: string;
  email: string;
  role: UserRole;
  agencyId: string | null;
  agencyName?: string;
}

// Données d'un employé
export interface Employee {
  firstName: string;
  lastName: string;
  pluriRH: string;
}

// Données d'une entreprise
export interface Company {
  name: string;
  email: string;
  contractNumber: string;
  location: string;
}

// Heures d'une journée
export interface DayHours {
  date: string;
  dayStart: string;
  dayEnd: string;
  nightStart: string;
  nightEnd: string;
  pause: number;
}

// Heures de la semaine
export interface WeekHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

// Statut de mission
export type MissionStatus = 'Terminée' | 'En cours' | 'Suspendue';

// Données du formulaire de relevé
export interface TimesheetFormData {
  employee: Employee;
  company: Company;
  weekStart: string;
  hours: WeekHours;
  comments: string;
  missionStatus: MissionStatus;
}

// Statut du relevé
export type TimesheetStatus = 'waiting' | 'validated' | 'rejected' | 'ongoing';

// Relevé complet
export interface Timesheet {
  id?: string;
  employee: Employee;
  company: Company;
  weekStart: string;
  status: TimesheetStatus;
  submittedAt: string;
  submittedBy: string;
  agencyId: string;
  totalHours?: string;
  hours?: WeekHours;
  comments?: string;
  missionStatus?: MissionStatus;
}

// Payload pour le webhook de soumission
export interface SubmissionWebhookPayload {
  timesheetId: string;
  agencyId: string;
  agencyName?: string;
  submittedBy: string;
  submittedAt: string;
  releve_data: {
    employee: Employee;
    company: Company;
    weekStart: string;
    hours: WeekHours;
    comments: string;
    missionStatus: MissionStatus;
    totalHours: string;
  };
  client_email: string;
}

// Payload pour le webhook de validation
export interface ValidationWebhookPayload {
  token: string;
  status: 'validé' | 'rejeté';
  comments?: string;
  validatedBy?: string;
  validatedAt: string;
}

// Réponse du webhook de lecture
export interface ReadWebhookResponse {
  success: boolean;
  timesheet: Timesheet;
}
