-- ============================================
-- SCHEMA SUPABASE POUR RELEVÉ HEURES PRO
-- ============================================

-- 1. Créer la table des profils utilisateurs
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('agence', 'interimaire', 'client')),
  agency_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Activer Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Créer les politiques RLS pour les profils
-- Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

-- Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Les agences peuvent voir les profils de leur agence
CREATE POLICY "Agencies can view their agency profiles" 
  ON public.profiles FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'agence' 
      AND agency_id = public.profiles.agency_id
    )
  );

-- 4. Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, agency_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'interimaire'),
    NEW.raw_user_meta_data->>'agency_id'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger pour appeler la fonction lors de l'inscription
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger pour updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- TABLE OPTIONNELLE : RELEVÉS (SI STOCKAGE LOCAL)
-- ============================================
-- Note: Si vous utilisez uniquement n8n/Airtable pour stocker les relevés,
-- cette table n'est pas nécessaire. Sinon, décommentez :

/*
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id TEXT NOT NULL,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_first_name TEXT NOT NULL,
  employee_last_name TEXT NOT NULL,
  employee_pluri_rh TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_email TEXT NOT NULL,
  company_contract_number TEXT NOT NULL,
  company_location TEXT NOT NULL,
  week_start DATE NOT NULL,
  hours_data JSONB NOT NULL,
  total_hours DECIMAL(5,2),
  comments TEXT,
  mission_status TEXT CHECK (mission_status IN ('Terminée', 'En cours', 'Suspendue')),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'validated', 'rejected', 'ongoing')),
  validation_token TEXT UNIQUE,
  validated_at TIMESTAMP WITH TIME ZONE,
  validated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS pour les relevés
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Politique : Les agences voient seulement leurs relevés
CREATE POLICY "Agencies can view their timesheets" 
  ON public.timesheets FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'agence' 
      AND agency_id = public.timesheets.agency_id
    )
  );

-- Politique : Les intérimaires voient leurs propres relevés
CREATE POLICY "Interimaires can view own timesheets" 
  ON public.timesheets FOR SELECT 
  USING (submitted_by = auth.uid());

-- Politique : Les intérimaires peuvent créer des relevés
CREATE POLICY "Interimaires can insert timesheets" 
  ON public.timesheets FOR INSERT 
  WITH CHECK (
    submitted_by = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role = 'interimaire'
    )
  );

-- Trigger updated_at pour timesheets
DROP TRIGGER IF EXISTS set_updated_at ON public.timesheets;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_timesheets_agency_id ON public.timesheets(agency_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON public.timesheets(status);
CREATE INDEX IF NOT EXISTS idx_timesheets_validation_token ON public.timesheets(validation_token);
*/

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que tout est bien créé
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'timesheets');

-- Afficher les politiques RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
