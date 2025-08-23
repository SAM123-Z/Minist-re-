/*
  # Fix RLS INSERT policy for pending_users table

  1. Security Changes
    - Drop existing INSERT policy that may be too restrictive
    - Create new INSERT policy allowing anonymous users to submit registration requests
    - Ensure the policy allows both 'anon' and 'authenticated' roles to insert data

  2. Policy Details
    - Policy name: "Anyone can submit registration request"
    - Allows INSERT operations for both anon and authenticated users
    - Uses simple 'true' condition to allow all insertions
*/

-- Drop the existing INSERT policy if it exists
DROP POLICY IF EXISTS "Anyone can submit registration request" ON pending_users;

-- Create a new INSERT policy that allows anonymous users to submit registration requests
CREATE POLICY "Anyone can submit registration request"
  ON pending_users
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Ensure RLS is enabled on the table
ALTER TABLE pending_users ENABLE ROW LEVEL SECURITY;