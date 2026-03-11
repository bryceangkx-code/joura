import Stripe from "stripe";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { plan } = await req.json();
  const priceId =
    plan === "premium"
      ? process.env.STRIPE_PRICE_PREMIUM
      : process.env.STRIPE_PRICE_BASIC;

  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan or Stripe price not configured" }, { status: 400 });
  }

  // Derive origin from the request so this works on localhost + production without an env var
  const host = req.headers.get("host") ?? "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  const origin = `${proto}://${host}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=1`,
    cancel_url: `${origin}/pricing`,
    metadata: { clerk_id: userId },
    subscription_data: {
      metadata: { clerk_id: userId },
    },
  });

  return NextResponse.json({ url: session.url });
}
