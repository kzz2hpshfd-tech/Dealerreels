import { db } from "@/lib/db";

// Sends the seller's automatic "thanks for the interest" message the first
// time a shopper likes, comments on, or shares a given reel. Never fires
// more than once per shopper/video pair (checked via the videoId on
// Message, which is only ever set by this function), never fires for the
// seller's own actions on their own reel, and only fires for shoppers --
// colleagues liking each other's reels shouldn't get a sales pitch.
export async function sendAutoEngagementMessage(videoId: string, actingUserId: string) {
  const [video, actingUser] = await Promise.all([
    db.video.findUnique({ where: { id: videoId }, select: { id: true, model: true, sellerId: true } }),
    db.user.findUnique({ where: { id: actingUserId }, select: { role: true } }),
  ]);
  if (!video || !actingUser) return;
  if (actingUser.role !== "SHOPPER") return;
  if (video.sellerId === actingUserId) return;

  const already = await db.message.findFirst({
    where: { videoId: video.id, senderId: video.sellerId, recipientId: actingUserId },
    select: { id: true },
  });
  if (already) return;

  await db.message.create({
    data: {
      body: `Hey! Thanks for checking out our ${video.model}. Let me know if you'd like more info, pricing, or want to schedule a test drive.`,
      senderId: video.sellerId,
      recipientId: actingUserId,
      videoId: video.id,
    },
  });
}
