import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // Fetch all swiped job IDs for this user
  const { data: swipes, error: swipesError } = await supabase
    .from("job_swipes")
    .select("job_id")
    .eq("clerk_id", userId);

  if (swipesError) {
    return NextResponse.json({ error: swipesError.message }, { status: 500 });
  }

  const swipedIds = (swipes ?? []).map((s) => s.job_id);

  // Fetch jobs for this user, ordered by posted_date DESC, limit 50
  let query = supabase
    .from("jobs")
    .select("id, title, company, location, fit_score, fit_reason, job_url, job_description, job_type, status, posted_date")
    .eq("user_id", userId)
    .order("posted_date", { ascending: false })
    .limit(50);

  // Exclude swiped jobs only if there are any
  if (swipedIds.length > 0) {
    query = query.not("id", "in", `(${swipedIds.join(",")})`);
  }

  const { data: jobs, error: jobsError } = await query;

  if (jobsError) {
    return NextResponse.json({ error: jobsError.message }, { status: 500 });
  }

  return NextResponse.json({ jobs: jobs ?? [] });
}
