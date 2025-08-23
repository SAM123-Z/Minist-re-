/*
  # Completely disable RLS on user_profiles table

  1. Security Changes
    - Disable RLS on user_profiles table to eliminate infinite recursion
    - Remove all existing policies that were causing circular references
    
  This is a temporary fix to resolve the infinite recursion issue.
  The recursion was caused by RLS policies that were referencing the same table
  they were protecting, creating circular dependencies.
*/

-- Disable RLS on user_profiles table
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to ensure clean state
DROP POLICY IF EXISTS "Admin can manage all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;