/*
  # Création des tables pour le tableau de bord Admin

  1. Nouvelles Tables
    - `cdc_agents` - Informations spécifiques aux agents CDC
      - `id` (uuid, primary key)
      - `user_id` (uuid, référence vers user_profiles)
      - `matricule` (text, unique, matricule généré automatiquement)
      - `department` (text, département d'affectation)
      - `status` (enum, statut de l'agent)
      - `hire_date` (date, date d'embauche)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `associations` - Informations spécifiques aux associations
      - `id` (uuid, primary key)
      - `user_id` (uuid, référence vers user_profiles)
      - `association_name` (text, nom de l'association)
      - `registration_number` (text, numéro d'enregistrement)
      - `legal_status` (text, statut juridique)
      - `activity_sector` (text, secteur d'activité)
      - `address` (text, adresse)
      - `phone` (text, téléphone)
      - `status` (enum, statut de l'association)
      - `registration_date` (date, date d'enregistrement)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `activity_logs` - Journal des activités
      - `id` (uuid, primary key)
      - `user_id` (uuid, utilisateur qui a effectué l'action)
      - `action_type` (text, type d'action)
      - `target_type` (text, type de cible)
      - `target_id` (uuid, ID de la cible)
      - `description` (text, description de l'action)
      - `metadata` (jsonb, données supplémentaires)
      - `created_at` (timestamp)

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour admin seulement
    - Politiques de lecture pour les utilisateurs concernés

  3. Fonctions
    - Génération automatique de matricules
    - Triggers pour les logs d'activité
*/

-- Créer les enums
CREATE TYPE agent_status_enum AS ENUM ('active', 'inactive', 'suspended', 'terminated');
CREATE TYPE association_status_enum AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- Table des agents CDC
CREATE TABLE IF NOT EXISTS cdc_agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  matricule text UNIQUE NOT NULL,
  department text NOT NULL DEFAULT 'General',
  status agent_status_enum NOT NULL DEFAULT 'active',
  hire_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des associations
CREATE TABLE IF NOT EXISTS associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  association_name text NOT NULL,
  registration_number text UNIQUE NOT NULL,
  legal_status text NOT NULL DEFAULT 'Association',
  activity_sector text NOT NULL,
  address text,
  phone text,
  status association_status_enum NOT NULL DEFAULT 'pending',
  registration_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des logs d'activité
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  description text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE cdc_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Politiques pour cdc_agents
CREATE POLICY "Admins can manage all agents"
  ON cdc_agents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Agents can read own data"
  ON cdc_agents
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Politiques pour associations
CREATE POLICY "Admins can manage all associations"
  ON associations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Associations can read own data"
  ON associations
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Politiques pour activity_logs
CREATE POLICY "Admins can read all logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Fonction pour générer un matricule unique
CREATE OR REPLACE FUNCTION generate_matricule()
RETURNS text AS $$
DECLARE
  new_matricule text;
  counter integer := 1;
BEGIN
  LOOP
    new_matricule := 'CDC' || LPAD(counter::text, 6, '0');
    
    IF NOT EXISTS (SELECT 1 FROM cdc_agents WHERE matricule = new_matricule) THEN
      RETURN new_matricule;
    END IF;
    
    counter := counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour générer un numéro d'enregistrement d'association
CREATE OR REPLACE FUNCTION generate_association_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer := 1;
BEGIN
  LOOP
    new_number := 'ASS' || LPAD(counter::text, 6, '0');
    
    IF NOT EXISTS (SELECT 1 FROM associations WHERE registration_number = new_number) THEN
      RETURN new_number;
    END IF;
    
    counter := counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour générer automatiquement le matricule
CREATE OR REPLACE FUNCTION set_agent_matricule()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.matricule IS NULL OR NEW.matricule = '' THEN
    NEW.matricule := generate_matricule();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_agent_matricule
  BEFORE INSERT ON cdc_agents
  FOR EACH ROW
  EXECUTE FUNCTION set_agent_matricule();

-- Trigger pour générer automatiquement le numéro d'association
CREATE OR REPLACE FUNCTION set_association_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.registration_number IS NULL OR NEW.registration_number = '' THEN
    NEW.registration_number := generate_association_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_association_number
  BEFORE INSERT ON associations
  FOR EACH ROW
  EXECUTE FUNCTION set_association_number();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_cdc_agents_updated_at
  BEFORE UPDATE ON cdc_agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_associations_updated_at
  BEFORE UPDATE ON associations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour logger les activités
CREATE OR REPLACE FUNCTION log_activity(
  p_action_type text,
  p_target_type text,
  p_target_id uuid,
  p_description text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action_type, target_type, target_id, description, metadata)
  VALUES (auth.uid(), p_action_type, p_target_type, p_target_id, p_description, p_metadata);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer des index pour les performances
CREATE INDEX IF NOT EXISTS idx_cdc_agents_user_id ON cdc_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_cdc_agents_matricule ON cdc_agents(matricule);
CREATE INDEX IF NOT EXISTS idx_cdc_agents_status ON cdc_agents(status);

CREATE INDEX IF NOT EXISTS idx_associations_user_id ON associations(user_id);
CREATE INDEX IF NOT EXISTS idx_associations_registration_number ON associations(registration_number);
CREATE INDEX IF NOT EXISTS idx_associations_status ON associations(status);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);