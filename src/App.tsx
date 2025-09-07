import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import AuthForm from './components/AuthForm';
import AuthCallback from './components/AuthCallback';
import Dashboard from './pages/Dashboard';
import OffresPage from './pages/OffresPage';
import CandidaturesPage from './pages/CandidaturesPage';
import ProfilPage from './pages/ProfilPage';
import AdminDashboard from './components/AdminDashboard';
import CDCAgentDashboard from './components/CDCAgentDashboard';
import Layout from './components/Layout';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function App() {
  const location = useLocation();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Gérer le callback OAuth
  useEffect(() => {
    // Si nous sommes sur la page de callback OAuth, gérer l'authentification
    if (location.pathname === '/auth/callback') {
      const handleOAuthCallback = async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Erreur OAuth callback:', error);
            toast.error('Erreur lors de l\'authentification OAuth');
            return;
          }

          if (data.session?.user) {
            setUser(data.session.user);
            await fetchProfile(data.session.user.id);
            toast.success('Connexion OAuth réussie!');
          }
        } catch (error) {
          console.error('Erreur lors du traitement du callback OAuth:', error);
          toast.error('Erreur lors de l\'authentification');
        }
      };

      handleOAuthCallback();
    }
  }, [location.pathname]);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      } else {
        // Clear any invalid tokens if no active session
        supabase.auth.signOut();
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    // Listen for changes on auth state (logged in, signed out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        await fetchProfile(session.user.id);
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Handle demo admin user
      if (userId === 'admin-demo-id') {
        const demoProfile = {
          id: userId,
          user_type: 'admin',
          username: 'admin',
          user_id_or_registration: 'admin-001',
          created_at: new Date().toISOString(),
        };
        setProfile(demoProfile);
        return;
      }

      // Fetch user profile
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // If profile doesn't exist, create a default profile for standard users
        if (profileError.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              id: userId,
              user_type: 'standard_user',
              username: user?.email?.split('@')[0] || `user_${userId.slice(0, 8)}`,
              user_id_or_registration: userId,
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
      toast.error('Erreur lors du chargement du profil');
    }
  };

  const handleAuthSuccess = (user: any) => {
    setUser(user);
    toast.success('Connexion réussie !');
  };

  const handleLogout = () => {
    setUser(null);
    setProfile(null);
    toast.success('Déconnexion réussie');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, show auth form
  if (!user) {
    // Afficher le composant de callback OAuth si nous sommes sur cette route
    if (location.pathname === '/auth/callback') {
      return <AuthCallback />;
    }
    
    return <AuthForm onSuccess={handleAuthSuccess} />;
  }

  // If no profile loaded yet, show loading
  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  // Admin dashboard
  if (profile.user_type === 'admin') {
    return <AdminDashboard user={user} profile={profile} onLogout={handleLogout} />;
  }

  // CDC Agent dashboard
  if (profile.user_type === 'cdc_agent') {
    return <CDCAgentDashboard user={user} profile={profile} onLogout={handleLogout} />;
  }

  // Standard user routes
  return (
    <Layout user={user} profile={profile} onLogout={handleLogout}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard user={user} profile={profile} />} />
        <Route path="/offres" element={<OffresPage user={user} profile={profile} />} />
        <Route path="/candidatures" element={<CandidaturesPage user={user} profile={profile} />} />
        <Route path="/profil" element={<ProfilPage user={user} profile={profile} />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;