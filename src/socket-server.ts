import { Server } from 'socket.io';
import { Worker, Queue, Job, QueueEvents } from 'bullmq';
import { getLogQueue } from './config/queue';

const PORT = 3001;

async function startSocketServer() {
  console.log(' Starting Socket.IO server on port', PORT);
  
  const io = new Server(PORT, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Track connected clients
  const connectedClients = new Set<string>();

  io.on('connection', (socket) => {
    connectedClients.add(socket.id);
    console.log(' Client connected:', socket.id);
    console.log(' Total connected clients:', connectedClients.size);
    
    socket.on('disconnect', () => {
      connectedClients.delete(socket.id);
      console.log(' Client disconnected:', socket.id);
      console.log(' Total connected clients:', connectedClients.size);
    });

    // Send initial connection success message
    const connectMessage = { 
      type: 'success',
      message: 'Connected to WebSocket server',
      timestamp: new Date().toISOString()
    };
    console.log(' Sending connect message:', connectMessage);
    socket.emit('processing.log', connectMessage);
  });

  // Initialize queue listeners
  try {
    const queue = await getLogQueue();
    console.log(' Queue connected, setting up listeners...');

    // Create QueueEvents instance
    const queueEvents = new QueueEvents('log-processing', {
      connection: queue.opts.connection
    });
    console.log(' Created QueueEvents instance');

    // Debug function to broadcast event
    const broadcastEvent = (eventName: string, data: any) => {
      console.log(` Broadcasting ${eventName}:`, data);
      io.emit('processing.log', {
        ...data,
        timestamp: data.timestamp || new Date().toISOString()
      });
    };

    // Listen for queue events
    queueEvents.on('waiting', ({ jobId }) => {
      console.log(' Job waiting:', jobId);
      broadcastEvent('processing.log', {
        type: 'info',
        message: `Job ${jobId} is waiting to be processed`
      });
    });

    queueEvents.on('active', ({ jobId, prev }) => {
      console.log(' Job active:', jobId);
      broadcastEvent('processing.log', {
        type: 'info',
        message: `Started processing job ${jobId}`
      });
    });

    queueEvents.on('progress', ({ jobId, data }) => {
      console.log(' Job progress:', jobId, data);
      broadcastEvent('processing.log', {
        type: 'info',
        message: `Processing progress: ${data}%`,
        progress: data
      });
    });

    // Listen for custom events
    queueEvents.on('added', ({ jobId, name, data }) => {
      console.log(' Queue event:', name, data);
      if (name === 'processing.log') {
        broadcastEvent('processing.log', data);
      }
    });

    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      console.log(' Job completed:', jobId, returnvalue);
      broadcastEvent('processing.log', {
        type: 'success',
        message: `Job ${jobId} completed successfully`,
        details: returnvalue
      });
    });

    queueEvents.on('failed', ({ jobId, failedReason }) => {
      console.log(' Job failed:', jobId, failedReason);
      broadcastEvent('processing.log', {
        type: 'error',
        message: `Job ${jobId} failed: ${failedReason}`,
        error: failedReason
      });
    });

    // Listen for worker events directly from the queue
    queue.on('error', (error: Error) => {
      console.error(' Queue error:', error);
      broadcastEvent('processing.log', {
        type: 'error',
        message: `Queue error: ${error.message}`
      });
    });

    // Subscribe to custom events
    queue.on('processing.log', (data: any) => {
      console.log(' Processing log:', data);
      broadcastEvent('processing.log', data);
    });

    console.log(' Queue listeners setup complete');
  } catch (error) {
    console.error(' Error setting up queue listeners:', error);
  }

  return io;
}

startSocketServer().catch(console.error);
