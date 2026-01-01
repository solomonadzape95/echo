-- RLS Policies Setup Script
-- This script creates basic RLS policies for all tables
-- Only run this AFTER enabling RLS with: bun run rls:enable
-- 
-- WARNING: These are basic policies. Adjust them based on your security requirements!

-- ============================================
-- VOTERS TABLE
-- ============================================
-- Allow users to read their own voter record
CREATE POLICY "Users can view own voter record"
  ON "voters" FOR SELECT
  USING (auth.uid()::text = id::text);

-- Allow users to update their own profile picture
CREATE POLICY "Users can update own profile"
  ON "voters" FOR UPDATE
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- ============================================
-- ADMINS TABLE
-- ============================================
-- Only admins can view admin records (requires service role or custom auth)
-- For server-side only access, you might want to disable RLS on this table
CREATE POLICY "Service role can manage admins"
  ON "admins" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ELECTIONS TABLE
-- ============================================
-- Public read access to elections
CREATE POLICY "Anyone can view elections"
  ON "elections" FOR SELECT
  USING (true);

-- Only service role can modify elections
CREATE POLICY "Service role can manage elections"
  ON "elections" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- OFFICES TABLE
-- ============================================
-- Public read access
CREATE POLICY "Anyone can view offices"
  ON "offices" FOR SELECT
  USING (true);

-- Service role only for modifications
CREATE POLICY "Service role can manage offices"
  ON "offices" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- CANDIDATES TABLE
-- ============================================
-- Public read access
CREATE POLICY "Anyone can view candidates"
  ON "candidates" FOR SELECT
  USING (true);

-- Service role only for modifications
CREATE POLICY "Service role can manage candidates"
  ON "candidates" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- TOKENS TABLE
-- ============================================
-- No public access - service role only
CREATE POLICY "Service role can manage tokens"
  ON "tokens" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- VOTES TABLE
-- ============================================
-- No public access - service role only
CREATE POLICY "Service role can manage votes"
  ON "votes" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- RECEIPTS TABLE
-- ============================================
-- Public read access for verification
CREATE POLICY "Anyone can verify receipts"
  ON "receipts" FOR SELECT
  USING (true);

-- Service role only for creation
CREATE POLICY "Service role can create receipts"
  ON "receipts" FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- RESULTS TABLE
-- ============================================
-- Public read access
CREATE POLICY "Anyone can view results"
  ON "results" FOR SELECT
  USING (true);

-- Service role only for modifications
CREATE POLICY "Service role can manage results"
  ON "results" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- REFRESH TOKENS TABLE
-- ============================================
-- No public access - service role only
CREATE POLICY "Service role can manage refresh tokens"
  ON "refresh_tokens" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- PASSWORD RESET TOKENS TABLE
-- ============================================
-- No public access - service role only
CREATE POLICY "Service role can manage password reset tokens"
  ON "password_reset_tokens" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- ISSUANCES TABLE
-- ============================================
-- Users can view their own issuances
CREATE POLICY "Users can view own issuances"
  ON "issuances" FOR SELECT
  USING (auth.uid()::text = "voter"::text);

-- Service role only for modifications
CREATE POLICY "Service role can manage issuances"
  ON "issuances" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- CLASSES TABLE
-- ============================================
-- Public read access
CREATE POLICY "Anyone can view classes"
  ON "classes" FOR SELECT
  USING (true);

-- Service role only for modifications
CREATE POLICY "Service role can manage classes"
  ON "classes" FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- MASTERLIST TABLE
-- ============================================
-- Public read access (for registration verification)
CREATE POLICY "Anyone can verify masterlist"
  ON "masterlist" FOR SELECT
  USING (true);

-- Service role only for modifications
CREATE POLICY "Service role can manage masterlist"
  ON "masterlist" FOR ALL
  USING (auth.role() = 'service_role');

