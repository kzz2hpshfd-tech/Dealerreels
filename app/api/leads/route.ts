import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Sellers view their own leads only -- the whole point is attribution
// to the specific salesperson whose reel generated the interest.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (user.role === "SHOPPER" || !user.dealershipId) {
    return NextResponse.json({ error: "Only dealership accounts have leads." }, { status: 403 });
  }

  const leads = await db.creditLead.findMany({
    where: { sellerId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      video: { select: { id: true, caption: true, model: true } },
    },
  });

  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as any;

  try {
    const { videoId, name, phone, email, notes } = await req.json();

    if (!videoId || typeof videoId !== "string") {
      return NextResponse.json({ error: "videoId is required." }, { status: 400 });
    }

    const video = await db.video.findUnique({ where: { id: videoId } });
    if (!video) {
      return NextResponse.json({ error: "Reel not found." }, { status: 404 });
    }

    const resolvedName = name || sessionUser?.name;
    const resolvedPhone = phone || sessionUser?.phone;
    if (!resolvedName || typeof resolvedName !== "string") {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    const digitCount = typeof resolvedPhone === "string" ? resolvedPhone.replace(/\D/g, "").length : 0;
    if (digitCount < 10) {
      return NextResponse.json({ error: "A valid phone number is required." }, { status: 400 });
    }

    const lead = await db.creditLead.create({
      data: {
        name: resolvedName,
        phone: resolvedPhone,
        email: email || sessionUser?.email || null,
        notes: notes || null,
        sellerId: video.sellerId,
        dealershipId: video.dealershipId,
        videoId: video.id,
        submittedById: sessionUser?.id ?? null,
      },
    });

    return NextResponse.json({ lead });
  } catch (err: any) {
    console.error("create lead error:", err);
    return NextResponse.json({ error: err.message || "Unknown server error" }, { status: 500 });
  }
}
