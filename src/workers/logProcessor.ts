import { Job } from 'bullmq';
import { getLogQueue } from '../config/queue';

interface LogAnalysisResult {
  errors: number;
  keywords?: {
    error?: number;
    warning?: number;
    critical?: number;
    timeout?: number;
    exception?: number;
  };
  ipAddresses?: Set<string>;
}

export async function processLogFile(job: Job, content: string): Promise<LogAnalysisResult> {
  const queue = await getLogQueue();
  const result: LogAnalysisResult = {
    errors: 0,
    keywords: {
      error: 0,
      warning: 0,
      critical: 0,
      timeout: 0,
      exception: 0
    },
    ipAddresses: new Set()
  };

  try {
    // Process the content line by line
    const lines = content.split('\n');
    const totalLines = lines.length;
    let processedLines = 0;
    const batchSize = Math.max(1, Math.floor(totalLines / 100)); // Update progress every 1%

    // Regular expressions for matching
    const ipRegex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
    const keywordRegex = {
      error: /\b(?:error|fail(?:ed|ure)?)\b/i,
      warning: /\bwarn(?:ing)?\b/i,
      critical: /\bcritical\b/i,
      timeout: /\btimeout\b/i,
      exception: /\bexception\b/i
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Extract IP addresses
      const ips = line.match(ipRegex);
      if (ips) {
        ips.forEach(ip => result.ipAddresses!.add(ip));
      }

      // Count keywords
      if (keywordRegex.error.test(line)) {
        result.keywords!.error!++;
        result.errors++;
      }
      if (keywordRegex.warning.test(line)) result.keywords!.warning!++;
      if (keywordRegex.critical.test(line)) result.keywords!.critical!++;
      if (keywordRegex.timeout.test(line)) result.keywords!.timeout!++;
      if (keywordRegex.exception.test(line)) result.keywords!.exception!++;

      // Update progress periodically
      processedLines++;
      if (processedLines % batchSize === 0 || processedLines === totalLines) {
        const progress = Math.min(90, 30 + Math.round((processedLines / totalLines) * 60));
        await job.updateProgress(progress);
        
        // Emit progress event
        await queue.emit('added', {
          name: 'processing.log',
          data: {
            type: 'info',
            message: `Processing log entries... (${Math.round((processedLines / totalLines) * 100)}%)`,
            timestamp: new Date().toISOString(),
            progress
          }
        });
      }
    }

    return result;
  } catch (error) {
    console.error('Error processing log file:', error);
    throw error;
  }
}
