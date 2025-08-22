/*
  # Mise à jour du système d'approbation avec envoi d'emails

  1. Nouvelles fonctions
    - `send_approval_email` - Simule l'envoi d'email d'approbation avec code à 4 chiffres
    - `send_rejection_email` - Simule l'envoi d'email de rejet
    - `approve_user_request` - Fonction complète d'approbation avec email
    - `reject_user_request` - Fonction complète de rejet avec email

  2. Modifications
    - Ajout de colonnes pour tracking des emails
    - Amélioration des logs d'activité
    - Gestion des codes de passerelle
*/

-- Fonction pour simuler l'envoi d'email d'approbation
CREATE OR REPLACE FUNCTION send_approval_email(
  p_email text,
  p_username text,
  p_gateway_code text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simulation d'envoi d'email d'approbation
  -- En production, ceci appellerait un service d'email réel
  
  -- Log de l'envoi d'email
  INSERT INTO activity_logs (
    action_type,
    target_type,
    description,
    metadata
  ) VALUES (
    'EMAIL_SENT',
    'APPROVAL',
    'Email d''approbation envoyé à ' || p_email,
    jsonb_build_object(
      'email', p_email,
      'username', p_username,
      'gateway_code', p_gateway_code,
      'email_type', 'approval',
      'sent_at', now()
    )
  );
  
  RETURN true;
END;
$$;

-- Fonction pour simuler l'envoi d'email de rejet
CREATE OR REPLACE FUNCTION send_rejection_email(
  p_email text,
  p_username text,
  p_reason text DEFAULT 'Non spécifié'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simulation d'envoi d'email de rejet
  -- En production, ceci appellerait un service d'email réel
  
  -- Log de l'envoi d'email
  INSERT INTO activity_logs (
    action_type,
    target_type,
    description,
    metadata
  ) VALUES (
    'EMAIL_SENT',
    'REJECTION',
    'Email de rejet envoyé à ' || p_email,
    jsonb_build_object(
      'email', p_email,
      'username', p_username,
      'reason', p_reason,
      'email_type', 'rejection',
      'sent_at', now()
    )
  );
  
  RETURN true;
END;
$$;

-- Fonction complète d'approbation avec envoi d'email
CREATE OR REPLACE FUNCTION approve_user_request(
  p_pending_id uuid,
  p_admin_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_user pending_users%ROWTYPE;
  v_gateway_code text;
  v_new_user_id uuid;
  v_email_sent boolean;
BEGIN
  -- Vérifier que l'utilisateur qui fait la demande est admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = p_admin_id AND user_type = 'admin'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seuls les administrateurs peuvent approuver les demandes'
    );
  END IF;

  -- Récupérer la demande en attente
  SELECT * INTO v_pending_user
  FROM pending_users
  WHERE id = p_pending_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Demande non trouvée ou déjà traitée'
    );
  END IF;

  -- Générer un code de passerelle à 4 chiffres
  v_gateway_code := LPAD((RANDOM() * 9000 + 1000)::int::text, 4, '0');

  -- Créer l'utilisateur avec Supabase Auth (simulation)
  v_new_user_id := gen_random_uuid();

  -- Créer le profil utilisateur
  INSERT INTO user_profiles (
    id,
    user_type,
    username,
    user_id_or_registration
  ) VALUES (
    v_new_user_id,
    v_pending_user.user_type,
    v_pending_user.username,
    v_pending_user.user_id_or_registration
  );

  -- Créer des enregistrements spécifiques selon le type
  IF v_pending_user.user_type = 'cdc_agent' THEN
    INSERT INTO cdc_agents (
      user_id,
      department,
      status
    ) VALUES (
      v_new_user_id,
      COALESCE(v_pending_user.additional_info->>'department', 'General'),
      'active'
    );
  ELSIF v_pending_user.user_type = 'association' THEN
    INSERT INTO associations (
      user_id,
      association_name,
      activity_sector,
      address,
      phone,
      status
    ) VALUES (
      v_new_user_id,
      COALESCE(v_pending_user.additional_info->>'association_name', v_pending_user.username),
      COALESCE(v_pending_user.additional_info->>'activity_sector', 'Non spécifié'),
      v_pending_user.additional_info->>'address',
      v_pending_user.additional_info->>'phone',
      'approved'
    );
  END IF;

  -- Mettre à jour la demande comme approuvée
  UPDATE pending_users
  SET 
    status = 'approved',
    serial_number = v_gateway_code,
    approved_by = p_admin_id,
    approved_at = now(),
    updated_at = now()
  WHERE id = p_pending_id;

  -- Envoyer l'email d'approbation avec le code de passerelle
  v_email_sent := send_approval_email(
    v_pending_user.email,
    v_pending_user.username,
    v_gateway_code
  );

  -- Log de l'approbation
  INSERT INTO activity_logs (
    user_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    p_admin_id,
    'APPROVE',
    'USER_REQUEST',
    v_new_user_id,
    'Demande d''utilisateur approuvée: ' || v_pending_user.username,
    jsonb_build_object(
      'pending_id', p_pending_id,
      'user_type', v_pending_user.user_type,
      'gateway_code', v_gateway_code,
      'email_sent', v_email_sent,
      'approved_by', p_admin_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'gateway_code', v_gateway_code,
    'user_id', v_new_user_id,
    'email_sent', v_email_sent,
    'message', 'Utilisateur approuvé avec succès. Email envoyé avec le code de passerelle.'
  );
END;
$$;

-- Fonction complète de rejet avec envoi d'email
CREATE OR REPLACE FUNCTION reject_user_request(
  p_pending_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Non spécifié'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pending_user pending_users%ROWTYPE;
  v_email_sent boolean;
BEGIN
  -- Vérifier que l'utilisateur qui fait la demande est admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = p_admin_id AND user_type = 'admin'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Seuls les administrateurs peuvent rejeter les demandes'
    );
  END IF;

  -- Récupérer la demande en attente
  SELECT * INTO v_pending_user
  FROM pending_users
  WHERE id = p_pending_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Demande non trouvée ou déjà traitée'
    );
  END IF;

  -- Mettre à jour la demande comme rejetée
  UPDATE pending_users
  SET 
    status = 'rejected',
    approved_by = p_admin_id,
    approved_at = now(),
    rejected_reason = p_reason,
    updated_at = now()
  WHERE id = p_pending_id;

  -- Envoyer l'email de rejet
  v_email_sent := send_rejection_email(
    v_pending_user.email,
    v_pending_user.username,
    p_reason
  );

  -- Log du rejet
  INSERT INTO activity_logs (
    user_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    p_admin_id,
    'REJECT',
    'USER_REQUEST',
    p_pending_id,
    'Demande d''utilisateur rejetée: ' || v_pending_user.username,
    jsonb_build_object(
      'pending_id', p_pending_id,
      'user_type', v_pending_user.user_type,
      'reason', p_reason,
      'email_sent', v_email_sent,
      'rejected_by', p_admin_id
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'email_sent', v_email_sent,
    'message', 'Demande rejetée avec succès. Email de notification envoyé.'
  );
END;
$$;