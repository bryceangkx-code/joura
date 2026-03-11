import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: resume } = await supabase
    .from("resumes")
    .select("file_url")
    .eq("id", id)
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await supabase.storage.from("resumes").remove([resume.file_url]);
  await supabase.from("resumes").delete().eq("id", id);

  return NextResponse.json({ success: true });
}
