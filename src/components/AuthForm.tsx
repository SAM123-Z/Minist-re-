import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase, type AuthFormData, type UserType } from '../lib/supabase';
import { Eye, EyeOff, User, Shield, Building, Crown, Loader2, AlertCircle, CheckCircle, Phone, Mail, MapPin } from 'lucide-react';

// Schema for standard users (with email/password)
const standardUserSchema = z.object({
  userType: z.literal('standard_user'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// Schema for non-standard users (with username/ID)
const nonStandardUserSchema = z.object({
  userType: z.enum(['standard_user', 'cdc_agent', 'association', 'admin'] as const, {
    required_error: 'Please select a user type',
  }),
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username must be less than 50 characters'),
  userIdOrRegistration: z.string().min(1, 'User ID/Registration Number is required'),
});

type StandardUserInputs = z.infer<typeof standardUserSchema>;
type NonStandardUserInputs = z.infer<typeof nonStandardUserSchema>;
type AuthFormInputs = StandardUserInputs | NonStandardUserInputs;

const userTypeOptions = [
  { value: 'standard_user' as const, label: 'Standard User', icon: User, color: 'text-blue-600' },
  { value: 'cdc_agent' as const, label: 'CDC Agent', icon: Shield, color: 'text-green-600' },
  { value: 'association' as const, label: 'Association', icon: Building, color: 'text-purple-600' },
  { value: 'admin' as const, label: 'Admin', icon: Crown, color: 'text-red-600' },
];

interface AuthFormProps {
  onSuccess: (user: any) => void;
}

export default function AuthForm({ onSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<UserType>('standard_user');

  // Determine which schema to use based on user type
  const getSchema = () => {
    return selectedUserType === 'standard_user' ? standardUserSchema : nonStandardUserSchema;
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormInputs>({
    resolver: zodResolver(getSchema()),
    defaultValues: {
      userType: 'standard_user',
    },
  });

  const selectedOption = userTypeOptions.find(option => option.value === selectedUserType);
  const isStandardUser = selectedUserType === 'standard_user';

  const handleUserTypeChange = (userType: UserType) => {
    setSelectedUserType(userType);
    setMessage(null);
    setShowContactInfo(false);
    reset({ userType });
  };

  const onSubmit = async (data: AuthFormInputs) => {
    // For non-standard users, create pending request
    if (!isStandardUser) {
      if (selectedUserType === 'admin') {
        // Create a mock admin user for demonstration
        const mockAdminUser = {
          id: 'admin-demo-id',
          email: 'admin@minjec.gov.cm',
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
      } else {
        // Create pending user request
        try {
          const nonStandardData = data as NonStandardUserInputs;
          
          const { error } = await supabase
            .from('pending_users')
            .insert({
              email: `${nonStandardData.username}@temp.com`, // Email temporaire
              username: nonStandardData.username,
              user_type: nonStandardData.userType,
              user_id_or_registration: nonStandardData.userIdOrRegistration,
              status: 'pending'
            });

          if (error) throw error;

          setMessage({ 
            type: 'success', 
            text: 'Votre demande a été soumise avec succès! Un administrateur l\'examinera bientôt.' 
          });
          
          setTimeout(() => {
            setShowContactInfo(true);
          }, 2000);
        } catch (error: any) {
          setMessage({ type: 'error', text: error.message || 'Erreur lors de la soumission' });
        }
      }
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      if (isLogin) {
        // Login logic for standard users only
        const standardData = data as StandardUserInputs;
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: standardData.email,
          password: standardData.password,
        });

        if (error) throw error;

        // Verify user profile is standard user
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();

        if (profileError) {
          throw new Error('User profile not found');
        }

        if (profile.user_type !== 'standard_user') {
          throw new Error('This account is not a standard user account');
        }

        setMessage({ type: 'success', text: 'Login successful!' });
        onSuccess(authData.user);
      } else {
        // Registration logic for standard users only
        const standardData = data as StandardUserInputs;
        const { data: authData, error } = await supabase.auth.signUp({
          email: standardData.email,
          password: standardData.password,
        });

        if (error) throw error;

        if (authData.user) {
          // Create user profile for standard user
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert({
              id: authData.user.id,
              user_type: 'standard_user',
              username: authData.user.email?.split('@')[0] || `user_${authData.user.id.slice(0, 8)}`,
              user_id_or_registration: authData.user.id,
            });

          if (profileError) throw profileError;

          setMessage({ type: 'success', text: 'Registration successful! Please check your email to verify your account.' });
          reset();
        }
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'An error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    if (!isStandardUser) {
      setShowContactInfo(true);
      return;
    }
    setIsLogin(!isLogin);
    setMessage(null);
    reset();
  };

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

  if (showContactInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md mx-auto">
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
          <ContactInfo />
        </div>
      </div>
    );
  }

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
              {isLogin ? 'Sign In' : 'Create Account'}
            </h2>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* User Type Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                User Type <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedUserType}
                  onChange={(e) => handleUserTypeChange(e.target.value as UserType)}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white pr-10 transition-colors text-sm sm:text-base"
                >
                  {userTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  {selectedOption && (
                    <selectedOption.icon className={`w-5 h-5 ${selectedOption.color}`} />
                  )}
                </div>
              </div>
              {errors.userType && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.userType.message}
                </p>
              )}
            </div>

            {/* Username - Only for non-standard users */}
            {!isStandardUser && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('username')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-colors text-sm sm:text-base"
                  placeholder="Enter your username"
                />
                {errors.username && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.username.message}
                  </p>
                )}
              </div>
            )}

            {/* User ID/Registration Number - Only for non-standard users */}
            {!isStandardUser && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  User ID/Registration Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('userIdOrRegistration')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-sm sm:text-base"
                  placeholder="Enter your ID or registration number"
                />
                {errors.userIdOrRegistration && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.userIdOrRegistration.message}
                  </p>
                )}
              </div>
            )}

            {/* Email - Only for standard users */}
            {isStandardUser && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-colors text-sm sm:text-base"
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.email.message}
                  </p>
                )}
              </div>
            )}

            {/* Password - Only for standard users */}
            {isStandardUser && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent pr-12 transition-colors text-sm sm:text-base"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.password.message}
                  </p>
                )}
              </div>
            )}

            {/* Warning message for non-standard users */}
            {!isStandardUser && (
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">
                    Les comptes {selectedOption?.label} nécessitent une approbation administrative.
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Soumettez votre demande ci-dessous. Vous recevrez un email avec votre numéro de série une fois approuvé.
                </p>
              </div>
            )}

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
                  {isLogin ? 'Connexion...' : 'Création...'}
                </>
              ) : (
                <>
                  {isStandardUser ? (
                    isLogin ? 'Se connecter' : 'Créer un compte'
                  ) : (
                    'Soumettre la Demande'
                  )}
                </>
              )}
            </button>

            {/* Toggle Mode - Only for standard users */}
            {isStandardUser && (
              <div className="text-center pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  {isLogin ? "Pas de compte?" : 'Déjà un compte?'}
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="ml-2 text-red-600 hover:text-red-700 font-medium transition-colors"
                  >
                    {isLogin ? 'Créer un compte' : 'Se connecter'}
                  </button>
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Secure authentication powered by Supabase</p>
        </div>
      </div>
    </div>
  );
}