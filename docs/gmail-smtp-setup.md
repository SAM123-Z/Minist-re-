# Configuration Gmail SMTP pour le Système d'Email

## Prérequis

1. **Compte Gmail** avec authentification à deux facteurs activée
2. **Mot de passe d'application** généré pour l'application

## Étapes de Configuration

### 1. Activer l'authentification à deux facteurs

1. Allez dans votre compte Google : https://myaccount.google.com/
2. Sécurité → Validation en deux étapes
3. Suivez les instructions pour activer la 2FA

### 2. Générer un mot de passe d'application

1. Dans les paramètres de sécurité Google
2. Sélectionnez "Mots de passe des applications"
3. Choisissez "Autre (nom personnalisé)"
4. Nommez-le "MINJEC Email System"
5. Copiez le mot de passe généré (16 caractères)

### 3. Configuration des variables d'environnement

Dans votre projet Supabase, ajoutez ces variables d'environnement :

```bash
GMAIL_USER=votre-email@gmail.com
GMAIL_APP_PASSWORD=votre-mot-de-passe-application-16-caracteres
```

### 4. Services SMTP alternatifs

Le système utilise deux services de fallback :

#### Option 1: EmailJS (Recommandé)
1. Créez un compte sur https://www.emailjs.com/
2. Configurez un service Gmail
3. Remplacez `your_emailjs_user_id` dans le code par votre User ID

#### Option 2: SMTP2GO (Fallback)
1. Créez un compte sur https://www.smtp2go.com/
2. Obtenez votre API Key
3. Ajoutez la variable d'environnement :
```bash
SMTP2GO_API_KEY=votre-api-key-smtp2go
```

## Configuration Gmail SMTP Directe

Si vous préférez utiliser Gmail SMTP directement :

```javascript
const smtpConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true pour 465, false pour autres ports
  auth: {
    user: 'votre-email@gmail.com',
    pass: 'votre-mot-de-passe-application'
  }
}
```

## Limites Gmail

- **Limite quotidienne** : 500 emails par jour pour les comptes gratuits
- **Limite par minute** : Environ 100 emails par minute
- **Taille des pièces jointes** : 25 MB maximum

## Sécurité

- ✅ Utilisez toujours des mots de passe d'application
- ✅ Ne partagez jamais vos identifiants
- ✅ Activez la 2FA sur votre compte Gmail
- ✅ Surveillez les logs d'activité de votre compte

## Dépannage

### Erreur "Username and Password not accepted"
- Vérifiez que la 2FA est activée
- Utilisez un mot de passe d'application, pas votre mot de passe Gmail
- Vérifiez que l'email est correct

### Erreur "Less secure app access"
- Gmail a désactivé cette option
- Vous DEVEZ utiliser un mot de passe d'application

### Emails non reçus
- Vérifiez les dossiers spam/indésirables
- Vérifiez les limites quotidiennes Gmail
- Consultez les logs de l'edge function

## Test de Configuration

Pour tester votre configuration :

```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-notification-email \
  -H "Content-Type: application/json" \
  -d '{
    "type": "admin_notification",
    "to": "test@example.com",
    "data": {
      "username": "test",
      "email": "test@example.com",
      "userType": "standard_user",
      "userIdOrRegistration": "123456789"
    }
  }'
```

## Support

En cas de problème :
1. Vérifiez les logs Supabase Edge Functions
2. Testez avec un email simple d'abord
3. Vérifiez les quotas Gmail
4. Contactez le support technique si nécessaire