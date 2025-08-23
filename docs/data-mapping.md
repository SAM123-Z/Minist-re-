# Spécification de Mapping des Données

## Structure des données entre systèmes

### 1. Demande d'inscription (pending_users)
```typescript
interface PendingUserRequest {
  id: string;                    // UUID généré automatiquement
  email: string;                 // Email de l'utilisateur
  username: string;              // Nom d'utilisateur choisi
  user_type: UserType;           // Type: standard_user | cdc_agent | association | admin
  user_id_or_registration: string; // CIN National
  additional_info: {             // Informations spécifiques au type
    password: string;            // Mot de passe hashé
    // Pour CDC Agent:
    region?: string;
    commune?: string;
    quartierCite?: string;
    // Pour Association:
    associationName?: string;
    activitySector?: string;
    address?: string;
    phone?: string;
  };
  status: 'pending' | 'approved' | 'rejected';
  serial_number?: string;        // Code à 4 chiffres généré lors de l'approbation
  approved_by?: string;          // ID de l'admin qui a traité
  approved_at?: string;          // Date de traitement
  rejected_reason?: string;      // Raison du rejet
  created_at: string;           // Date de soumission
  updated_at: string;           // Dernière modification
}
```

### 2. Utilisateur final (user_profiles)
```typescript
interface UserProfile {
  id: string;                    // UUID Supabase Auth
  user_type: UserType;           // Type d'utilisateur
  username: string;              // Nom d'utilisateur
  user_id_or_registration: string; // CIN National
  created_at: string;           // Date de création
  updated_at: string;           // Dernière modification
}
```

### 3. Données spécifiques Agent CDC (cdc_agents)
```typescript
interface CDCAgent {
  id: string;                    // UUID généré
  user_id: string;              // Référence vers user_profiles
  matricule: string;            // Généré automatiquement
  department: string;           // Région + Commune + Quartier
  status: 'active' | 'inactive' | 'suspended' | 'terminated';
  hire_date: string;            // Date d'embauche
  created_at: string;
  updated_at: string;
}
```

### 4. Données spécifiques Association (associations)
```typescript
interface Association {
  id: string;                    // UUID généré
  user_id: string;              // Référence vers user_profiles
  association_name: string;      // Nom de l'association
  registration_number: string;   // Généré automatiquement
  legal_status: string;         // Statut juridique
  activity_sector: string;      // Secteur d'activité
  address?: string;             // Adresse
  phone?: string;               // Téléphone
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  registration_date: string;    // Date d'enregistrement
  created_at: string;
  updated_at: string;
}
```

## Mapping des champs lors de l'approbation

### De pending_users vers user_profiles:
- `id` → Nouveau UUID Supabase Auth
- `user_type` → `user_type`
- `username` → `username`
- `user_id_or_registration` → `user_id_or_registration`

### De pending_users vers cdc_agents (si user_type = 'cdc_agent'):
- `additional_info.region` + `additional_info.commune` + `additional_info.quartierCite` → `department`
- Auto-généré → `matricule`
- `'active'` → `status`

### De pending_users vers associations (si user_type = 'association'):
- `additional_info.associationName` → `association_name`
- `additional_info.activitySector` → `activity_sector`
- `additional_info.address` → `address`
- `additional_info.phone` → `phone`
- `'approved'` → `status`