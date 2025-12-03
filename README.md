# 🚀 Relevé Heures Pro - Version Supabase

Application multi-tenant avec authentification Supabase et gestion des rôles.

## 📋 Table des Matières

- [Architecture](#architecture)
- [Gestion des Rôles](#gestion-des-rôles)
- [Installation](#installation)
- [Configuration Supabase](#configuration-supabase)
- [Configuration n8n](#configuration-n8n)
- [Structure du Projet](#structure-du-projet)
- [Développement](#développement)
- [Déploiement](#déploiement)

---

## 🏗️ Architecture

### Stack Technique
- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Authentification**: Supabase Auth
- **Base de données**: Supabase PostgreSQL
- **Backend Logic**: Webhooks n8n
- **Routing**: React Router v6

### Flux de Données

```
┌─────────────┐
│   React UI  │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
       v              v
┌──────────────┐  ┌──────────────┐
│   Supabase   │  │     n8n      │
│     Auth     │  │  Webhooks    │
└──────────────┘  └──────┬───────┘
                         │
                         v
                  ┌──────────────┐
                  │   Airtable   │
                  └──────────────┘
```

---

## 👥 Gestion des Rôles

### Rôles Disponibles

| Rôle | Accès | Description |
|------|-------|-------------|
| **agence** | `/dashboard` | Voit tous les relevés de son agence |
| **interimaire** | `/nouveau-releve` | Soumet uniquement des relevés |
| **client** | `/validation?token=XXX` | Valide/rejette un relevé spécifique |

### Flux d'Authentification

```typescript
┌─────────────┐
│   Signup    │
│  avec rôle  │
└──────┬──────┘
       │
       v
┌──────────────────┐
│  Supabase Auth   │
│  Crée user +     │
│  Profile table   │
└──────┬───────────┘
       │
       v
┌──────────────────┐
│  Login Success   │
│  Redirection     │
│  selon rôle:     │
│  - agence →      │
│    /dashboard    │
│  - interimaire → │
│    /nouveau-     │
│    releve        │
└──────────────────┘
```

### Protection des Routes

```typescript
// Route protégée pour agence uniquement
<ProtectedRoute allowedRoles={['agence']}>
  <Dashboard />
</ProtectedRoute>

// Route protégée pour intérimaire uniquement
<ProtectedRoute allowedRoles={['interimaire']}>
  <TimesheetForm />
</ProtectedRoute>

// Route publique pour validation client
<Route path="/validation" element={<ValidationPage />} />
```

---

## 📦 Installation

### 1. Prérequis

- Node.js 18+
- Compte Supabase (gratuit)
- Instance n8n (self-hosted ou cloud)

### 2. Cloner et Installer

```bash
# Extraire l'archive
tar -xzf releve-heures-supabase.tar.gz
cd releve-heures-supabase

# Installer les dépendances
npm install
```

### 3. Configuration des Variables d'Environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer avec vos valeurs
nano .env
```

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# n8n Webhooks
VITE_WEBHOOK_SUBMISSION_URL=https://your-n8n.com/webhook/submission
VITE_WEBHOOK_VALIDATION_URL=https://your-n8n.com/webhook/validation
VITE_WEBHOOK_READ_URL=https://your-n8n.com/webhook/read
```

### 4. Lancer l'Application

```bash
npm run dev
```

Ouvrir `http://localhost:3000`

---

## ⚙️ Configuration Supabase

### Étape 1: Créer un Projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Choisir une région et un mot de passe
4. Attendre que le projet soit prêt (~2 minutes)

### Étape 2: Récupérer les Clés API

1. Aller dans **Settings** → **API**
2. Copier:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### Étape 3: Exécuter le Schéma SQL

1. Aller dans **SQL Editor** dans Supabase
2. Créer une nouvelle query
3. Copier tout le contenu de `supabase-schema.sql`
4. Exécuter (RUN)

Cela va créer:
- ✅ Table `profiles` (rôles et agency_id)
- ✅ Politiques RLS (sécurité)
- ✅ Triggers automatiques
- ✅ Fonctions de gestion

### Étape 4: Vérifier la Configuration

```sql
-- Vérifier que la table existe
SELECT * FROM public.profiles LIMIT 1;

-- Vérifier les politiques RLS
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### Étape 5: Configurer l'Email (Optionnel)

Pour l'envoi d'emails de confirmation:

1. **Settings** → **Authentication** → **Email Templates**
2. Personnaliser les templates si besoin
3. Configurer un provider SMTP custom (optionnel)

---

## 🔗 Configuration n8n

### Workflow 1: Soumission de Relevé

**Webhook URL**: `/webhook/releve-submission`

**Nodes**:
1. **Webhook Trigger**
   - Method: POST
   - Path: `releve-submission`

2. **Set Node** - Extraire les données
   ```json
   {
     "agencyId": "{{ $json.body.agencyId }}",
     "submittedBy": "{{ $json.body.submittedBy }}",
     "employee": "{{ $json.body.releve_data.employee }}",
     "company": "{{ $json.body.releve_data.company }}",
     "hours": "{{ $json.body.releve_data.hours }}",
     "totalHours": "{{ $json.body.releve_data.totalHours }}",
     "clientEmail": "{{ $json.body.client_email }}"
   }
   ```

3. **Airtable Node** - Create Record
   - Base: Votre base
   - Table: `Timesheets`
   - Fields: Mapper tous les champs

4. **Function Node** - Générer Token
   ```javascript
   const crypto = require('crypto');
   const token = crypto.randomBytes(32).toString('hex');
   return { token };
   ```

5. **Email Node** - Envoyer au Client
   - To: `{{ $json.clientEmail }}`
   - Subject: "Nouveau relevé à valider"
   - Body: Lien avec token

6. **Respond to Webhook**
   ```json
   {
     "success": true,
     "message": "Relevé soumis avec succès",
     "token": "{{ $json.token }}"
   }
   ```

### Workflow 2: Lecture de Relevé

**Webhook URL**: `/webhook/releve-read`

**Nodes**:
1. **Webhook Trigger**
   - Method: GET
   - Path: `releve-read`
   - Query params: `token`

2. **Airtable Node** - Find Record
   - Filter: `{validation_token} = '{{ $query.token }}'`

3. **Respond to Webhook**
   ```json
   {
     "success": true,
     "timesheet": "{{ $json }}"
   }
   ```

### Workflow 3: Validation de Relevé

**Webhook URL**: `/webhook/releve-validation`

**Nodes**:
1. **Webhook Trigger**
   - Method: POST
   - Path: `releve-validation`

2. **Airtable Node** - Update Record
   - Find by: `validation_token`
   - Update: 
     - status: `{{ $json.body.status }}`
     - validated_at: `{{ $now }}`

3. **Email Node** - Notifier l'Agence
   - To: Email de l'agence
   - Subject: "Relevé validé/rejeté"

4. **Respond to Webhook**
   ```json
   {
     "success": true,
     "message": "Relevé mis à jour"
   }
   ```

---

## 📁 Structure du Projet

```
releve-heures-supabase/
├── src/
│   ├── components/
│   │   ├── ProtectedRoute.tsx    # Gestion des rôles
│   │   ├── Header.tsx             # En-tête
│   │   └── ...
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx          # Connexion
│   │   ├── SignupPage.tsx         # Inscription
│   │   ├── Dashboard.tsx          # Vue agence
│   │   ├── TimesheetForm.tsx      # Formulaire
│   │   └── ValidationPage.tsx     # Vue client
│   │
│   ├── hooks/
│   │   └── useAuth.ts             # Hook auth Supabase
│   │
│   ├── lib/
│   │   └── supabase.ts            # Config Supabase
│   │
│   ├── types/
│   │   └── index.ts               # Types TypeScript
│   │
│   ├── App.tsx                    # App principale
│   └── main.tsx                   # Point d'entrée
│
├── supabase-schema.sql            # Schéma SQL
├── .env.example                   # Variables exemple
├── package.json                   # Dépendances
└── README.md                      # Ce fichier
```

---

## 💻 Développement

### Commandes Disponibles

```bash
# Développement
npm run dev

# Build production
npm run build

# Prévisualiser build
npm run preview

# Linter
npm run lint
```

### Tester les Rôles

1. **Créer 2 comptes**:
   - Un avec rôle `agence` + agency_id
   - Un avec rôle `interimaire`

2. **Tester la redirection**:
   - Agence → `/dashboard`
   - Intérimaire → `/nouveau-releve`

3. **Tester l'isolation**:
   - Créer des relevés avec différentes agences
   - Vérifier que chaque agence voit uniquement ses relevés

### Déboguer l'Auth

```typescript
// Dans n'importe quel composant
import { useAuth } from '../hooks/useAuth';

function MyComponent() {
  const { user, loading } = useAuth();
  
  console.log('User:', user);
  console.log('Role:', user?.role);
  console.log('Agency:', user?.agencyId);
  
  // ...
}
```

---

## 🌐 Déploiement

### Option 1: Vercel (Recommandé)

```bash
# Installer Vercel CLI
npm install -g vercel

# Déployer
vercel

# Configurer les variables d'environnement
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
vercel env add VITE_WEBHOOK_SUBMISSION_URL
# etc...

# Déployer en production
vercel --prod
```

### Option 2: Netlify

1. Connecter le repo GitHub
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Ajouter les variables d'environnement

### Option 3: Serveur Classique

```bash
# Build
npm run build

# Le dossier dist/ contient l'app
# L'uploader sur votre serveur
```

---

## 🔒 Sécurité

### Row Level Security (RLS)

Supabase utilise RLS pour isoler les données:

```sql
-- Exemple: Les agences voient seulement leurs relevés
CREATE POLICY "Agencies see own timesheets" 
  ON public.timesheets FOR SELECT 
  USING (
    agency_id = (
      SELECT agency_id FROM public.profiles 
      WHERE id = auth.uid()
    )
  );
```

### Bonnes Pratiques

✅ **Ne jamais exposer** `service_role_key` (uniquement `anon` key)
✅ **Activer RLS** sur toutes les tables sensibles
✅ **Valider les données** côté frontend ET backend
✅ **Utiliser HTTPS** en production
✅ **Limiter les tentatives** de login (rate limiting)

---

## 📊 Monitoring

### Supabase Dashboard

- **Auth** → Voir les utilisateurs connectés
- **Table Editor** → Voir les données en temps réel
- **Logs** → Déboguer les erreurs d'auth
- **API Logs** → Voir les requêtes

### n8n Dashboard

- **Executions** → Voir les webhooks appelés
- **Logs** → Déboguer les workflows
- **Monitoring** → Statistiques d'usage

---

## 🆘 Dépannage

### Erreur "Invalid API key"
➡️ Vérifier que `VITE_SUPABASE_ANON_KEY` est correct

### Erreur "User not found"
➡️ Vérifier que le trigger `on_auth_user_created` est actif

### Redirection infinie
➡️ Vérifier que le profil existe dans la table `profiles`

### RLS bloque les requêtes
➡️ Vérifier les politiques RLS avec:
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs
- **n8n Docs**: https://docs.n8n.io
- **React Router**: https://reactrouter.com

---

## 🎯 Prochaines Étapes

1. ✅ Configurer Supabase
2. ✅ Créer le schéma SQL
3. ✅ Configurer les variables .env
4. ✅ Lancer l'app en dev
5. ✅ Créer des comptes test
6. ✅ Configurer les workflows n8n
7. ✅ Tester les webhooks
8. ✅ Déployer en production

---

**Version**: 2.0.0  
**Date**: Novembre 2024  
**Licence**: MIT
