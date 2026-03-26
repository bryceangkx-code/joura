import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await createAdminClient()
    .from("user_profiles")
    .select("clerk_id, plan, stripe_customer_id, stripe_subscription_id, updated_at")
    .eq("clerk_id", userId)
    .maybeSingle();

  return NextResponse.json({ clerk_id: userId, profile: data });
}
