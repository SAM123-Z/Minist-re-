import React, { useState } from 'react';
import { supabase, type AuthFormData, type UserType } from '../lib/supabase';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Phone, Mail, MapPin, UserPlus, KeyRound } from 'lucide-react';
import RegistrationForm from './RegistrationForm';
import OtpVerificationForm from './OtpVerificationForm';

interface AuthFormProps {
  onSuccess: (user: any) => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'otp'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpEmail, setOtpEmail] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      // Check for admin login
      if (email.trim().toLowerCase() === 'admin@minjec.gov.dj' && password === 'admin123') {
        const mockAdminUser = {
          id: 'admin-demo-id',
          email: 'admin@minjec.gov.dj',
          user_metadata: {},
          app_metadata: {},
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString(),
        };
        
        setMessage({ type: 'success', text: 'Connexion administrateur réussie!' });
        setTimeout(() => {
          onSuccess(mockAdminUser);
        }, 1000);
        return;
      }

      // Regular user login
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) throw error;

      if (!authData.user) {
        throw new Error('Aucun utilisateur trouvé');
      }

      setMessage({ type: 'success', text: 'Connexion réussie!' });
      onSuccess(authData.user);
    } catch (error: any) {
      let errorMessage = 'Erreur de connexion';
      
      if (error.message === 'Invalid login credentials') {
        errorMessage = 'Email ou mot de passe incorrect. Vérifiez vos identifiants.';
      } else if (error.message === 'Email not confirmed') {
        errorMessage = 'Votre compte n\'est pas encore confirmé. Vérifiez votre email.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (currentView === 'register') {
    return <RegistrationForm onBackToLogin={() => setCurrentView('login')} />;
  }

  if (currentView === 'otp') {
    return (
      <OtpVerificationForm 
        email={otpEmail}
        onSuccess={onSuccess}
        onBackToLogin={() => setCurrentView('login')}
      />
    );
  }
  // Contact Information Component
  const ContactInfo = () => (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 via-green-600 to-blue-600 px-6 py-4">
        <h2 className="text-xl font-semibold text-white text-center">
          Demande Soumise
        </h2>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="text-center mb-6">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Demande en Cours de Traitement</h3>
          <p className="text-gray-600">
            Votre demande de création de compte {selectedOption?.label} a été soumise avec succès.
            Un administrateur l'examinera et vous recevrez un email avec votre numéro de série une fois approuvée.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Phone className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Phone</p>
              <p className="text-gray-600">+253 21 35 26 14</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Mail className="w-6 h-6 text-blue-600" />
            <div>
              <p className="font-medium text-gray-900">Email</p>
              <p className="text-gray-600">admin@minjec.gov.dj</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <MapPin className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-medium text-gray-900">Address</p>
              <p className="text-gray-600">
                Ministère de la Jeunesse et de la Culture<br />
                Djibouti, République de Djibouti
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={() => setShowContactInfo(false)}
            className="w-full bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white py-2 sm:py-3 px-4 rounded-lg font-medium hover:from-red-700 hover:via-green-700 hover:to-blue-700 transition-all duration-200 text-sm sm:text-base"
          >
            Retour à la Connexion
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md mx-auto">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img 
              src="/public/files_4816535-1755628297770-images.png" 
              alt="Logo" 
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl shadow-lg"
            />
          </div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 px-4">Ministère de la Jeunesse et de la Culture</h1>
        </div>

        {/* Auth Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 via-green-600 to-blue-600 px-6 py-4">
            <h2 className="text-lg sm:text-xl font-semibold text-white text-center">
              Connexion
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Adresse email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                placeholder="Entrez votre email"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Mot de passe <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 transition-colors text-sm sm:text-base"
                  placeholder="Entrez votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Message Display */}
            {message && (
              <div className={`p-4 rounded-lg flex items-center gap-2 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {message.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white py-2 sm:py-3 px-4 rounded-lg font-medium hover:from-red-700 hover:via-green-700 hover:to-blue-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connexion...
                </>
              ) : (
                'Se connecter'
              )}
            </button>

            {/* Registration Link */}
            <div className="text-center pt-4 border-t border-gray-200">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  Pas de compte?
                  <button
                    type="button"
                    onClick={() => setCurrentView('register')}
                    className="ml-2 text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    S'inscrire
                  </button>
                </p>
                <p className="text-sm text-gray-600">
                  Déjà approuvé?
                  <button
                    type="button"
                    onClick={() => {
                      setOtpEmail(email);
                      setCurrentView('otp');
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-1 justify-center"
                  >
                    <KeyRound className="w-4 h-4" />
                    Saisir code OTP
                  </button>
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Authentification sécurisée avec Supabase</p>
        </div>
      </div>
    </div>
  );
}