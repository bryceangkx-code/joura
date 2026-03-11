import { auth } from "@clerk/nextjs/server";
import { scoreJob } from "@/lib/scoreJob";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, company, job_type, description } = await req.json();

  if (!title || !company) {
    return NextResponse.json({ error: "title and company are required" }, { status: 400 });
  }

  const fit_score = await scoreJob(title, company, job_type ?? "Full-time", description);

  return NextResponse.json({ fit_score });
}
