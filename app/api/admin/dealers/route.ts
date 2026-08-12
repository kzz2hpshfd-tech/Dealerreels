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

  const dealers = await db.user.findMany({
    where: { role: { in: ["SALESPERSON", "DEALERSHIP_ADMIN"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      verificationStatus: true,
      createdAt: true,
      dealership: { select: { id: true, name: true, city: true, state: true } },
      _count: { select: { videos: true } },
    },
  });

  return NextResponse.json({ dealers });
}
