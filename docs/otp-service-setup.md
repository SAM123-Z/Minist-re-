# Configuration du Service OTP avec Gmail SMTP

## Variables d'Environnement Requises

Ajoutez ces variables dans votre projet Supabase :

```bash
# Configuration Gmail SMTP (style Laravel)
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-mot-de-passe-application-16-caracteres
MAIL_FROM_ADDRESS=votre-email@gmail.com
MAIL_FROM_NAME="MINJEC Auth"

# Ou utilisez les noms alternatifs
GMAIL_USER=votre-email@gmail.com
GMAIL_APP_PASSWORD=votre-mot-de-passe-application-16-caracteres

# Services de fallback (optionnels mais recommandés)
SMTP2GO_API_KEY=votre-cle-api-smtp2go
EMAILJS_USER_ID=votre-user-id-emailjs
```

## Configuration Gmail

### 1. Activer l'authentification à deux facteurs
1. Allez dans votre compte Google : https://myaccount.google.com/
2. Sécurité → Validation en deux étapes
3. Suivez les instructions pour activer la 2FA

### 2. Générer un mot de passe d'application
1. Dans les paramètres de sécurité Google
2. Sélectionnez "Mots de passe des applications"
3. Choisissez "Autre (nom personnalisé)"
4. Nommez-le "MINJEC OTP System"
5. Copiez le mot de passe généré (16 caractères)

## Utilisation du Service OTP

### 1. Envoyer un OTP

```javascript
// Générer et envoyer un OTP
const { data, error } = await supabase.functions.invoke('send-otp', {
  body: {
    email: 'user@example.com',
    type: 'login' // ou 'registration', 'password_reset'
  }
});

if (data.success) {
  console.log('OTP envoyé avec succès');
  console.log('Expire dans:', data.expires_in, 'secondes');
}
```

### 2. Vérifier un OTP

```javascript
// Vérifier le code OTP saisi par l'utilisateur
const { data, error } = await supabase.functions.invoke('verify-otp', {
  body: {
    email: 'user@example.com',
    otp: '123456',
    type: 'login'
  }
});

if (data.verified) {
  console.log('OTP vérifié avec succès');
  // Procéder à la connexion
} else {
  console.log('OTP invalide:', data.error);
}
```

## Fonctionnalités du Service

### Génération OTP
- **Code à 6 chiffres** généré aléatoirement
- **Expiration automatique** après 10 minutes
- **Un seul OTP actif** par email/type à la fois

### Sécurité
- **Codes à usage unique** (marqués comme utilisés après vérification)
- **Expiration automatique** pour éviter les codes périmés
- **Nettoyage automatique** des codes expirés
- **Limitation par type** (login, registration, password_reset)

### Templates Email
- **Template OTP dédié** avec design MINJEC
- **Instructions de sécurité** incluses
- **Responsive design** pour tous les appareils
- **Branding cohérent** avec l'application

## Services de Fallback

### SMTP2GO (Recommandé)
1. Créez un compte sur https://www.smtp2go.com/
2. Obtenez votre API Key
3. Ajoutez `SMTP2GO_API_KEY` dans vos variables d'environnement

### EmailJS (Alternative)
1. Créez un compte sur https://www.emailjs.com/
2. Configurez un service Gmail
3. Ajoutez `EMAILJS_USER_ID` dans vos variables d'environnement

## Base de Données

La table `otp_codes` est automatiquement créée avec :
- **Stockage sécurisé** des codes OTP
- **Gestion des expirations** automatique
- **Prévention des doublons** actifs
- **Historique des vérifications**

## Exemple d'Intégration

```javascript
// Fonction utilitaire pour envoyer un OTP
async function sendOtp(email, type = 'login') {
  const otp = Math.floor(100000 + Math.random() * 900000);
  
  const { data, error } = await supabase.functions.invoke('send-otp', {
    body: { email, type }
  });
  
  if (error) {
    throw new Error('Erreur lors de l\'envoi de l\'OTP');
  }
  
  return data;
}

// Fonction utilitaire pour vérifier un OTP
async function verifyOtp(email, otp, type = 'login') {
  const { data, error } = await supabase.functions.invoke('verify-otp', {
    body: { email, otp, type }
  });
  
  if (error || !data.verified) {
    throw new Error(data.error || 'Code OTP invalide');
  }
  
  return data;
}
```

## Maintenance

### Nettoyage automatique
```sql
-- Supprimer les codes expirés (à exécuter périodiquement)
SELECT cleanup_expired_otps();
```

### Monitoring
- Surveillez les logs des Edge Functions
- Vérifiez les taux de livraison des emails
- Contrôlez les tentatives de vérification

## Dépannage

### OTP non reçu
1. Vérifiez les dossiers spam/indésirables
2. Vérifiez les variables d'environnement Gmail
3. Consultez les logs Supabase Edge Functions

### Erreur "Code invalide"
1. Vérifiez que le code n'a pas expiré (10 minutes)
2. Assurez-vous que le type correspond (login/registration)
3. Vérifiez que le code n'a pas déjà été utilisé

### Problèmes SMTP
1. Vérifiez le mot de passe d'application Gmail
2. Testez avec les services de fallback
3. Vérifiez les quotas Gmail (500 emails/jour)