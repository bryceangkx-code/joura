import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [{ count: jobsToday }, { data: fitData }, { count: appliedCount }, { count: savedCount }] =
    await Promise.all([
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", today.toISOString()),
      supabase.from("jobs").select("fit_score").eq("user_id", userId),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "applied"),
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "saved"),
    ]);

  const scores = (fitData ?? []).map((j) => j.fit_score).filter(Boolean);
  const avgFit = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  return NextResponse.json({
    jobsToday: jobsToday ?? 0,
    avgFit,
    appliedCount: appliedCount ?? 0,
    savedCount: savedCount ?? 0,
  });
}
