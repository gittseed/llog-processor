import { NextResponse } from 'next/server';
import { Server } from 'socket.io';
import { getLogQueue } from '@/config/queue';

let io: Server | null = null;

// Initialize WebSocket server
const initSocket = async () => {
  if (!io) {
    // Create a new Socket.IO server
    io = new Server({
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    // Initialize queue listeners
    const queue = await getLogQueue();

    queue.on('active', async (job) => {
      io?.emit('job.active', {
        id: job.id,
        status: 'active',
        timestamp: new Date().toISOString()
      });
    });

    queue.on('completed', async (job, result) => {
      io?.emit('job.completed', {
        id: job.id,
        status: 'completed',
        result,
        timestamp: new Date().toISOString()
      });
    });

    queue.on('failed', async (job, error) => {
      io?.emit('job.failed', {
        id: job.id,
        status: 'failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    });

    queue.on('progress', async (job, progress) => {
      io?.emit('job.progress', {
        id: job.id,
        status: 'progress',
        progress,
        timestamp: new Date().toISOString()
      });
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    // Start listening on port 3001
    io.listen(3001);
  }
  return io;
};

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await initSocket();
    return new NextResponse('WebSocket server is running');
  } catch (error) {
    console.error('WebSocket error:', error);
    return new NextResponse('Failed to start WebSocket server', { status: 500 });
  }
}
