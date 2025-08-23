import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  type: 'admin_notification' | 'approval' | 'rejection';
  to: string;
  data: {
    username: string;
    email: string;
    userType: string;
    userIdOrRegistration: string;
    submissionDate?: string;
    gatewayCode?: string;
    rejectionReason?: string;
    adminPanelUrl?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, to, data }: EmailRequest = await req.json()

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY not configured')
    }

    let subject = ''
    let htmlContent = ''

    switch (type) {
      case 'admin_notification':
        subject = `🔔 Nouvelle demande d'inscription - ${data.userType} - ${data.username}`
        htmlContent = generateAdminNotificationHTML(data)
        break
        
      case 'approval':
        subject = `✅ Inscription approuvée - Code d'activation: ${data.gatewayCode}`
        htmlContent = generateApprovalHTML(data)
        break
        
      case 'rejection':
        subject = `❌ Demande d'inscription non approuvée`
        htmlContent = generateRejectionHTML(data)
        break
        
      default:
        throw new Error('Invalid email type')
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
        html: htmlContent,
      }),
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    const result = await res.json()

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.id,
        type: type 
      }),
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

function generateAdminNotificationHTML(data: any): string {
  const userTypeLabels: Record<string, string> = {
    'standard_user': 'Utilisateur Standard',
    'cdc_agent': 'Agent CDC',
    'association': 'Association',
    'admin': 'Administrateur'
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Nouvelle Demande d'Inscription</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #dc2626, #16a34a, #2563eb); padding: 20px; border-radius: 12px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">MINJEC - Nouvelle Demande</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Système de Gestion des Inscriptions</p>
        </div>
        
        <div style="background: #f8fafc; padding: 25px; border-radius: 12px; border-left: 4px solid #2563eb; margin-bottom: 25px;">
          <h2 style="color: #1d4ed8; margin: 0 0 20px 0; font-size: 20px;">📋 Détails de la demande</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151; width: 40%;">Nom d'utilisateur:</td>
              <td style="padding: 8px 0; color: #111827;">${data.username}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Email:</td>
              <td style="padding: 8px 0; color: #111827;">${data.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Type d'utilisateur:</td>
              <td style="padding: 8px 0; color: #111827;">
                <span style="background: #dbeafe; color: #1d4ed8; padding: 4px 8px; border-radius: 6px; font-size: 12px; font-weight: bold;">
                  ${userTypeLabels[data.userType] || data.userType}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">CIN National:</td>
              <td style="padding: 8px 0; color: #111827; font-family: monospace;">${data.userIdOrRegistration}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #374151;">Date de soumission:</td>
              <td style="padding: 8px 0; color: #111827;">${data.submissionDate || new Date().toLocaleDateString('fr-FR')}</td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.adminPanelUrl || 'https://your-admin-panel.com/requests'}" 
             style="display: inline-block; background: linear-gradient(135deg, #dc2626, #16a34a, #2563eb); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            🔍 Traiter la demande
          </a>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b; margin: 25px 0;">
          <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">⚡ Action requise</h3>
          <p style="color: #92400e; margin: 0; font-size: 14px;">
            Cette demande nécessite votre approbation. L'utilisateur sera notifié par email de votre décision.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            📧 admin@minjec.gov.dj | 📞 +253 21 35 26 14<br>
            Ministère de la Jeunesse et de la Culture - République de Djibouti
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateApprovalHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Inscription Approuvée</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #16a34a, #22c55e); padding: 25px; border-radius: 12px;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Inscription Approuvée</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Félicitations ${data.username}!</p>
        </div>
        
        <div style="background: #f0f9ff; padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 25px; border: 2px solid #0ea5e9;">
          <h2 style="color: #0c4a6e; margin: 0 0 15px 0; font-size: 22px;">🔑 Votre Code d'Activation</h2>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 15px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            <div style="font-size: 48px; font-weight: bold; color: #0c4a6e; letter-spacing: 8px; font-family: monospace; margin: 10px 0;">
              ${data.gatewayCode}
            </div>
          </div>
          <p style="color: #0c4a6e; margin: 15px 0 0 0; font-weight: 500;">
            ⚠️ Conservez précieusement ce code pour finaliser votre inscription
          </p>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">📋 Prochaines étapes</h3>
          <ol style="color: #92400e; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Connectez-vous à la plateforme avec votre email</li>
            <li style="margin-bottom: 8px;">Saisissez le code d'activation ci-dessus</li>
            <li style="margin-bottom: 8px;">Complétez votre profil utilisateur</li>
            <li style="margin-bottom: 8px;">Commencez à utiliser nos services</li>
          </ol>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-platform.com/login" 
             style="display: inline-block; background: linear-gradient(135deg, #16a34a, #22c55e); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            🚀 Accéder à la plateforme
          </a>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">💡 Besoin d'aide?</h4>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            Si vous rencontrez des difficultés, n'hésitez pas à contacter notre équipe support.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            📧 admin@minjec.gov.dj | 📞 +253 21 35 26 14<br>
            Ministère de la Jeunesse et de la Culture - République de Djibouti
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateRejectionHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Demande Non Approuvée</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px; background: linear-gradient(135deg, #dc2626, #ef4444); padding: 25px; border-radius: 12px;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Demande Non Approuvée</h1>
          <p style="color: white; margin: 10px 0 0 0; opacity: 0.9;">Ministère de la Jeunesse et de la Culture</p>
        </div>
        
        <div style="background: #fef2f2; padding: 25px; border-radius: 12px; border-left: 4px solid #dc2626; margin-bottom: 25px;">
          <p style="margin: 0 0 15px 0; font-size: 16px;">Bonjour <strong>${data.username}</strong>,</p>
          <p style="margin: 0; color: #374151;">
            Nous regrettons de vous informer que votre demande d'inscription n'a pas pu être approuvée à ce stade.
          </p>
        </div>
        
        ${data.rejectionReason ? `
        <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f87171;">
          <h3 style="color: #dc2626; margin: 0 0 10px 0; font-size: 16px;">📝 Raison du rejet</h3>
          <p style="color: #7f1d1d; margin: 0; font-style: italic;">
            "${data.rejectionReason}"
          </p>
        </div>
        ` : ''}
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">💡 Que faire maintenant?</h3>
          <ul style="color: #92400e; margin: 0; padding-left: 20px;">
            <li style="margin-bottom: 8px;">Vérifiez que toutes vos informations sont correctes et complètes</li>
            <li style="margin-bottom: 8px;">Assurez-vous d'avoir fourni tous les documents requis</li>
            <li style="margin-bottom: 8px;">Contactez notre équipe support pour obtenir des clarifications</li>
            <li style="margin-bottom: 8px;">Vous pouvez soumettre une nouvelle demande une fois les corrections apportées</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-platform.com/register" 
             style="display: inline-block; background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            🔄 Soumettre une nouvelle demande
          </a>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h4 style="color: #374151; margin: 0 0 10px 0; font-size: 16px;">📞 Support et Assistance</h4>
          <p style="color: #6b7280; margin: 0; font-size: 14px;">
            Notre équipe est disponible pour vous aider à comprendre les exigences et vous accompagner dans votre démarche.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            📧 admin@minjec.gov.dj | 📞 +253 21 35 26 14<br>
            Ministère de la Jeunesse et de la Culture - République de Djibouti
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}