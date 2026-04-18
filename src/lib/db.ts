import { PrismaClient } from "@prisma/client";

declare global {
  var __centipedePrisma: PrismaClient | undefined;
}

export const prisma =
  global.__centipedePrisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__centipedePrisma = prisma;
}
