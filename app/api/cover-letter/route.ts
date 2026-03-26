import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // Check plan — premium only
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("plan, job_title, skills")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (!profile || profile.plan !== "premium") {
    return NextResponse.json({ error: "Premium required" }, { status: 403 });
  }

  const { jobId, resumeId } = await request.json();

  // Fetch job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("title, company, location, job_description")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  // Optionally fetch resume name for context
  let resumeFileName: string | null = null;
  if (resumeId) {
    const { data: resume } = await supabase
      .from("resumes")
      .select("file_name")
      .eq("id", resumeId)
      .eq("clerk_id", userId)
      .maybeSingle();
    resumeFileName = resume?.file_name ?? null;
  }

  // Build prompt
  const prompt = `Write a compelling, concise cover letter for this job application.

Job Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Job Description: ${job.job_description ?? "Not provided"}

Candidate Profile:
- Current/target role: ${profile.job_title ?? "Not specified"}
- Skills: ${profile.skills?.join(", ") || "Not specified"}${resumeFileName ? `\n- Resume: ${resumeFileName}` : ""}

Write a 3-paragraph cover letter that:
1. Opens with genuine interest in this specific role and company
2. Highlights 2-3 relevant skills/experiences matching the JD
3. Closes with a confident call to action

Keep it under 300 words. Do not include a header/date/address block. Start with "Dear Hiring Manager,"`;

  // Call Claude Haiku
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let message;
  try {
    message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (aiError) {
    console.error("[cover-letter] Claude API error:", aiError);
    return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
  }

  const firstBlock = message.content[0];
  if (!firstBlock || firstBlock.type !== "text") {
    console.error("[cover-letter] Unexpected Claude response content:", message.content);
    return NextResponse.json({ error: "AI returned unexpected response" }, { status: 502 });
  }
  const content = firstBlock.text;

  // Save to cover_letters
  const { data: saved, error: insertError } = await supabase
    .from("cover_letters")
    .insert({
      clerk_id: userId,
      job_id: jobId,
      resume_id: resumeId ?? null,
      content,
    })
    .select("id")
    .single();

  if (insertError || !saved) {
    return NextResponse.json({ error: "Failed to save cover letter" }, { status: 500 });
  }

  return NextResponse.json({ id: saved.id, content });
}
