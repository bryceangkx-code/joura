import { createAdminClient } from "@/lib/supabase";
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

  const rows = jobs.map((job: Record<string, unknown>) => ({
    user_id: job.user_id,
    title: job.title,
    company: job.company,
    location: job.location ?? "Remote",
    job_type: job.job_type ?? "Full-time",
    fit_score: typeof job.fit_score === "number" ? job.fit_score : 0,
    status: "new",
    posted_date: job.posted_date ?? new Date().toISOString().split("T")[0],
  }));

  // Validate required fields
  for (const row of rows) {
    if (!row.user_id || !row.title || !row.company) {
      return NextResponse.json(
        { error: "Each job requires user_id, title, and company" },
        { status: 400 }
      );
    }
  }

  const { error, data } = await createAdminClient()
    .from("jobs")
    .insert(rows)
    .select("id, title, company");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ inserted: data?.length ?? 0, jobs: data });
}
