/*
  # Correction des problèmes de migrations et réparation de la base de données

  1. Nettoyage des politiques RLS conflictuelles
    - Suppression de toutes les politiques existantes sur user_profiles et pending_users
    - Désactivation temporaire des RLS pour éviter les conflits
    
  2. Création de la table OTP codes
    - Table pour stocker les codes OTP avec expiration
    - Relation avec user_profiles et gestion des emails
    
  3. Recréation des politiques RLS propres
    - Politiques simplifiées et fonctionnelles
    - Gestion des permissions appropriées
    
  4. Vérification et synchronisation
    - Activation des RLS sur les tables nécessaires
    - Création des index pour les performances
*/

-- =====================================================
-- 1. NETTOYAGE DES POLITIQUES RLS CONFLICTUELLES
-- =====================================================

-- Supprimer toutes les politiques existantes sur user_profiles
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_profiles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', policy_record.policyname);
    END LOOP;
END $$;

-- Supprimer toutes les politiques existantes sur pending_users
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'pending_users' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.pending_users', policy_record.policyname);
    END LOOP;
END $$;

-- Désactiver temporairement les RLS pour éviter les conflits
ALTER TABLE IF EXISTS user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pending_users DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. CRÉATION DE LA TABLE OTP CODES
-- =====================================================

-- Créer la table otp_codes si elle n'existe pas
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'login',
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    
    -- Contrainte unique pour éviter les doublons actifs
    UNIQUE(email, type)
);

-- Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_used ON otp_codes(used);

-- Fonction pour nettoyer automatiquement les codes expirés
CREATE OR REPLACE FUNCTION cleanup_expired_otps()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_codes 
    WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 3. RECRÉATION DES POLITIQUES RLS PROPRES
-- =====================================================

-- Réactiver les RLS sur user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Politique simple pour user_profiles - les utilisateurs peuvent voir leur propre profil
CREATE POLICY "user_profiles_select_own" 
ON user_profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Politique pour permettre aux admins de voir tous les profils
CREATE POLICY "user_profiles_select_admin" 
ON user_profiles 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.user_type = 'admin'
    )
);

-- Politique pour permettre l'insertion de nouveaux profils
CREATE POLICY "user_profiles_insert" 
ON user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Politique pour permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "user_profiles_update_own" 
ON user_profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Politique pour permettre aux admins de mettre à jour tous les profils
CREATE POLICY "user_profiles_update_admin" 
ON user_profiles 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.user_type = 'admin'
    )
);

-- =====================================================
-- 4. POLITIQUES POUR PENDING_USERS
-- =====================================================

-- Réactiver les RLS sur pending_users
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

-- Permettre l'insertion anonyme pour les nouvelles demandes
CREATE POLICY "pending_users_insert_anonymous" 
ON pending_users 
FOR INSERT 
WITH CHECK (true);

-- Permettre aux utilisateurs de voir leur propre demande
CREATE POLICY "pending_users_select_own" 
ON pending_users 
FOR SELECT 
USING (
    email IN (
        SELECT users.email 
        FROM auth.users 
        WHERE users.id = auth.uid()
    )
);

-- Permettre aux admins de voir toutes les demandes
CREATE POLICY "pending_users_select_admin" 
ON pending_users 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.user_type = 'admin'
    )
);

-- Permettre aux admins de mettre à jour les demandes
CREATE POLICY "pending_users_update_admin" 
ON pending_users 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM user_profiles up 
        WHERE up.id = auth.uid() 
        AND up.user_type = 'admin'
    )
);

-- =====================================================
-- 5. POLITIQUES POUR OTP_CODES
-- =====================================================

-- Activer les RLS sur otp_codes
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

-- Permettre l'insertion de codes OTP (pour le système)
CREATE POLICY "otp_codes_insert" 
ON otp_codes 
FOR INSERT 
WITH CHECK (true);

-- Permettre la lecture des codes OTP pour vérification
CREATE POLICY "otp_codes_select" 
ON otp_codes 
FOR SELECT 
USING (true);

-- Permettre la mise à jour des codes OTP (pour marquer comme utilisés)
CREATE POLICY "otp_codes_update" 
ON otp_codes 
FOR UPDATE 
USING (true);

-- Permettre la suppression des codes expirés
CREATE POLICY "otp_codes_delete" 
ON otp_codes 
FOR DELETE 
USING (expires_at < NOW() OR used = TRUE);

-- =====================================================
-- 6. VÉRIFICATIONS ET OPTIMISATIONS
-- =====================================================

-- Vérifier que toutes les tables principales existent
DO $$
BEGIN
    -- Vérifier user_profiles
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        RAISE NOTICE 'Table user_profiles manquante - elle sera créée par les migrations existantes';
    END IF;
    
    -- Vérifier pending_users
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_users') THEN
        RAISE NOTICE 'Table pending_users manquante - elle sera créée par les migrations existantes';
    END IF;
    
    -- Vérifier otp_codes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'otp_codes') THEN
        RAISE NOTICE 'Table otp_codes créée avec succès';
    END IF;
END $$;

-- Créer un trigger pour nettoyer automatiquement les codes expirés
CREATE OR REPLACE FUNCTION trigger_cleanup_expired_otps()
RETURNS TRIGGER AS $$
BEGIN
    -- Nettoyer les codes expirés à chaque insertion
    PERFORM cleanup_expired_otps();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger si il n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'cleanup_expired_otps_trigger'
    ) THEN
        CREATE TRIGGER cleanup_expired_otps_trigger
            AFTER INSERT ON otp_codes
            FOR EACH STATEMENT
            EXECUTE FUNCTION trigger_cleanup_expired_otps();
    END IF;
END $$;

-- =====================================================
-- 7. STATISTIQUES ET VÉRIFICATION FINALE
-- =====================================================

-- Afficher un résumé des tables et politiques
DO $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
BEGIN
    -- Compter les tables principales
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('user_profiles', 'pending_users', 'otp_codes', 'cdc_agents', 'associations');
    
    -- Compter les politiques RLS
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE '=== RÉSUMÉ DE LA RÉPARATION ===';
    RAISE NOTICE 'Tables principales trouvées: %', table_count;
    RAISE NOTICE 'Politiques RLS actives: %', policy_count;
    RAISE NOTICE 'Table otp_codes: %', 
        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'otp_codes') 
             THEN 'CRÉÉE' 
             ELSE 'ERREUR' 
        END;
    RAISE NOTICE '=== RÉPARATION TERMINÉE ===';
END $$;