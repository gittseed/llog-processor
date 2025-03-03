import { Worker } from 'bullmq'
import * as dotenv from 'dotenv'
import path from 'path'
import { getRedisClient } from '../config/redis'
import { processLogFile } from './logProcessor'
import { getLogQueue } from '../config/queue'

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

// Verify environment variables are loaded
const requiredEnvVars = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
}

console.log('🔧 Environment check:', {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌',
  redisHost: process.env.REDIS_HOST ? '✅' : '❌',
  redisPort: process.env.REDIS_PORT ? '✅' : '❌'
})

console.log('🚀 Starting log processor worker...')

const worker = new Worker('log-processing', async (job) => {
  console.log(`📝 Processing job ${job.id}...`, job.data)
  
  try {
    const queue = await getLogQueue();
    
    // Initial job state
    await job.updateProgress(0);
    await queue.emit('added', {
      name: 'processing.log',
      data: {
        type: 'info',
        message: '📝 Starting file processing...',
        timestamp: new Date().toISOString(),
        progress: 0
      }
    });
    
    // Getting signed URL
    await job.updateProgress(10);
    await queue.emit('added', {
      name: 'processing.log',
      data: {
        type: 'info',
        message: '📥 Getting signed URL for file...',
        timestamp: new Date().toISOString(),
        progress: 10
      }
    });
    
    // Processing file
    await job.updateProgress(30);
    await queue.emit('added', {
      name: 'processing.log',
      data: {
        type: 'info',
        message: '🔄 Processing file contents...',
        timestamp: new Date().toISOString(),
        progress: 30
      }
    });
    
    const result = await processLogFile(job);
    
    // Storing results
    await job.updateProgress(90);
    await queue.emit('added', {
      name: 'processing.log',
      data: {
        type: 'info',
        message: '💾 Storing results in database...',
        timestamp: new Date().toISOString(),
        progress: 90
      }
    });
    
    // Final success
    await job.updateProgress(100);
    await queue.emit('added', {
      name: 'processing.log',
      data: {
        type: 'success',
        message: '✅ File processing completed successfully',
        timestamp: new Date().toISOString(),
        progress: 100,
        details: {
          errors: result.errors,
          keywords: {
            error: result.keywords?.error || 0,
            warning: result.keywords?.warning || 0,
            critical: result.keywords?.critical || 0,
            timeout: result.keywords?.timeout || 0,
            exception: result.keywords?.exception || 0
          },
          ipAddresses: Array.from(result.ipAddresses || [])
        }
      }
    });
    
    console.log(`✅ Job ${job.id} completed with result:`, result)
    return {
      errors: result.errors,
      keywords: {
        error: result.keywords?.error || 0,
        warning: result.keywords?.warning || 0,
        critical: result.keywords?.critical || 0,
        timeout: result.keywords?.timeout || 0,
        exception: result.keywords?.exception || 0
      },
      ipAddresses: Array.from(result.ipAddresses || [])
    };
  } catch (error) {
    console.error(`❌ Job ${job.id} failed:`, error)
    const queue = await getLogQueue();
    await queue.emit('added', {
      name: 'processing.log',
      data: {
        type: 'error',
        message: `❌ Error: ${error.message}`,
        timestamp: new Date().toISOString()
      }
    });
    throw error
  }
}, {
  connection: getRedisClient(),
  concurrency: 1,
  removeOnComplete: {
    age: 3600,
    count: 1000
  },
  removeOnFail: {
    age: 24 * 3600 // Keep failed jobs for 24 hours
  }
})

worker.on('ready', () => {
  console.log('✅ Worker ready to process jobs')
})

worker.on('active', async (job) => {
  console.log(`🏃‍♂️ Started processing job ${job.id}`)
  const queue = await getLogQueue();
  await queue.emit('added', {
    name: 'processing.log',
    data: {
      type: 'info',
      message: `🏃‍♂️ Started processing job ${job.id}`,
      timestamp: new Date().toISOString()
    }
  });
})

worker.on('completed', async (job, result) => {
  console.log(`✅ Job ${job.id} completed:`, result)
})

worker.on('failed', async (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err)
  const queue = await getLogQueue();
  await queue.emit('added', {
    name: 'processing.log',
    data: {
      type: 'error',
      message: `❌ Job ${job?.id} failed: ${err.message}`,
      timestamp: new Date().toISOString()
    }
  });
})

worker.on('error', async (err) => {
  console.error('❌ Worker error:', err)
  const queue = await getLogQueue();
  await queue.emit('added', {
    name: 'processing.log',
    data: {
      type: 'error',
      message: `❌ Worker error: ${err.message}`,
      timestamp: new Date().toISOString()
    }
  });
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down worker...')
  await worker.close()
})

process.on('SIGINT', async () => {
  console.log('Shutting down worker...')
  await worker.close()
})

export default worker
