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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, dealershipId, newDealership } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
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
        },
      });
      resolvedDealershipId = dealership.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const initials = name
      .trim()
      .split(/\s+/)
      .map((p: string) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    await db.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: "SALESPERSON",
        avatarInitials: initials || null,
        dealershipId: resolvedDealershipId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("register error:", err);
    return NextResponse.json({ error: err.message || "Unknown server error" }, { status: 500 });
  }
}
