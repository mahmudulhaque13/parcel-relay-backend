import cron from 'node-cron';
import { prisma } from '../lib/prisma';

export const cleanupExpiredRefreshSessions = async (): Promise<void> => {
  try {
    const result = await prisma.refreshSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (result.count > 0) {
      console.log(
        JSON.stringify({
          job: 'cleanup-expired-refresh-sessions',
          deleted: result.count,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        job: 'cleanup-expired-refresh-sessions',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      }),
    );
  }
};

export const startCronJobs = (): void => {
  cron.schedule('0 * * * *', async () => {
    await cleanupExpiredRefreshSessions();
  });

  console.log('Cron jobs started successfully.');
};
