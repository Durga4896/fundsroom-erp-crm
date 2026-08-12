import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const users = [
  {
    name: "System Administrator",
    email: "admin@fundsroom.com",
    password: "Admin@12345",
    role: "ADMIN" as const,
  },
  {
    name: "Sales User",
    email: "sales@fundsroom.com",
    password: "Sales@12345",
    role: "SALES" as const,
  },
  {
    name: "Warehouse User",
    email: "warehouse@fundsroom.com",
    password: "Warehouse@12345",
    role: "WAREHOUSE" as const,
  },
  {
    name: "Accounts User",
    email: "accounts@fundsroom.com",
    password: "Accounts@12345",
    role: "ACCOUNTS" as const,
  },
];

async function main() {
  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 12);

    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
      },
    });

    console.log(`Created/updated: ${user.email}`);
  }

  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });