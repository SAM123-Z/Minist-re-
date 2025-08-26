import axios from 'axios';

// Configuration de l'API Laravel
const API_BASE_URL = import.meta.env.VITE_LARAVEL_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Intercepteur pour ajouter le token d'authentification
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('supabase.auth.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Types pour les offres
export interface Offre {
  id: string;
  titre: string;
  description: string;
  type_offre: 'formation' | 'seminaire' | 'stage' | 'emploi' | 'bourse' | 'autre';
  exigences: string;
  date_publication: string;
  date_limite: string;
  lieu: string;
  contact_info: string;
  statut: 'active' | 'inactive' | 'expiree';
  created_at: string;
  updated_at: string;
}

export interface Candidature {
  id: string;
  offre_id: string;
  user_id: string;
  nom_complet: string;
  cin: string;
  telephone: string;
  email: string;
  genre: 'homme' | 'femme';
  niveau_education: string;
  documents: Record<string, any>;
  statut: 'en_cours' | 'acceptee' | 'refusee';
  date_soumission: string;
  date_traitement?: string;
  notes?: string;
  offre?: Offre;
}

// API Functions
export const offresApi = {
  // Récupérer toutes les offres
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    statut?: string;
  }) => {
    const response = await api.get('/offres', { params });
    return response.data;
  },

  // Récupérer une offre par ID
  getById: async (id: string) => {
    const response = await api.get(`/offres/${id}`);
    return response.data;
  },

  // Rechercher des offres
  search: async (query: string) => {
    const response = await api.get('/offres/search', { params: { q: query } });
    return response.data;
  },
};

export const candidaturesApi = {
  // Récupérer les candidatures de l'utilisateur
  getMyCandidatures: async (userId: string) => {
    const response = await api.get(`/candidatures/user/${userId}`);
    return response.data;
  },

  // Soumettre une nouvelle candidature
  create: async (candidatureData: Partial<Candidature>) => {
    const response = await api.post('/candidatures', candidatureData);
    return response.data;
  },

  // Mettre à jour une candidature
  update: async (id: string, candidatureData: Partial<Candidature>) => {
    const response = await api.put(`/candidatures/${id}`, candidatureData);
    return response.data;
  },

  // Supprimer une candidature
  delete: async (id: string) => {
    const response = await api.delete(`/candidatures/${id}`);
    return response.data;
  },

  // Récupérer une candidature par ID
  getById: async (id: string) => {
    const response = await api.get(`/candidatures/${id}`);
    return response.data;
  },
};

// Mock data pour le développement (à supprimer en production)
export const mockOffres: Offre[] = [
  {
    id: '1',
    titre: 'Formation en Leadership Jeunesse',
    description: 'Programme de formation intensive pour développer les compétences de leadership chez les jeunes leaders communautaires.',
    type_offre: 'formation',
    exigences: 'Âge entre 18-35 ans, expérience associative, niveau BAC minimum',
    date_publication: '2025-01-15',
    date_limite: '2025-02-15',
    lieu: 'Djibouti-Ville',
    contact_info: 'formation@minjec.gov.dj',
    statut: 'active',
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: '2',
    titre: 'Bourse d\'Excellence Académique',
    description: 'Bourse d\'études pour les étudiants méritants dans les domaines STEM.',
    type_offre: 'bourse',
    exigences: 'Moyenne générale > 15/20, domaine STEM, nationalité djiboutienne',
    date_publication: '2025-01-10',
    date_limite: '2025-03-01',
    lieu: 'Toutes régions',
    contact_info: 'bourses@minjec.gov.dj',
    statut: 'active',
    created_at: '2025-01-10T09:00:00Z',
    updated_at: '2025-01-10T09:00:00Z',
  },
  {
    id: '3',
    titre: 'Stage Professionnel - Développement Culturel',
    description: 'Opportunité de stage dans le département de développement culturel du ministère.',
    type_offre: 'stage',
    exigences: 'Étudiant en dernière année, domaine culturel ou communication',
    date_publication: '2025-01-20',
    date_limite: '2025-02-28',
    lieu: 'Ministère - Djibouti',
    contact_info: 'stages@minjec.gov.dj',
    statut: 'active',
    created_at: '2025-01-20T14:00:00Z',
    updated_at: '2025-01-20T14:00:00Z',
  },
];

export const mockCandidatures: Candidature[] = [
  {
    id: '1',
    offre_id: '1',
    user_id: 'user-1',
    nom_complet: 'Ahmed Hassan',
    cin: '123456789',
    telephone: '+253 77 12 34 56',
    email: 'ahmed@example.com',
    genre: 'homme',
    niveau_education: 'Licence',
    documents: {},
    statut: 'en_cours',
    date_soumission: '2025-01-22T10:30:00Z',
    offre: mockOffres[0],
  },
];