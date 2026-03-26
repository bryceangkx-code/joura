import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: jobId } = await params;
  const body = await req.json();
  const { direction } = body;

  // Validate direction
  if (!["left", "right", "super"].includes(direction)) {
    return NextResponse.json(
      { error: "Invalid direction. Must be 'left', 'right', or 'super'." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Handle 'super' direction: check and deduct credits
  if (direction === "super") {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("credits")
      .eq("clerk_id", userId)
      .maybeSingle();

    const credits = profile?.credits ?? 0;
    if (credits < 1) {
      return NextResponse.json(
        { error: "Not enough credits" },
        { status: 402 }
      );
    }

    // Deduct 1 credit
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ credits: credits - 1 })
      .eq("clerk_id", userId);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to deduct credits" },
        { status: 500 }
      );
    }
  }

  // Upsert into job_swipes
  const { error: swipeError } = await supabase
    .from("job_swipes")
    .upsert(
      {
        clerk_id: userId,
        job_id: jobId,
        direction,
      },
      { onConflict: "clerk_id,job_id" }
    );

  if (swipeError) {
    return NextResponse.json(
      { error: "Failed to record swipe" },
      { status: 500 }
    );
  }

  // If direction is 'right' or 'super', update job status to 'saved'
  if (direction === "right" || direction === "super") {
    const { error: statusError } = await supabase
      .from("jobs")
      .update({ status: "saved" })
      .eq("id", jobId)
      .eq("user_id", userId);

    if (statusError) {
      return NextResponse.json(
        { error: "Failed to update job status" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true });
}
