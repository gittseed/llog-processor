import { NextResponse } from 'next/server';
import { getLogQueue } from '@/config/queue';

export async function GET() {
  try {
    const queue = await getLogQueue();
    const counts = await queue.getJobCounts('active', 'completed', 'delayed', 'failed', 'waiting');

    return NextResponse.json({
      active: counts.active || 0,
      completed: counts.completed || 0,
      delayed: counts.delayed || 0,
      failed: counts.failed || 0,
      waiting: counts.waiting || 0
    });
  } catch (error) {
    console.error('Error fetching queue status:', error);
    return NextResponse.json({ error: 'Failed to fetch queue status' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
