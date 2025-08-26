import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  Eye, 
  Heart,
  Briefcase,
  GraduationCap,
  Award,
  Users,
  Clock,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { mockOffres, type Offre } from '../lib/api';
import toast from 'react-hot-toast';

interface OffresPageProps {
  user: any;
  profile: any;
}

const typeOffreLabels = {
  formation: 'Formation',
  seminaire: 'Séminaire',
  stage: 'Stage',
  emploi: 'Emploi',
  bourse: 'Bourse',
  autre: 'Autre',
};

const typeOffreIcons = {
  formation: GraduationCap,
  seminaire: Users,
  stage: Briefcase,
  emploi: Briefcase,
  bourse: Award,
  autre: Briefcase,
};

const typeOffreColors = {
  formation: 'bg-blue-50 text-blue-600 border-blue-200',
  seminaire: 'bg-green-50 text-green-600 border-green-200',
  stage: 'bg-purple-50 text-purple-600 border-purple-200',
  emploi: 'bg-red-50 text-red-600 border-red-200',
  bourse: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  autre: 'bg-gray-50 text-gray-600 border-gray-200',
};

export default function OffresPage({ user, profile }: OffresPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState<string[]>([]);
  const itemsPerPage = 6;

  // Simulation de l'API (remplacer par de vraies requêtes)
  const { data: offres = mockOffres, isLoading } = useQuery({
    queryKey: ['offres', searchTerm, selectedType],
    queryFn: () => {
      // Simulation d'un délai d'API
      return new Promise<Offre[]>((resolve) => {
        setTimeout(() => {
          let filtered = mockOffres.filter(offre => offre.statut === 'active');
          
          if (searchTerm) {
            filtered = filtered.filter(offre =>
              offre.titre.toLowerCase().includes(searchTerm.toLowerCase()) ||
              offre.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
          }
          
          if (selectedType !== 'all') {
            filtered = filtered.filter(offre => offre.type_offre === selectedType);
          }
          
          resolve(filtered);
        }, 500);
      });
    },
  });

  // Pagination
  const totalPages = Math.ceil(offres.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOffres = offres.slice(startIndex, startIndex + itemsPerPage);

  const handleViewDetails = (offre: Offre) => {
    setSelectedOffre(offre);
    setShowModal(true);
  };

  const handleToggleFavorite = (offreId: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(offreId)
        ? prev.filter(id => id !== offreId)
        : [...prev, offreId];
      
      toast.success(
        prev.includes(offreId) 
          ? 'Offre retirée des favoris' 
          : 'Offre ajoutée aux favoris'
      );
      
      return newFavorites;
    });
  };

  const handleApply = (offre: Offre) => {
    // Redirection vers la page de candidature (à implémenter)
    toast.success(`Candidature initiée pour: ${offre.titre}`);
  };

  const isExpiringSoon = (dateLimit: string) => {
    const today = new Date();
    const limitDate = new Date(dateLimit);
    const diffTime = limitDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays > 0;
  };

  const isExpired = (dateLimit: string) => {
    const today = new Date();
    const limitDate = new Date(dateLimit);
    return limitDate < today;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-r from-red-600 via-green-600 to-blue-600 rounded-xl">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Offres Ministérielles</h2>
            <p className="text-gray-600">Découvrez les opportunités publiées par le MINJEC</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une offre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les types</option>
            {Object.entries(typeOffreLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-gray-600">
          {isLoading ? 'Chargement...' : `${offres.length} offre(s) trouvée(s)`}
        </div>
      </div>

      {/* Offres Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : paginatedOffres.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune offre trouvée</h3>
          <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedOffres.map((offre) => {
            const TypeIcon = typeOffreIcons[offre.type_offre];
            const isOffreExpired = isExpired(offre.date_limite);
            const isOffreExpiringSoon = isExpiringSoon(offre.date_limite);
            const isFavorite = favorites.includes(offre.id);

            return (
              <div key={offre.id} className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${typeOffreColors[offre.type_offre]}`}>
                      <TypeIcon className="w-4 h-4 mr-1" />
                      {typeOffreLabels[offre.type_offre]}
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(offre.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isFavorite 
                          ? 'text-red-600 bg-red-50 hover:bg-red-100' 
                          : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                    </button>
                  </div>

                  {/* Title and Description */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    {offre.titre}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {offre.description}
                  </p>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>Limite: {new Date(offre.date_limite).toLocaleDateString('fr-FR')}</span>
                      {isOffreExpired && (
                        <span className="text-red-600 font-medium">Expirée</span>
                      )}
                      {isOffreExpiringSoon && !isOffreExpired && (
                        <span className="text-orange-600 font-medium">Expire bientôt</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <MapPin className="w-4 h-4" />
                      <span>{offre.lieu}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(offre)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                      Détails
                    </button>
                    <button
                      onClick={() => handleApply(offre)}
                      disabled={isOffreExpired}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                        isOffreExpired
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white hover:from-red-700 hover:via-green-700 hover:to-blue-700'
                      }`}
                    >
                      {isOffreExpired ? 'Expirée' : 'Candidater'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentPage === i + 1
                  ? 'bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {i + 1}
            </button>
          ))}
          
          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal de détails */}
      {showModal && selectedOffre && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-red-600 via-green-600 to-blue-600 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Détails de l'offre</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Type et titre */}
              <div>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border mb-3 ${typeOffreColors[selectedOffre.type_offre]}`}>
                  {React.createElement(typeOffreIcons[selectedOffre.type_offre], { className: "w-4 h-4 mr-1" })}
                  {typeOffreLabels[selectedOffre.type_offre]}
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{selectedOffre.titre}</h3>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
                <p className="text-gray-700 leading-relaxed">{selectedOffre.description}</p>
              </div>

              {/* Exigences */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Exigences</h4>
                <p className="text-gray-700 leading-relaxed">{selectedOffre.exigences}</p>
              </div>

              {/* Informations pratiques */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">📅 Dates importantes</h5>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Publication: {new Date(selectedOffre.date_publication).toLocaleDateString('fr-FR')}</p>
                    <p>Date limite: {new Date(selectedOffre.date_limite).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <h5 className="font-medium text-gray-900 mb-2">📍 Lieu</h5>
                  <p className="text-sm text-gray-600">{selectedOffre.lieu}</p>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h5 className="font-medium text-blue-900 mb-2">📧 Contact</h5>
                <p className="text-sm text-blue-800">{selectedOffre.contact_info}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fermer
                </button>
                <button
                  onClick={() => {
                    handleApply(selectedOffre);
                    setShowModal(false);
                  }}
                  disabled={isExpired(selectedOffre.date_limite)}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    isExpired(selectedOffre.date_limite)
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white hover:from-red-700 hover:via-green-700 hover:to-blue-700'
                  }`}
                >
                  {isExpired(selectedOffre.date_limite) ? 'Offre expirée' : 'Candidater maintenant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}