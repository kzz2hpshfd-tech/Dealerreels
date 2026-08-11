import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const dealership = await db.dealership.upsert({
    where: { slug: "demo-cdjr" },
    update: {},
    create: {
      name: "Demo Chrysler Dodge Jeep Ram",
      slug: "demo-cdjr",
      city: "Austin",
      state: "TX",
      creditApplyUrl: "https://example.com/apply",
    },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const user = await db.user.upsert({
    where: { email: "demo@dealerreels.com" },
    update: {},
    create: {
      name: "Demo Salesperson",
      email: "demo@dealerreels.com",
      passwordHash,
      role: "SALESPERSON",
      avatarInitials: "DS",
      dealershipId: dealership.id,
    },
  });

  console.log("Seeded dealership:", dealership.name);
  console.log("Seeded user:", user.email, "(password: password123)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
