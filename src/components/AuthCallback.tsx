import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Récupérer la session depuis l'URL de callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Erreur lors de la récupération de la session:', error);
          setError(error.message);
          return;
        }

        if (data.session) {
          console.log('Session OAuth récupérée avec succès:', data.session.user.email);
          
          // Vérifier si l'utilisateur a un profil
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.session.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            // Créer un profil par défaut pour les nouveaux utilisateurs OAuth
            const { error: createError } = await supabase
              .from('user_profiles')
              .insert({
                id: data.session.user.id,
                user_type: 'standard_user',
                username: data.session.user.email?.split('@')[0] || `user_${data.session.user.id.slice(0, 8)}`,
                user_id_or_registration: data.session.user.id,
              });

            if (createError) {
              console.error('Erreur lors de la création du profil:', createError);
              setError('Erreur lors de la création du profil utilisateur');
              return;
            }
          }

          // Rediriger vers le dashboard
          navigate('/dashboard', { replace: true });
        } else {
          setError('Aucune session trouvée');
        }
      } catch (error: any) {
        console.error('Erreur dans le callback OAuth:', error);
        setError(error.message || 'Erreur lors de l\'authentification');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/public/files_4816535-1755628297770-images.png" 
              alt="Logo" 
              className="w-16 h-16 object-contain rounded-2xl shadow-lg"
            />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Authentification en cours</h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Finalisation de votre connexion...</span>
          </div>
          <p className="text-sm text-gray-500">Veuillez patienter pendant que nous configurons votre compte.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center max-w-md w-full">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/public/files_4816535-1755628297770-images.png" 
              alt="Logo" 
              className="w-16 h-16 object-contain rounded-2xl shadow-lg"
            />
          </div>
          <div className="flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Erreur d'authentification</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-red-700 hover:via-green-700 hover:to-blue-700 transition-colors"
            >
              Retour à la connexion
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center max-w-md w-full">
        <div className="flex items-center justify-center mb-6">
          <img 
            src="/public/files_4816535-1755628297770-images.png" 
            alt="Logo" 
            className="w-16 h-16 object-contain rounded-2xl shadow-lg"
          />
        </div>
        <div className="flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Connexion réussie!</h2>
        <p className="text-gray-600">Redirection vers votre tableau de bord...</p>
      </div>
    </div>
  );
}