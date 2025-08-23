import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') // 'approve' or 'reject'
    const pendingId = url.searchParams.get('id')
    const token = url.searchParams.get('token')
    const reason = url.searchParams.get('reason') || ''

    if (!action || !pendingId || !token) {
      return new Response(
        generateErrorPage('Paramètres manquants'),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier que la demande existe et est en attente
    const { data: pendingUser, error: fetchError } = await supabaseAdmin
      .from('pending_users')
      .select('*')
      .eq('id', pendingId)
      .eq('status', 'pending')
      .single()

    if (fetchError || !pendingUser) {
      return new Response(
        generateErrorPage('Demande non trouvée ou déjà traitée'),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    // Vérifier le token de sécurité (simple hash basé sur l'ID et un secret)
    const expectedToken = await generateSecureToken(pendingId)
    if (token !== expectedToken) {
      return new Response(
        generateErrorPage('Token de sécurité invalide'),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    if (action === 'approve') {
      // Appeler la fonction d'approbation existante
      const { data, error } = await supabaseAdmin.functions.invoke('approve-registration', {
        body: {
          pendingUserId: pendingId,
          adminUserId: 'admin-via-email' // ID spécial pour les approbations par email
        }
      })

      if (error) throw error
      if (!data.success) throw new Error(data.error || 'Erreur lors de l\'approbation')

      return new Response(
        generateSuccessPage('approve', pendingUser.username, data.gatewayCode),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )

    } else if (action === 'reject') {
      // Traiter le rejet
      const { error: updateError } = await supabaseAdmin
        .from('pending_users')
        .update({
          status: 'rejected',
          approved_by: 'admin-via-email',
          approved_at: new Date().toISOString(),
          rejected_reason: reason || 'Rejeté par email',
        })
        .eq('id', pendingId)

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
          user_id: null,
          action_type: 'REJECT',
          target_type: 'USER_REQUEST',
          target_id: pendingId,
          description: `Demande rejetée par email: ${reason || 'Aucune raison spécifiée'}`,
          metadata: {
            pending_user_id: pendingId,
            rejection_reason: reason,
            approved_via: 'email_link'
          },
        })

      return new Response(
        generateSuccessPage('reject', pendingUser.username, null, reason),
        { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      )
    }

    return new Response(
      generateErrorPage('Action non valide'),
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    )

  } catch (error: any) {
    console.error('Error in approve-via-link:', error)
    return new Response(
      generateErrorPage(`Erreur: ${error.message}`),
      { headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
    )
  }
})

async function generateSecureToken(pendingId: string): Promise<string> {
  const secret = Deno.env.get('EMAIL_APPROVAL_SECRET') || 'default-secret-key'
  const data = `${pendingId}-${secret}`
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data))
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16)
}

function generateSuccessPage(action: string, username: string, gatewayCode?: string, reason?: string): string {
  const isApproval = action === 'approve'
  const title = isApproval ? 'Demande Approuvée ✅' : 'Demande Rejetée ❌'
  const bgColor = isApproval ? '#16a34a' : '#dc2626'
  const message = isApproval 
    ? `La demande de <strong>${username}</strong> a été approuvée avec succès !`
    : `La demande de <strong>${username}</strong> a été rejetée.`

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="background: ${bgColor}; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">${title}</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">MINJEC - Ministère de la Jeunesse et de la Culture</p>
        </div>
        
        <div style="padding: 30px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: ${isApproval ? '#dcfce7' : '#fee2e2'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px;">
              ${isApproval ? '✅' : '❌'}
            </div>
            <p style="font-size: 18px; color: #374151; margin: 0;">${message}</p>
          </div>

          ${isApproval && gatewayCode ? `
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h3 style="color: #1d4ed8; margin: 0 0 10px 0;">Code OTP généré</h3>
            <div style="font-size: 32px; font-weight: bold; color: #1d4ed8; letter-spacing: 4px; font-family: monospace;">
              ${gatewayCode}
            </div>
            <p style="color: #1e40af; margin: 10px 0 0 0; font-size: 14px;">
              Ce code a été envoyé par email à l'utilisateur
            </p>
          </div>
          ` : ''}

          ${!isApproval && reason ? `
          <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin: 0 0 10px 0;">Raison du rejet</h3>
            <p style="color: #7f1d1d; margin: 0;">${reason}</p>
          </div>
          ` : ''}

          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h4 style="color: #374151; margin: 0 0 10px 0;">Actions effectuées :</h4>
            <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
              <li>Statut de la demande mis à jour</li>
              <li>Email de notification envoyé à l'utilisateur</li>
              <li>Activité enregistrée dans les logs</li>
              ${isApproval ? '<li>Code OTP à 4 chiffres généré et envoyé</li>' : ''}
            </ul>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              📧 admin@minjec.gov.dj | 📞 +253 21 35 26 14<br>
              Traitement effectué le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateErrorPage(errorMessage: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Erreur - MINJEC</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
        <div style="background: #dc2626; color: white; padding: 30px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">❌ Erreur</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">MINJEC - Ministère de la Jeunesse et de la Culture</p>
        </div>
        
        <div style="padding: 30px; text-align: center;">
          <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: #fee2e2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px;">
            ⚠️
          </div>
          <p style="font-size: 18px; color: #374151; margin: 0 0 20px 0;">${errorMessage}</p>
          
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              Si le problème persiste, veuillez contacter l'équipe technique :<br>
              📧 admin@minjec.gov.dj | 📞 +253 21 35 26 14
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
}