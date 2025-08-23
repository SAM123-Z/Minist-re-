const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.OTP_SERVICE_PORT || 3001;

// Configuration sécurisée
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting pour éviter les abus
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Maximum 5 tentatives par IP
  message: {
    error: 'Trop de tentatives d\'envoi d\'OTP. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 vérifications par IP
  message: {
    error: 'Trop de tentatives de vérification. Réessayez dans 15 minutes.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// Stockage en mémoire des OTP (en production, utiliser Redis ou une DB)
const otpStorage = new Map();

// Configuration Brevo
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

if (!BREVO_API_KEY) {
  console.error('❌ BREVO_API_KEY manquante dans les variables d\'environnement');
  process.exit(1);
}

// Fonction utilitaire pour générer un OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Fonction utilitaire pour valider l'email
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Fonction pour nettoyer les OTP expirés
function cleanExpiredOTPs() {
  const now = Date.now();
  for (const [email, data] of otpStorage.entries()) {
    if (now > data.expiresAt) {
      otpStorage.delete(email);
    }
  }
}

// Nettoyage automatique toutes les minutes
setInterval(cleanExpiredOTPs, 60 * 1000);

// Endpoint pour envoyer un OTP
app.post('/send-otp', otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    // Validation des paramètres
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'L\'adresse email est requise',
        code: 'MISSING_EMAIL'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Format d\'email invalide',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }

    // Générer le code OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes

    // Sauvegarder en mémoire
    otpStorage.set(email, {
      otp,
      expiresAt,
      attempts: 0,
      createdAt: Date.now()
    });

    // Préparer l'email pour Brevo
    const emailData = {
      sender: {
        name: "MINJEC Auth",
        email: process.env.SENDER_EMAIL || "no-reply@minjec.gov.dj"
      },
      to: [{ email: email }],
      subject: "🔐 Votre code de vérification MINJEC",
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Code de Vérification</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #dc2626, #16a34a, #2563eb); padding: 25px; border-radius: 12px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Code de Vérification</h1>
              <p style="color: white; margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">MINJEC - Ministère de la Jeunesse et de la Culture</p>
            </div>
            
            <div style="background: #f0f9ff; padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px; border: 2px solid #0ea5e9;">
              <h2 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 22px;">Votre code de vérification</h2>
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
                <div style="font-size: 48px; font-weight: bold; color: #0c4a6e; letter-spacing: 8px; font-family: monospace; margin: 10px 0;">
                  ${otp}
                </div>
              </div>
              <p style="color: #0c4a6e; margin: 15px 0 0 0; font-weight: 500;">
                ⚠️ Ce code expire dans 5 minutes
              </p>
            </div>
            
            <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
              <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">🔒 Instructions de sécurité</h3>
              <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                <li style="margin-bottom: 8px;">Ne partagez jamais ce code avec personne</li>
                <li style="margin-bottom: 8px;">Utilisez ce code uniquement sur le site officiel MINJEC</li>
                <li style="margin-bottom: 8px;">Si vous n'avez pas demandé ce code, ignorez cet email</li>
                <li style="margin-bottom: 8px;">Le code expire automatiquement après 5 minutes</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                📧 admin@minjec.gov.dj | 📞 +253 21 35 26 14<br>
                Ministère de la Jeunesse et de la Culture - République de Djibouti
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Envoyer l'email via Brevo
    const response = await axios.post(BREVO_API_URL, emailData, {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 secondes timeout
    });

    console.log(`✅ OTP envoyé avec succès à ${email} - Message ID: ${response.data.messageId}`);

    res.json({
      success: true,
      message: 'Code OTP envoyé avec succès',
      expiresIn: 300, // 5 minutes en secondes
      messageId: response.data.messageId
    });

  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'OTP:', error.message);

    // Gestion spécifique des erreurs Brevo
    if (error.response?.status === 400) {
      return res.status(400).json({
        success: false,
        error: 'Données d\'email invalides',
        code: 'INVALID_EMAIL_DATA',
        details: error.response.data
      });
    }

    if (error.response?.status === 401) {
      return res.status(500).json({
        success: false,
        error: 'Erreur d\'authentification avec le service email',
        code: 'EMAIL_SERVICE_AUTH_ERROR'
      });
    }

    if (error.code === 'ECONNABORTED') {
      return res.status(500).json({
        success: false,
        error: 'Timeout lors de l\'envoi de l\'email',
        code: 'EMAIL_TIMEOUT'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi de l\'OTP',
      code: 'SEND_OTP_ERROR'
    });
  }
});

