import app from './app';
import config from './app/config';
import { prisma } from './app/lib/prisma';
import { redisClient } from './app/lib/redis';
import { seedAdmin, seedDemoUsers } from './app/utils/seed';
import { startCronJobs } from './app/lib/cron';

const PORT = config.port;

const main = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('Connected to the database successfully.');

    await redisClient.connect();
    console.log('Redis Connected Successfully.');

    await seedAdmin();

    await seedDemoUsers();

    startCronJobs();

    app.listen(PORT, () => {
      console.log(`ParcelRelay API running on port ${PORT} [${config.node_env}]`);
    });
  } catch (error) {
    console.error('Error starting the server:', error);

    await prisma.$disconnect();
    process.exit(1);
  }
};

main();
