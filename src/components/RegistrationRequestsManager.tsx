import React, { useState, useEffect } from 'react';
import { supabase, type PendingUser } from '../lib/supabase';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  User,
  Shield,
  Building,
  Crown,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  Eye,
  UserCheck,
  UserX,
  Loader2,
  Filter,
  Search,
  RefreshCw,
  Bell
} from 'lucide-react';

interface RegistrationRequestsManagerProps {
  user: any;
}

const userTypeConfig = {
  standard_user: { label: 'Utilisateur Standard', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: User },
  cdc_agent: { label: 'Agent CDC', color: 'text-green-600', bgColor: 'bg-green-50', icon: Shield },
  association: { label: 'Association', color: 'text-purple-600', bgColor: 'bg-purple-50', icon: Building },
  admin: { label: 'Administrateur', color: 'text-red-600', bgColor: 'bg-red-50', icon: Crown },
};

const statusConfig = {
  pending: { label: 'En Attente', color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: Clock },
  approved: { label: 'Approuvée', color: 'text-green-600', bgColor: 'bg-green-50', icon: CheckCircle },
  rejected: { label: 'Rejetée', color: 'text-red-600', bgColor: 'bg-red-50', icon: XCircle },
};

export default function RegistrationRequestsManager({ user }: RegistrationRequestsManagerProps) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [filterType, setFilterType] = useState<'all' | string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<PendingUser | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchPendingUsers();
    
    // Écouter les changements en temps réel
    const subscription = supabase
      .channel('pending_users_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'pending_users' },
        () => {
          fetchPendingUsers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pending_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingUsers(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des demandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (pendingId: string) => {
    setProcessingId(pendingId);
    try {
      // Call the server-side approval function with proper headers
      const { data, error } = await supabase.functions.invoke('approve-registration', {
        body: {
          pendingUserId: pendingId,
          adminUserId: user.id
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erreur lors de l\'approbation');

      alert(`✅ ${data.message}\n\n📧 Un email avec le code de passerelle (${data.gatewayCode}) a été envoyé à l'utilisateur.\n\n🔑 L'utilisateur peut maintenant finaliser son inscription avec ce code.`);
      
    } catch (error: any) {
      console.error('Erreur lors de l\'approbation:', error);
      
      let errorMessage = 'Erreur lors de l\'approbation';
      
      // Handle different types of errors
      if (error.message?.includes('FunctionsHttpError')) {
        errorMessage = 'Erreur de communication avec le serveur. Vérifiez votre connexion.';
      } else if (error.context?.response) {
        try {
          const responseText = await error.context.response.text();
          try {
            const responseJson = JSON.parse(responseText);
            errorMessage = responseJson.error || responseJson.message || responseText;
          } catch {
            errorMessage = responseText || error.message;
          }
        } catch {
          errorMessage = error.message || 'Edge Function returned a non-2xx status code';
        }
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
      } else if (error.message?.includes('NetworkError')) {
        errorMessage = 'Erreur réseau. Veuillez réessayer.';
      } else {
        errorMessage = error.message || 'Erreur lors de l\'approbation';
      }
      
      alert('Erreur lors de l\'approbation: ' + errorMessage);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (pendingId: string) => {
    const reason = prompt('Raison du rejet (optionnel):') || 'Non spécifié';
    
    setProcessingId(pendingId);
    try {
      const { error } = await supabase
        .from('pending_users')
        .update({
          status: 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejected_reason: reason,
        })
        .eq('id', pendingId);

      if (error) throw error;

      // Enregistrer l'activité
      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action_type: 'REJECT',
          target_type: 'USER_REQUEST',
          target_id: pendingId,
          description: `Demande d'utilisateur rejetée: ${reason}`,
          metadata: {
            pending_user_id: pendingId,
            rejection_reason: reason,
          },
        });

      alert(`❌ Demande rejetée avec succès.\n\n📧 Un email de notification a été envoyé à l'utilisateur.\n\n📝 Raison: ${reason}`);
      
    } catch (error: any) {
      console.error('Erreur lors du rejet:', error);
      alert('Erreur lors du rejet: ' + error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = pendingUsers.filter(request => {
    const matchesSearch = request.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.user_id_or_registration.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    const matchesType = filterType === 'all' || request.user_type === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const pendingCount = pendingUsers.filter(u => u.status === 'pending').length;
  const approvedCount = pendingUsers.filter(u => u.status === 'approved').length;
  const rejectedCount = pendingUsers.filter(u => u.status === 'rejected').length;

  const renderRequestDetails = (request: PendingUser) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-red-600 via-green-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Détails de la Demande</h2>
          <button
            onClick={() => setShowDetails(false)}
            className="text-white hover:text-gray-200 transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Nom d'utilisateur</p>
              <p className="text-lg font-semibold text-gray-900">{request.username}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Email</p>
              <p className="text-lg font-semibold text-gray-900">{request.email}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Type d'utilisateur</p>
              <p className="text-lg font-semibold text-gray-900">
                {userTypeConfig[request.user_type as keyof typeof userTypeConfig]?.label}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">CIN National</p>
              <p className="text-lg font-semibold text-gray-900">{request.user_id_or_registration}</p>
            </div>
          </div>

          {/* Informations spécifiques */}
          {request.additional_info && Object.keys(request.additional_info).length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-3">Informations Supplémentaires</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(request.additional_info).map(([key, value]) => {
                  if (key === 'password') return null;
                  return (
                    <div key={key} className="bg-white rounded p-3">
                      <p className="text-sm font-medium text-gray-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </p>
                      <p className="text-sm text-gray-900">{String(value)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Statut et dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Statut</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium ${statusConfig[request.status]?.bgColor} ${statusConfig[request.status]?.color}`}>
                {statusConfig[request.status]?.label}
              </span>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Date de demande</p>
              <p className="text-sm text-gray-900">
                {new Date(request.created_at).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          {/* Actions */}
          {request.status === 'pending' && (
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleReject(request.id)}
                disabled={processingId === request.id}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {processingId === request.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UserX className="w-5 h-5" />
                )}
                Rejeter
              </button>
              <button
                onClick={() => handleApprove(request.id)}
                disabled={processingId === request.id}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processingId === request.id ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UserCheck className="w-5 h-5" />
                )}
                Approuver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header avec statistiques */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Demandes d'Inscription</h2>
              <p className="text-gray-600">Gestion des demandes de création de compte</p>
            </div>
          </div>
          <button
            onClick={fetchPendingUsers}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">En Attente</p>
                <p className="text-2xl font-bold text-yellow-900">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Approuvées</p>
                <p className="text-2xl font-bold text-green-900">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Rejetées</p>
                <p className="text-2xl font-bold text-red-900">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email ou CIN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="approved">Approuvées</option>
            <option value="rejected">Rejetées</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tous les types</option>
            <option value="standard_user">Utilisateur Standard</option>
            <option value="cdc_agent">Agent CDC</option>
            <option value="association">Association</option>
            <option value="admin">Administrateur</option>
          </select>
        </div>
      </div>

      {/* Liste des demandes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucune demande trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRequests.map((request) => {
              const userTypeInfo = userTypeConfig[request.user_type as keyof typeof userTypeConfig];
              const statusInfo = statusConfig[request.status];
              const IconComponent = userTypeInfo?.icon || User;
              
              return (
                <div key={request.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${userTypeInfo?.bgColor}`}>
                        <IconComponent className={`w-6 h-6 ${userTypeInfo?.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{request.username}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo?.bgColor} ${statusInfo?.color}`}>
                            {statusInfo?.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <span className="truncate">{request.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-4 h-4" />
                            <span>{request.user_id_or_registration}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${userTypeInfo?.bgColor} ${userTypeInfo?.color}`}>
                            {userTypeInfo?.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetails(true);
                        }}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleReject(request.id)}
                            disabled={processingId === request.id}
                            className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                          >
                            {processingId === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserX className="w-4 h-4" />
                            )}
                            Rejeter
                          </button>
                          <button
                            onClick={() => handleApprove(request.id)}
                            disabled={processingId === request.id}
                            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                          >
                            {processingId === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                            Approuver
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
      </div>

      {/* Modal de détails */}
      {showDetails && selectedRequest && renderRequestDetails(selectedRequest)}
    </div>
  );
}