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

  // Enforce premium plan
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("plan, job_title, skills, years_experience")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (profile?.plan !== "premium") {
    return NextResponse.json({ error: "Premium plan required" }, { status: 403 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("title, company, location, job_type")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const candidateContext = [
    `Title: ${profile.job_title ?? "Not specified"}`,
    `Skills: ${(profile.skills ?? []).join(", ") || "Not specified"}`,
    `Experience: ${profile.years_experience ?? "Unknown"} years`,
  ].join("\n");

  const jobContext = [
    `Job Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    `Type: ${job.job_type}`,
  ].join("\n");

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 128,
    messages: [
      {
        role: "user",
        content: `Score how well this candidate matches this job. Return ONLY valid JSON: {"score": <integer 0-100>, "reason": "<one concise sentence>"}

CANDIDATE:
${candidateContext}

JOB:
${jobContext}`,
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "{}";
  const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const { score, reason } = JSON.parse(cleaned);
  const fitScore = Math.min(100, Math.max(0, Math.round(score)));
  const fitReason: string | null = reason ?? null;

  await supabase
    .from("jobs")
    .update({ fit_score: fitScore, fit_reason: fitReason })
    .eq("id", id)
    .eq("user_id", userId);

  return NextResponse.json({ fit_score: fitScore, fit_reason: fitReason });
}
