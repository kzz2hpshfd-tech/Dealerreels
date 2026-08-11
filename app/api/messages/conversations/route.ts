import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const messages = await db.message.findMany({
    where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const latestByPartner = new Map<string, (typeof messages)[number]>();
  for (const m of messages) {
    const partnerId = m.senderId === userId ? m.recipientId : m.senderId;
    if (!latestByPartner.has(partnerId)) latestByPartner.set(partnerId, m);
  }

  const partnerIds = [...latestByPartner.keys()];
  if (partnerIds.length === 0) {
    return NextResponse.json({ conversations: [] });
  }

  const [partners, unread] = await Promise.all([
    db.user.findMany({
      where: { id: { in: partnerIds } },
      select: { id: true, name: true, avatarInitials: true },
    }),
    db.message.groupBy({
      by: ["senderId"],
      where: { recipientId: userId, readAt: null, senderId: { in: partnerIds } },
      _count: { _all: true },
    }),
  ]);

  const partnerById = new Map(partners.map((p) => [p.id, p]));
  const unreadBySender = new Map(unread.map((u) => [u.senderId, u._count._all]));

  const conversations = partnerIds
    .map((id) => {
      const last = latestByPartner.get(id)!;
      const partner = partnerById.get(id);
      if (!partner) return null;
      return {
        user: partner,
        lastMessage: { body: last.body, createdAt: last.createdAt, fromMe: last.senderId === userId },
        unreadCount: unreadBySender.get(id) ?? 0,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime());

  return NextResponse.json({ conversations });
}
