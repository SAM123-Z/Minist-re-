/*
  # Système d'approbation des utilisateurs avec numéro de série

  1. Nouvelles Tables
    - `pending_users` - Utilisateurs en attente d'approbation
      - `id` (uuid, primary key)
      - `email` (text, email de l'utilisateur)
      - `username` (text, nom d'utilisateur souhaité)
      - `user_type` (enum, type d'utilisateur demandé)
      - `user_id_or_registration` (text, ID/numéro d'enregistrement)
      - `additional_info` (jsonb, informations supplémentaires)
      - `status` (enum, statut de la demande)
      - `serial_number` (text, numéro de série généré)
      - `approved_by` (uuid, admin qui a approuvé)
      - `approved_at` (timestamp, date d'approbation)
      - `created_at` (timestamp)

  2. Fonctions
    - Génération automatique de numéros de série à 4 chiffres
    - Fonction d'envoi d'email (simulation)

  3. Sécurité
    - Enable RLS sur pending_users
    - Politiques pour admin et utilisateurs concernés
*/

-- Créer l'enum pour le statut des demandes
CREATE TYPE pending_status_enum AS ENUM ('pending', 'approved', 'rejected');

-- Table des utilisateurs en attente d'approbation
CREATE TABLE IF NOT EXISTS pending_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  username text NOT NULL,
  user_type user_type_enum NOT NULL,
  user_id_or_registration text NOT NULL,
  additional_info jsonb DEFAULT '{}',
  status pending_status_enum NOT NULL DEFAULT 'pending',
  serial_number text UNIQUE,
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  rejected_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;

-- Politiques pour pending_users
CREATE POLICY "Admins can manage all pending users"
  ON pending_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Users can read own pending request"
  ON pending_users
  FOR SELECT
  TO authenticated
  USING (
    email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Fonction pour générer un numéro de série à 4 chiffres
CREATE OR REPLACE FUNCTION generate_serial_number()
RETURNS text AS $$
DECLARE
  new_serial text;
  counter integer := 1000;
BEGIN
  LOOP
    new_serial := LPAD(counter::text, 4, '0');
    
    IF NOT EXISTS (SELECT 1 FROM pending_users WHERE serial_number = new_serial) THEN
      RETURN new_serial;
    END IF;
    
    counter := counter + 1;
    
    -- Éviter les boucles infinies
    IF counter > 9999 THEN
      counter := 1000;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour approuver un utilisateur
CREATE OR REPLACE FUNCTION approve_pending_user(
  p_pending_id uuid,
  p_admin_id uuid
)
RETURNS jsonb AS $$
DECLARE
  pending_record pending_users%ROWTYPE;
  new_user_id uuid;
  serial_num text;
BEGIN
  -- Vérifier que l'utilisateur qui approuve est admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = p_admin_id AND user_type = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Récupérer la demande en attente
  SELECT * INTO pending_record 
  FROM pending_users 
  WHERE id = p_pending_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pending user not found');
  END IF;

  -- Générer un numéro de série
  serial_num := generate_serial_number();

  -- Créer l'utilisateur dans auth.users (simulation - en réalité ceci serait fait via l'API Supabase)
  -- Pour la démo, on va créer directement le profil utilisateur
  
  -- Générer un UUID pour le nouvel utilisateur
  new_user_id := gen_random_uuid();

  -- Créer le profil utilisateur
  INSERT INTO user_profiles (id, user_type, username, user_id_or_registration)
  VALUES (new_user_id, pending_record.user_type, pending_record.username, pending_record.user_id_or_registration);

  -- Créer les enregistrements spécifiques selon le type
  IF pending_record.user_type = 'cdc_agent' THEN
    INSERT INTO cdc_agents (user_id, department, status)
    VALUES (
      new_user_id, 
      COALESCE(pending_record.additional_info->>'department', 'General'),
      'active'
    );
  ELSIF pending_record.user_type = 'association' THEN
    INSERT INTO associations (user_id, association_name, activity_sector, status)
    VALUES (
      new_user_id,
      COALESCE(pending_record.additional_info->>'association_name', pending_record.username),
      COALESCE(pending_record.additional_info->>'activity_sector', 'General'),
      'approved'
    );
  END IF;

  -- Mettre à jour la demande
  UPDATE pending_users 
  SET 
    status = 'approved',
    serial_number = serial_num,
    approved_by = p_admin_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_pending_id;

  -- Logger l'activité
  INSERT INTO activity_logs (user_id, action_type, target_type, target_id, description, metadata)
  VALUES (
    p_admin_id,
    'APPROVE',
    'PENDING_USER',
    p_pending_id,
    'Utilisateur approuvé: ' || pending_record.username || ' (' || pending_record.user_type || ')',
    jsonb_build_object(
      'serial_number', serial_num,
      'email', pending_record.email,
      'user_type', pending_record.user_type
    )
  );

  -- Simuler l'envoi d'email (en réalité, ceci déclencherait un webhook ou une fonction edge)
  -- Pour la démo, on va juste logger l'action
  INSERT INTO activity_logs (user_id, action_type, target_type, target_id, description, metadata)
  VALUES (
    p_admin_id,
    'EMAIL_SENT',
    'USER',
    new_user_id,
    'Email de confirmation envoyé avec numéro de série: ' || serial_num,
    jsonb_build_object(
      'email', pending_record.email,
      'serial_number', serial_num,
      'email_type', 'approval_confirmation'
    )
  );

  RETURN jsonb_build_object(
    'success', true, 
    'serial_number', serial_num,
    'user_id', new_user_id,
    'email', pending_record.email
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour rejeter un utilisateur
CREATE OR REPLACE FUNCTION reject_pending_user(
  p_pending_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Non spécifié'
)
RETURNS jsonb AS $$
DECLARE
  pending_record pending_users%ROWTYPE;
BEGIN
  -- Vérifier que l'utilisateur qui rejette est admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = p_admin_id AND user_type = 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  END IF;

  -- Récupérer la demande en attente
  SELECT * INTO pending_record 
  FROM pending_users 
  WHERE id = p_pending_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pending user not found');
  END IF;

  -- Mettre à jour la demande
  UPDATE pending_users 
  SET 
    status = 'rejected',
    rejected_reason = p_reason,
    approved_by = p_admin_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_pending_id;

  -- Logger l'activité
  INSERT INTO activity_logs (user_id, action_type, target_type, target_id, description, metadata)
  VALUES (
    p_admin_id,
    'REJECT',
    'PENDING_USER',
    p_pending_id,
    'Utilisateur rejeté: ' || pending_record.username || ' - Raison: ' || p_reason,
    jsonb_build_object(
      'email', pending_record.email,
      'user_type', pending_record.user_type,
      'reason', p_reason
    )
  );

  RETURN jsonb_build_object('success', true, 'reason', p_reason);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_pending_users_updated_at
  BEFORE UPDATE ON pending_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);
CREATE INDEX IF NOT EXISTS idx_pending_users_status ON pending_users(status);
CREATE INDEX IF NOT EXISTS idx_pending_users_created_at ON pending_users(created_at);
CREATE INDEX IF NOT EXISTS idx_pending_users_serial_number ON pending_users(serial_number);