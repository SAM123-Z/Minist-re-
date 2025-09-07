import { createClient } from '@supabase/supabase-js'

// Configuration Supabase depuis les variables d'environnement
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Vérifier que les variables d'environnement sont configurées
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variables d\'environnement Supabase manquantes. ' +
    'Veuillez configurer VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans votre fichier .env'
  )
}

// Créer le client Supabase avec configuration OAuth
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: window.localStorage,
    storageKey: 'supabase.auth.token',
    debug: import.meta.env.DEV
  },
  global: {
    headers: {
      'X-Client-Info': 'minjec-auth-system'
    }
  }
})

export type UserType = 'standard_user' | 'cdc_agent' | 'association' | 'admin'

export interface AuthFormData {
  userType: UserType
  username: string
  userIdOrRegistration: string
  email: string
  password: string
}

export interface UserProfile {
  id: string
  user_type: UserType
  username: string
  user_id_or_registration: string
  created_at: string
}

export interface PendingUser {
  id: string
  email: string
  username: string
  user_type: UserType
  user_id_or_registration: string
  additional_info: Record<string, any>
  status: 'pending' | 'approved' | 'rejected'
  serial_number?: string
  approved_by?: string
  approved_at?: string
  rejected_reason?: string
  created_at: string
  updated_at: string
}
export interface CDCAgent {
  id: string
  user_id: string
  matricule: string
  department: string
  status: 'active' | 'inactive' | 'suspended' | 'terminated'
  hire_date: string
  created_at: string
  updated_at: string
}

export interface Association {
  id: string
  user_id: string
  association_name: string
  registration_number: string
  legal_status: string
  activity_sector: string
  address?: string
  phone?: string
  status: 'pending' | 'approved' | 'rejected' | 'suspended'
  registration_date: string
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  user_id?: string
  action_type: string
  target_type: string
  target_id?: string
  description: string
  metadata: Record<string, any>
  created_at: string
}