import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  // Get file path from DB
  const { data: resume } = await supabase
    .from("resumes")
    .select("file_url, file_name")
    .eq("id", id)
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

  // Download PDF from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from("resumes")
    .download(resume.file_url);

  if (downloadError || !fileData) {
    console.error("[parse] download error:", downloadError);
    return NextResponse.json({ error: "Failed to download resume" }, { status: 500 });
  }

  const base64Pdf = Buffer.from(await fileData.arrayBuffer()).toString("base64");

  // Send to Claude Haiku for extraction
  let parsed: Record<string, unknown>;
  try {
    // Use beta API for PDF document support
    const response = await client.beta.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      betas: ["pdfs-2024-09-25"],
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Pdf,
              },
            },
            {
              type: "text",
              text: `Extract information from this resume and return ONLY a valid JSON object with no markdown, no explanation, no code fences.

Return exactly this structure:
{
  "full_name": "full name or null",
  "email": "email address or null",
  "current_job_title": "most recent job title or null",
  "skills": ["skill1", "skill2"],
  "years_of_experience": <integer estimate, or null if unclear>,
  "previous_roles": [
    {"title": "job title", "company": "company name"}
  ]
}

Return only the JSON object.`,
            },
          ],
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "{}";

    // Strip any accidental markdown fences
    const clean = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error("[parse] Claude error:", err);
    return NextResponse.json({ error: "Failed to parse resume with AI" }, { status: 500 });
  }

  return NextResponse.json({
    full_name: parsed.full_name ?? null,
    email: parsed.email ?? null,
    current_job_title: parsed.current_job_title ?? null,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    years_of_experience: typeof parsed.years_of_experience === "number" ? parsed.years_of_experience : null,
    previous_roles: Array.isArray(parsed.previous_roles) ? parsed.previous_roles : [],
  });
}
