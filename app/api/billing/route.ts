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
  if (user.role === "SHOPPER" || !user.dealershipId) {
    return NextResponse.json({ error: "Only dealership accounts have billing." }, { status: 403 });
  }

  const dealership = await db.dealership.findUnique({ where: { id: user.dealershipId } });
  if (!dealership) {
    return NextResponse.json({ error: "Dealership not found." }, { status: 404 });
  }

  const approvedSeats = await db.user.count({
    where: {
      dealershipId: dealership.id,
      role: { in: ["SALESPERSON", "DEALERSHIP_ADMIN"] },
      verificationStatus: "APPROVED",
    },
  });

  return NextResponse.json({
    dealershipName: dealership.name,
    seatLimit: dealership.seatLimit, // null = unlimited/exempt
    approvedSeats,
    subscriptionStatus: dealership.subscriptionStatus,
  });
}
