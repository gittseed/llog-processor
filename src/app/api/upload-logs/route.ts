import { NextResponse } from 'next/server';
import { getLogQueue } from '@/config/queue';
import { supabaseAdmin as supabase } from '@/config/supabase';

// Increase body size limit for this route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '500mb'
    }
  }
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer in chunks to avoid memory issues
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;

    console.log(`Processing file: ${filename}, size: ${totalSize} bytes, chunks: ${totalChunks}`);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(totalSize, start + CHUNK_SIZE);
      const chunk = file.slice(start, end);
      const chunkBuffer = Buffer.from(await chunk.arrayBuffer());

      console.log(`Uploading chunk ${i + 1}/${totalChunks}, size: ${chunkBuffer.length} bytes`);

      const { error: uploadError } = await supabase.storage
        .from('logs')
        .upload(`${filename}_part${i}`, chunkBuffer, {
          contentType: 'text/plain',
          upsert: false
        });

      if (uploadError) {
        console.error(`Error uploading chunk ${i}:`, uploadError);
        // Clean up previously uploaded chunks
        for (let j = 0; j < i; j++) {
          await supabase.storage
            .from('logs')
            .remove([`${filename}_part${j}`]);
        }
        return NextResponse.json(
          { success: false, error: uploadError.message },
          { status: 500 }
        );
      }
    }

    // Get queue and add job
    const queue = await getLogQueue();
    const job = await queue.add('process-log', {
      filename,
      totalChunks,
      fileSize: totalSize
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      priority: Math.ceil(totalSize / 1024 / 1024) // Priority based on file size in MB
    });

    console.log(`Created job ${job.id} for file ${filename}`);

    return NextResponse.json({
      success: true,
      jobId: job.id,
      fileId: filename
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
