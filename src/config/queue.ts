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

    // Add event listeners for debugging
    logQueue.on('waiting', (jobId) => {
      console.log(' Job waiting:', jobId);
    });

    logQueue.on('active', (job) => {
      console.log(' Job active:', job.id);
    });

    logQueue.on('progress', (job, progress) => {
      console.log(' Job progress:', job.id, progress);
    });

    logQueue.on('completed', (job, result) => {
      console.log(' Job completed:', job.id, result);
    });

    logQueue.on('failed', (job, error) => {
      console.error(' Job failed:', job?.id, error);
    });

    logQueue.on('error', (error) => {
      console.error(' Queue error:', error);
    });

    // Listen for custom events
    logQueue.on('processing.log', (data) => {
      console.log(' Processing log:', data);
    });

    console.log(' Queue initialized with event listeners');
  }
  return logQueue;
}
