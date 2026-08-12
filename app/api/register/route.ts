import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || null
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { accountType, email, password } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (accountType === "shopper") {
      const { firstName, lastName, phone, smsConsent } = body;

      if (!firstName || typeof firstName !== "string") {
        return NextResponse.json({ error: "First name is required." }, { status: 400 });
      }
      if (!lastName || typeof lastName !== "string") {
        return NextResponse.json({ error: "Last name is required." }, { status: 400 });
      }
      const digitCount = typeof phone === "string" ? phone.replace(/\D/g, "").length : 0;
      if (digitCount < 10) {
        return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
      }
      if (!smsConsent) {
        return NextResponse.json(
          { error: "You must agree to the terms to be contacted at the phone number provided." },
          { status: 400 }
        );
      }

      const name = `${firstName} ${lastName}`.trim();
      await db.user.create({
        data: {
          name,
          firstName,
          lastName,
          phone,
          email,
          passwordHash,
          role: "SHOPPER",
          avatarInitials: initialsOf(name),
          smsConsentAt: new Date(),
          dealershipId: null,
        },
      });

      return NextResponse.json({ ok: true });
    }

    // Dealer / salesperson signup (default).
    const { name, dealershipId, newDealership } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }

    let resolvedDealershipId: string | undefined = dealershipId || undefined;

    if (!resolvedDealershipId) {
      if (!newDealership?.name || !newDealership?.city || !newDealership?.state) {
        return NextResponse.json(
          { error: "Pick a dealership, or provide a new dealership's name, city, and state." },
          { status: 400 }
        );
      }

      const baseSlug = slugify(newDealership.name);
      let slug = baseSlug;
      let suffix = 1;
      while (await db.dealership.findUnique({ where: { slug } })) {
        suffix += 1;
        slug = `${baseSlug}-${suffix}`;
      }

      const dealership = await db.dealership.create({
        data: {
          name: newDealership.name,
          slug,
          city: newDealership.city,
          state: newDealership.state,
          // Brand-new dealerships start paywalled at 0 seats -- they
          // need to subscribe (see /billing) before any of their
          // salespeople can be approved. Existing dealerships were left
          // at the schema's NULL/unlimited default by the migration and
          // are unaffected.
          seatLimit: 0,
        },
      });
      resolvedDealershipId = dealership.id;
    }

    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "SALESPERSON",
        avatarInitials: initialsOf(name),
        dealershipId: resolvedDealershipId,
        // New dealer accounts need review before they can post or
        // receive leads -- see /admin/dealers.
        verificationStatus: "PENDING",
      },
    });

    return NextResponse.json({ ok: true, pendingVerification: true });
  } catch (err: any) {
    console.error("register error:", err);
    return NextResponse.json({ error: err.message || "Unknown server error" }, { status: 500 });
  }
}
