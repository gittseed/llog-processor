import { Job } from 'bullmq';
import { supabaseAdmin } from '../config/supabase';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import https from 'https';
import { EventEmitter } from 'events';
import parseLogFile from '../utils/logParser';

const unlinkAsync = promisify(fs.unlink);

async function downloadFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`📥 Attempting to download from URL: ${url}`);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const fileStream = fs.createWriteStream(filePath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });

      fileStream.on('error', (err) => {
        fs.unlink(filePath, () => reject(err));
      });

      response.on('error', (err) => {
        fs.unlink(filePath, () => reject(err));
      });
    }).on('error', reject);
  });
}

export async function processLogFile(job: Job) {
  const { fileId, filePath } = job.data;
  const tempDir = path.join(process.cwd(), 'tmp');
  const tempFilePath = path.join(tempDir, `download_${fileId}`);

  try {
    // Create tmp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log(`🔄 Processing job: ${job.id}`);
    console.log(`📥 Getting signed URL for file: ${fileId}`);

    // Get signed URL for the file
    const { data: { signedUrl }, error: signedUrlError } = await supabaseAdmin
      .storage
      .from('logs')
      .createSignedUrl(`${fileId}`, 60);

    if (signedUrlError || !signedUrl) {
      throw new Error(`Failed to get signed URL: ${signedUrlError?.message}`);
    }

    console.log(`📥 Downloading file: ${fileId}`);
    await downloadFile(signedUrl, tempFilePath);
    console.log(`📥 Downloaded file to: ${tempFilePath}`);

    console.log(`📊 Processing file: ${fileId}`);
    
    // Create event emitter for progress updates
    const emitter = new EventEmitter();
    emitter.on('progress', async (data) => {
      await job.updateProgress(data);
    });
    
    const stats = await parseLogFile(tempFilePath, emitter);
    console.log(`📊 Parsed log stats:`, stats);

    // Store results in Supabase
    console.log('💾 Storing stats in Supabase...');
    const { data: statsData, error: insertError } = await supabaseAdmin
      .from('log_stats')
      .insert({
        file_id: fileId,
        error_count: stats.errors || 0,
        warning_count: stats.keywords.warning || 0,
        critical_count: stats.keywords.critical || 0,
        timeout_count: stats.keywords.timeout || 0,
        exception_count: stats.keywords.exception || 0,
        unique_ips: Array.from(stats.ipAddresses) || [],
        processed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to store stats:', insertError);
      throw new Error(`Failed to store stats: ${insertError.message}`);
    }
    console.log('✅ Stats stored successfully:', statsData);

    // Clean up temp file
    await unlinkAsync(tempFilePath);
    console.log(`✅ Successfully processed file: ${fileId}`);

    return stats;
  } catch (error) {
    console.error(`❌ Error processing file ${fileId}:`, error);
    // Clean up temp file on error
    if (fs.existsSync(tempFilePath)) {
      await unlinkAsync(tempFilePath).catch(console.error);
    }
    throw error;
  }
}
