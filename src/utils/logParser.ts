import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { EventEmitter } from 'events';

const KEYWORDS = (process.env.TRACKED_KEYWORDS || 'error,warning,critical,timeout,exception').split(',');

interface LogStats {
  errors: number;
  keywords: Record<string, number>;
  ipAddresses: Set<string>;
}

async function parseLogFile(filePath: string, emitter?: EventEmitter): Promise<LogStats> {
  const stats: LogStats = {
    errors: 0,
    keywords: {},
    ipAddresses: new Set()
  };

  // Initialize keyword counters
  KEYWORDS.forEach(keyword => stats.keywords[keyword.toLowerCase()] = 0);

  const logLineRegex = /\[(.*?)\]\s+(\w+)\s+(.*?)(?:\s+(\{.*\}))?$/;
  const ipRegex = /\b(\d{1,3}\.){3}\d{1,3}\b/g;
  let linesProcessed = 0;
  let totalLines = 0;

  // First pass to count total lines
  const countStream = createReadStream(filePath, { encoding: 'utf-8' });
  const countInterface = createInterface({ input: countStream });
  for await (const _ of countInterface) {
    totalLines++;
  }

  // Create read stream and interface for processing
  const fileStream = createReadStream(filePath, { encoding: 'utf-8' });
  const rl = createInterface({ input: fileStream });

  for await (const line of rl) {
    linesProcessed++;
    if (!line.trim()) continue;

    // Count keywords in the entire line
    KEYWORDS.forEach(keyword => {
      const regex = new RegExp(keyword, 'gi');
      const matches = line.match(regex);
      if (matches) {
        stats.keywords[keyword.toLowerCase()] += matches.length;
      }
    });

    const match = line.match(logLineRegex);
    if (match) {
      const [, timestamp, level, message, jsonPayload] = match;
      
      // Count errors based on level
      if (level.toLowerCase() === 'error') {
        stats.errors++;
      }

      // Extract IPs from message and JSON payload
      const messageIps = message.match(ipRegex) || [];
      const jsonIps = jsonPayload ? (jsonPayload.match(ipRegex) || []) : [];
      [...messageIps, ...jsonIps].forEach(ip => stats.ipAddresses.add(ip));
    }

    // Emit progress every 1000 lines or when processing is complete
    if (emitter && (linesProcessed % 1000 === 0 || linesProcessed === totalLines)) {
      const progress = Math.round((linesProcessed / totalLines) * 100);
      emitter.emit('progress', {
        linesProcessed,
        totalLines,
        progress,
        currentStats: {
          ...stats,
          ipAddresses: Array.from(stats.ipAddresses)
        }
      });
    }
  }

  return {
    ...stats,
    ipAddresses: stats.ipAddresses
  };
}

export default parseLogFile;
