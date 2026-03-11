import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await createAdminClient()
    .from("user_profiles")
    .select("*")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!data) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { job_title, skills, years_experience, preferred_job_types, preferred_locations } =
    await req.json();

  const { error } = await createAdminClient()
    .from("user_profiles")
    .upsert(
      {
        clerk_id: userId,
        job_title,
        skills,
        years_experience,
        preferred_job_types,
        preferred_locations,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "clerk_id" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
