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
    // Log environment variables (without exposing sensitive data)
    console.log('Environment check:', {
      hasUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      url: Deno.env.get('SUPABASE_URL')?.substring(0, 20) + '...'
    })

    const { pendingUserId, adminUserId } = await req.json()
    
    if (!pendingUserId || !adminUserId) {
      throw new Error('Missing required parameters: pendingUserId or adminUserId')
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceKey
    )

    // 1. Retrieve the pending user details
    console.log('Fetching pending user:', pendingUserId)
    const { data: pendingUser, error: fetchError } = await supabaseAdmin
      .from('pending_users')
      .select('*')
      .eq('id', pendingUserId)
      .single()

    if (fetchError) {
      console.error('Error fetching pending user:', fetchError)
      throw new Error(`Erreur lors de la récupération de la demande: ${fetchError.message}`)
    }
    if (!pendingUser) {
      throw new Error('Demande non trouvée')
    }

    console.log('Found pending user:', { id: pendingUser.id, email: pendingUser.email, type: pendingUser.user_type })

    let userId: string

    // 2. Check if user already exists in Supabase Auth
    console.log('Checking if user exists:', pendingUser.email)
    const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(pendingUser.email)

    if (getUserError && getUserError.message !== 'User not found') {
      console.error('Error checking existing user:', getUserError)
      throw getUserError
    }

    if (existingUser.user) {
      // 3. User exists, use their existing ID
      userId = existingUser.user.id
      console.log(`Using existing user ID: ${userId}`)
    } else {
      // 4. User doesn't exist, create new user
      console.log('Creating new user for:', pendingUser.email)
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: pendingUser.email,
        password: pendingUser.additional_info.password || 'TempPassword123!',
        email_confirm: true
      })

      if (createError) {
        console.error('Error creating user:', createError)
        throw new Error(`Erreur lors de la création de l'utilisateur: ${createError.message}`)
      }
      if (!newUser.user) {
        throw new Error('Erreur lors de la création de l\'utilisateur')
      }

      userId = newUser.user.id
      console.log(`Created new user ID: ${userId}`)
    }

    // 5. Create user profile
    console.log('Creating user profile for:', userId)
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        id: userId,
        user_type: pendingUser.user_type,
        username: pendingUser.username,
        user_id_or_registration: pendingUser.user_id_or_registration,
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Error creating user profile:', profileError)
      throw new Error(`Erreur lors de la création du profil: ${profileError.message}`)
    }

    // 6. Create specific records based on user type
    if (pendingUser.user_type === 'cdc_agent' && pendingUser.additional_info.region) {
      console.log('Creating CDC agent record')
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

      if (agentError) {
        console.error('Error creating CDC agent:', agentError)
        throw new Error(`Erreur lors de la création de l'agent CDC: ${agentError.message}`)
      }
    }

    if (pendingUser.user_type === 'association' && pendingUser.additional_info.associationName) {
      console.log('Creating association record')
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

      if (associationError) {
        console.error('Error creating association:', associationError)
        throw new Error(`Erreur lors de la création de l'association: ${associationError.message}`)
      }
    }

    // 7. Generate gateway code
    const gatewayCode = Math.floor(1000 + Math.random() * 9000).toString() // Code à 4 chiffres
    console.log('Generated gateway code:', gatewayCode)

    // 8. Update pending user status
    console.log('Updating pending user status')
    const { error: updateError } = await supabaseAdmin
      .from('pending_users')
      .update({
        status: 'approved',
        approved_by: adminUserId,
        approved_at: new Date().toISOString(),
        serial_number: gatewayCode,
      })
      .eq('id', pendingUserId)

    if (updateError) {
      console.error('Error updating pending user:', updateError)
      throw new Error(`Erreur lors de la mise à jour du statut: ${updateError.message}`)
    }

    // 9. Send approval email
    try {
      console.log('Sending approval email')
      await supabaseAdmin.functions.invoke('send-otp', {
        body: {
          email: pendingUser.email,
          type: 'approval',
          customOtp: gatewayCode,
          username: pendingUser.username
        }
      })
    } catch (emailError) {
      console.error('Error sending approval email:', emailError)
      // Don't fail the approval if email fails
    }

    // 10. Log activity
    console.log('Logging activity')
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

    console.log('Approval process completed successfully')
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
    console.error('Error stack:', error.stack)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack?.split('\n')[0] || 'No additional details'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})