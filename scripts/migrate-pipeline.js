// Run: node scripts/migrate-pipeline.js
// Paste this SQL into the Supabase SQL editor instead:
//
// -- Extend status check constraint to include pipeline stages
// ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;
// ALTER TABLE jobs ADD CONSTRAINT jobs_status_check
//   CHECK (status IN ('new','saved','applied','interviewing','offer','rejected'));
//
// -- Optional: track when a job was applied to
// ALTER TABLE jobs ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ;
//
// -- Optional: user notes on each application
// ALTER TABLE jobs ADD COLUMN IF NOT EXISTS notes TEXT;

console.log("Paste the SQL above into the Supabase SQL editor at:");
console.log("https://supabase.com/dashboard/project/kzpykiohhpmtrvgsehkr/sql/new");
