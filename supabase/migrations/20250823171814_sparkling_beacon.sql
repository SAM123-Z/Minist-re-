/*
  # Fix infinite recursion in user_profiles RLS policies

  1. Security Changes
    - Temporarily disable RLS on user_profiles table
    - Drop all existing policies that cause recursion
    - Re-enable RLS with simple, safe policies
    - Use only basic auth.uid() comparisons to avoid recursion

  This fixes the "infinite recursion detected in policy for relation user_profiles" error
  by removing all complex policy conditions and replacing them with simple ones.
*/

-- Disable RLS temporarily to break recursion
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Enable admin access to all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for users to own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users to own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admin can access all profiles" ON user_profiles;

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, safe policies that don't cause recursion
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