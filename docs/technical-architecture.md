# Architecture Technique - Système d'Intégration par Email

## Vue d'ensemble du système

```
┌─────────────────────┐    Email Gateway    ┌─────────────────────┐
│  Registration       │◄──────────────────►│  Registration       │
│  Request System     │                     │  System             │
│  (Frontend)         │                     │  (Backend/Admin)    │
└─────────────────────┘                     └─────────────────────┘
           │                                           │
           ▼                                           ▼
┌─────────────────────┐                     ┌─────────────────────┐
│  Supabase Database  │                     │  Email Service      │
│  - pending_users    │                     │  - Resend/SendGrid  │
│  - notifications    │                     │  - Templates        │
└─────────────────────┘                     └─────────────────────┘
```

## Composants du système

### 1. Registration Request System (Frontend)
- Interface utilisateur pour soumettre les demandes
- Validation des données côté client
- Stockage temporaire des demandes dans `pending_users`

### 2. Registration System (Backend/Admin)
- Interface d'administration pour traiter les demandes
- Système d'approbation/rejet
- Création des comptes utilisateurs finaux

### 3. Email Communication Layer
- Service d'email transactionnel (Resend/SendGrid)
- Templates d'email dynamiques
- Système de tracking et de retry

## Flux de données

1. **Soumission de demande** → Stockage DB → Notification email admin
2. **Traitement admin** → Mise à jour DB → Email de confirmation/rejet utilisateur
3. **Finalisation** → Création compte → Email d'activation utilisateur