# Plan de Tests - Système d'Intégration Email

## 1. Tests unitaires

### A. Validation des données
```typescript
describe('Registration Form Validation', () => {
  test('should validate email format', () => {
    expect(validateEmail('invalid-email')).toBe(false);
    expect(validateEmail('valid@email.com')).toBe(true);
  });
  
  test('should validate password strength', () => {
    expect(validatePassword('weak')).toBe(false);
    expect(validatePassword('StrongPass123!')).toBe(true);
  });
  
  test('should validate CIN format', () => {
    expect(validateCIN('123456789')).toBe(true);
    expect(validateCIN('invalid')).toBe(false);
  });
});
```

### B. Fonctions de mapping
```typescript
describe('Data Mapping', () => {
  test('should map pending user to user profile', () => {
    const pendingUser = createMockPendingUser();
    const userProfile = mapToUserProfile(pendingUser);
    
    expect(userProfile.username).toBe(pendingUser.username);
    expect(userProfile.user_type).toBe(pendingUser.user_type);
  });
  
  test('should map CDC agent data correctly', () => {
    const pendingUser = createMockCDCAgent();
    const agentData = mapToCDCAgent(pendingUser);
    
    expect(agentData.department).toContain(pendingUser.additional_info.region);
  });
});
```

## 2. Tests d'intégration

### A. Flux complet d'inscription
```typescript
describe('Registration Flow Integration', () => {
  test('should complete standard user registration', async () => {
    // 1. Soumettre demande
    const response = await submitRegistration(mockStandardUser);
    expect(response.status).toBe('success');
    
    // 2. Vérifier stockage en DB
    const pendingUser = await getPendingUser(response.id);
    expect(pendingUser).toBeDefined();
    
    // 3. Approuver demande
    await approveUser(pendingUser.id);
    
    // 4. Vérifier création compte
    const userProfile = await getUserProfile(pendingUser.email);
    expect(userProfile.user_type).toBe('standard_user');
  });
  
  test('should handle CDC agent registration with location', async () => {
    const cdcAgent = mockCDCAgentWithLocation();
    
    const response = await submitRegistration(cdcAgent);
    await approveUser(response.id);
    
    const agent = await getCDCAgent(response.userId);
    expect(agent.department).toContain('Djibouti ville');
  });
});
```

### B. Tests d'email
```typescript
describe('Email Integration', () => {
  test('should send admin notification on new request', async () => {
    const mockEmailService = jest.fn();
    
    await submitRegistration(mockUser);
    
    expect(mockEmailService).toHaveBeenCalledWith({
      to: 'admin@minjec.gov.dj',
      template: 'admin-notification',
      data: expect.objectContaining({
        username: mockUser.username
      })
    });
  });
  
  test('should send approval email with gateway code', async () => {
    const pendingUser = await createPendingUser();
    const mockEmailService = jest.fn();
    
    await approveUser(pendingUser.id);
    
    expect(mockEmailService).toHaveBeenCalledWith({
      to: pendingUser.email,
      template: 'approval-notification',
      data: expect.objectContaining({
        gatewayCode: expect.stringMatching(/^\d{4}$/)
      })
    });
  });
});
```

## 3. Tests de performance

### A. Charge de demandes simultanées
```typescript
describe('Performance Tests', () => {
  test('should handle 100 concurrent registrations', async () => {
    const startTime = Date.now();
    
    const promises = Array.from({ length: 100 }, () => 
      submitRegistration(generateRandomUser())
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    expect(results.every(r => r.status === 'success')).toBe(true);
    expect(endTime - startTime).toBeLessThan(10000); // < 10s
  });
  
  test('should maintain email delivery rate under load', async () => {
    const emailsSent = [];
    
    // Simuler 50 approbations simultanées
    const approvals = Array.from({ length: 50 }, async () => {
      const user = await createPendingUser();
      await approveUser(user.id);
      emailsSent.push(user.email);
    });
    
    await Promise.all(approvals);
    
    // Vérifier que tous les emails ont été envoyés
    const deliveryRate = await checkEmailDeliveryRate(emailsSent);
    expect(deliveryRate).toBeGreaterThan(0.95); // > 95%
  });
});
```

## 4. Tests de sécurité

### A. Validation des permissions
```typescript
describe('Security Tests', () => {
  test('should prevent unauthorized access to admin functions', async () => {
    const regularUser = await createRegularUser();
    
    await expect(
      approveUser(pendingUserId, { user: regularUser })
    ).rejects.toThrow('Insufficient permissions');
  });
  
  test('should sanitize user input', async () => {
    const maliciousInput = {
      username: '<script>alert("xss")</script>',
      email: 'test@test.com',
      // ... autres champs
    };
    
    const response = await submitRegistration(maliciousInput);
    const storedUser = await getPendingUser(response.id);
    
    expect(storedUser.username).not.toContain('<script>');
  });
});
```

## 5. Tests de récupération d'erreurs

### A. Gestion des pannes
```typescript
describe('Error Recovery Tests', () => {
  test('should retry failed email sends', async () => {
    const mockEmailService = jest.fn()
      .mockRejectedValueOnce(new Error('Service unavailable'))
      .mockResolvedValueOnce({ success: true });
    
    await sendEmailWithRetry(mockEmailData);
    
    expect(mockEmailService).toHaveBeenCalledTimes(2);
  });
  
  test('should handle database connection loss', async () => {
    // Simuler perte de connexion DB
    mockDatabaseDown();
    
    const response = await submitRegistration(mockUser);
    
    // Devrait utiliser le stockage local temporaire
    expect(response.status).toBe('queued');
    
    // Restaurer connexion et vérifier sync
    mockDatabaseUp();
    await syncQueuedRequests();
    
    const syncedUser = await getPendingUser(response.id);
    expect(syncedUser).toBeDefined();
  });
});
```

## 6. Tests end-to-end (E2E)

### A. Parcours utilisateur complet
```typescript
describe('E2E Registration Flow', () => {
  test('complete user journey from request to activation', async () => {
    // 1. Utilisateur soumet demande
    await page.goto('/register');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toBeVisible();
    
    // 2. Admin reçoit notification et approuve
    await adminPage.goto('/admin/requests');
    await adminPage.click('.approve-button');
    
    // 3. Utilisateur reçoit email avec code
    const email = await getLastEmail('test@example.com');
    const gatewayCode = extractGatewayCode(email.body);
    
    // 4. Utilisateur se connecte avec le code
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="gatewayCode"]', gatewayCode);
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.dashboard')).toBeVisible();
  });
});
```

## 7. Critères de validation

### Métriques de succès
- **Taux de réussite des inscriptions:** > 99%
- **Temps de traitement moyen:** < 5 minutes
- **Taux de livraison des emails:** > 95%
- **Temps de réponse interface:** < 2 secondes
- **Disponibilité système:** > 99.5%

### Seuils d'alerte
- **Erreurs système:** > 1% des requêtes
- **Emails non livrés:** > 5% sur 1 heure
- **Demandes en attente:** > 100 pendant > 24h
- **Temps de réponse:** > 5 secondes