/*
  # Créer un compte administrateur par défaut

  1. Création d'un profil administrateur
    - Username: admin
    - User ID: admin-001
    - Type: admin

  2. Note importante
    - Ce compte doit être créé manuellement dans Supabase
    - L'email et le mot de passe doivent être configurés via l'interface Supabase Auth
*/

-- Insérer un profil administrateur (vous devrez remplacer l'UUID par celui généré lors de la création du compte)
-- Cette requête est un exemple - l'UUID réel sera généré par Supabase Auth

-- Exemple d'insertion (à adapter avec le vrai UUID après création du compte)
/*
INSERT INTO user_profiles (id, user_type, username, user_id_or_registration)
VALUES (
  'UUID_GENERE_PAR_SUPABASE_AUTH', -- Remplacer par l'UUID réel
  'admin',
  'admin',
  'admin-001'
);
*/

-- Pour créer le compte admin, suivez ces étapes :
-- 1. Allez dans Supabase Dashboard > Authentication > Users
-- 2. Cliquez sur "Add user"
-- 3. Utilisez ces informations :
--    Email: admin@minjec.gov.cm
--    Password: AdminMINJEC2024!
-- 4. Copiez l'UUID généré
-- 5. Exécutez la requête ci-dessus avec le bon UUID