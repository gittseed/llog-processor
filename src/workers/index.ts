import { Worker } from 'bullmq'
import * as dotenv from 'dotenv'
import path from 'path'
import { getRedisClient } from '../config/redis'
import { processLogFile } from './logProcessor'
import { getLogQueue } from '../config/queue'
import { supabaseAdmin } from '../config/supabase'

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
    const { filename, totalChunks, fileSize } = job.data;
    
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
    
    // Download and combine chunks
    await job.updateProgress(10);
    await queue.emit('added', {
      name: 'processing.log',
      data: {
        type: 'info',
        message: '📥 Downloading file chunks...',
        timestamp: new Date().toISOString(),
        progress: 10
      }
    });

    let combinedContent = '';
    for (let i = 0; i < totalChunks; i++) {
      const chunkProgress = 10 + Math.round((i / totalChunks) * 20); // Progress from 10% to 30%
      await job.updateProgress(chunkProgress);
      
      const { data, error } = await supabaseAdmin.storage
        .from('logs')
        .download(`${filename}_part${i}`);

      if (error) {
        throw new Error(`Error downloading chunk ${i}: ${error.message}`);
      }

      const chunkText = await data.text();
      combinedContent += chunkText;

      await queue.emit('added', {
        name: 'processing.log',
        data: {
          type: 'info',
          message: `📥 Downloaded chunk ${i + 1}/${totalChunks}`,
          timestamp: new Date().toISOString(),
          progress: chunkProgress
        }
      });
    }
    
    // Process combined content
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
    
    const result = await processLogFile(job, combinedContent);
    
    // Clean up chunks
    await job.updateProgress(90);
    await queue.emit('added', {
      name: 'processing.log',
      data: {
        type: 'info',
        message: '🧹 Cleaning up temporary files...',
        timestamp: new Date().toISOString(),
        progress: 90
      }
    });

    for (let i = 0; i < totalChunks; i++) {
      await supabaseAdmin.storage
        .from('logs')
        .remove([`${filename}_part${i}`]);
    }
    
    // Store results in database
    const { error: dbError } = await supabaseAdmin
      .from('log_stats')
      .insert({
        file_id: filename,
        error_count: result.errors,
        warning_count: result.keywords?.warning || 0,
        critical_count: result.keywords?.critical || 0,
        timeout_count: result.keywords?.timeout || 0,
        exception_count: result.keywords?.exception || 0,
        unique_ips: Array.from(result.ipAddresses || []),
        processed_at: new Date().toISOString()
      });

    if (dbError) {
      throw new Error(`Error storing results: ${dbError.message}`);
    }
    
    // Final success
    await job.updateProgress(100);
    await queue.emit('added', {
      name: 'processing.log',
      data: {
        type: 'success',
        message: '✅ File processing completed successfully',
        timestamp: new Date().toISOString(),
        progress: 100,
        details: result
      }
    });
    
    console.log(`✅ Job ${job.id} completed with result:`, result)
    return result;
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
  concurrency: 4,
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
