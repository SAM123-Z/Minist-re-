import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OtpRequest {
  email: string;
  type?: 'login' | 'registration' | 'password_reset' | 'approval';
  customOtp?: string;
  username?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, type = 'login', customOtp, username }: OtpRequest = await req.json()

    // Check if email configuration is available
    const MAIL_USERNAME = Deno.env.get('MAIL_USERNAME') || Deno.env.get('GMAIL_USER')
    const MAIL_PASSWORD = Deno.env.get('MAIL_PASSWORD') || Deno.env.get('GMAIL_APP_PASSWORD')
    
    if (!MAIL_USERNAME || !MAIL_PASSWORD) {
      console.warn('Email configuration missing - OTP cannot be sent')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Email configuration not available',
          code: 'EMAIL_CONFIG_MISSING'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }
    
    if (!email) {
      throw new Error('Email is required')
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate OTP (6-digit random number)
    const otp = customOtp || (type === 'approval' ? 
      Math.floor(1000 + Math.random() * 9000).toString() : // 4 chiffres pour approbation
      Math.floor(100000 + Math.random() * 900000).toString()) // 6 chiffres pour autres

    // Store OTP in database with expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    const { error: insertError } = await supabase
      .from('otp_codes')
      .upsert({
        email: email,
        otp_code: otp,
        type: type,
        expires_at: expiresAt.toISOString(),
        used: false,
        created_at: new Date().toISOString()
      }, {
        onConflict: 'email,type'
      })

    if (insertError) {
      console.error('Error storing OTP:', insertError)
      throw new Error('Failed to generate OTP')
    }

    // Send OTP via email
    try {
      const { error: emailError } = await supabase.functions.invoke('send-notification-email', {
        body: {
          type: type === 'approval' ? 'approval' : 'otp',
          to: email,
          data: {
            otp: otp,
            email: email,
            type: type,
            username: username,
            gatewayCode: otp
          }
        }
      })

      if (emailError) {
        console.error('Error sending OTP email:', emailError)
        // Don't fail the request if email fails, but log it
      }
    } catch (emailError) {
      console.error('Error calling email function:', emailError)
      // Continue without failing
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP envoyé avec succès',
        expires_in: 600 // 10 minutes in seconds
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('Error in send-otp:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})