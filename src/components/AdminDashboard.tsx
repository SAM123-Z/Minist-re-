import React, { useState, useEffect } from 'react';
import { supabase, type UserProfile } from '../lib/supabase';
import CreateUserModal from './CreateUserModal';
import RegistrationRequestsManager from './RegistrationRequestsManager';
import { 
  Users, 
  Shield, 
  Building, 
  Crown, 
  BarChart3, 
  FileText, 
  Settings, 
  LogOut,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  Filter,
  Eye,
  UserCheck,
  UserX,
  Calendar,
  TrendingUp,
  Activity,
  AlertCircle,
  Menu,
  X,
  User,
  Loader2,
  Bell
} from 'lucide-react';

interface AdminDashboardProps {
  user: any;
  profile: UserProfile;
  onLogout: () => void;
}

interface DashboardStats {
  totalUsers: number;
  totalAgents: number;
  totalAssociations: number;
  pendingAssociations: number;
  activeAgents: number;
  recentActivities: number;
}

interface User {
  id: string;
  username: string;
  user_type: string;
  user_id_or_registration: string;
  created_at: string;
  email?: string;
  agent_info?: {
    matricule: string;
    department: string;
    status: string;
    hire_date: string;
  };
  association_info?: {
    association_name: string;
    registration_number: string;
    status: string;
    activity_sector: string;
  };
}

interface PendingUser {
  id: string;
  email: string;
  username: string;
  user_type: string;
  user_id_or_registration: string;
  additional_info: any;
  status: 'pending' | 'approved' | 'rejected';
  serial_number?: string;
  created_at: string;
}

interface ActivityLog {
  id: string;
  action_type: string;
  target_type: string;
  description: string;
  created_at: string;
  user?: {
    username: string;
  };
}

const sidebarItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
  { id: 'requests', label: 'Demandes d\'Inscription', icon: Bell },
  { id: 'users', label: 'Gestion Utilisateurs', icon: Users },
  { id: 'agents', label: 'Agents CDC', icon: Shield },
  { id: 'associations', label: 'Associations', icon: Building },
  { id: 'activities', label: 'Journal d\'activité', icon: Activity },
  { id: 'reports', label: 'Rapports', icon: FileText },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

const userTypeConfig = {
  standard_user: { label: 'Utilisateur Standard', color: 'text-blue-600', bgColor: 'bg-blue-50', icon: User },
  cdc_agent: { label: 'Agent CDC', color: 'text-green-600', bgColor: 'bg-green-50', icon: Shield },
  association: { label: 'Association', color: 'text-purple-600', bgColor: 'bg-purple-50', icon: Building },
  admin: { label: 'Administrateur', color: 'text-red-600', bgColor: 'bg-red-50', icon: Crown },
};

