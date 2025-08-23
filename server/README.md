# 🔐 Microservice OTP - MINJEC

Microservice Node.js pour l'envoi et la vérification de codes OTP via l'API Brevo.

## 🚀 Démarrage Rapide

### 1. Installation
```bash
npm install
```

### 2. Configuration
Copiez le fichier `.env.example` vers `.env` et configurez vos variables :
```bash
cp server/.env.example server/.env
```

Éditez le fichier `.env` :
```env
BREVO_API_KEY=your_actual_brevo_api_key
SENDER_EMAIL=no-reply@minjec.gov.dj
OTP_SERVICE_PORT=3001
```

### 3. Lancement
```bash
# Mode développement (avec auto-reload)
npm run otp-service

# Mode production
npm run otp-service:prod
```

## 📡 API Endpoints

### POST `/send-otp`
Envoie un code OTP à 6 chiffres par email.

**Paramètres :**
```json
{
  "email": "utilisateur@example.com"
}
```

**Réponse succès :**
```json
{
  "success": true,
  "message": "Code OTP envoyé avec succès",
  "expiresIn": 300,
  "messageId": "brevo_message_id"
}
```

### POST `/verify-otp`
Vérifie un code OTP.

**Paramètres :**
```json
{
  "email": "utilisateur@example.com",
  "otp": "123456"
}
```

**Réponse succès :**
```json
{
  "success": true,
  "message": "Code OTP vérifié avec succès",
  "verified": true
}
```

### GET `/health`
Vérification de l'état du service.

**Réponse :**
```json
{
  "status": "OK",
  "service": "OTP Microservice",
  "version": "1.0.0",
  "timestamp": "2025-01-23T10:30:00.000Z",
  "activeOTPs": 5
}
```

## 🔒 Sécurité

- **Rate Limiting** : 5 envois d'OTP par 15 minutes par IP
- **Expiration** : Les OTP expirent après 5 minutes
- **Tentatives limitées** : Maximum 3 tentatives de vérification par OTP
- **CORS configuré** : Seules les origines autorisées peuvent accéder
- **Headers sécurisés** : Helmet.js pour la sécurité des headers

## 🛠️ Configuration Brevo

1. Créez un compte sur [Brevo](https://www.brevo.com/)
2. Allez dans **Paramètres** → **Clés API**
3. Créez une nouvelle clé API avec les permissions d'envoi d'emails
4. Copiez la clé dans votre fichier `.env`

## 📊 Monitoring

### Logs
Le service affiche des logs détaillés :
- ✅ Succès d'envoi/vérification
- ❌ Erreurs avec codes spécifiques
- 🔍 Informations de débogage

### Endpoint de statistiques (développement)
```bash
GET /stats
```

Retourne les OTP actifs en mémoire (uniquement en mode développement).

## 🚨 Gestion d'Erreurs

### Codes d'erreur communs :

| Code | Description |
|------|-------------|
| `MISSING_EMAIL` | Email manquant |
| `INVALID_EMAIL_FORMAT` | Format email invalide |
| `RATE_LIMIT_EXCEEDED` | Trop de tentatives |
| `OTP_NOT_FOUND` | OTP non trouvé |
| `OTP_EXPIRED` | OTP expiré |
| `INVALID_OTP` | Code incorrect |
| `TOO_MANY_ATTEMPTS` | Trop de tentatives incorrectes |

## 🔧 Intégration Frontend

Exemple d'utilisation depuis votre application React :

```javascript
// Envoyer un OTP
const sendOTP = async (email) => {
  const response = await fetch('http://localhost:3001/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};

// Vérifier un OTP
const verifyOTP = async (email, otp) => {
  const response = await fetch('http://localhost:3001/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, otp })
  });
  return response.json();
};
```

## 🏗️ Production

Pour la production, considérez :

1. **Base de données** : Remplacer le stockage en mémoire par Redis ou PostgreSQL
2. **Load Balancer** : Utiliser nginx ou un load balancer cloud
3. **Monitoring** : Intégrer avec des outils comme DataDog ou New Relic
4. **Logs** : Utiliser un système de logs centralisé
5. **SSL/TLS** : Configurer HTTPS

## 📝 Licence

MIT License - MINJEC 2025