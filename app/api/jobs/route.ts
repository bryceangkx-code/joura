import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("plan")
    .eq("clerk_id", userId)
    .maybeSingle();

  const plan = (profile?.plan ?? "free") as "free" | "basic" | "premium";

  const { data: allJobs, error } = await supabase
    .from("jobs")
    .select("id, title, company, location, fit_score, fit_reason, job_type, status, posted_date")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const jobs = allJobs ?? [];

  // Free plan: cap at 3 jobs, hide fit scores
  if (plan === "free") {
    return NextResponse.json({
      jobs: jobs.slice(0, 3).map((j) => ({ ...j, fit_score: null })),
      plan,
      totalCount: jobs.length,
    });
  }

  return NextResponse.json({ jobs, plan, totalCount: jobs.length });
}
