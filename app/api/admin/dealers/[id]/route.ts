import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const ALLOWED_STATUSES = ["PENDING", "APPROVED", "REJECTED"];

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  if (!user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }
  if (user.role !== "PLATFORM_ADMIN") {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { verificationStatus } = await req.json();
  if (!ALLOWED_STATUSES.includes(verificationStatus)) {
    return NextResponse.json({ error: `Status must be one of: ${ALLOWED_STATUSES.join(", ")}` }, { status: 400 });
  }

  const target = await db.user.findUnique({ where: { id: params.id } });
  if (!target) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  if (target.role === "SHOPPER") {
    return NextResponse.json({ error: "Shopper accounts aren't verified." }, { status: 400 });
  }

  // Approving beyond a dealership's paid seat count is blocked here --
  // this is the actual enforcement point for the paywall, not signup
  // itself (every dealer signup still lands as PENDING regardless of
  // seats; it's approval that requires an open seat). NULL seatLimit
  // means unlimited/exempt (existing dealerships from before the
  // paywall shipped).
  if (verificationStatus === "APPROVED" && target.dealershipId && target.verificationStatus !== "APPROVED") {
    const dealership = await db.dealership.findUnique({ where: { id: target.dealershipId } });
    if (dealership && dealership.seatLimit !== null) {
      const approvedCount = await db.user.count({
        where: {
          dealershipId: dealership.id,
          role: { in: ["SALESPERSON", "DEALERSHIP_ADMIN"] },
          verificationStatus: "APPROVED",
        },
      });
      if (approvedCount >= dealership.seatLimit) {
        return NextResponse.json(
          {
            error: `${dealership.name} has reached its seat limit (${approvedCount}/${dealership.seatLimit}). They need to purchase more seats before you can approve another account.`,
          },
          { status: 409 }
        );
      }
    }
  }

  const updated = await db.user.update({
    where: { id: params.id },
    data: { verificationStatus },
  });

  return NextResponse.json({ id: updated.id, verificationStatus: updated.verificationStatus });
}
