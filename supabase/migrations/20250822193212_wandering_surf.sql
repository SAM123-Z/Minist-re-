/*
  # Tables pour les agents CDC

  1. Nouvelles Tables
    - `cdc_missions` - Missions assignées aux agents
    - `cdc_activities` - Activités locales créées par les agents
    - `ministry_offers` - Offres du ministère (formations, stages, etc.)
    - `offer_applications` - Candidatures soumises via les agents
    - `cdc_reports` - Rapports générés par les agents
    - `cdc_notifications` - Système de notifications

  2. Sécurité
    - Enable RLS sur toutes les tables
    - Politiques pour que les agents ne voient que leurs données
*/

-- Table des missions assignées aux agents
CREATE TABLE IF NOT EXISTS cdc_missions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES cdc_agents(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'assigned' CHECK (status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date date,
  assigned_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des activités locales
CREATE TABLE IF NOT EXISTS cdc_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES cdc_agents(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  activity_type text NOT NULL CHECK (activity_type IN ('formation', 'sensibilisation', 'reunion', 'evenement', 'autre')),
  target_audience text,
  location text,
  scheduled_date date,
  status text DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
  participants_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des offres du ministère
CREATE TABLE IF NOT EXISTS ministry_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  offer_type text NOT NULL CHECK (offer_type IN ('formation', 'seminaire', 'stage', 'emploi', 'bourse', 'autre')),
  requirements text,
  deadline date,
  location text,
  contact_info text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des candidatures soumises
CREATE TABLE IF NOT EXISTS offer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES ministry_offers(id) ON DELETE CASCADE,
  agent_id uuid REFERENCES cdc_agents(id) ON DELETE CASCADE,
  applicant_name text NOT NULL,
  applicant_cin text NOT NULL,
  applicant_phone text,
  applicant_email text,
  applicant_gender text CHECK (applicant_gender IN ('homme', 'femme')),
  applicant_education text,
  application_documents jsonb DEFAULT '{}',
  status text DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected')),
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  notes text
);

-- Table des rapports
CREATE TABLE IF NOT EXISTS cdc_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES cdc_agents(id) ON DELETE CASCADE,
  title text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('monthly', 'activity', 'mission', 'special')),
  content text NOT NULL,
  period_start date,
  period_end date,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamptz,
  feedback text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des notifications
CREATE TABLE IF NOT EXISTS cdc_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes pour les performances
CREATE INDEX IF NOT EXISTS idx_cdc_missions_agent_id ON cdc_missions(agent_id);
CREATE INDEX IF NOT EXISTS idx_cdc_activities_agent_id ON cdc_activities(agent_id);
CREATE INDEX IF NOT EXISTS idx_offer_applications_agent_id ON offer_applications(agent_id);
CREATE INDEX IF NOT EXISTS idx_cdc_reports_agent_id ON cdc_reports(agent_id);
CREATE INDEX IF NOT EXISTS idx_cdc_notifications_recipient_id ON cdc_notifications(recipient_id);

-- Enable RLS
ALTER TABLE cdc_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdc_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE offer_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdc_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE cdc_notifications ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour les agents CDC
CREATE POLICY "Agents can view their missions"
  ON cdc_missions FOR SELECT
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM cdc_agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can update their missions"
  ON cdc_missions FOR UPDATE
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM cdc_agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can manage their activities"
  ON cdc_activities FOR ALL
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM cdc_agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Everyone can view active offers"
  ON ministry_offers FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Agents can manage applications they submitted"
  ON offer_applications FOR ALL
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM cdc_agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Agents can manage their reports"
  ON cdc_reports FOR ALL
  TO authenticated
  USING (
    agent_id IN (
      SELECT id FROM cdc_agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their notifications"
  ON cdc_notifications FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

CREATE POLICY "Users can update their notifications"
  ON cdc_notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid());

-- Admins peuvent tout voir et gérer
CREATE POLICY "Admins can manage all CDC data"
  ON cdc_missions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage all activities"
  ON cdc_activities FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage offers"
  ON ministry_offers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can view all applications"
  ON offer_applications FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

CREATE POLICY "Admins can manage all reports"
  ON cdc_reports FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Triggers pour updated_at
CREATE TRIGGER update_cdc_missions_updated_at
  BEFORE UPDATE ON cdc_missions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cdc_activities_updated_at
  BEFORE UPDATE ON cdc_activities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ministry_offers_updated_at
  BEFORE UPDATE ON ministry_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cdc_reports_updated_at
  BEFORE UPDATE ON cdc_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Données d'exemple pour les offres du ministère
INSERT INTO ministry_offers (title, description, offer_type, requirements, deadline, location, contact_info, created_by) VALUES
('Formation en Leadership Jeunesse', 'Formation de 3 jours sur le leadership pour les jeunes de 18-35 ans', 'formation', 'Âge: 18-35 ans, Diplôme minimum: Baccalauréat', '2024-12-31', 'Centre de Formation MINJEC, Djibouti', 'formation@minjec.gov.dj', (SELECT id FROM user_profiles WHERE user_type = 'admin' LIMIT 1)),
('Stage au Ministère', 'Stage de 6 mois dans les différents départements du ministère', 'stage', 'Étudiant en dernière année, Bon niveau en français', '2024-11-30', 'Ministère de la Jeunesse et Culture', 'stage@minjec.gov.dj', (SELECT id FROM user_profiles WHERE user_type = 'admin' LIMIT 1)),
('Séminaire sur l''Entrepreneuriat', 'Séminaire de 2 jours sur la création d''entreprise pour les jeunes', 'seminaire', 'Projet d''entreprise, Âge: 20-40 ans', '2024-10-15', 'Hôtel Kempinski, Djibouti', 'entrepreneur@minjec.gov.dj', (SELECT id FROM user_profiles WHERE user_type = 'admin' LIMIT 1));