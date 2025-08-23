import React, { useState, useEffect } from 'react';
import { supabase, type UserProfile } from '../lib/supabase';
import { 
  Home, 
  Activity, 
  Building, 
  FileText, 
  Briefcase, 
  Bell, 
  Settings, 
  LogOut,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  Users,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
  Send,
  Download,
  Filter,
  Search,
  User,
  Phone,
  Mail,
  GraduationCap,
  Menu,
  X
} from 'lucide-react';

interface CDCAgentDashboardProps {
  user: any;
  profile: UserProfile;
  onLogout: () => void;
}

interface AgentInfo {
  id: string;
  matricule: string;
  department: string;
  status: string;
  hire_date: string;
}

interface Mission {
  id: string;
  title: string;
  description: string;
  status: 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string;
  created_at: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  activity_type: string;
  target_audience: string;
  location: string;
  scheduled_date: string;
  status: string;
  participants_count: number;
  created_at: string;
}

interface MinistryOffer {
  id: string;
  title: string;
  description: string;
  offer_type: string;
  requirements: string;
  deadline: string;
  location: string;
  contact_info: string;
  created_at: string;
}

interface Application {
  id: string;
  offer_id: string;
  applicant_name: string;
  applicant_cin: string;
  applicant_phone: string;
  applicant_email: string;
  applicant_gender: string;
  applicant_education: string;
  status: string;
  submitted_at: string;
  offer?: MinistryOffer;
}

interface Report {
  id: string;
  title: string;
  report_type: string;
  content: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
}

interface DashboardStats {
  totalMissions: number;
  completedMissions: number;
  totalActivities: number;
  totalApplications: number;
  pendingReports: number;
}

const sidebarItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: Home },
  { id: 'activities', label: 'Activités CDC', icon: Activity },
  { id: 'offers', label: 'Offres Ministère', icon: Briefcase },
  { id: 'applications', label: 'Candidatures', icon: Users },
  { id: 'reports', label: 'Rapports', icon: FileText },
];

