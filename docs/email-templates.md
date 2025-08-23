# Templates d'Email - Système d'Inscription

## 1. Notification Admin - Nouvelle Demande

**Objet:** 🔔 Nouvelle demande d'inscription - {userType} - {username}

**Template HTML:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Nouvelle Demande d'Inscription</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">MINJEC - Nouvelle Demande</h1>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
            <h2 style="color: #1d4ed8;">Détails de la demande</h2>
            <ul>
                <li><strong>Nom d'utilisateur:</strong> {username}</li>
                <li><strong>Email:</strong> {email}</li>
                <li><strong>Type:</strong> {userType}</li>
                <li><strong>CIN:</strong> {userIdOrRegistration}</li>
                <li><strong>Date:</strong> {submissionDate}</li>
            </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{adminPanelUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Traiter la demande
            </a>
        </div>
    </div>
</body>
</html>
```

## 2. Confirmation d'Approbation Utilisateur

**Objet:** ✅ Inscription approuvée - Code d'activation: {gatewayCode}

**Template HTML:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Inscription Approuvée</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #16a34a;">Inscription Approuvée ✅</h1>
        </div>
        
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center;">
            <h2 style="color: #1d4ed8;">Votre Code d'Activation</h2>
            <div style="font-size: 36px; font-weight: bold; color: #1d4ed8; letter-spacing: 6px; margin: 20px 0;">
                {gatewayCode}
            </div>
            <p style="color: #1e40af;">Utilisez ce code pour finaliser votre inscription</p>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e;">Prochaines étapes:</h3>
            <ol style="color: #92400e;">
                <li>Connectez-vous sur la plateforme</li>
                <li>Saisissez votre code d'activation</li>
                <li>Complétez votre profil</li>
                <li>Commencez à utiliser nos services</li>
            </ol>
        </div>
    </div>
</body>
</html>
```

## 3. Notification de Rejet

**Objet:** ❌ Demande d'inscription non approuvée

**Template HTML:**
```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Demande Non Approuvée</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626;">Demande Non Approuvée</h1>
        </div>
        
        <div style="background: #fef2f2; padding: 20px; border-radius: 8px;">
            <p>Bonjour <strong>{username}</strong>,</p>
            <p>Nous regrettons de vous informer que votre demande d'inscription n'a pas pu être approuvée.</p>
            
            {#if rejectionReason}
            <div style="background: #fee2e2; padding: 15px; border-radius: 6px; margin: 15px 0;">
                <strong>Raison:</strong> {rejectionReason}
            </div>
            {/if}
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e;">Que faire maintenant?</h3>
            <ul style="color: #92400e;">
                <li>Vérifiez vos informations</li>
                <li>Contactez notre support</li>
                <li>Soumettez une nouvelle demande si nécessaire</li>
            </ul>
        </div>
    </div>
</body>
</html>
```