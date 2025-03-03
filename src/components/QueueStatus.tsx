'use client';

import { useEffect, useState } from 'react';

interface QueueMetrics {
  active: number;
  completed: number;
  delayed: number;
  failed: number;
  paused: number;
  prioritized: number;
  waiting: number;
  'waiting-children': number;
}

export default function QueueStatus() {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/queue-status');
      if (!response.ok) throw new Error('Failed to fetch queue metrics');
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch queue status');
      console.error('Error fetching queue metrics:', err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
        </div>
      </div>
    );
  }

  const totalActive = metrics.active + metrics.waiting;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className={`rounded-lg p-4 ${totalActive > 0 ? 'bg-blue-50 animate-pulse' : 'bg-blue-50'}`}>
        <div className="flex flex-col">
          <dt className="text-sm font-medium text-blue-900">Processing</dt>
          <dd className="mt-1 text-2xl font-semibold text-blue-700">
            {totalActive}
          </dd>
          {totalActive > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              {metrics.active} active, {metrics.waiting} waiting
            </p>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-green-50 p-4">
        <div className="flex flex-col">
          <dt className="text-sm font-medium text-green-900">Completed</dt>
          <dd className="mt-1 text-2xl font-semibold text-green-700">{metrics.completed}</dd>
        </div>
      </div>

      <div className="rounded-lg bg-yellow-50 p-4">
        <div className="flex flex-col">
          <dt className="text-sm font-medium text-yellow-900">Delayed</dt>
          <dd className="mt-1 text-2xl font-semibold text-yellow-700">{metrics.delayed}</dd>
        </div>
      </div>

      <div className="rounded-lg bg-red-50 p-4">
        <div className="flex flex-col">
          <dt className="text-sm font-medium text-red-900">Failed</dt>
          <dd className="mt-1 text-2xl font-semibold text-red-700">{metrics.failed}</dd>
        </div>
      </div>
    </div>
  );
}
