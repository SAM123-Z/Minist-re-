import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailWebhookPayload {
  from: string;
  subject: string;
  body: string;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: EmailWebhookPayload = await req.json()
    
    console.log('Received email webhook:', payload)

    // Extraire l'action et l'ID de la demande depuis l'objet
    const subject = payload.subject.toUpperCase()
    let action: 'approve' | 'reject' | null = null
    let requestId: string | null = null

    if (subject.includes('APPROUVER-')) {
      action = 'approve'
      requestId = subject.match(/APPROUVER-(.+)/)?.[1] || null
    } else if (subject.includes('REJETER-')) {
      action = 'reject'
      requestId = subject.match(/REJETER-(.+)/)?.[1] || null
    }

    if (!action || !requestId) {
      console.log('Email does not contain valid approval/rejection command')
      return new Response(
        JSON.stringify({ message: 'Email processed but no action taken' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Trouver la demande correspondante (utiliser une approche flexible pour l'ID)
    const { data: pendingUsers, error: searchError } = await supabaseAdmin
      .from('pending_users')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (searchError || !pendingUsers) {
      throw new Error('Erreur lors de la recherche des demandes')
    }

    // Chercher la demande qui correspond (par nom d'utilisateur ou email)
    let targetUser = null
    for (const user of pendingUsers) {
      const userRequestId = `${user.username?.substring(0, 3).toUpperCase() || 'REQ'}-${new Date(user.created_at).getTime().toString().slice(-6)}`
      if (userRequestId === requestId || user.username.toUpperCase().includes(requestId.split('-')[0])) {
        targetUser = user
        break
      }
    }

    if (!targetUser) {
      throw new Error(`Demande non trouvée pour l'ID: ${requestId}`)
    }

    // Extraire la raison du rejet si applicable
    let reason = ''
    if (action === 'reject') {
      const bodyLines = payload.body.split('\n')
      const reasonLine = bodyLines.find(line => line.toLowerCase().includes('raison:'))
      if (reasonLine) {
        reason = reasonLine.split('raison:')[1]?.trim() || 'Rejeté par email'
      } else {
        reason = 'Rejeté par email'
      }
    }

    // Appeler la fonction de traitement
    const { data, error } = await supabaseAdmin.functions.invoke('process-email-approval', {
      body: {
        action: action,
        pendingUserId: targetUser.id,
        adminEmail: payload.from,
        reason: reason
      }
    })

    if (error) throw error

    console.log(`Email approval processed successfully: ${action} for user ${targetUser.username}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Demande ${action === 'approve' ? 'approuvée' : 'rejetée'} avec succès`,
        user: targetUser.username,
        action: action
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Error in handle-email-webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})