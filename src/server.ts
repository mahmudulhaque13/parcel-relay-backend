import type { Server } from 'node:http';
import app from './app';
import { env } from './app/config/env';

let server: Server;

function bootstrap(): void {
  server = app.listen(env.PORT, () => {
    console.log(`🚀 ParcelRelay API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });
}

function shutdown(signal: string): void {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  if (!server) {
    process.exit(0);
  }

  server.close(() => process.exit(0));

  // Stop keeping idle keep-alive connections alive so close() can resolve.
  server.closeAllConnections?.();

  // Safety net: force-exit if connections do not drain in time.
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

bootstrap();
