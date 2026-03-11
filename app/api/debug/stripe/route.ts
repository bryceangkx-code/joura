import { NextResponse } from "next/server";

export async function GET() {
  const basic = process.env.STRIPE_PRICE_BASIC ?? "";
  const premium = process.env.STRIPE_PRICE_PREMIUM ?? "";
  const secret = process.env.STRIPE_SECRET_KEY ?? "";
  const webhook = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  return NextResponse.json({
    STRIPE_PRICE_BASIC: basic ? basic.slice(0, 10) + "…" : "(not set)",
    STRIPE_PRICE_PREMIUM: premium ? premium.slice(0, 10) + "…" : "(not set)",
    STRIPE_SECRET_KEY: secret ? secret.slice(0, 10) + "…" : "(not set)",
    STRIPE_WEBHOOK_SECRET: webhook ? webhook.slice(0, 10) + "…" : "(not set)",
  });
}
