import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const supabase = createAdminClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("status")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Toggle: unsave if already saved, don't downgrade if applied
  if (job.status === "applied") return NextResponse.json({ status: "applied" });
  const newStatus = job.status === "saved" ? "new" : "saved";

  const { error } = await supabase
    .from("jobs")
    .update({ status: newStatus })
    .eq("id", jobId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: newStatus });
}
