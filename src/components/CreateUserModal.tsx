import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase, type UserType } from '../lib/supabase';
import { 
  X, 
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
  Calendar
} from 'lucide-react';

const createUserSchema = z.object({
  userType: z.enum(['standard_user', 'cdc_agent', 'association', 'admin'] as const),
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  username: z.string().min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères'),
  userIdOrRegistration: z.string().min(1, 'ID/Numéro d\'enregistrement requis'),
  
  // Champs spécifiques pour les agents CDC
  region: z.string().optional(),
  commune: z.string().optional(),
  quartierCite: z.string().optional(),
  
  // Champs spécifiques pour les associations
  associationName: z.string().optional(),
  activitySector: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
});

type CreateUserInputs = z.infer<typeof createUserSchema>;

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: (userData: any) => void;
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

export default function CreateUserModal({ isOpen, onClose, onUserCreated }: CreateUserModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<UserType>('standard_user');
  const [selectedRegion, setSelectedRegion] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CreateUserInputs>({
    resolver: zodResolver(createUserSchema),
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
    // Reset commune when region changes
    if (watchedRegion !== selectedRegion) {
      setValue('commune', '');
      setValue('quartierCite', '');
    }
  }, [watchedRegion, selectedRegion, setValue]);

  const availableCommunes = selectedRegion === 'Djibouti ville' ? communes['Djibouti ville'] : [];
  const showCommuneField = selectedRegion === 'Djibouti ville';
  
  const onSubmit = async (data: CreateUserInputs) => {
    setIsLoading(true);
    setMessage(null);

    try {
      // Appeler la fonction de création de demande au lieu de créer directement
      await onUserCreated(data);

      setMessage({ 
        type: 'success', 
        text: `Demande de création soumise avec succès pour ${data.username}!` 
      });

      // Réinitialiser le formulaire après un délai
      setTimeout(() => {
        reset();
        setMessage(null);
        onClose();
      }, 2000);

    } catch (error: any) {
      console.error('Erreur lors de la soumission de la demande:', error);
      setMessage({ 
        type: 'error', 
        text: error.message || 'Erreur lors de la soumission de la demande' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      reset();
      setMessage(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  const selectedOption = userTypeOptions.find(option => option.value === selectedUserType);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 via-green-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Demande de Création d'Utilisateur</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Type d'utilisateur */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Type d'utilisateur <span className="text-red-500">*</span>
            </label>
            <select
              {...register('userType')}
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

          {/* Email et mot de passe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              {/* Commune - Seulement pour Djibouti ville */}
              {showCommuneField && (
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
              )}
              
              {/* Quartier/Cité - Seulement pour Djibouti ville */}
              {showQuartierField && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Quartier CDC <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('quartierCite')}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Sélectionner un quartier</option>
                    {availableQuartiers.map((quartier) => (
                      <option key={quartier} value={quartier}>{quartier}</option>
                    ))}
                  </select>
                  {errors.quartierCite && (
                    <p className="text-sm text-red-600">{errors.quartierCite.message}</p>
                  )}
                </div>
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
                      placeholder="+237 XXX XXX XXX"
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

          {/* Boutons d'action */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-red-600 via-green-600 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:via-green-700 hover:to-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Soumission en cours...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Créer la Demande
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}