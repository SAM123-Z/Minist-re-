import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  Briefcase,
  Filter,
  Search,
  Plus
} from 'lucide-react';
import { mockCandidatures, type Candidature } from '../lib/api';
import toast from 'react-hot-toast';

interface CandidaturesPageProps {
  user: any;
  profile: any;
}

const statutLabels = {
  en_cours: 'En cours',
  acceptee: 'Acceptée',
  refusee: 'Refusée',
};

const statutColors = {
  en_cours: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  acceptee: 'bg-green-50 text-green-600 border-green-200',
  refusee: 'bg-red-50 text-red-600 border-red-200',
};

const statutIcons = {
  en_cours: Clock,
  acceptee: CheckCircle,
  refusee: XCircle,
};

export default function CandidaturesPage({ user, profile }: CandidaturesPageProps) {
  const [selectedStatut, setSelectedStatut] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Simulation de l'API (remplacer par de vraies requêtes)
  const { data: candidatures = mockCandidatures, isLoading, refetch } = useQuery({
    queryKey: ['candidatures', user.id, selectedStatut, searchTerm],
    queryFn: () => {
      return new Promise<Candidature[]>((resolve) => {
        setTimeout(() => {
          let filtered = mockCandidatures.filter(c => c.user_id === user.id);
          
          if (selectedStatut !== 'all') {
            filtered = filtered.filter(c => c.statut === selectedStatut);
          }
          
          if (searchTerm) {
            filtered = filtered.filter(c =>
              c.offre?.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
              c.nom_complet.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }
          
          resolve(filtered);
        }, 300);
      });
    },
  });

  const handleViewDetails = (candidature: Candidature) => {
    setSelectedCandidature(candidature);
    setShowModal(true);
  };

  const handleEdit = (candidature: Candidature) => {
    if (candidature.statut !== 'en_cours') {
      toast.error('Vous ne pouvez modifier que les candidatures en cours');
      return;
    }
    toast.info('Fonctionnalité de modification en cours de développement');
  };

  const handleDelete = async (candidature: Candidature) => {
    if (candidature.statut !== 'en_cours') {
      toast.error('Vous ne pouvez supprimer que les candidatures en cours');
      return;
    }

    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette candidature ?')) {
      try {
        // Simulation de suppression
        toast.success('Candidature supprimée avec succès');
        refetch();
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const stats = {
    total: candidatures.length,
    enCours: candidatures.filter(c => c.statut === 'en_cours').length,
    acceptees: candidatures.filter(c => c.statut === 'acceptee').length,
    refusees: candidatures.filter(c => c.statut === 'refusee').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-red-600 via-green-600 to-blue-600 rounded-xl">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Mes Candidatures</h2>
            <p className="text-gray-600">Suivez l'état de vos candidatures et gérez vos dossiers</p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-600">Total</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.enCours}</p>
            <p className="text-sm text-yellow-600">En cours</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.acceptees}</p>
            <p className="text-sm text-green-600">Acceptées</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.refusees}</p>
            <p className="text-sm text-red-600">Refusées</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une candidature..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedStatut}
            onChange={(e) => setSelectedStatut(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            {Object.entries(statutLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Candidatures List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      ) : candidatures.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune candidature trouvée</h3>
          <p className="text-gray-600 mb-4">Vous n'avez pas encore soumis de candidature</p>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white rounded-lg hover:from-red-700 hover:via-green-700 hover:to-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Découvrir les offres
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {candidatures.map((candidature) => {
            const StatutIcon = statutIcons[candidature.statut];
            
            return (
              <div key={candidature.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {candidature.offre?.titre || 'Offre supprimée'}
                      </h3>
                      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statutColors[candidature.statut]}`}>
                        <StatutIcon className="w-4 h-4 mr-1" />
                        {statutLabels[candidature.statut]}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span>Soumise le {new Date(candidature.date_soumission).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Briefcase className="w-4 h-4" />
                        <span>{candidature.offre?.type_offre || 'N/A'}</span>
                      </div>
                      {candidature.date_traitement && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>Traitée le {new Date(candidature.date_traitement).toLocaleDateString('fr-FR')}</span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {candidature.notes && (
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <p className="text-sm text-gray-700">
                          <strong>Notes:</strong> {candidature.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleViewDetails(candidature)}
                      className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Voir les détails"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    {candidature.statut === 'en_cours' && (
                      <>
                        <button
                          onClick={() => handleEdit(candidature)}
                          className="p-2 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50 transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(candidature)}
                          className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de détails */}
      {showModal && selectedCandidature && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-red-600 via-green-600 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Détails de la candidature</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Statut */}
              <div className="text-center">
                <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-medium border ${statutColors[selectedCandidature.statut]}`}>
                  {React.createElement(statutIcons[selectedCandidature.statut], { className: "w-5 h-5 mr-2" })}
                  {statutLabels[selectedCandidature.statut]}
                </div>
              </div>

              {/* Informations de l'offre */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Offre</h4>
                <h5 className="font-medium text-gray-900">{selectedCandidature.offre?.titre}</h5>
                <p className="text-sm text-gray-600 mt-1">{selectedCandidature.offre?.description}</p>
              </div>

              {/* Informations du candidat */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Informations personnelles</h5>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Nom:</strong> {selectedCandidature.nom_complet}</p>
                    <p><strong>CIN:</strong> {selectedCandidature.cin}</p>
                    <p><strong>Email:</strong> {selectedCandidature.email}</p>
                    <p><strong>Téléphone:</strong> {selectedCandidature.telephone}</p>
                    <p><strong>Genre:</strong> {selectedCandidature.genre}</p>
                    <p><strong>Niveau d'éducation:</strong> {selectedCandidature.niveau_education}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">Dates importantes</h5>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Soumise le:</strong> {new Date(selectedCandidature.date_soumission).toLocaleDateString('fr-FR')}</p>
                    {selectedCandidature.date_traitement && (
                      <p><strong>Traitée le:</strong> {new Date(selectedCandidature.date_traitement).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedCandidature.notes && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-2">Notes</h5>
                  <p className="text-sm text-blue-800">{selectedCandidature.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
                {selectedCandidature.statut === 'en_cours' && (
                  <button
                    onClick={() => {
                      handleEdit(selectedCandidature);
                      setShowModal(false);
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white rounded-lg hover:from-red-700 hover:via-green-700 hover:to-blue-700 transition-colors"
                  >
                    Modifier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}