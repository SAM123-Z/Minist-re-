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
    const { pendingUserId, adminUserId } = await req.json()

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Retrieve the pending user details
    const { data: pendingUser, error: fetchError } = await supabaseAdmin
      .from('pending_users')
      .select('*')
      .eq('id', pendingUserId)
      .single()

    if (fetchError) throw fetchError
    if (!pendingUser) throw new Error('Demande non trouvée')

    let userId: string

    // 2. Check if user already exists in Supabase Auth
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(pendingUser.email)

    if (getUserError && getUserError.message !== 'User not found') {
      throw getUserError
    }

    if (existingUser.user) {
      // 3. User exists, use their existing ID
      userId = existingUser.user.id
      console.log(`Using existing user ID: ${userId}`)
    } else {
      // 4. User doesn't exist, create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: pendingUser.email,
        password: pendingUser.additional_info.password || 'TempPassword123!',
        email_confirm: true
      })

      if (createError) throw createError
      if (!newUser.user) throw new Error('Erreur lors de la création de l\'utilisateur')

      userId = newUser.user.id
      console.log(`Created new user ID: ${userId}`)
    }

    // 5. Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        user_type: pendingUser.user_type,
        username: pendingUser.username,
        user_id_or_registration: pendingUser.user_id_or_registration,
      })

    if (profileError) throw profileError

    // 6. Create specific records based on user type
    if (pendingUser.user_type === 'cdc_agent' && pendingUser.additional_info.region) {
      const departmentValue = pendingUser.additional_info.region === 'Djibouti ville' && pendingUser.additional_info.commune 
        ? `${pendingUser.additional_info.region} - ${pendingUser.additional_info.commune}${pendingUser.additional_info.quartierCite ? ` (${pendingUser.additional_info.quartierCite})` : ''}`
        : pendingUser.additional_info.region

      const { error: agentError } = await supabaseAdmin
        .from('cdc_agents')
        .upsert({
          user_id: userId,
          department: departmentValue,
          status: 'active',
        }, { onConflict: 'user_id' })

      if (agentError) throw agentError
    }

    if (pendingUser.user_type === 'association' && pendingUser.additional_info.associationName) {
      const { error: associationError } = await supabaseAdmin
        .from('associations')
        .upsert({
          user_id: userId,
          association_name: pendingUser.additional_info.associationName,
          activity_sector: pendingUser.additional_info.activitySector || 'Non spécifié',
          address: pendingUser.additional_info.address || null,
          phone: pendingUser.additional_info.phone || null,
          status: 'approved',
        }, { onConflict: 'user_id' })

      if (associationError) throw associationError
    }

    // 7. Generate gateway code
    const gatewayCode = Math.floor(1000 + Math.random() * 9000).toString()

    // 8. Update pending user status
    const { error: updateError } = await supabaseAdmin
      .from('pending_users')
      .update({
        status: 'approved',
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
        serial_number: gatewayCode,
      })
      .eq('id', pendingUserId)

    if (updateError) throw updateError

    // 9. Send approval email
    try {
      await supabaseAdmin.functions.invoke('send-notification-email', {
        body: {
          type: 'approval',
          to: pendingUser.email,
          data: {
            username: pendingUser.username,
            email: pendingUser.email,
            userType: pendingUser.user_type,
            gatewayCode: gatewayCode,
          }
        }
      })
    } catch (emailError) {
      console.error('Error sending approval email:', emailError)
      // Don't fail the approval if email fails
    }

    // 10. Log activity
    await supabaseAdmin
      .from('activity_logs')
      .insert({
        user_id: adminUserId,
        action_type: 'APPROVE',
        target_type: 'USER_REQUEST',
        target_id: userId,
        description: `Demande d'utilisateur approuvée: ${pendingUser.username} (${pendingUser.user_type})`,
        metadata: {
          pending_user_id: pendingUserId,
          gateway_code: gatewayCode,
          user_type: pendingUser.user_type,
        },
      })

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        gatewayCode: gatewayCode,
        message: `Utilisateur ${pendingUser.username} approuvé avec succès!`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Error in approve-registration:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})