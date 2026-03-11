import { createAdminClient } from "@/lib/supabase";
import { scoreJob } from "@/lib/scoreJob";
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

  // Validate required fields up front (using JSearch field names)
  for (const job of jobs) {
    const j = job as Record<string, unknown>;
    if (!j.user_id || !j.job_title || !j.employer_name) {
      console.log("[n8n webhook] validation failed for job:", JSON.stringify(j));
      return NextResponse.json(
        { error: "Each job requires user_id, job_title, and employer_name" },
        { status: 400 }
      );
    }
  }

  // Score and build rows in parallel
  const rows = await Promise.all(
    jobs.map(async (job: Record<string, unknown>) => {
      const title = String(job.job_title ?? "").replace(/^=+/, "").trim();
      const company = String(job.employer_name ?? "").replace(/^=+/, "").trim();
      const jobType = String(job.job_employment_type ?? "Full-time").replace(/^=+/, "").trim();
      const location = String(job.job_city ?? "Remote").replace(/^=+/, "").trim();
      const description = job.job_description ? String(job.job_description) : undefined;
      const postedDate = job.job_posted_at_datetime_utc
        ? String(job.job_posted_at_datetime_utc).split("T")[0]
        : new Date().toISOString().split("T")[0];

      console.log(`[n8n webhook] scoring: "${title}" at "${company}"`);
      let fit_score = 0;
      try {
        fit_score = await scoreJob(title, company, jobType, description);
        console.log(`[n8n webhook] score for "${title}": ${fit_score}`);
      } catch (err) {
        console.error(`[n8n webhook] scoring failed for "${title}":`, err);
      }

      return {
        user_id: job.user_id,
        title,
        company,
        location,
        job_type: jobType,
        fit_score,
        status: "new",
        posted_date: postedDate,
      };
    })
  );

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
