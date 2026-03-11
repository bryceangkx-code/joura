import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { job_description } = await req.json();

  if (!job_description?.trim()) {
    return NextResponse.json({ error: "Job description is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: resume } = await supabase
    .from("resumes")
    .select("file_url")
    .eq("id", id)
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("resumes")
    .download(resume.file_url);

  if (downloadError || !fileData) {
    return NextResponse.json({ error: "Failed to download resume" }, { status: 500 });
  }

  const base64Pdf = Buffer.from(await fileData.arrayBuffer()).toString("base64");

  try {
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
              source: { type: "base64", media_type: "application/pdf", data: base64Pdf },
            },
            {
              type: "text",
              text: `You are an expert ATS resume coach. Analyse this resume against the job description below and return ONLY a valid JSON object with no markdown, no explanation, no code fences.

JOB DESCRIPTION:
${job_description.slice(0, 3000)}

Return exactly this structure:
{
  "ats_score": <integer 0-100 representing how well the resume matches the job>,
  "missing_keywords": ["keyword1", "keyword2", "keyword3"],
  "bullet_rewrites": [
    {
      "original": "exact original bullet from the resume",
      "rewritten": "improved version tailored to the job description",
      "reason": "one sentence explaining the improvement"
    }
  ]
}

Rules:
- ats_score: score based on keyword match, relevant experience, and skills alignment
- missing_keywords: exactly 3 important keywords from the job description not in the resume
- bullet_rewrites: exactly 3 rewrites of existing resume bullets to better match the job

Return only the JSON object.`,
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
    const clean = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json({
      ats_score: typeof parsed.ats_score === "number" ? Math.min(100, Math.max(0, parsed.ats_score)) : 0,
      missing_keywords: Array.isArray(parsed.missing_keywords) ? parsed.missing_keywords.slice(0, 3) : [],
      bullet_rewrites: Array.isArray(parsed.bullet_rewrites) ? parsed.bullet_rewrites.slice(0, 3) : [],
    });
  } catch (err) {
    console.error("[polish] Claude error:", err);
    return NextResponse.json({ error: "Analysis failed. Please try again." }, { status: 500 });
  }
}
