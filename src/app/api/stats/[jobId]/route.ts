import { NextRequest, NextResponse } from 'next/server';
import { getLogQueue } from '@/config/queue';
import { supabaseAdmin } from '@/config/supabase';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Extract jobId from the request URL
    const url = new URL(request.url);
    const jobId = url.pathname.split('/').pop(); // Extract last segment

    if (!jobId) {
      return NextResponse.json({ error: 'Missing job ID' }, { status: 400 });
    }

    // Apply rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    const rateLimitResult = await rateLimit(ip, 'stats_job');

    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    // Get job from queue
    const queue = await getLogQueue();
    const job = await queue.getJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get job state and progress
    const [state, progress] = await Promise.all([
      job.getState(),
      job.progress
    ]);

    // Get stats from Supabase using the job's filename
    const { data: stats, error } = await supabaseAdmin
      .from('log_stats')
      .select('*')
      .eq('file_id', job.data.filename)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching stats:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }

    // Combine job info with stats
    const response = {
      id: job.id,
      state,
      progress,
      file_id: job.data.filename,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      attemptsMade: job.attemptsMade,
      error_count: stats?.error_count ?? 0,
      warning_count: stats?.warning_count ?? 0,
      critical_count: stats?.critical_count ?? 0,
      timeout_count: stats?.timeout_count ?? 0,
      exception_count: stats?.exception_count ?? 0,
      unique_ips: stats?.unique_ips ?? []
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching job stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
