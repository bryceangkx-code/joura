import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { NextResponse } from "next/server";

const CREDIT_PACKS = {
  starter: { credits: 5, price: 499 },
  value: { credits: 15, price: 999 },
  power: { credits: 40, price: 1999 },
} as const;

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { pack } = body;

  if (!pack || !(pack in CREDIT_PACKS)) {
    return NextResponse.json({ error: "Invalid pack. Must be one of: starter, value, power" }, { status: 400 });
  }

  const packKey = pack as keyof typeof CREDIT_PACKS;
  const selectedPack = CREDIT_PACKS[packKey];

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch existing stripe_customer_id
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id")
    .eq("clerk_id", userId)
    .single();

  let customerId = profile?.stripe_customer_id as string | undefined;

  // Create Stripe customer if none exists
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerk_id: userId },
    });
    customerId = customer.id;

    await supabase
      .from("user_profiles")
      .update({ stripe_customer_id: customerId })
      .eq("clerk_id", userId);
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: selectedPack.price,
          product_data: {
            name: `Joura Superlike Credits — ${selectedPack.credits} pack`,
          },
        },
      },
    ],
    metadata: {
      clerk_id: userId,
      credits: String(selectedPack.credits),
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/swipe?credits=added`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/swipe`,
  });

  return NextResponse.json({ url: session.url });
}
