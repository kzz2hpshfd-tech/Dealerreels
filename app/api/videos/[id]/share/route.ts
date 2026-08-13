import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendAutoEngagementMessage } from "@/lib/autoMessage";

// Fired by the client after a successful share (native share sheet or
// clipboard copy) purely so a shopper sharing a reel counts as engagement
// -- there's nothing to persist about the share itself.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  await sendAutoEngagementMessage(params.id, userId).catch((err) => console.error("auto-message error:", err));
  return NextResponse.json({ ok: true });
}
