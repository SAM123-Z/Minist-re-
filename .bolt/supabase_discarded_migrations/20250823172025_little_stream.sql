/*
  # Add RLS policies for user_profiles table

  1. Security
    - Enable RLS on `user_profiles` table
    - Add policy for authenticated users to view their own profile
    - Add policy for authenticated users to create their own profile
    - Add policy for authenticated users to update their own profile
*/

-- Enable RLS on user_profiles table
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow authenticated users to view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to update their own profile" ON user_profiles;

-- Create policy for SELECT operations
CREATE POLICY "Allow authenticated users to view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create policy for INSERT operations
CREATE POLICY "Allow authenticated users to create their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policy for UPDATE operations
CREATE POLICY "Allow authenticated users to update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);