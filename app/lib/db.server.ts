import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;
declare global {
  var __db: PrismaClient | undefined; // eslint-disable-line
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient();
  prisma.$connect();
} else {
  if (!global.__db) {
    global.__db = new PrismaClient({
      log: [
        { level: "query", emit: "event" },
        { level: "error", emit: "stdout" },
        { level: "warn", emit: "stdout" },
      ],
    });

    global.__db.$connect();
  }
  prisma = global.__db;
}

export { prisma };
