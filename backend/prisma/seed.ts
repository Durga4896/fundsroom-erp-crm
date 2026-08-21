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
    passwordEnv: "ADMIN_PASSWORD",
    role: "ADMIN" as const,
  },
  {
    name: "Operations User",
    email: "operations@fundsroom.com",
    passwordEnv: "OPERATIONS_PASSWORD",
    role: "OPERATIONS" as const,
  },
  {
    name: "Sales User",
    email: "sales@fundsroom.com",
    passwordEnv: "SALES_PASSWORD",
    role: "SALES" as const,
  },
];

async function main() {
  for (const user of users) {
    const password = process.env[user.passwordEnv];

    if (!password) {
      throw new Error(`${user.passwordEnv} is not configured`);
    }

    const passwordHash = await bcrypt.hash(password, 12);

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