This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Log Processing Application

A Next.js application for processing and analyzing log files in real-time using WebSocket connections and Redis queue.

## Features

- Real-time log processing with WebSocket support
- Redis-backed job queue system
- Live status updates
- File upload with size and type validation
- Supabase integration for data storage

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# App Config
LOG_KEYWORDS=error,warning,critical
MAX_FILE_SIZE=1073741824  # 1GB in bytes
CONCURRENT_JOBS=4
RETRY_LIMIT=3

# WebSocket
NEXT_PUBLIC_SOCKET_URL=ws://localhost:3001
```

## Docker Setup

1. Build and start the containers:
```bash
docker-compose up --build
```

2. Access the application:
- Web UI: http://localhost:3000
- WebSocket: ws://localhost:3001
- Redis: localhost:6379

3. Stop the containers:
```bash
docker-compose down
```

To persist Redis data between restarts, data is automatically saved in a Docker volume.

## Development Setup

1. Install dependencies:
```bash
npm install
```

2. Start Redis locally:
```bash
docker-compose up redis -d
```

3. Run the development server:
```bash
npm run dev
```

## Architecture

- **Next.js Frontend**: Handles UI and file uploads
- **WebSocket Server**: Real-time communication for log processing updates
- **Redis Queue**: Manages log processing jobs
- **Supabase**: Stores processing results and user data

## Production Deployment

1. Update environment variables for production.
2. Build and push Docker images.
3. Deploy using docker-compose:
```bash
docker-compose -f docker-compose.yml up -d
```

## Monitoring

- Redis Commander is available at http://localhost:8081 (when using development setup)
- WebSocket events can be monitored in the browser console
- Job processing logs are available in the container logs

## Troubleshooting

1. **WebSocket Connection Issues**
   - Ensure NEXT_PUBLIC_SOCKET_URL is correctly set
   - Check if port 3001 is accessible

2. **Redis Connection Issues**
   - Verify Redis container is running: `docker ps`
   - Check Redis logs: `docker-compose logs redis`

3. **File Upload Issues**
   - Verify file size is within MAX_FILE_SIZE limit
   - Check browser console for error messages
