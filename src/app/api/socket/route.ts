import { Server } from 'socket.io';
import { getLogQueue } from '@/config/queue';

let io: Server | null = null;

const initSocket = async () => {
  if (!io) {
    console.log('Initializing Socket.IO server...');
    
    io = new Server(3001, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });

      // Send initial connection success message
      socket.emit('init', { status: 'connected', socketId: socket.id });
    });

    // Initialize queue listeners
    try {
      const queue = await getLogQueue();
      console.log('Queue connected, setting up listeners...');

      queue.on('active', async (job) => {
        console.log('Emitting job.active:', job.id);
        io?.emit('job.active', {
          id: job.id,
          status: 'active',
          timestamp: new Date().toISOString()
        });
      });

      queue.on('completed', async (job, result) => {
        console.log('Emitting job.completed:', job.id);
        io?.emit('job.completed', {
          id: job.id,
          status: 'completed',
          result,
          timestamp: new Date().toISOString()
        });
      });

      queue.on('failed', async (job, error) => {
        console.error('Emitting job.failed:', job.id, error);
        io?.emit('job.failed', {
          id: job.id,
          status: 'failed',
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });

      console.log('Queue listeners setup complete');
    } catch (error) {
      console.error('Error setting up queue listeners:', error);
    }
  }
  return io;
};

export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response('Socket server is running on port 3001', { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST',
    }
  });
}
