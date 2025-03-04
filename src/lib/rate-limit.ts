import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { getRedisClient } from '@/config/redis';

// Create Redis client using existing config
const redis = getRedisClient();

interface RateLimitConfig {
  maxRequests: number;  // Maximum requests allowed
  windowMs: number;     // Time window in milliseconds
}

const defaultConfig: RateLimitConfig = {
  maxRequests: 10,      // 10 requests
  windowMs: 10 * 1000,  // per 10 seconds
};

export async function rateLimit(
  identifier: string,
  endpoint: string,
  config: RateLimitConfig = defaultConfig
): Promise<{ success: boolean; response?: NextResponse }> {
  try {
    const key = `rate_limit:${endpoint}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Use Redis transaction to ensure atomic operations
    const multi = redis.multi();
    
    // Remove old requests outside the current window
    multi.zremrangebyscore(key, 0, windowStart);
    
    // Add current request
    multi.zadd(key, now, `${now}`);
    
    // Count requests in current window
    multi.zcard(key);
    
    // Set expiry on the key
    multi.expire(key, Math.ceil(config.windowMs / 1000));

    const results = await multi.exec();
    if (!results) {
      throw new Error('Redis transaction failed');
    }

    const requestCount = results[2][1] as number;

    // Get time until oldest request expires
    const oldestRequest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const resetTime = oldestRequest.length ? parseInt(oldestRequest[1]) + config.windowMs : now + config.windowMs;

    if (requestCount > config.maxRequests) {
      return {
        success: false,
        response: new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            limit: config.maxRequests,
            remaining: 0,
            reset: `${resetTime - now}ms`,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': config.maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': resetTime.toString(),
            },
          }
        ),
      };
    }

    return { 
      success: true 
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // If rate limiting fails, allow the request to proceed
    return { success: true };
  }
}
