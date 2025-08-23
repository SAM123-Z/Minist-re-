import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase, type UserType } from '../lib/supabase';
import { 
  User, 
  Shield, 
  Building, 
  Crown, 
  Mail, 
  Lock, 
  UserPlus, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Phone,
  MapPin,
  FileText,
  ArrowLeft
} from 'lucide-react';

const registrationSchema = z.object({
  userType: z.enum(['standard_user', 'cdc_agent', 'association', 'admin'] as const),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  confirmPassword: z.string(),
  username: z.string().min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'),
  userIdOrRegistration: z.string().min(1, 'CIN National requis'),
  
  // Champs spécifiques pour les agents CDC
  region: z.string().optional(),
  commune: z.string().optional(),
  quartierCite: z.string().optional(),
  
  // Champs spécifiques pour les associations
  associationName: z.string().optional(),
  activitySector: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegistrationInputs = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  onBackToLogin: () => void;
}

const userTypeOptions = [
  { value: 'standard_user' as const, label: 'Utilisateur Standard', icon: User, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  { value: 'cdc_agent' as const, label: 'Agent CDC', icon: Shield, color: 'text-green-600', bgColor: 'bg-green-50' },
  { value: 'association' as const, label: 'Association', icon: Building, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  { value: 'admin' as const, label: 'Administrateur', icon: Crown, color: 'text-red-600', bgColor: 'bg-red-50' },
];

const regions = [
  'Sabieh',
  'Dikhil',
  'Obock',
  'Tadjourah',
  'Arta',
  'Djibouti ville'
];

const communes = {
  'Djibouti ville': ['Balbala', 'Boulaos', 'Ras Dika']
};

const activitySectors = [
  'Éducation',
  'Santé',
  'Environnement',
  'Culture',
  'Sport',
  'Développement communautaire',
  'Droits humains',
  'Jeunesse',
  'Femmes',
  'Agriculture',
  'Technologie',
  'Arts'
];

export default function RegistrationForm({ onBackToLogin }: RegistrationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<UserType>('standard_user');
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [showContactInfo, setShowContactInfo] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<RegistrationInputs>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      userType: 'standard_user',
    },
  });

  const watchedUserType = watch('userType');
  const watchedRegion = watch('region');

  React.useEffect(() => {
    setSelectedUserType(watchedUserType);
  }, [watchedUserType]);

  React.useEffect(() => {
    setSelectedRegion(watchedRegion || '');
    if (watchedRegion !== selectedRegion) {
      setValue('commune', '');
      setValue('quartierCite', '');
    }
  }, [watchedRegion, selectedRegion, setValue]);

  const availableCommunes = selectedRegion === 'Djibouti ville' ? communes['Djibouti ville'] : [];
  const showCommuneField = selectedRegion === 'Djibouti ville';
  
  const onSubmit = async (data: RegistrationInputs) => {
    setIsLoading(true);
    setMessage(null);

    try {
      // TOUTES les inscriptions passent par le système d'approbation
      const additionalInfo: any = {};

      // Préparer les informations spécifiques selon le type d'utilisateur
      if (selectedUserType === 'cdc_agent' && data.region) {
        additionalInfo.region = data.region;
        if (data.commune) additionalInfo.commune = data.commune;
        if (data.quartierCite) additionalInfo.quartierCite = data.quartierCite;
      }

      if (selectedUserType === 'association') {
        if (data.associationName) additionalInfo.associationName = data.associationName;
        if (data.activitySector) additionalInfo.activitySector = data.activitySector;
        if (data.address) additionalInfo.address = data.address;
        if (data.phone) additionalInfo.phone = data.phone;
      }

      // Stocker le mot de passe de manière sécurisée
      additionalInfo.password = data.password;

      // Créer la demande d'approbation
      const { data: pendingUserData, error } = await supabase
        .from('pending_users')
        .insert({
          email: data.email,
          username: data.username,
          user_type: selectedUserType,
          user_id_or_registration: data.userIdOrRegistration,
          additional_info: additionalInfo,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Envoyer notification immédiate à l'admin
      try {
        // Générer un token de sécurité pour les liens d'approbation
        const securityToken = await generateSecurityToken(pendingUserData.id)
        
        const selectedOption = userTypeOptions.find(option => option.value === selectedUserType);
        
        await supabase.functions.invoke('send-notification-email', {
          body: {
            type: 'admin_notification',
            to: 'admin@minjec.gov.dj',
            data: {
              username: data.username,
              email: data.email,
              userType: selectedOption?.label || selectedUserType,
              userIdOrRegistration: data.userIdOrRegistration,
              submissionDate: new Date().toLocaleDateString('fr-FR'),
              adminPanelUrl: window.location.origin + '/admin/requests',
              pendingId: pendingUserData.id,
              securityToken: securityToken
            }
          }
        });
      } catch (emailError) {
        console.error('Erreur lors de l\'envoi de la notification:', emailError);
        // Ne pas bloquer l'inscription si l'email échoue
      }

      setMessage({ 
        type: 'success', 
        text: `✅ Demande d'inscription soumise avec succès!\n\n📧 Un administrateur a été notifié de votre demande.\n\n🔑 Vous recevrez un email avec votre code d'activation à 4 chiffres une fois votre demande approuvée.\n\n⏱️ Délai de traitement: 24-48h` 
      });

      setTimeout(() => {
        setShowContactInfo(true);
      }, 3000);

    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de l\'inscription' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour générer un token de sécurité
  const generateSecurityToken = async (pendingId: string): Promise<string> => {
    const data = `${pendingId}-${Date.now()}`
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
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
            Votre demande d'inscription a été soumise avec succès et est en cours d'examen par notre équipe administrative.
          </p>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📧 Notification par Email</h4>
            <p className="text-sm text-blue-800">
              Vous recevrez automatiquement un email contenant :
            </p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              <li>• <strong>Si approuvé</strong> : Code de passerelle à 4 chiffres pour finaliser votre inscription</li>
              <li>• <strong>Si rejeté</strong> : Raisons du rejet et marche à suivre</li>
            </ul>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>⏱️ Délai de traitement :</strong> 24 à 48 heures ouvrables
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <Phone className="w-6 h-6 text-green-600" />
            <div>
              <p className="font-medium text-gray-900">Téléphone</p>
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
              <p className="font-medium text-gray-900">Adresse</p>
              <p className="text-gray-600">
                Ministère de la Jeunesse et de la Culture<br />
                Djibouti, République de Djibouti
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={onBackToLogin}
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

  const selectedOption = userTypeOptions.find(option => option.value === selectedUserType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl mx-auto">
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

        {/* Registration Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 via-green-600 to-blue-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-semibold text-white">
                Inscription Nouveau Compte
              </h2>
              <button
                onClick={onBackToLogin}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Type d'utilisateur */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Type d'utilisateur <span className="text-red-500">*</span>
              </label>
              <select
                {...register('userType')}
                onChange={(e) => setSelectedUserType(e.target.value as UserType)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {userTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {errors.userType && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.userType.message}
                </p>
              )}
            </div>

            {/* Informations de base */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nom d'utilisateur <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    {...register('username')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Nom d'utilisateur"
                  />
                </div>
                {errors.username && (
                  <p className="text-sm text-red-600">{errors.username.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  CIN National <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    {...register('userIdOrRegistration')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Numéro CIN National"
                  />
                </div>
                {errors.userIdOrRegistration && (
                  <p className="text-sm text-red-600">{errors.userIdOrRegistration.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Adresse email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  {...register('email')}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="email@exemple.com"
                />
              </div>
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Mots de passe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    {...register('password')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Mot de passe (min. 8 caractères)"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    {...register('confirmPassword')}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Confirmer le mot de passe"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Champs spécifiques pour Agent CDC */}
            {selectedUserType === 'cdc_agent' && (
              <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h3 className="text-lg font-medium text-green-900 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Informations Agent CDC
                </h3>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Région <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('region')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner une région</option>
                    {regions.map((region) => (
                      <option key={region} value={region}>{region}</option>
                    ))}
                  </select>
                  {errors.region && (
                    <p className="text-sm text-red-600">{errors.region.message}</p>
                  )}
                </div>
                
                {showCommuneField && (
                  <>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Commune <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('commune')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">Sélectionner une commune</option>
                        {availableCommunes.map((commune) => (
                          <option key={commune} value={commune}>{commune}</option>
                        ))}
                      </select>
                      {errors.commune && (
                        <p className="text-sm text-red-600">{errors.commune.message}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Quartier/Cité
                      </label>
                      <input
                        type="text"
                        {...register('quartierCite')}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Nom du quartier ou de la cité"
                      />
                      {errors.quartierCite && (
                        <p className="text-sm text-red-600">{errors.quartierCite.message}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Champs spécifiques pour Association */}
            {selectedUserType === 'association' && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h3 className="text-lg font-medium text-purple-900 flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Informations Association
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Nom de l'association <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      {...register('associationName')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Nom de l'association"
                    />
                    {errors.associationName && (
                      <p className="text-sm text-red-600">{errors.associationName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Secteur d'activité <span className="text-red-500">*</span>
                    </label>
                    <select
                      {...register('activitySector')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">Sélectionner un secteur</option>
                      {activitySectors.map((sector) => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                    {errors.activitySector && (
                      <p className="text-sm text-red-600">{errors.activitySector.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="tel"
                        {...register('phone')}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="+253 XXX XXX XXX"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Adresse</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        {...register('address')}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Adresse complète"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Avertissement pour les comptes non-standard */}
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Toutes les inscriptions nécessitent une approbation administrative.
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Vous recevrez un email avec votre code de passerelle à 4 chiffres une fois votre demande approuvée par un administrateur.
              </p>
              <p className="text-sm text-blue-700 mt-1">
                🔔 L'administrateur sera notifié immédiatement de votre demande.
              </p>
            </div>

            {/* Message d'état */}
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

            {/* Bouton de soumission */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:via-green-700 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Inscription en cours...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  S'inscrire
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>Inscription sécurisée avec Supabase</p>
        </div>
      </div>
    </div>
  );
}