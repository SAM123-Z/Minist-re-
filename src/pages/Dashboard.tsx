import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Briefcase, 
  FileText, 
  Star, 
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { mockOffres, mockCandidatures } from '../lib/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface DashboardProps {
  user: any;
  profile: any;
}

export default function Dashboard({ user, profile }: DashboardProps) {
  // Simulation des données (remplacer par de vraies requêtes API)
  const { data: offres = mockOffres } = useQuery({
    queryKey: ['offres'],
    queryFn: () => Promise.resolve(mockOffres),
  });

  const { data: candidatures = mockCandidatures } = useQuery({
    queryKey: ['candidatures', user.id],
    queryFn: () => Promise.resolve(mockCandidatures),
  });

  // Statistiques
  const stats = {
    offresDisponibles: offres.filter(o => o.statut === 'active').length,
    candidaturesEnvoyees: candidatures.length,
    candidaturesAcceptees: candidatures.filter(c => c.statut === 'acceptee').length,
    candidaturesEnCours: candidatures.filter(c => c.statut === 'en_cours').length,
  };

  // Données pour le graphique des candidatures
  const candidaturesChartData = {
    labels: ['En cours', 'Acceptées', 'Refusées'],
    datasets: [
      {
        label: 'Candidatures',
        data: [
          candidatures.filter(c => c.statut === 'en_cours').length,
          candidatures.filter(c => c.statut === 'acceptee').length,
          candidatures.filter(c => c.statut === 'refusee').length,
        ],
        backgroundColor: [
          '#f59e0b',
          '#16a34a',
          '#dc2626',
        ],
        borderColor: [
          '#d97706',
          '#15803d',
          '#b91c1c',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Données pour le graphique des types d'offres
  const offresTypeData = {
    labels: ['Formation', 'Bourse', 'Stage', 'Emploi', 'Séminaire'],
    datasets: [
      {
        data: [
          offres.filter(o => o.type_offre === 'formation').length,
          offres.filter(o => o.type_offre === 'bourse').length,
          offres.filter(o => o.type_offre === 'stage').length,
          offres.filter(o => o.type_offre === 'emploi').length,
          offres.filter(o => o.type_offre === 'seminaire').length,
        ],
        backgroundColor: [
          '#dc2626',
          '#16a34a',
          '#2563eb',
          '#7c3aed',
          '#ea580c',
        ],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Répartition des candidatures',
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-red-600 via-green-600 to-blue-600 rounded-xl">
            <User className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Bienvenue, {profile.username}!</h2>
            <p className="text-gray-600">Voici un aperçu de votre activité sur le portail MINJEC</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500">Nom d'utilisateur</p>
            <p className="text-lg font-semibold text-gray-900">{profile.username}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500">Email</p>
            <p className="text-lg font-semibold text-gray-900 truncate">{user.email}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 sm:col-span-2 md:col-span-1">
            <p className="text-sm font-medium text-gray-500">CIN National</p>
            <p className="text-lg font-semibold text-gray-900">{profile.user_id_or_registration}</p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Offres Disponibles</p>
              <p className="text-3xl font-bold text-gray-900">{stats.offresDisponibles}</p>
              <p className="text-sm text-blue-600 mt-1">Nouvelles opportunités</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Candidatures Envoyées</p>
              <p className="text-3xl font-bold text-gray-900">{stats.candidaturesEnvoyees}</p>
              <p className="text-sm text-green-600 mt-1">Total soumis</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Cours</p>
              <p className="text-3xl font-bold text-gray-900">{stats.candidaturesEnCours}</p>
              <p className="text-sm text-yellow-600 mt-1">En traitement</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-50 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Acceptées</p>
              <p className="text-3xl font-bold text-gray-900">{stats.candidaturesAcceptees}</p>
              <p className="text-sm text-green-600 mt-1">Succès</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Candidatures Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Statut des Candidatures</h3>
          <div className="h-64">
            <Bar data={candidaturesChartData} options={chartOptions} />
          </div>
        </div>

        {/* Offres Types Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Types d'Offres Disponibles</h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut 
              data={offresTypeData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }} 
            />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Activité Récente</h3>
        </div>
        <div className="p-6">
          {candidatures.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucune candidature soumise</p>
              <p className="text-sm text-gray-400 mt-1">Explorez les offres disponibles pour commencer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {candidatures.slice(0, 5).map((candidature) => (
                <div key={candidature.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                    candidature.statut === 'acceptee' ? 'bg-green-50' :
                    candidature.statut === 'refusee' ? 'bg-red-50' : 'bg-yellow-50'
                  }`}>
                    {candidature.statut === 'acceptee' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : candidature.statut === 'refusee' ? (
                      <XCircle className="w-5 h-5 text-red-600" />
                    ) : (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{candidature.offre?.titre}</h4>
                    <p className="text-sm text-gray-600">
                      Candidature {candidature.statut === 'acceptee' ? 'acceptée' : 
                                 candidature.statut === 'refusee' ? 'refusée' : 'en cours'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(candidature.date_soumission).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Nouvelles Offres</h3>
          </div>
          <p className="text-gray-600 text-sm">Découvrez les dernières opportunités publiées par le ministère</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Mes Candidatures</h3>
          </div>
          <p className="text-gray-600 text-sm">Suivez l'état de vos candidatures et gérez vos dossiers</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer sm:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 bg-purple-50 rounded-lg">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Mon Profil</h3>
          </div>
          <p className="text-gray-600 text-sm">Mettez à jour vos informations personnelles et préférences</p>
        </div>
      </div>
    </div>
  );
}