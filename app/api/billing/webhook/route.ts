import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getStripeClient } from "@/lib/stripe";
import type Stripe from "stripe";

export const runtime = "nodejs";

// Seats are only ever granted here, off a signature-verified webhook
// event -- never off the client-side checkout redirect, which is just
// for UX and can't be trusted to actually mean payment succeeded.
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripeClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("webhook signature verification failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const dealershipId = session.metadata?.dealershipId;
        const seats = session.metadata?.seats;
        if (dealershipId && seats) {
          await db.dealership.update({
            where: { id: dealershipId },
            data: {
              seatLimit: parseInt(seats, 10),
              stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
              subscriptionStatus: "active",
            },
          });
        }
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const dealershipId = sub.metadata?.dealershipId;
        const seats = sub.metadata?.seats;
        if (dealershipId) {
          await db.dealership.update({
            where: { id: dealershipId },
            data: {
              subscriptionStatus: sub.status,
              ...(seats ? { seatLimit: parseInt(seats, 10) } : {}),
            },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const dealershipId = sub.metadata?.dealershipId;
        if (dealershipId) {
          await db.dealership.update({
            where: { id: dealershipId },
            data: { seatLimit: 0, subscriptionStatus: "canceled" },
          });
        }
        break;
      }
    }
  } catch (err: any) {
    console.error("webhook handling error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
