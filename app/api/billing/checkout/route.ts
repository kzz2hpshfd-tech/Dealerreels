import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStripeClient, getSeatPlan } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (user.role === "SHOPPER" || !user.dealershipId) {
    return NextResponse.json({ error: "Only dealership accounts can manage billing." }, { status: 403 });
  }

  const { planId } = await req.json();
  const plan = getSeatPlan(planId);
  if (!plan) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  try {
    const dealership = await db.dealership.findUnique({ where: { id: user.dealershipId } });
    if (!dealership) {
      return NextResponse.json({ error: "Dealership not found." }, { status: 404 });
    }

    const stripe = getStripeClient();
    const origin = req.nextUrl.origin;

    let customerId = dealership.stripeCustomerId ?? undefined;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: dealership.name,
        metadata: { dealershipId: dealership.id },
      });
      customerId = customer.id;
      await db.dealership.update({ where: { id: dealership.id }, data: { stripeCustomerId: customerId } });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `DealerReels -- ${plan.seats} seats` },
            unit_amount: plan.priceUsd * 100,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      metadata: { dealershipId: dealership.id, seats: String(plan.seats), planId: plan.id },
      subscription_data: {
        metadata: { dealershipId: dealership.id, seats: String(plan.seats), planId: plan.id },
      },
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/billing?checkout=cancelled`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err: any) {
    console.error("checkout error:", err);
    return NextResponse.json({ error: err.message || "Unknown server error" }, { status: 500 });
  }
}
