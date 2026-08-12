import Stripe from "stripe";

export function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing environment variable: STRIPE_SECRET_KEY");
  }
  return new Stripe(key);
}

export type SeatPlan = {
  id: string;
  seats: number;
  priceUsd: number;
};

// Fixed tiers only -- no arbitrary seat counts. Prices are sent to
// Stripe inline at checkout time (price_data) rather than pre-created
// Stripe Price objects, so there's nothing to set up in the Stripe
// dashboard beyond the account itself.
export const SEAT_PLANS: SeatPlan[] = [
  { id: "tier-25", seats: 25, priceUsd: 250 },
  { id: "tier-45", seats: 45, priceUsd: 450 },
];

export function getSeatPlan(planId: string): SeatPlan | undefined {
  return SEAT_PLANS.find((p) => p.id === planId);
}
