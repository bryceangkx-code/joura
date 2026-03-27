import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

const VALID_STATUSES = ["new", "saved", "applied", "interviewing", "offer", "rejected"] as const;
type JobStatus = (typeof VALID_STATUSES)[number];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const body = await req.json();
  const { status } = body as { status: JobStatus };

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId)
    .eq("user_id", userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status });
}