const statusConfig = {
  assigned: { label: 'Assignée', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  in_progress: { label: 'En cours', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
  completed: { label: 'Terminée', color: 'text-green-600', bgColor: 'bg-green-50' },
  cancelled: { label: 'Annulée', color: 'text-red-600', bgColor: 'bg-red-50' },
};

const priorityConfig = {
  low: { label: 'Faible', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  medium: { label: 'Moyenne', color: 'text-blue-600', bgColor: 'bg-blue-50' },
  high: { label: 'Élevée', color: 'text-orange-600', bgColor: 'bg-orange-50' },
  urgent: { label: 'Urgente', color: 'text-red-600', bgColor: 'bg-red-50' },
};

export default function CDCAgentDashboard({ user, profile, onLogout }: CDCAgentDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [agentInfo, setAgentInfo] = useState<AgentInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalMissions: 0,
    completedMissions: 0,
    totalActivities: 0,
    totalApplications: 0,
    pendingReports: 0,
  });
  const [missions, setMissions] = useState<Mission[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [offers, setOffers] = useState<MinistryOffer[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalType, setModalType] = useState<'activity' | 'application' | 'report'>('activity');

  useEffect(() => {
    fetchAgentData();
  }, [user.id]);

  const fetchAgentData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchAgentInfo(),
        fetchMissions(),
        fetchActivities(),
        fetchOffers(),
        fetchApplications(),
        fetchReports(),
      ]);
      calculateStats();
    } catch (error) {
      console.error('Error fetching agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentInfo = async () => {
    const { data } = await supabase
      .from('cdc_agents')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) setAgentInfo(data);
  };

  const fetchMissions = async () => {
    if (!agentInfo) return;
    
    const { data } = await supabase
      .from('cdc_missions')
      .select('*')
      .eq('agent_id', agentInfo.id)
      .order('created_at', { ascending: false });
    
    if (data) setMissions(data);
  };

  const fetchActivities = async () => {
    if (!agentInfo) return;
    
    const { data } = await supabase
      .from('cdc_activities')
      .select('*')
      .eq('agent_id', agentInfo.id)
      .order('created_at', { ascending: false });
    
    if (data) setActivities(data);
  };

  const fetchOffers = async () => {
    const { data } = await supabase
      .from('ministry_offers')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (data) setOffers(data);
  };

  const fetchApplications = async () => {
    if (!agentInfo) return;
    
    const { data } = await supabase
      .from('offer_applications')
      .select(`
        *,
        ministry_offers (title, offer_type, deadline)
      `)
      .eq('agent_id', agentInfo.id)
      .order('submitted_at', { ascending: false });
    
    if (data) setApplications(data);
  };

  const fetchReports = async () => {
    if (!agentInfo) return;
    
    const { data } = await supabase
      .from('cdc_reports')
      .select('*')
      .eq('agent_id', agentInfo.id)
      .order('created_at', { ascending: false });
    
    if (data) setReports(data);
  };

  const calculateStats = () => {
    setStats({
      totalMissions: missions.length,
      completedMissions: missions.filter(m => m.status === 'completed').length,
      totalActivities: activities.length,
      totalApplications: applications.length,
      pendingReports: reports.filter(r => r.status === 'draft').length,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Agent Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Informations Personnelles</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500">CIN National</p>
            <p className="text-lg font-semibold text-gray-900">{profile.user_id_or_registration}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500">Nom</p>
            <p className="text-lg font-semibold text-gray-900">{profile.username}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500">Rôle</p>
            <p className="text-lg font-semibold text-gray-900">Agent CDC</p>
          </div>
          {agentInfo && (
            <>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-500">Matricule</p>
                <p className="text-lg font-semibold text-gray-900">{agentInfo.matricule}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 md:col-span-2">
                <p className="text-sm font-medium text-gray-500">Département</p>
                <p className="text-lg font-semibold text-gray-900">{agentInfo.department}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Missions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalMissions}</p>
              <p className="text-sm text-green-600">{stats.completedMissions} terminées</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-blue-50 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Activités</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalActivities}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-green-50 rounded-lg">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Candidatures</p>
              <p className="text-3xl font-bold text-gray-900">{stats.totalApplications}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-purple-50 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rapports</p>
              <p className="text-3xl font-bold text-gray-900">{reports.length}</p>
              <p className="text-sm text-yellow-600">{stats.pendingReports} en attente</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-yellow-50 rounded-lg">
              <FileText className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Missions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Missions Assignées</h3>
        </div>
        <div className="p-6">
          {missions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune mission assignée</p>
          ) : (
            <div className="space-y-4">
              {missions.slice(0, 5).map((mission) => (
                <div key={mission.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{mission.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{mission.description}</p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig[mission.status]?.bgColor} ${statusConfig[mission.status]?.color}`}>
                        {statusConfig[mission.status]?.label}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityConfig[mission.priority]?.bgColor} ${priorityConfig[mission.priority]?.color}`}>
                        {priorityConfig[mission.priority]?.label}
                      </span>
                      {mission.due_date && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(mission.due_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderActivities = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Gestion des Activités CDC</h2>
        <button
          onClick={() => {
            setModalType('activity');
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouvelle Activité
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucune activité créée</p>
              <button
                onClick={() => {
                  setModalType('activity');
                  setShowCreateModal(true);
                }}
                className="mt-4 text-green-600 hover:text-green-700 font-medium"
              >
                Créer votre première activité
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{activity.title}</h3>
                      <p className="text-gray-600 mt-1">{activity.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(activity.scheduled_date).toLocaleDateString('fr-FR')}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {activity.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {activity.participants_count} participants
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderOffers = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Offres du Ministère</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          {offers.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucune offre disponible</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {offers.map((offer) => (
                <div key={offer.id} className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">{offer.title}</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                      {offer.offer_type}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-4">{offer.description}</p>
                  <div className="space-y-2 text-sm text-gray-500 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Échéance: {new Date(offer.deadline).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{offer.location}</span>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Exigences:</p>
                    <p className="text-sm text-gray-600">{offer.requirements}</p>
                  </div>
                  <button
                    onClick={() => {
                      setModalType('application');
                      setShowCreateModal(true);
                    }}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Soumettre une candidature
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderApplications = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Candidatures Soumises</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          {applications.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucune candidature soumise</p>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application) => (
                <div key={application.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{application.applicant_name}</h3>
                      <p className="text-gray-600">CIN: {application.applicant_cin}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {application.applicant_phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {application.applicant_email}
                        </span>
                        <span className="flex items-center gap-1">
                          <GraduationCap className="w-4 h-4" />
                          {application.applicant_education}
                        </span>
                      </div>
                      {application.offer && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-700">Offre: {application.offer.title}</p>
                          <p className="text-xs text-gray-500">Type: {application.offer.offer_type}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        application.status === 'submitted' ? 'bg-blue-50 text-blue-600' :
                        application.status === 'under_review' ? 'bg-yellow-50 text-yellow-600' :
                        application.status === 'accepted' ? 'bg-green-50 text-green-600' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {application.status === 'submitted' ? 'Soumise' :
                         application.status === 'under_review' ? 'En révision' :
                         application.status === 'accepted' ? 'Acceptée' : 'Rejetée'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(application.submitted_at).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Rapports</h2>
        <button
          onClick={() => {
            setModalType('report');
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau Rapport
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6">
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun rapport créé</p>
              <button
                onClick={() => {
                  setModalType('report');
                  setShowCreateModal(true);
                }}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                Créer votre premier rapport
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{report.title}</h3>
                      <p className="text-gray-600 mt-1">Type: {report.report_type}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span>Période: {new Date(report.period_start).toLocaleDateString('fr-FR')} - {new Date(report.period_end).toLocaleDateString('fr-FR')}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          report.status === 'draft' ? 'bg-gray-50 text-gray-600' :
                          report.status === 'submitted' ? 'bg-blue-50 text-blue-600' :
                          'bg-green-50 text-green-600'
                        }`}>
                          {report.status === 'draft' ? 'Brouillon' :
                           report.status === 'submitted' ? 'Soumis' : 'Révisé'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-blue-500 hover:text-blue-700 rounded-lg hover:bg-blue-50">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-green-500 hover:text-green-700 rounded-lg hover:bg-green-50">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'activities':
        return renderActivities();
      case 'offers':
        return renderOffers();
      case 'applications':
        return renderApplications();
      case 'reports':
        return renderReports();
      default:
        return renderDashboard();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Agent CDC</h1>
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
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === item.id
                    ? 'bg-green-600 text-white shadow-md font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                }`}
              >
                <IconComponent className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-gray-200 bg-white mt-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-8 h-8 bg-green-50 rounded-lg">
              <User className="w-4 h-4 text-green-600" />
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
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-red-600 via-green-600 to-blue-600 bg-clip-text text-transparent">
                {sidebarItems.find(item => item.id === activeTab)?.label || 'Tableau de bord'}
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-4">
              <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5" />
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
    </div>
  );
}