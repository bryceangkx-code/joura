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

  // Validate required fields up front
  for (const job of jobs) {
    const j = job as Record<string, unknown>;
    if (!j.user_id || !j.title || !j.company) {
      return NextResponse.json(
        { error: "Each job requires user_id, title, and company" },
        { status: 400 }
      );
    }
  }

  // Score and build rows in parallel
  const rows = await Promise.all(
    jobs.map(async (job: Record<string, unknown>) => {
      const title = String(job.title ?? "").replace(/^=+/, "").trim();
      const company = String(job.company ?? "").replace(/^=+/, "").trim();
      const jobType = String(job.job_type ?? "Full-time").replace(/^=+/, "").trim();
      const description = job.description ? String(job.description) : undefined;

      const fit_score = await scoreJob(title, company, jobType, description);

      return {
        user_id: job.user_id,
        title,
        company,
        location: String(job.location ?? "Remote").replace(/^=+/, "").trim(),
        job_type: jobType,
        fit_score,
        status: "new",
        posted_date: job.posted_date ?? new Date().toISOString().split("T")[0],
      };
    })
  );

  const { error, data } = await createAdminClient()
    .from("jobs")
    .insert(rows)
    .select("id, title, company, fit_score");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data?.length ?? 0, jobs: data });
}
