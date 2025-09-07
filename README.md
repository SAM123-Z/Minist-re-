# 🏛️ MINJEC - Système d'Authentification Complet

Système d'authentification et de gestion des utilisateurs pour le Ministère de la Jeunesse et de la Culture de Djibouti.

## 🚀 Fonctionnalités

### Authentification Multi-Méthodes
- **Connexion classique** : Email + mot de passe
- **OAuth Social** : Google et GitHub
- **Système OTP** : Codes de vérification à 6 chiffres
- **Code de passerelle** : Codes d'activation à 4 chiffres pour les utilisateurs approuvés

### Types d'Utilisateurs
- **👤 Utilisateur Standard** : Accès aux services de base
- **🛡️ Agent CDC** : Gestion des activités locales et rapports
- **🏢 Association** : Gestion des projets associatifs
- **👑 Administrateur** : Gestion complète du système

### Système d'Approbation
- **Demandes d'inscription** : Toutes les inscriptions nécessitent une approbation
- **Notifications automatiques** : Les admins sont notifiés instantanément
- **Approbation par email** : Les admins peuvent approuver directement par email
- **Codes de passerelle** : Génération automatique de codes à 4 chiffres

## 🛠️ Configuration

### 1. Variables d'Environnement

Créez un fichier `.env` à la racine du projet :

```env
# Configuration Supabase
VITE_SUPABASE_URL=https://ueghzagymniahlmxwsgh.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon-supabase

# Configuration du microservice OTP
OTP_SERVICE_PORT=3001
BREVO_API_KEY=votre-cle-api-brevo
SENDER_EMAIL=no-reply@minjec.gov.dj

# Configuration email pour les Edge Functions
MAIL_USERNAME=admin@minjec.gov.dj
MAIL_PASSWORD=votre-mot-de-passe-application-gmail
MAIL_FROM_ADDRESS=admin@minjec.gov.dj
MAIL_FROM_NAME="MINJEC Admin"

# Services de fallback pour les emails
SMTP2GO_API_KEY=votre-cle-api-smtp2go
EMAILJS_USER_ID=votre-user-id-emailjs

# Sécurité
EMAIL_APPROVAL_SECRET=minjec-secure-approval-key-2025
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 2. Configuration OAuth dans Supabase

#### Google OAuth
1. Allez dans votre dashboard Supabase
2. **Authentication** → **Providers** → **Google**
3. Activez Google et configurez :
   - **Client ID** : Votre Google Client ID
   - **Client Secret** : Votre Google Client Secret
   - **Redirect URL** : `https://ueghzagymniahlmxwsgh.supabase.co/auth/v1/callback`

#### GitHub OAuth
1. Dans le dashboard Supabase
2. **Authentication** → **Providers** → **GitHub**
3. Activez GitHub et configurez :
   - **Client ID** : Votre GitHub Client ID
   - **Client Secret** : Votre GitHub Client Secret

### 3. Configuration Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API Google+ et l'API Gmail
4. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configurez :
   - **Application type** : Web application
   - **Authorized redirect URIs** : `https://ueghzagymniahlmxwsgh.supabase.co/auth/v1/callback`

### 4. Configuration GitHub OAuth