// Endpoint pour vérifier un OTP
app.post('/verify-otp', verifyLimiter, (req, res) => {
  try {
    const { email, otp } = req.body;

    // Validation des paramètres
    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Email et code OTP sont requis',
        code: 'MISSING_PARAMETERS'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        error: 'Format d\'email invalide',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }

    // Vérifier si l'OTP existe
    const storedData = otpStorage.get(email);
    if (!storedData) {
      return res.status(400).json({
        success: false,
        error: 'Aucun code OTP trouvé pour cet email',
        code: 'OTP_NOT_FOUND'
      });
    }

    // Vérifier l'expiration
    if (Date.now() > storedData.expiresAt) {
      otpStorage.delete(email);
      return res.status(400).json({
        success: false,
        error: 'Le code OTP a expiré',
        code: 'OTP_EXPIRED'
      });
    }

    // Incrémenter les tentatives
    storedData.attempts += 1;

    // Limiter les tentatives (max 3)
    if (storedData.attempts > 3) {
      otpStorage.delete(email);
      return res.status(400).json({
        success: false,
        error: 'Trop de tentatives incorrectes. Demandez un nouveau code.',
        code: 'TOO_MANY_ATTEMPTS'
      });
    }

    // Vérifier le code OTP
    if (storedData.otp !== otp.toString()) {
      return res.status(400).json({
        success: false,
        error: 'Code OTP incorrect',
        code: 'INVALID_OTP',
        attemptsRemaining: 3 - storedData.attempts
      });
    }

    // Code correct - supprimer de la mémoire
    otpStorage.delete(email);

    console.log(`✅ OTP vérifié avec succès pour ${email}`);

    res.json({
      success: true,
      message: 'Code OTP vérifié avec succès',
      verified: true
    });

  } catch (error) {
    console.error('❌ Erreur lors de la vérification de l\'OTP:', error.message);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la vérification de l\'OTP',
      code: 'VERIFY_OTP_ERROR'
    });
  }
});

// Endpoint de santé
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'OTP Microservice',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    activeOTPs: otpStorage.size
  });
});

// Endpoint pour les statistiques (développement uniquement)
if (process.env.NODE_ENV !== 'production') {
  app.get('/stats', (req, res) => {
    const stats = {
      activeOTPs: otpStorage.size,
      otps: Array.from(otpStorage.entries()).map(([email, data]) => ({
        email,
        expiresAt: new Date(data.expiresAt).toISOString(),
        attempts: data.attempts,
        createdAt: new Date(data.createdAt).toISOString()
      }))
    };
    res.json(stats);
  });
}

// Gestion des erreurs globales
app.use((err, req, res, next) => {
  console.error('❌ Erreur non gérée:', err);
  res.status(500).json({
    success: false,
    error: 'Erreur interne du serveur',
    code: 'INTERNAL_SERVER_ERROR'
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint non trouvé',
    code: 'ENDPOINT_NOT_FOUND'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Microservice OTP démarré sur le port ${PORT}`);
  console.log(`📧 Service email: ${BREVO_API_KEY ? 'Configuré' : 'Non configuré'}`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

// Gestion propre de l'arrêt
process.on('SIGTERM', () => {
  console.log('🛑 Arrêt du microservice OTP...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Arrêt du microservice OTP...');
  process.exit(0);
});