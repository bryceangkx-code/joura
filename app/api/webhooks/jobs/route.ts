import { createAdminClient } from "@/lib/supabase";
import { scoreJob, UserProfile } from "@/lib/scoreJob";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Verify shared secret so only n8n can call this
  const secret = req.headers.get("x-webhook-secret");
  if (!secret || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  console.log("[n8n webhook] incoming body:", JSON.stringify(body, null, 2));

  // Accept a single job or an array
  const jobs = Array.isArray(body) ? body : [body];

  // Validate required fields up front (accepts both field name formats)
  for (const job of jobs) {
    const j = job as Record<string, unknown>;
    const hasTitle = j.title || j.job_title;
    const hasCompany = j.company || j.employer_name;
    if (!j.user_id || !hasTitle || !hasCompany) {
      console.log("[n8n webhook] validation failed for job:", JSON.stringify(j));
      return NextResponse.json(
        { error: "Each job requires user_id, and either title/job_title and company/employer_name" },
        { status: 400 }
      );
    }
  }

  // Fetch the user's profile once (all jobs in a batch share the same user_id)
  const userId = String((jobs[0] as Record<string, unknown>).user_id);
  let userProfile: UserProfile | undefined;
  let userPlan: string | undefined;
  let userJobTitle: string | undefined;
  try {
    const { data } = await createAdminClient()
      .from("user_profiles")
      .select("plan, job_title, skills, preferred_job_types, preferred_locations")
      .eq("clerk_id", userId)
      .maybeSingle();
    if (data) {
      userProfile = data;
      userPlan = data.plan ?? "free";
      userJobTitle = data.job_title ?? undefined;
      console.log("[n8n webhook] loaded user profile, plan:", userPlan, "skills:", data.skills);
    } else {
      console.log("[n8n webhook] no user profile found, using fallback scoring");
    }
  } catch (err) {
    console.error("[n8n webhook] failed to fetch user profile:", err);
  }

  // Score and build rows sequentially
  const rows = [];
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i] as Record<string, unknown>;
    const title = String(job.title || job.job_title || "").replace(/^=+/, "").trim();
    const company = String(job.company || job.employer_name || "").replace(/^=+/, "").trim();
    const jobType = String(job.job_type || job.job_employment_type || "Full-time").replace(/^=+/, "").trim();
    const location = String(job.location || job.job_city || "Remote").replace(/^=+/, "").trim();
    const description = job.description || job.job_description
      ? String(job.description || job.job_description).replace(/^=+/, "").trim()
      : undefined;
    const rawDate = job.posted_date || job.job_posted_at_datetime_utc;
    const postedDate = rawDate
      ? String(rawDate).split("T")[0]
      : new Date().toISOString().split("T")[0];
    const jobUrl = job.job_url || job.job_apply_link
      ? String(job.job_url || job.job_apply_link)
      : null;

    console.log(`[n8n webhook] scoring ${i + 1}/${jobs.length}: "${title}" at "${company}"`);
    let fit_score = 0;
    let fit_reason: string | null = null;
    try {
      const result = await scoreJob(title, company, jobType, description, userProfile, userPlan, userJobTitle);
      fit_score = result.score;
      fit_reason = result.reason;
      console.log(`[n8n webhook] score for "${title}": ${fit_score}`);
    } catch (err) {
      console.error(`[n8n webhook] scoring failed for "${title}":`, err);
    }

    rows.push({
      user_id: job.user_id,
      title,
      company,
      location,
      job_type: jobType,
      fit_score,
      fit_reason,
      job_url: jobUrl,
      job_description: description ?? null,
      status: "new",
      posted_date: postedDate,
    });

    if (i < jobs.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log("[n8n webhook] inserting rows:", JSON.stringify(rows, null, 2));

  const { error, data } = await createAdminClient()
    .from("jobs")
    .insert(rows)
    .select("id, title, company, fit_score");

  if (error) {
    console.error("[n8n webhook] Supabase insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[n8n webhook] inserted ${data?.length ?? 0} jobs`);
  return NextResponse.json({ inserted: data?.length ?? 0, jobs: data });
}
