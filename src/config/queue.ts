import { Queue } from 'bullmq';
import { getRedisClient } from './redis';

let logQueue: Queue | null = null;

export async function getLogQueue() {
  if (!logQueue) {
    logQueue = new Queue('log-processing', {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: {
          age: 3600,
          count: 1000
        },
        removeOnFail: {
          age: 24 * 3600 // Keep failed jobs for 24 hours
        }
      }
    });

    // Enable event subscription
    await logQueue.waitUntilReady();

  }
  return logQueue;
}
