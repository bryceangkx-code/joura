import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("clerk_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Generate a fresh signed URL for each resume (1 hour expiry)
  const withUrls = await Promise.all(
    (data ?? []).map(async (resume) => {
      const { data: signed } = await supabase.storage
        .from("resumes")
        .createSignedUrl(resume.file_url, 3600);
      return { ...resume, signed_url: signed?.signedUrl ?? null };
    })
  );

  return NextResponse.json(withUrls);
}
