'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

interface LogStats {
  id: number;
  file_id: string;
  error_count: number;
  warning_count: number;
  critical_count: number;
  timeout_count: number;
  exception_count: number;
  unique_ips: string[];
  processed_at: string;
}

interface LogStatsTableProps {
  stats: LogStats[];
}

export default function LogStatsTable({ stats }: LogStatsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const getFileName = (fileId: string) => {
    const parts = fileId.split('_');
    return parts.length > 1 ? decodeURIComponent(parts[1]) : fileId;
  };

  if (!stats || stats.length === 0) {
    return (
      <div className="text-center py-8 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No log files have been processed yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              File Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Errors
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Warnings
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Critical
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Timeouts
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Exceptions
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Unique IPs
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Processed
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {stats.map((stat) => (
            <React.Fragment key={stat.id}>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {getFileName(stat.file_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                  {stat.error_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-yellow-600">
                  {stat.warning_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-800">
                  {stat.critical_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                  {stat.timeout_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600">
                  {stat.exception_count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button 
                    onClick={() => toggleRow(stat.id)}
                    className="flex items-center gap-1 hover:text-blue-600 focus:outline-none"
                  >
                    {(stat.unique_ips || []).length} IPs
                    {expandedRows.has(stat.id) ? (
                      <ChevronUpIcon className="h-4 w-4" />
                    ) : (
                      <ChevronDownIcon className="h-4 w-4" />
                    )}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {stat.processed_at ? formatDistanceToNow(new Date(stat.processed_at), { addSuffix: true }) : 'Processing...'}
                </td>
              </tr>
              {expandedRows.has(stat.id) && stat.unique_ips && (
                <tr className="bg-gray-50">
                  <td colSpan={8} className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      <div className="font-medium mb-2">All Unique IPs:</div>
                      <div className="grid grid-cols-4 gap-2">
                        {stat.unique_ips.map((ip, index) => (
                          <div key={index} className="bg-white rounded px-3 py-1 shadow-sm">
                            {ip}
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
