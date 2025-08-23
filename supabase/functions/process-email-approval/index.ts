import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailApprovalRequest {
  action: 'approve' | 'reject';
  pendingUserId: string;
  adminEmail: string;
  reason?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, pendingUserId, adminEmail, reason }: EmailApprovalRequest = await req.json()

    if (!action || !pendingUserId || !adminEmail) {
      throw new Error('Missing required parameters')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier que l'admin existe
    const { data: adminProfile, error: adminError } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('user_type', 'admin')
      .single()

    if (adminError || !adminProfile) {
      throw new Error('Admin non autorisé')
    }

    if (action === 'approve') {
      // Appeler la fonction d'approbation existante
      const { data, error } = await supabaseAdmin.functions.invoke('approve-registration', {
        body: {
          pendingUserId: pendingUserId,
          adminUserId: adminProfile.id
        }
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error || 'Erreur lors de l\'approbation')

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Demande approuvée avec succès. Code OTP: ${data.gatewayCode}`,
          action: 'approved'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )

    } else if (action === 'reject') {
      // Récupérer les informations de la demande
      const { data: pendingUser, error: fetchError } = await supabaseAdmin
        .from('pending_users')
        .select('*')
        .eq('id', pendingUserId)
        .single()

      if (fetchError || !pendingUser) {
        throw new Error('Demande non trouvée')
      }

      // Mettre à jour le statut
      const { error: updateError } = await supabaseAdmin
        .from('pending_users')
        .update({
          status: 'rejected',
          approved_by: adminProfile.id,
          approved_at: new Date().toISOString(),
          rejected_reason: reason || 'Rejeté par email',
        })
        .eq('id', pendingUserId)

      if (updateError) throw updateError

      // Envoyer email de rejet
      await supabaseAdmin.functions.invoke('send-notification-email', {
        body: {
          type: 'rejection',
          to: pendingUser.email,
          data: {
            username: pendingUser.username,
            rejectionReason: reason || 'Votre demande n\'a pas pu être approuvée'
          }
        }
      })

      // Enregistrer l'activité
      await supabaseAdmin
        .from('activity_logs')
        .insert({
          user_id: adminProfile.id,
          action_type: 'REJECT',
          target_type: 'USER_REQUEST',
          target_id: pendingUserId,
          description: `Demande rejetée par email: ${reason || 'Aucune raison spécifiée'}`,
          metadata: {
            pending_user_id: pendingUserId,
            rejection_reason: reason,
            approved_via: 'email'
          },
        })

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Demande rejetée avec succès',
          action: 'rejected'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    throw new Error('Action non valide')

  } catch (error: any) {
    console.error('Error in process-email-approval:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})