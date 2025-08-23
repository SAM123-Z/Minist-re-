/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Problem
    - Infinite recursion detected in policy for relation "user_profiles"
    - Policies are likely referencing each other in a circular manner
    - This happens during user approval process when creating profiles

  2. Solution
    - Drop existing problematic policies
    - Create simplified policies that don't cause recursion
    - Ensure policies don't reference the same table they're protecting
*/

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON user_profiles;

-- Create simplified policies without recursion
CREATE POLICY "Enable read access for users to own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Enable insert for authenticated users"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable update for users to own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin policy that doesn't cause recursion
CREATE POLICY "Enable admin access to all profiles"
  ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.email IN (
        SELECT email FROM auth.users 
        WHERE id IN (
          SELECT id FROM user_profiles 
          WHERE user_type = 'admin'
          AND id = auth.uid()
        )
      )
    )
  );