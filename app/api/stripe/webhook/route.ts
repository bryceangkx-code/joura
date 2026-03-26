import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkId = session.metadata?.clerk_id;
      if (!clerkId) break;

      // Credit top-up: one-time payment with credits metadata
      if (session.mode === "payment" && session.metadata?.credits) {
        const creditsToAdd = parseInt(session.metadata.credits);
        if (!isNaN(creditsToAdd) && creditsToAdd > 0) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("credits")
            .eq("clerk_id", clerkId)
            .single();

          const currentCredits = (profile?.credits as number) ?? 0;

          await supabase
            .from("user_profiles")
            .update({ credits: currentCredits + creditsToAdd, updated_at: new Date().toISOString() })
            .eq("clerk_id", clerkId);

          console.log(`[stripe] credits top-up ${clerkId} +${creditsToAdd} → ${currentCredits + creditsToAdd}`);
        }
        break;
      }

      // Subscription checkout
      if (!session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId === process.env.STRIPE_PRICE_PREMIUM ? "premium" : "basic";

      await supabase.from("user_profiles").upsert(
        {
          clerk_id: clerkId,
          plan,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clerk_id" }
      );

      console.log(`[stripe] ${clerkId} → ${plan}`);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const clerkId = subscription.metadata?.clerk_id;
      if (!clerkId) break;

      const priceId = subscription.items.data[0]?.price.id;
      const plan = priceId === process.env.STRIPE_PRICE_PREMIUM ? "premium" : "basic";

      await supabase
        .from("user_profiles")
        .update({ plan, updated_at: new Date().toISOString() })
        .eq("clerk_id", clerkId);

      console.log(`[stripe] subscription updated ${clerkId} → ${plan}`);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const clerkId = subscription.metadata?.clerk_id;
      if (!clerkId) break;

      await supabase
        .from("user_profiles")
        .update({ plan: "free", stripe_subscription_id: null, updated_at: new Date().toISOString() })
        .eq("clerk_id", clerkId);

      console.log(`[stripe] subscription cancelled ${clerkId} → free`);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
