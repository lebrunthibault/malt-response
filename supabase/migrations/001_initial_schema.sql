-- MaltResponse initial schema
-- Apply via: Supabase Dashboard > SQL Editor, or supabase db push

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
  daily_generation_count INTEGER NOT NULL DEFAULT 0,
  last_generation_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. AUTO-CREATE PROFILE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 3. DOCUMENTS TABLE
-- ============================================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('cv', 'past_response', 'profile_info', 'other')),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  extracted_text TEXT,
  extraction_status TEXT NOT NULL DEFAULT 'pending' CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_user_doc_type ON documents(user_id, doc_type);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own documents"
  ON documents
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 4. JOB OFFERS TABLE
-- ============================================================================

CREATE TABLE job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT NOT NULL,
  company_name TEXT,
  company_description TEXT,
  company_website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_offers_user_id ON job_offers(user_id);

ALTER TABLE job_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own job offers"
  ON job_offers
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 5. RESPONSES TABLE
-- ============================================================================

CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_offer_id UUID NOT NULL REFERENCES job_offers(id) ON DELETE CASCADE,
  generated_text TEXT NOT NULL,
  model_used TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  generation_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_responses_user_id ON responses(user_id);
CREATE INDEX idx_responses_job_offer_id ON responses(job_offer_id);

ALTER TABLE responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own responses"
  ON responses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
  ON responses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- 6. GENERATION LOGS TABLE
-- ============================================================================

CREATE TABLE generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  generation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, generation_date)
);

CREATE INDEX idx_generation_logs_user_date ON generation_logs(user_id, generation_date);

ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logs"
  ON generation_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. ATOMIC RATE LIMIT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_date DATE,
  p_max_count INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO generation_logs (user_id, generation_date, count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, generation_date)
  DO UPDATE SET count = generation_logs.count + 1
  RETURNING count INTO v_count;

  IF v_count > p_max_count THEN
    UPDATE generation_logs
    SET count = count - 1
    WHERE user_id = p_user_id AND generation_date = p_date;
    RETURN jsonb_build_object('allowed', false, 'remaining', 0);
  END IF;

  RETURN jsonb_build_object('allowed', true, 'remaining', p_max_count - v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. STORAGE BUCKET FOR USER DOCUMENTS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-documents', 'user-documents', false);

CREATE POLICY "Users can upload own files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'user-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
