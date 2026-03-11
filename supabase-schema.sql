-- Your jobs table already exists. Just run the seed data below if you want sample jobs.
-- Replace 'your-clerk-user-id' with your actual Clerk user ID before running.

insert into jobs (user_id, title, company, location, fit_score, job_type, status, posted_date) values
  ('user_3Ak7gHCg6mlI1lPCsaqdsZjvGJA', 'Senior Product Designer', 'Stripe', 'Remote', 92, 'Full-time', 'new', now() - interval '2 days'),
  ('user_3Ak7gHCg6mlI1lPCsaqdsZjvGJA', 'UX Designer', 'Linear', 'San Francisco', 85, 'Full-time', 'new', now() - interval '3 days'),
  ('user_3Ak7gHCg6mlI1lPCsaqdsZjvGJA', 'Product Designer', 'Vercel', 'Remote', 78, 'Full-time', 'new', now() - interval '5 days'),
  ('user_3Ak7gHCg6mlI1lPCsaqdsZjvGJA', 'Design Systems Lead', 'GitHub', 'Remote', 71, 'Full-time', 'new', now() - interval '1 day'),
  ('user_3Ak7gHCg6mlI1lPCsaqdsZjvGJA', 'UX Researcher', 'Figma', 'New York', 64, 'Contract', 'new', now() - interval '7 days'),
  ('user_3Ak7gHCg6mlI1lPCsaqdsZjvGJA', 'Visual Designer', 'Notion', 'Remote', 55, 'Full-time', 'new', now() - interval '2 days');
