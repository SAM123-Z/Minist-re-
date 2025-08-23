/*
  # Rebuild user_profiles RLS policies to fix infinite recursion

  1. Security Changes
    - Drop all existing policies that cause recursion
    - Create simple, non-recursive policies
    - Use direct auth.uid() comparisons only
    - Avoid any subqueries that reference user_profiles table

  2. New Policies
    - Simple user access to own profile
    - Simple insert for authenticated users
    - Simple update for own profile
    - Direct admin access without recursion
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Enable admin access to all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for users to own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users to own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON user_profiles;

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Simple admin policy using direct email check without subqueries
CREATE POLICY "Admin can manage all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@ministry.gov'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email = 'admin@ministry.gov'
    )
  );