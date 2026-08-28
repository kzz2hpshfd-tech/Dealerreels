import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const [dealers, approvedCounts] = await Promise.all([
    db.user.findMany({
      where: { role: { in: ["SALESPERSON", "DEALERSHIP_ADMIN"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        verificationStatus: true,
        createdAt: true,
        dealership: { select: { id: true, name: true, city: true, state: true, seatLimit: true, trialEndsAt: true } },
        _count: { select: { videos: true } },
      },
    }),
    db.user.groupBy({
      by: ["dealershipId"],
      where: { role: { in: ["SALESPERSON", "DEALERSHIP_ADMIN"] }, verificationStatus: "APPROVED" },
      _count: { _all: true },
    }),
  ]);

  const approvedByDealership = new Map(approvedCounts.map((c) => [c.dealershipId, c._count._all]));
  const withSeats = dealers.map((d) => ({
    ...d,
    dealership: d.dealership
      ? { ...d.dealership, approvedSeats: approvedByDealership.get(d.dealership.id) ?? 0 }
      : null,
  }));

  return NextResponse.json({ dealers: withSeats });
}
