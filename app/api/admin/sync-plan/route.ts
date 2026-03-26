import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  // Get existing profile to find stripe_customer_id
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("clerk_id", userId)
    .maybeSingle();

  let plan: "free" | "basic" | "premium" = "free";
  let stripeCustomerId = profile?.stripe_customer_id ?? null;
  let stripeSubscriptionId = profile?.stripe_subscription_id ?? null;

  if (stripeSubscriptionId) {
    // Check existing subscription
    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      if (sub.status === "active" || sub.status === "trialing") {
        const priceId = sub.items.data[0]?.price.id;
        plan = priceId === process.env.STRIPE_PRICE_PREMIUM ? "premium" : "basic";
      }
    } catch {
      // Subscription not found, fall through to search
    }
  }

  if (plan === "free" && stripeCustomerId) {
    // Search for active subscriptions under this customer
    const subs = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: "active",
      limit: 5,
    });
    const active = subs.data[0];
    if (active) {
      stripeSubscriptionId = active.id;
      const priceId = active.items.data[0]?.price.id;
      plan = priceId === process.env.STRIPE_PRICE_PREMIUM ? "premium" : "basic";
    }
  }

  // Upsert profile with correct plan
  await supabase.from("user_profiles").upsert(
    {
      clerk_id: userId,
      plan,
      ...(stripeCustomerId ? { stripe_customer_id: stripeCustomerId } : {}),
      ...(stripeSubscriptionId ? { stripe_subscription_id: stripeSubscriptionId } : {}),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "clerk_id" }
  );

  return NextResponse.json({ plan, stripeCustomerId, stripeSubscriptionId });
}
