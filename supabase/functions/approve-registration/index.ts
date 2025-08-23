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

  // Add request logging
  console.log('=== APPROVE REGISTRATION REQUEST ===')
  console.log('Method:', req.method)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))
  
  try {
    console.log('=== APPROVE REGISTRATION FUNCTION START ===')
    
    // 1. Parse request body
    let requestBody
    try {
      requestBody = await req.json()
      console.log('Request body parsed successfully:', { 
        hasPendingUserId: !!requestBody.pendingUserId,
        hasAdminUserId: !!requestBody.adminUserId 
      })
    } catch (error) {
      console.error('Failed to parse request body:', error)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { pendingUserId, adminUserId } = requestBody
    
    // 2. Validate required parameters
    if (!pendingUserId || !adminUserId) {
      console.error('Missing required parameters:', { pendingUserId, adminUserId })
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: pendingUserId or adminUserId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // 3. Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Environment variables check:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlPrefix: supabaseUrl?.substring(0, 30) + '...'
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing environment variables')
      return new Response(
        JSON.stringify({ error: 'Server configuration error: Missing environment variables' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 4. Create Supabase admin client
    let supabaseAdmin
    try {
      supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
      console.log('Supabase admin client created successfully')
    } catch (error) {
      console.error('Failed to create Supabase client:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to initialize database connection' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 5. Retrieve the pending user details
    console.log('Fetching pending user with ID:', pendingUserId)
    let pendingUser
    try {
      const { data, error } = await supabaseAdmin
        .from('pending_users')
        .select('*')
        .eq('id', pendingUserId)
        .single()

      if (error) {
        console.error('Database error fetching pending user:', error)
        return new Response(
          JSON.stringify({ error: `Database error: ${error.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }
      
      if (!data) {
        console.error('Pending user not found:', pendingUserId)
        return new Response(
          JSON.stringify({ error: 'Pending user not found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      pendingUser = data
      console.log('Pending user found:', { 
        id: pendingUser.id, 
        email: pendingUser.email, 
        type: pendingUser.user_type,
        status: pendingUser.status
      })

      if (pendingUser.status !== 'pending') {
        console.error('User request already processed:', pendingUser.status)
        return new Response(
          JSON.stringify({ error: `Request already ${pendingUser.status}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

    } catch (error) {
      console.error('Unexpected error fetching pending user:', error)
      return new Response(
        JSON.stringify({ error: 'Unexpected database error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    let userId: string

    // 6. Check if user already exists in Supabase Auth
    console.log('Checking if user exists in auth:', pendingUser.email)
    try {
      const { data: existingUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserByEmail(pendingUser.email)

      if (getUserError && getUserError.message !== 'User not found') {
        console.error('Error checking existing user:', getUserError)
        return new Response(
          JSON.stringify({ error: `Auth error: ${getUserError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      if (existingUser.user) {
        userId = existingUser.user.id
        console.log('Using existing user ID:', userId)
      } else {
        // 7. Create new user
        console.log('Creating new user for:', pendingUser.email)
        const password = pendingUser.additional_info?.password || 'TempPassword123!'
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: pendingUser.email,
          password: password,
          email_confirm: true
        })

        if (createError) {
          console.error('Error creating user:', createError)
          return new Response(
            JSON.stringify({ error: `Failed to create user: ${createError.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
        
        if (!newUser.user) {
          console.error('User creation returned null')
          return new Response(
            JSON.stringify({ error: 'User creation failed: no user returned' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }

        userId = newUser.user.id
        console.log('Created new user ID:', userId)
      }
    } catch (error) {
      console.error('Unexpected error in user creation/check:', error)
      return new Response(
        JSON.stringify({ error: 'Unexpected auth error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 8. Create user profile
    console.log('Creating user profile for:', userId)
    try {
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
        return new Response(
          JSON.stringify({ error: `Profile creation error: ${profileError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      console.log('User profile created successfully')
    } catch (error) {
      console.error('Unexpected error creating profile:', error)
      return new Response(
        JSON.stringify({ error: 'Unexpected profile creation error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 9. Create specific records based on user type
    try {
      if (pendingUser.user_type === 'cdc_agent') {
        console.log('Creating CDC agent record')
        
        // Ensure we have valid values for required fields
        const region = pendingUser.additional_info?.region || 'Non spécifié'
        const commune = pendingUser.additional_info?.commune || ''
        const quartierCite = pendingUser.additional_info?.quartierCite || ''
        
        const departmentValue = region === 'Djibouti ville' && commune 
          ? `${region} - ${commune}${quartierCite ? ` (${quartierCite})` : ''}`
          : region

        const { error: agentError } = await supabaseAdmin
          .from('cdc_agents')
          .upsert({
            user_id: userId,
            department: departmentValue,
            status: 'active',
          }, { onConflict: 'user_id' })

        if (agentError) {
          console.error('Error creating CDC agent:', agentError)
          return new Response(
            JSON.stringify({ error: `CDC agent creation error: ${agentError.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
        console.log('CDC agent record created successfully')
      }

      if (pendingUser.user_type === 'association') {
        console.log('Creating association record')
        
        // Ensure we have valid values for required fields
        const associationName = pendingUser.additional_info?.associationName || 'Association non spécifiée'
        const activitySector = pendingUser.additional_info?.activitySector || 'Non spécifié'
        const address = pendingUser.additional_info?.address || null
        const phone = pendingUser.additional_info?.phone || null
        
        const { error: associationError } = await supabaseAdmin
          .from('associations')
          .upsert({
            user_id: userId,
            association_name: associationName,
            activity_sector: activitySector,
            address: address,
            phone: phone,
            status: 'approved',
          }, { onConflict: 'user_id' })

        if (associationError) {
          console.error('Error creating association:', associationError)
          return new Response(
            JSON.stringify({ error: `Association creation error: ${associationError.message}` }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
          )
        }
        console.log('Association record created successfully')
      }
    } catch (error) {
      console.error('Unexpected error creating type-specific records:', error)
      return new Response(
        JSON.stringify({ error: 'Unexpected error creating user type records' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 10. Generate gateway code
    const gatewayCode = Math.floor(1000 + Math.random() * 9000).toString()
    console.log('Generated gateway code:', gatewayCode)

    // 11. Update pending user status
    console.log('Updating pending user status to approved')
    try {
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
        console.error('Error updating pending user status:', updateError)
        return new Response(
          JSON.stringify({ error: `Status update error: ${updateError.message}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }
      console.log('Pending user status updated successfully')
    } catch (error) {
      console.error('Unexpected error updating status:', error)
      return new Response(
        JSON.stringify({ error: 'Unexpected status update error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // 12. Send approval email (non-blocking)
    let emailSent = false
    try {
      console.log('Attempting to send approval email')
      const { data: emailData, error: emailError } = await supabaseAdmin.functions.invoke('send-otp', {
        body: {
          email: pendingUser.email,
          type: 'approval',
          customOtp: gatewayCode,
          username: pendingUser.username
        }
      })
      
      if (emailError) {
        console.warn('Email sending failed but continuing approval:', emailError)
      } else {
        console.log('Approval email sent successfully')
        emailSent = true
      }
    } catch (emailError) {
      console.warn('Error sending approval email, but approval continues:', emailError)
    }

    // 13. Log activity
    try {
      console.log('Logging approval activity')
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
      console.log('Activity logged successfully')
    } catch (error) {
      console.warn('Failed to log activity, but approval continues:', error)
    }

    console.log('=== APPROVAL PROCESS COMPLETED SUCCESSFULLY ===')
    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userId,
        gatewayCode: gatewayCode,
        message: `Utilisateur ${pendingUser.username} approuvé avec succès!`,
        emailSent: emailSent
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('=== CRITICAL ERROR IN APPROVE-REGISTRATION ===')
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Error details:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})