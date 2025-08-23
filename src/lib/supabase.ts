import { createClient } from '@supabase/supabase-js'

// Check if environment variables are defined
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create mock Supabase client if environment variables are not configured
const createMockSupabaseClient = () => {
  const mockQuery = {
    select: () => mockQuery,
    insert: () => mockQuery,
    update: () => mockQuery,
    delete: () => mockQuery,
    eq: () => mockQuery,
    neq: () => mockQuery,
    gt: () => mockQuery,
    gte: () => mockQuery,
    lt: () => mockQuery,
    lte: () => mockQuery,
    like: () => mockQuery,
    ilike: () => mockQuery,
    is: () => mockQuery,
    in: () => mockQuery,
    contains: () => mockQuery,
    containedBy: () => mockQuery,
    rangeGt: () => mockQuery,
    rangeGte: () => mockQuery,
    rangeLt: () => mockQuery,
    rangeLte: () => mockQuery,
    rangeAdjacent: () => mockQuery,
    overlaps: () => mockQuery,
    textSearch: () => mockQuery,
    match: () => mockQuery,
    not: () => mockQuery,
    or: () => mockQuery,
    filter: () => mockQuery,
    order: () => mockQuery,
    limit: () => mockQuery,
    range: () => mockQuery,
    abortSignal: () => mockQuery,
    single: () => Promise.resolve({ data: null, error: null }),
    maybeSingle: () => Promise.resolve({ data: null, error: null }),
    then: (resolve: any) => resolve({ data: [], error: null })
  };

  return {
    from: () => mockQuery,
    channel: (channelName: string) => ({
      on: (event: string, filter: any, callback: any) => ({
        on: (event: string, filter: any, callback: any) => ({
          subscribe: () => Promise.resolve({ error: null })
        }),
        subscribe: () => Promise.resolve({ error: null })
      }),
      subscribe: () => Promise.resolve({ error: null }),
      unsubscribe: () => Promise.resolve({ error: null })
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signUp: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: (callback: any) => {
        setTimeout(() => callback('SIGNED_OUT', null), 0);
        return { data: { subscription: { unsubscribe: () => {} } } };
      }
    }
  };
};

// Create Supabase client or mock client
export const supabase = (!supabaseUrl || !supabaseAnonKey || 
  supabaseUrl.includes('your-project-ref') || supabaseAnonKey.includes('your-anon-key'))
  ? createMockSupabaseClient()
  : createClient(supabaseUrl, supabaseAnonKey)

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