1. Allez sur [GitHub Developer Settings](https://github.com/settings/developers)
2. **New OAuth App**
3. Configurez :
   - **Application name** : MINJEC Auth System
   - **Homepage URL** : `https://votre-domaine.com`
   - **Authorization callback URL** : `https://ueghzagymniahlmxwsgh.supabase.co/auth/v1/callback`

## 🏃‍♂️ Démarrage

### 1. Installation des dépendances
```bash
npm install
```

### 2. Démarrage du serveur de développement
```bash
npm run dev
```

### 3. Démarrage du microservice OTP (optionnel)
```bash
npm run otp-service
```

## 📧 Configuration Email

### Gmail SMTP
1. Activez l'authentification à deux facteurs sur votre compte Gmail
2. Générez un mot de passe d'application :
   - **Compte Google** → **Sécurité** → **Mots de passe des applications**
   - Créez un nouveau mot de passe pour "MINJEC Auth System"
3. Utilisez ce mot de passe dans `MAIL_PASSWORD`

### Services de Fallback

#### SMTP2GO (Recommandé)
1. Créez un compte sur [SMTP2GO](https://www.smtp2go.com/)
2. Obtenez votre API Key
3. Ajoutez `SMTP2GO_API_KEY` dans votre `.env`

#### EmailJS (Alternative)
1. Créez un compte sur [EmailJS](https://www.emailjs.com/)
2. Configurez un service Gmail
3. Ajoutez `EMAILJS_USER_ID` dans votre `.env`

## 🔐 Sécurité

### Authentification
- **JWT Tokens** : Gestion automatique par Supabase
- **Refresh Tokens** : Renouvellement automatique des sessions
- **PKCE Flow** : Sécurisation des flux OAuth
- **Session Persistence** : Maintien des sessions entre les rechargements

### Protection des Données
- **Row Level Security (RLS)** : Activé sur toutes les tables sensibles
- **Chiffrement** : Toutes les communications sont chiffrées
- **Validation** : Validation côté client et serveur
- **Rate Limiting** : Protection contre les attaques par force brute

## 📱 Utilisation

### Connexion Standard
1. Saisissez votre email et mot de passe
2. Cliquez sur "Se connecter"

### Connexion OAuth
1. Cliquez sur "Google" ou "GitHub"
2. Autorisez l'application
3. Vous serez automatiquement connecté

### Inscription
1. Cliquez sur "S'inscrire"
2. Remplissez le formulaire selon votre type d'utilisateur
3. Attendez l'approbation de l'administrateur
4. Utilisez le code de passerelle reçu par email

### Code OTP
1. Si vous avez déjà été approuvé, cliquez sur "Saisir code OTP"
2. Entrez le code à 4 chiffres reçu par email
3. Vous serez automatiquement connecté

## 🔧 Architecture

### Frontend (React + TypeScript)
- **Vite** : Build tool moderne et rapide
- **Tailwind CSS** : Framework CSS utilitaire
- **React Router** : Navigation côté client
- **React Hook Form** : Gestion des formulaires
- **React Query** : Gestion des états et cache

### Backend (Supabase)
- **PostgreSQL** : Base de données relationnelle
- **Edge Functions** : Fonctions serverless pour la logique métier
- **Real-time** : Notifications en temps réel
- **Storage** : Stockage de fichiers (si nécessaire)

### Services Externes
- **Brevo** : Service d'email transactionnel
- **SMTP2GO** : Service de fallback pour les emails
- **EmailJS** : Alternative pour l'envoi d'emails

## 📊 Monitoring

### Logs d'Activité
- Toutes les actions importantes sont loggées
- Traçabilité complète des approbations/rejets
- Historique des connexions et modifications

### Métriques
- Taux de succès des authentifications
- Temps de traitement des demandes
- Taux de livraison des emails
- Activité des utilisateurs par type

## 🚨 Dépannage

### Problèmes Courants

#### "Variables d'environnement manquantes"
- Vérifiez que le fichier `.env` existe
- Assurez-vous que toutes les variables sont définies
- Redémarrez le serveur de développement

#### "Erreur OAuth"
- Vérifiez la configuration dans Supabase Dashboard
- Assurez-vous que les URLs de redirection sont correctes
- Vérifiez les Client ID et Client Secret

#### "Email non reçu"
- Vérifiez les dossiers spam/indésirables
- Vérifiez la configuration Gmail SMTP
- Consultez les logs des Edge Functions

### Support
- **Email** : admin@minjec.gov.dj
- **Téléphone** : +253 21 35 26 14
- **Documentation** : Consultez le dossier `/docs`

## 📝 Licence

MIT License - MINJEC 2025

---

**Développé avec ❤️ pour le Ministère de la Jeunesse et de la Culture de Djibouti**