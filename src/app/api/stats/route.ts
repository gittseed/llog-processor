import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/config/supabase';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { data: stats, error } = await supabaseAdmin
      .from('log_stats')
      .select('*')
      .order('processed_at', { ascending: false });

    if (error) {
      console.error('Error fetching stats:', error);
      return NextResponse.json({ error: 'Failed to fetch stats' }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
    }

    return NextResponse.json(stats, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Error in stats route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
  }
}
