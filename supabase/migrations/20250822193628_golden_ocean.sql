/*
  # Correction des politiques RLS pour pending_users

  1. Corrections
    - Permettre aux utilisateurs anonymes d'insérer dans pending_users
    - Corriger les politiques existantes pour permettre l'inscription
    - Maintenir la sécurité pour les autres opérations
*/

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can insert own pending request" ON pending_users;
DROP POLICY IF EXISTS "Users can read own pending request" ON pending_users;
DROP POLICY IF EXISTS "Admins can manage all pending users" ON pending_users;

-- Créer une nouvelle politique pour permettre l'insertion par les utilisateurs anonymes
CREATE POLICY "Anyone can submit registration request"
  ON pending_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Politique pour que les utilisateurs authentifiés puissent lire leur propre demande
CREATE POLICY "Users can read own pending request"
  ON pending_users
  FOR SELECT
  TO authenticated
  USING (email IN (
    SELECT users.email
    FROM auth.users
    WHERE users.id = auth.uid()
  ));

-- Politique pour que les admins puissent gérer toutes les demandes
CREATE POLICY "Admins can manage all pending users"
  ON pending_users
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.user_type = 'admin'::user_type_enum
  ))
  WITH CHECK (EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.user_type = 'admin'::user_type_enum
  ));