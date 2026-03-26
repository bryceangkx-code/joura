-- Add credits column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;

-- Track swipe decisions (left = reject, right = save, super = superlike)
CREATE TABLE IF NOT EXISTS job_swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT NOT NULL REFERENCES user_profiles(clerk_id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'super')),
  swiped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(clerk_id, job_id)
);

CREATE INDEX IF NOT EXISTS job_swipes_clerk_id_idx ON job_swipes(clerk_id);
CREATE INDEX IF NOT EXISTS job_swipes_job_id_idx ON job_swipes(job_id);

-- Store generated cover letters
CREATE TABLE IF NOT EXISTS cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT NOT NULL REFERENCES user_profiles(clerk_id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cover_letters_clerk_id_idx ON cover_letters(clerk_id);
