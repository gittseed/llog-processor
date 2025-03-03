import { NextResponse } from 'next/server';
import { getLogQueue } from '@/config/queue';
import { supabaseAdmin as supabase } from '@/config/supabase';

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

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name}`;

    // Upload to Supabase Storage with correct content type
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('logs')
      .upload(filename, buffer, {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message },
        { status: 500 }
      );
    }

    // Get queue and add job
    const queue = await getLogQueue();
    const job = await queue.add('process-log', {
      fileId: filename,
      filePath: uploadData.path
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      // Prioritize smaller files
      priority: Math.ceil(buffer.length / 1024 / 1024) // Priority based on file size in MB
    });

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
