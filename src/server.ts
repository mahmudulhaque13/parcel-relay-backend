import type { Server } from "node:http";

import app from "./app";
import config from "./app/config";
import { prisma } from "./app/lib/prisma";
import { seedAdmin } from "./app/utils/seed";

let server: Server;

const main = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("Connected to the database successfully.");

    await seedAdmin();

    server = app.listen(config.port, () => {
      console.log(
        `🚀 ParcelRelay API running on port ${config.port} [${config.node_env}]`,
      );
    });
  } catch (error) {
    console.error("Error starting the server:", error);

    await prisma.$disconnect();

    process.exit(1);
  }
};

function shutdown(signal: string): void {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  if (!server) {
    process.exit(0);
  }

  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  server.closeAllConnections?.();

  setTimeout(() => {
    console.error("Forced shutdown after timeout.");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));

process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);

  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);

  process.exit(1);
});

main();