export default function AdminDashboard({ user, profile, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAgents: 0,
    totalAssociations: 0,
    pendingAssociations: 0,
    activeAgents: 0,
    recentActivities: 0,
  });
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [processingApproval, setProcessingApproval] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Fonction pour créer une demande d'approbation au lieu de créer directement l'utilisateur
  const handleCreateUserRequest = async (userData: any) => {
    try {
      const additionalInfo: any = {};

      // Préparer les informations supplémentaires selon le type d'utilisateur
      if (userData.userType === 'cdc_agent' && userData.region) {
        additionalInfo.region = userData.region;
        if (userData.commune) additionalInfo.commune = userData.commune;
        if (userData.quartierCite) additionalInfo.quartierCite = userData.quartierCite;
      }

      if (userData.userType === 'association') {
        if (userData.associationName) additionalInfo.associationName = userData.associationName;
        if (userData.activitySector) additionalInfo.activitySector = userData.activitySector;
        if (userData.address) additionalInfo.address = userData.address;
        if (userData.phone) additionalInfo.phone = userData.phone;
      }

      // Stocker le mot de passe de manière sécurisée
      additionalInfo.password = userData.password;
      additionalInfo.createdByAdmin = true;

      // Créer une demande d'approbation au lieu de créer directement l'utilisateur
      const { error } = await supabase
        .from('pending_users')
        .insert({
          email: userData.email,
          username: userData.username,
          user_type: userData.userType,
          user_id_or_registration: userData.userIdOrRegistration,
          additional_info: additionalInfo,
          status: 'pending'
        });

      if (error) throw error;

      // Rafraîchir les données
      await fetchDashboardData();
      
      alert(`Demande de création d'utilisateur soumise avec succès pour ${userData.username}!`);
    } catch (error: any) {
      console.error('Erreur lors de la création de la demande:', error);
      alert('Erreur lors de la création de la demande: ' + error.message);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    
    // Écouter les changements de demandes en temps réel
    let subscription: any = null;
    let notificationSubscription: any = null;
    
    const setupSubscription = async () => {
      subscription = await supabase
        .channel('pending_users_admin')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'pending_users' },
          () => {
            fetchPendingUsers();
          }
        )
        .subscribe();

      // Écouter les nouvelles notifications
      notificationSubscription = await supabase
        .channel('system_notifications_admin')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'system_notifications' },
          (payload) => {
            console.log('Nouvelle notification reçue:', payload);
            fetchNotifications();
            // Afficher une notification browser si possible
            if (Notification.permission === 'granted') {
              new Notification('Nouvelle demande d\'inscription', {
                body: payload.new.message,
                icon: '/favicon.ico'
              });
            }
          }
        )
        .subscribe();
    };
    
    setupSubscription();
    fetchNotifications();
    
    // Demander permission pour les notifications browser
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
      if (notificationSubscription && notificationSubscription.unsubscribe) {
        notificationSubscription.unsubscribe();
      }
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchPendingUsers(),
        fetchActivities(),
        fetchNotifications(),
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch user counts
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select('user_type');

      const { data: agents } = await supabase
        .from('cdc_agents')
        .select('status');

      const { data: associations } = await supabase
        .from('associations')
        .select('status');

      const { data: recentActivities } = await supabase
        .from('activity_logs')
        .select('id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const totalUsers = userProfiles?.length || 0;
      const totalAgents = agents?.length || 0;
      const totalAssociations = associations?.length || 0;
      const pendingAssociations = associations?.filter(a => a.status === 'pending').length || 0;
      const activeAgents = agents?.filter(a => a.status === 'active').length || 0;

      setStats({
        totalUsers,
        totalAgents,
        totalAssociations,
        pendingAssociations,
        activeAgents,
        recentActivities: recentActivities?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data: userProfiles } = await supabase
        .from('user_profiles')
        .select(`
          *,
          cdc_agents (matricule, department, status, hire_date),
          associations (association_name, registration_number, status, activity_sector)
        `)
        .order('created_at', { ascending: false });

      const formattedUsers: User[] = userProfiles?.map(profile => ({
        id: profile.id,
        username: profile.username,
        user_type: profile.user_type,
        user_id_or_registration: profile.user_id_or_registration,
        created_at: profile.created_at,
        agent_info: profile.cdc_agents?.[0] ? {
          matricule: profile.cdc_agents[0].matricule,
          department: profile.cdc_agents[0].department,
          status: profile.cdc_agents[0].status,
          hire_date: profile.cdc_agents[0].hire_date,
        } : undefined,
        association_info: profile.associations?.[0] ? {
          association_name: profile.associations[0].association_name,
          registration_number: profile.associations[0].registration_number,
          status: profile.associations[0].status,
          activity_sector: profile.associations[0].activity_sector,
        } : undefined,
      })) || [];

      setUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPendingUsers = async () => {
    try {
      const { data } = await supabase
        .from('pending_users')
        .select('*')
        .order('created_at', { ascending: false });

      setPendingUsers(data || []);
      setPendingCount(data?.filter(u => u.status === 'pending').length || 0);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    }
  };

  const fetchActivities = async () => {
    try {
      const { data } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user_profiles (username)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const formattedActivities: ActivityLog[] = data?.map(log => ({
        id: log.id,
        action_type: log.action_type,
        target_type: log.target_type,
        description: log.description,
        created_at: log.created_at,
        user: log.user_profiles ? { username: log.user_profiles.username } : undefined,
      })) || [];

      setActivities(formattedActivities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('system_notifications')
        .select('*')
        .eq('type', 'new_registration')
        .order('created_at', { ascending: false })
        .limit(10);

      setNotifications(data || []);
      
      // Compter les notifications non lues (créées dans les dernières 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const unreadCount = data?.filter(n => new Date(n.created_at) > oneDayAgo).length || 0;
      setUnreadNotifications(unreadCount);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const handleApproveUser = async (pendingId: string) => {
    setProcessingApproval(pendingId);
    try {
      // Get current session for authentication
      const { data: session } = await supabase.auth.getSession();
      
      // Call the server-side approval function with proper authentication
      const { data, error } = await supabase.functions.invoke('approve-registration', {
        body: {
          pendingUserId: pendingId,
          adminUserId: user.id
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token || ''}`
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Erreur lors de l\'approbation');

      alert(`✅ ${data.message}\n\n📧 Un email avec le code de passerelle (${data.gatewayCode}) a été envoyé à l'utilisateur.\n\n🔑 L'utilisateur peut maintenant finaliser son inscription avec ce code.`);
      await fetchDashboardData();

    } catch (error: any) {
      console.error('Error approving user:', error);
      
      let errorMessage = 'Erreur lors de l\'approbation';
      
      if (error.message?.includes('FunctionsHttpError')) {
        errorMessage = 'Erreur de communication avec le serveur. Veuillez réessayer.';
      } else if (error.message?.includes('Failed to fetch')) {
        errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
      } else {
        errorMessage = error.message || 'Erreur inconnue';
      }
      
      alert('Erreur lors de l\'approbation: ' + errorMessage);
    } finally {
      setProcessingApproval(null);
    }
  };

  const handleRejectUser = async (pendingId: string) => {
    const reason = prompt('Raison du rejet (optionnel):') || 'Non spécifié';
    
    setProcessingApproval(pendingId);
    try {
      // Récupérer les informations de la demande
      const { data: pendingUser, error: fetchError } = await supabase
        .from('pending_users')
        .select('*')
        .eq('id', pendingId)
        .single();

      if (fetchError) throw fetchError;
      if (!pendingUser) throw new Error('Demande non trouvée');

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

      // L'email de rejet sera envoyé automatiquement par le trigger

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
      await fetchDashboardData();
    } catch (error: any) {
      console.error('Error rejecting user:', error);
      alert('Erreur lors du rejet: ' + error.message);
    } finally {
      setProcessingApproval(null);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.user_id_or_registration.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || user.user_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const renderDashboardOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Utilisateurs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Agents CDC</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalAgents}</p>
              <p className="text-sm text-green-600">{stats.activeAgents} actifs</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Associations</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalAssociations}</p>
              <p className="text-sm text-yellow-600">{stats.pendingAssociations} en attente</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-purple-50 rounded-lg">
              <Building className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Activités Récentes</h3>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500">
                    {activity.user?.username} • {new Date(activity.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsersManagement = () => (
    <div className="space-y-6">
      {/* Header */}
      <h2 className="text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h2>

      {/* Demandes en attente */}
      {pendingUsers.filter(u => u.status === 'pending').length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-yellow-900 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Demandes en Attente d'Approbation ({pendingUsers.filter(u => u.status === 'pending').length})
          </h3>
            {unreadNotifications > 0 && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                <Bell className="w-4 h-4 animate-pulse" />
                {unreadNotifications} nouvelle{unreadNotifications > 1 ? 's' : ''}
              </div>
            )}
          </div>
          <div className="space-y-4">
            {pendingUsers.filter(u => u.status === 'pending').map((pendingUser) => (
              <div key={pendingUser.id} className="bg-white rounded-lg p-4 border border-yellow-300">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${userTypeConfig[pendingUser.user_type as keyof typeof userTypeConfig]?.bgColor}`}>
                        {React.createElement(userTypeConfig[pendingUser.user_type as keyof typeof userTypeConfig]?.icon || User, {
                          className: `w-4 h-4 ${userTypeConfig[pendingUser.user_type as keyof typeof userTypeConfig]?.color}`
                        })}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{pendingUser.username}</h4>
                        <p className="text-sm text-gray-600">{pendingUser.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Type:</span>
                        <span className="ml-2 font-medium">{userTypeConfig[pendingUser.user_type as keyof typeof userTypeConfig]?.label}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">ID/Enregistrement:</span>
                        <span className="ml-2 font-medium">{pendingUser.user_id_or_registration}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-gray-500">Demandé le:</span>
                        <span className="ml-2 font-medium">{new Date(pendingUser.created_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveUser(pendingUser.id)}
                      disabled={processingApproval === pendingUser.id}
                      className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm"
                    >
                      {processingApproval === pendingUser.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                      Approuver
                    </button>
                    <button
                      onClick={() => handleRejectUser(pendingUser.id)}
                      disabled={processingApproval === pendingUser.id}
                      className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                    >
                      <UserX className="w-4 h-4" />
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Tous les types</option>
          <option value="standard_user">Utilisateurs Standard</option>
          <option value="cdc_agent">Agents CDC</option>
          <option value="association">Associations</option>
          <option value="admin">Administrateurs</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Informations
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date de création
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 truncate">{user.username}</div>
                      <div className="text-xs text-gray-500 truncate">{user.user_id_or_registration}</div>
                      <div className="sm:hidden mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${userTypeConfig[user.user_type as keyof typeof userTypeConfig]?.bgColor} ${userTypeConfig[user.user_type as keyof typeof userTypeConfig]?.color}`}>
                          {userTypeConfig[user.user_type as keyof typeof userTypeConfig]?.label}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="hidden sm:table-cell px-3 sm:px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${userTypeConfig[user.user_type as keyof typeof userTypeConfig]?.bgColor} ${userTypeConfig[user.user_type as keyof typeof userTypeConfig]?.color}`}>
                      {userTypeConfig[user.user_type as keyof typeof userTypeConfig]?.label}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.agent_info && (
                      <div>
                        <div className="truncate">Matricule: {user.agent_info.matricule}</div>
                        <div className="text-gray-500">{user.agent_info.department}</div>
                      </div>
                    )}
                    {user.association_info && (
                      <div>
                        <div className="truncate">{user.association_info.association_name}</div>
                        <div className="text-gray-500">{user.association_info.activity_sector}</div>
                      </div>
                    )}
                  </td>
                  <td className="hidden lg:table-cell px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button className="text-blue-600 hover:text-blue-900">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-900">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-900">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboardOverview();
      case 'requests':
        return <RegistrationRequestsManager user={user} />;
      case 'users':
        return renderUsersManagement();
      case 'agents':
        return <div className="p-6 bg-white rounded-xl">Gestion des Agents CDC (En développement)</div>;
      case 'associations':
        return <div className="p-6 bg-white rounded-xl">Gestion des Associations (En développement)</div>;
      case 'activities':
        return <div className="p-6 bg-white rounded-xl">Journal d'activité (En développement)</div>;
      case 'reports':
        return <div className="p-6 bg-white rounded-xl">Rapports (En développement)</div>;
      case 'settings':
        return <div className="p-6 bg-white rounded-xl">Paramètres (En développement)</div>;
      default:
        return renderDashboardOverview();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between lg:justify-center">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-red-600 via-green-600 to-blue-600 rounded-lg">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                <p className="text-sm text-gray-500">MINJEC</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {sidebarItems.map((item) => {
            const IconComponent = item.icon;
            const isRequestsTab = item.id === 'requests';
            const hasNotifications = isRequestsTab && (pendingCount > 0 || unreadNotifications > 0);
            const notificationCount = isRequestsTab ? Math.max(pendingCount, unreadNotifications) : 0;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? 'bg-red-600 text-white shadow-md font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                }`}
              >
                <div className="flex items-center gap-3">
                  <IconComponent className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {hasNotifications && (
                  <div className="flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                    {notificationCount}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200 bg-white mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-8 h-8 bg-red-50 rounded-lg">
              <Crown className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile.username}</p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              {activeTab === 'requests' && (pendingCount > 0 || unreadNotifications > 0) && (
                <div className="flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                  <Bell className="w-4 h-4" />
                  {Math.max(pendingCount, unreadNotifications)} nouvelle{Math.max(pendingCount, unreadNotifications) > 1 ? 's' : ''} demande{Math.max(pendingCount, unreadNotifications) > 1 ? 's' : ''}
                </div>
              )}
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-600 via-green-600 to-blue-600 bg-clip-text text-transparent">
                {sidebarItems.find(item => item.id === activeTab)?.label || 'Tableau de bord'}
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <Download className="w-5 h-5" />
              </button>
              <div className="hidden md:block text-sm text-gray-500">
                {new Date().toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6">
          {renderContent()}
        </main>
      </div>

      {/* Modal de création d'utilisateur */}
      <CreateUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onUserCreated={fetchDashboardData}
      />
    </div>
  );
}