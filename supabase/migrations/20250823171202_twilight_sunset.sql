/*
  # Remove RLS restriction for pending_users INSERT operations

  1. Changes
    - Drop existing INSERT policy that's blocking anonymous users
    - Create new unrestricted INSERT policy for anonymous registration
    - Ensure anonymous users can submit registration requests

  2. Security
    - Allow anonymous INSERT operations for registration
    - Maintain existing SELECT policies for data protection
    - Keep RLS enabled for other operations
*/

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Anyone can submit registration request" ON pending_users;
DROP POLICY IF EXISTS "Users can insert own profile" ON pending_users;

-- Create new INSERT policy that allows anonymous users
CREATE POLICY "Allow anonymous registration requests"
  ON pending_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;