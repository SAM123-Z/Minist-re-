import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, KeyRound, Loader2, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface OtpVerificationFormProps {
  email: string;
  onSuccess: (user: any) => void;
  onBackToLogin: () => void;
}

export default function OtpVerificationForm({ email, onSuccess, onBackToLogin }: OtpVerificationFormProps) {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus sur le premier input au chargement
    inputRefs.current[0]?.focus();

    // Démarrer le countdown pour le renvoi
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return; // Empêcher plus d'un caractère
    if (!/^\d*$/.test(value)) return; // Seuls les chiffres sont autorisés

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Passer au champ suivant si un chiffre est saisi
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Vérifier automatiquement si tous les champs sont remplis
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 4) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Revenir au champ précédent si le champ actuel est vide
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    
    if (pastedData.length === 4) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      inputRefs.current[3]?.focus();
      
      // Vérifier automatiquement
      setTimeout(() => handleVerifyOtp(pastedData), 100);
    }
  };

  const handleVerifyOtp = async (otpCode?: string) => {
    const codeToVerify = otpCode || otp.join('');
    
    if (codeToVerify.length !== 4) {
      setMessage({ type: 'error', text: 'Veuillez saisir le code à 4 chiffres complet' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Vérifier le code OTP via le microservice
      const response = await fetch('http://localhost:3001/verify-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          otp: codeToVerify
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Code OTP invalide');
      }

      // Récupérer les informations de l'utilisateur approuvé
      const { data: pendingUser, error: fetchError } = await supabase
        .from('pending_users')
        .select('*')
        .eq('email', email)
        .eq('status', 'approved')
        .eq('serial_number', codeToVerify)
        .single();

      if (fetchError || !pendingUser) {
        throw new Error('Utilisateur non trouvé ou code invalide');
      }

      // Connecter l'utilisateur
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: pendingUser.additional_info.password
      });

      if (signInError) throw signInError;

      setMessage({ type: 'success', text: 'Code vérifié avec succès! Connexion en cours...' });
      
      setTimeout(() => {
        onSuccess(authData.user);
      }, 1500);

    } catch (error: any) {
      console.error('Erreur lors de la vérification OTP:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Code invalide ou expiré' 
      });
      
      // Réinitialiser le formulaire en cas d'erreur
      setOtp(['', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setIsLoading(true);
    setMessage(null);

    try {
      // Demander un nouveau code (cette fonctionnalité nécessiterait une modification du système)
      setMessage({ 
        type: 'error', 
        text: 'Veuillez contacter l\'administrateur pour un nouveau code' 
      });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: 'Erreur lors du renvoi du code' 
      });
    } finally {
      setIsLoading(false);
    }
  };

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
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2 px-4">
            Ministère de la Jeunesse et de la Culture
          </h1>
        </div>

        {/* OTP Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 via-green-600 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5" />
                Code d'Activation
              </h2>
              <button
                onClick={onBackToLogin}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-4 sm:p-6 space-y-6">
            {/* Instructions */}
            <div className="text-center">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Saisissez votre code d'activation
              </h3>
              <p className="text-gray-600 text-sm">
                Un code à 4 chiffres a été envoyé à<br />
                <span className="font-medium text-gray-900">{email}</span>
              </p>
            </div>

            {/* OTP Input */}
            <div className="flex justify-center gap-3">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                  disabled={isLoading}
                />
              ))}
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

            {/* Verify Button */}
            <button
              onClick={() => handleVerifyOtp()}
              disabled={isLoading || otp.some(digit => digit === '')}
              className="w-full bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:from-red-700 hover:via-green-700 hover:to-blue-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Vérification...
                </>
              ) : (
                <>
                  <KeyRound className="w-5 h-5" />
                  Vérifier le code
                </>
              )}
            </button>

            {/* Resend Section */}
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-2">
                Vous n'avez pas reçu le code?
              </p>
              {canResend ? (
                <button
                  onClick={handleResendOtp}
                  disabled={isLoading}
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center gap-1 justify-center mx-auto transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Renvoyer le code
                </button>
              ) : (
                <p className="text-sm text-gray-500">
                  Renvoyer dans {countdown}s
                </p>
              )}
            </div>

            {/* Help Section */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-600">
                <strong>Besoin d'aide?</strong><br />
                Contactez l'administrateur : admin@minjec.gov.dj<br />
                Tél: +253 21 35 26 14
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Vérification sécurisée avec code OTP</p>
        </div>
      </div>
    </div>
  );
}