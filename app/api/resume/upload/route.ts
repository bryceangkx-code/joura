import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json({ error: "A PDF file is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const fileId = crypto.randomUUID();
  const storagePath = `${userId}/${fileId}.pdf`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("resumes")
    .upload(storagePath, buffer, { contentType: "application/pdf" });

  if (uploadError) {
    console.error("[resume upload] storage error:", uploadError);
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: signed } = await supabase.storage
    .from("resumes")
    .createSignedUrl(storagePath, 3600);

  const { data, error: dbError } = await supabase
    .from("resumes")
    .insert({ clerk_id: userId, file_name: file.name, file_url: storagePath })
    .select()
    .single();

  if (dbError) {
    console.error("[resume upload] db error:", dbError);
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  return NextResponse.json({ ...data, signed_url: signed?.signedUrl ?? null });
}
