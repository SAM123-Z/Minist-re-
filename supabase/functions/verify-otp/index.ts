import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VerifyOtpRequest {
  email: string;
  otp: string;
  type?: 'login' | 'registration' | 'password_reset';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, otp, type = 'login' }: VerifyOtpRequest = await req.json()

    if (!email || !otp) {
      throw new Error('Email and OTP are required')
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('type', type)
      .eq('otp_code', otp)
      .eq('used', false)
      .single()

    if (fetchError || !otpRecord) {
      throw new Error('Code OTP invalide ou expiré')
    }

    // Check if OTP is expired
    const now = new Date()
    const expiresAt = new Date(otpRecord.expires_at)
    
    if (now > expiresAt) {
      // Mark as used to prevent reuse
      await supabase
        .from('otp_codes')
        .update({ used: true })
        .eq('id', otpRecord.id)
      
      throw new Error('Code OTP expiré')
    }

    // Mark OTP as used
    const { error: updateError } = await supabase
      .from('otp_codes')
      .update({ 
        used: true,
        verified_at: new Date().toISOString()
      })
      .eq('id', otpRecord.id)

    if (updateError) {
      console.error('Error marking OTP as used:', updateError)
    }

    // For login type, create or sign in the user
    let authResult = null
    if (type === 'login') {
      // Try to sign in the user or create if doesn't exist
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        email_confirm: true
      })

      if (authError && !authError.message.includes('already registered')) {
        console.error('Auth error:', authError)
      } else {
        authResult = authData
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Code OTP vérifié avec succès',
        verified: true,
        auth: authResult
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Error in verify-otp:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        verified: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})