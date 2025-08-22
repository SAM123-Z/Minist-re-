/*
  # Système de notification par email

  1. Nouvelles Tables
    - `email_notifications` - Historique des emails envoyés
    - `notification_templates` - Templates d'emails

  2. Fonctions
    - Fonction pour envoyer des emails automatiquement
    - Triggers pour déclencher les notifications

  3. Sécurité
    - RLS activé sur toutes les tables
    - Politiques appropriées pour les admins
*/

-- Table pour l'historique des emails
CREATE TABLE IF NOT EXISTS email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  subject text NOT NULL,
  content text NOT NULL,
  email_type text NOT NULL CHECK (email_type IN ('approval', 'rejection', 'general')),
  sent_at timestamptz DEFAULT now(),
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
  related_user_id uuid,
  gateway_code text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient ON email_notifications(recipient_email);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(email_type);
CREATE INDEX IF NOT EXISTS idx_email_notifications_sent_at ON email_notifications(sent_at);

-- RLS pour email_notifications
ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Politique pour les admins
CREATE POLICY "Admins can manage email notifications"
  ON email_notifications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.user_type = 'admin'
    )
  );

-- Fonction pour envoyer un email d'approbation
CREATE OR REPLACE FUNCTION send_approval_email(
  user_email text,
  username text,
  user_type text,
  gateway_code text,
  is_approval boolean DEFAULT true,
  rejection_reason text DEFAULT null
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  email_subject text;
  email_type text;
BEGIN
  -- Déterminer le type et sujet de l'email
  IF is_approval THEN
    email_subject := 'Inscription Approuvée - Code de Passerelle MINJEC';
    email_type := 'approval';
  ELSE
    email_subject := 'Inscription Non Approuvée - MINJEC';
    email_type := 'rejection';
  END IF;

  -- Enregistrer la notification dans l'historique
  INSERT INTO email_notifications (
    recipient_email,
    subject,
    content,
    email_type,
    gateway_code,
    metadata
  ) VALUES (
    user_email,
    email_subject,
    CASE 
      WHEN is_approval THEN 
        format('Inscription approuvée pour %s (%s). Code de passerelle: %s', username, user_type, gateway_code)
      ELSE 
        format('Inscription rejetée pour %s (%s). Raison: %s', username, user_type, COALESCE(rejection_reason, 'Non spécifié'))
    END,
    email_type,
    CASE WHEN is_approval THEN gateway_code ELSE null END,
    jsonb_build_object(
      'username', username,
      'user_type', user_type,
      'is_approval', is_approval,
      'rejection_reason', rejection_reason
    )
  );

  -- Appeler la fonction Edge pour envoyer l'email réel
  PERFORM net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/send-approval-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body := jsonb_build_object(
      'to', user_email,
      'subject', email_subject,
      'isApproval', is_approval,
      'gatewayCode', gateway_code,
      'username', username,
      'userType', user_type,
      'rejectionReason', rejection_reason
    )
  );
END;
$$;

-- Fonction trigger pour envoyer automatiquement les emails
CREATE OR REPLACE FUNCTION handle_pending_user_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Vérifier si le statut a changé vers 'approved' ou 'rejected'
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    -- Envoyer l'email approprié
    PERFORM send_approval_email(
      NEW.email,
      NEW.username,
      NEW.user_type,
      NEW.serial_number,
      NEW.status = 'approved',
      NEW.rejected_reason
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_pending_user_status_change ON pending_users;
CREATE TRIGGER trigger_pending_user_status_change
  AFTER UPDATE ON pending_users
  FOR EACH ROW
  EXECUTE FUNCTION handle_pending_user_status_change();