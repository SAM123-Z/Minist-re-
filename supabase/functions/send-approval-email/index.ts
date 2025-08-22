import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, subject, html, isApproval, gatewayCode, username, userType } = await req.json()

    // Configuration email (vous devrez configurer ces variables dans Supabase)
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    let emailContent = ''
    
    if (isApproval) {
      emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Inscription Approuvée - MINJEC</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb;">Ministère de la Jeunesse et de la Culture</h1>
              <h2 style="color: #16a34a;">Inscription Approuvée ✅</h2>
            </div>
            
            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p>Bonjour <strong>${username}</strong>,</p>
              <p>Nous avons le plaisir de vous informer que votre demande d'inscription en tant que <strong>${userType}</strong> a été approuvée par notre équipe administrative.</p>
            </div>
            
            <div style="background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h3 style="color: #1d4ed8; margin-bottom: 10px;">Votre Code de Passerelle</h3>
              <div style="font-size: 32px; font-weight: bold; color: #1d4ed8; letter-spacing: 4px; margin: 10px 0;">
                ${gatewayCode}
              </div>
              <p style="color: #1e40af; font-size: 14px;">Conservez précieusement ce code pour finaliser votre inscription</p>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-bottom: 10px;">📋 Prochaines Étapes :</h4>
              <ol style="color: #92400e;">
                <li>Connectez-vous à la plateforme avec votre email</li>
                <li>Saisissez le code de passerelle ci-dessus</li>
                <li>Finalisez votre profil</li>
                <li>Commencez à utiliser nos services</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Pour toute question, contactez-nous :<br>
                📧 admin@minjec.gov.dj | 📞 +253 21 35 26 14
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    } else {
      emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Inscription Rejetée - MINJEC</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb;">Ministère de la Jeunesse et de la Culture</h1>
              <h2 style="color: #dc2626;">Inscription Non Approuvée ❌</h2>
            </div>
            
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p>Bonjour <strong>${username}</strong>,</p>
              <p>Nous regrettons de vous informer que votre demande d'inscription n'a pas pu être approuvée à ce stade.</p>
            </div>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="color: #92400e; margin-bottom: 10px;">💡 Que faire maintenant ?</h4>
              <ul style="color: #92400e;">
                <li>Vérifiez que toutes vos informations sont correctes</li>
                <li>Assurez-vous d'avoir fourni tous les documents requis</li>
                <li>Contactez notre équipe pour plus d'informations</li>
                <li>Vous pouvez soumettre une nouvelle demande si nécessaire</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                Pour toute question ou recours, contactez-nous :<br>
                📧 admin@minjec.gov.dj | 📞 +253 21 35 26 14
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    // Envoi de l'email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'MINJEC <noreply@minjec.gov.dj>',
        to: [to],
        subject: subject,
        html: emailContent,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})