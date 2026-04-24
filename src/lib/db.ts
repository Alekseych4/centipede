import { PrismaClient } from "@prisma/client";
import { optionalEnv } from "./env";

declare global {
  var __centipedePrisma: PrismaClient | undefined;
}

const datasourceUrl = optionalEnv("DATABASE_URL");

export const prisma =
  global.__centipedePrisma ||
  new PrismaClient({
    ...(datasourceUrl ? { datasourceUrl } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") {
  global.__centipedePrisma = prisma;
}
