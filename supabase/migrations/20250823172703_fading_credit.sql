/*
  # Enable RLS and create policies for user_profiles table

  1. Security
    - Enable RLS on `user_profiles` table
    - Add policy for authenticated users to view their own profile
    - Add policy for authenticated users to create their own profile
    - Add policy for authenticated users to update their own profile

  This fixes the "permission denied for table users" error by allowing
  authenticated users to access their own profile data.
*/

-- Enable Row Level Security on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create policy for SELECT (Read Access)
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policy for INSERT (Create Access)
CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policy for UPDATE (Update Access)
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);