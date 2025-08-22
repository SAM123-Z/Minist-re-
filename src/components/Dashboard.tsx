import React, { useState, useEffect } from 'react';
import { supabase, type UserProfile } from '../lib/supabase';
import AdminDashboard from './AdminDashboard';
import CDCAgentDashboard from './CDCAgentDashboard';
import { LogOut, User, Shield, Building, Crown, Settings, Bell, Home, AlertCircle } from 'lucide-react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

const userTypeConfig = {
  standard_user: { label: 'Utilisateur Standard', icon: User, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  cdc_agent: { label: 'Agent CDC', icon: Shield, color: 'text-green-600', bgColor: 'bg-green-50' },
  association: { label: 'Association', icon: Building, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  admin: { label: 'Administrateur', icon: Crown, color: 'text-red-600', bgColor: 'bg-red-50' },
};

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Handle demo admin user
      if (user.id === 'admin-demo-id') {
        const demoProfile: UserProfile = {
          id: user.id,
          user_type: 'admin',
          username: 'admin',
          user_id_or_registration: 'admin-001',
          created_at: new Date().toISOString(),
        };
        setProfile(demoProfile);
        return;
      }

      // Récupérer le profil utilisateur
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        // Si le profil n'existe pas, créer un profil par défaut pour les utilisateurs standard
        if (profileError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: user.id,
              user_type: 'standard_user',
              username: user.email?.split('@')[0] || `user_${user.id.slice(0, 8)}`,
              user_id_or_registration: user.id,
            })
            .select()
            .single();

          if (createError) throw createError;
          setProfile(newProfile);
        } else {
          throw profileError;
        }
      } else {
        setProfile(profileData);
      }
    } catch (error: any) {
      console.error('Error fetching/creating profile:', error);
      setError(error.message || 'Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onLogout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <button
              onClick={fetchProfile}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Réessayer
            </button>
            <button
              onClick={handleLogout}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Profil non trouvé
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Profil non trouvé</h2>
          <p className="text-gray-600 mb-4">
            Votre profil utilisateur n'a pas pu être chargé. Veuillez contacter l'administrateur.
          </p>
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // Redirection vers l'interface Admin si l'utilisateur est admin
  if (profile.user_type === 'admin') {
    return <AdminDashboard user={user} profile={profile} onLogout={handleLogout} />;
  }

  // Redirection vers l'interface Agent CDC si l'utilisateur est agent CDC
  if (profile.user_type === 'cdc_agent') {
    return <CDCAgentDashboard user={user} profile={profile} onLogout={handleLogout} />;
  }

  // Interface pour les autres types d'utilisateurs
  const userConfig = userTypeConfig[profile.user_type];
  const IconComponent = userConfig.icon;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-r from-red-600 via-green-600 to-blue-600 rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg sm:text-xl font-semibold bg-gradient-to-r from-red-600 via-green-600 to-blue-600 bg-clip-text text-transparent">
                Ministère de la Jeunesse et de la Culture
              </h1>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <button className="hidden sm:block p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="hidden sm:block p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 text-gray-700 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-sm font-medium">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 ${userConfig.bgColor} rounded-xl`}>
              <IconComponent className={`w-6 h-6 ${userConfig.color}`} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Bienvenue, {profile.username}!</h2>
              <p className="text-sm sm:text-base text-gray-600">Vous êtes connecté en tant que {userConfig.label}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Type d'utilisateur</p>
              <p className="text-base sm:text-lg font-semibold text-gray-900">{userConfig.label}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-500">Nom d'utilisateur</p>
              <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">{profile.username}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 sm:col-span-2 md:col-span-1">
              <p className="text-sm font-medium text-gray-500">CIN National</p>
              <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">{profile.user_id_or_registration}</p>
            </div>
          </div>
        </div>

        {/* Interface spécifique selon le type d'utilisateur */}
        {profile.user_type === 'cdc_agent' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Espace Agent CDC</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Mes Missions</h4>
                <p className="text-sm text-green-700">Consultez vos missions assignées et rapports</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">Rapports d'Activité</h4>
                <p className="text-sm text-green-700">Soumettez vos rapports d'activité</p>
              </div>
            </div>
          </div>
        )}

        {profile.user_type === 'association' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Espace Association</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Mes Projets</h4>
                <p className="text-sm text-purple-700">Gérez vos projets et demandes de financement</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-purple-900 mb-2">Documents</h4>
                <p className="text-sm text-purple-700">Téléchargez et gérez vos documents</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-50 rounded-lg">
                <Home className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Tableau de bord</h3>
            </div>
            <p className="text-gray-600 text-sm">Consultez votre aperçu de compte et activité récente</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 bg-green-50 rounded-lg">
                <Settings className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Paramètres</h3>
            </div>
            <p className="text-gray-600 text-sm">Gérez vos préférences de compte et sécurité</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow cursor-pointer sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center justify-center w-10 h-10 bg-purple-50 rounded-lg">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
            </div>
            <p className="text-gray-600 text-sm">Consultez vos dernières notifications et alertes</p>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations du compte</h3>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-100 gap-1 sm:gap-0">
              <span className="text-gray-600">Adresse email</span>
              <span className="font-medium text-gray-900 truncate">{user.email}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-100 gap-1 sm:gap-0">
              <span className="text-gray-600">Compte créé le</span>
              <span className="font-medium text-gray-900">
                {new Date(profile.created_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 border-b border-gray-100 gap-1 sm:gap-0">
              <span className="text-gray-600">Dernière connexion</span>
              <span className="font-medium text-gray-900">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('fr-FR') : 'Jamais'}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 gap-1 sm:gap-0">
              <span className="text-gray-600">Email vérifié</span>
              <span className={`font-medium ${user.email_confirmed_at ? 'text-green-600' : 'text-red-600'}`}>
                {user.email_confirmed_at ? 'Vérifié' : 'Non vérifié'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}