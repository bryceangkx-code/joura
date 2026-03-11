/**
 * Run once to create Stripe products + monthly prices.
 * Usage: npx tsx scripts/setup-stripe.ts
 *
 * Requires STRIPE_SECRET_KEY in your environment:
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/setup-stripe.ts
 *
 * Copy the printed price IDs into .env.local
 */
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function main() {
  console.log("Creating Stripe products and prices…\n");

  const basic = await stripe.products.create({
    name: "Joura Basic",
    description: "Access to job feed, fit scoring, and resume upload",
  });
  const basicPrice = await stripe.prices.create({
    product: basic.id,
    unit_amount: 1200, // $12.00
    currency: "usd",
    recurring: { interval: "month" },
  });

  const premium = await stripe.products.create({
    name: "Joura Premium",
    description: "Everything in Basic + AI Polish, AI fit scoring, resume rewrite",
  });
  const premiumPrice = await stripe.prices.create({
    product: premium.id,
    unit_amount: 2400, // $24.00
    currency: "usd",
    recurring: { interval: "month" },
  });

  console.log("✅ Done! Add these to your .env.local:\n");
  console.log(`STRIPE_PRICE_BASIC=${basicPrice.id}`);
  console.log(`STRIPE_PRICE_PREMIUM=${premiumPrice.id}`);
  console.log("\nThen set up your Stripe webhook and add:");
  console.log("STRIPE_SECRET_KEY=sk_live_or_test_...");
  console.log("STRIPE_WEBHOOK_SECRET=whsec_...");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
