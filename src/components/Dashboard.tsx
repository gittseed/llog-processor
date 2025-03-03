'use client';

import { useState, useEffect } from 'react';
import { Button, Table, Alert, Space, Upload, message, Row, Col } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import LiveStats from './LiveStats';

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

interface QueueStatus {
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  waiting: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<LogStats[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus>({
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    waiting: 0
  });
  const [error, setError] = useState<string>('');

  // Fetch initial data and set up polling
  useEffect(() => {
    fetchStats();
    fetchQueueStatus();

    const statsInterval = setInterval(fetchStats, 2000); // Poll every 2 seconds
    const queueInterval = setInterval(fetchQueueStatus, 1000); // Poll every second

    return () => {
      clearInterval(statsInterval);
      clearInterval(queueInterval);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
      setError('');
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to fetch stats');
    }
  };

  const fetchQueueStatus = async () => {
    try {
      const response = await fetch('/api/queue-status', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch queue status');
      const data = await response.json();
      setQueueStatus(data);
    } catch (err) {
      console.error('Error fetching queue status:', err);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    action: '/api/upload-logs',
    accept: '.log,.txt',
    showUploadList: false,
    onChange(info) {
      if (info.file.status === 'done') {
        message.success(`${info.file.name} file uploaded successfully`);
        fetchQueueStatus();
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  };

  const columns = [
    {
      title: 'File ID',
      dataIndex: 'file_id',
      key: 'file_id',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Errors',
      dataIndex: 'error_count',
      key: 'error_count',
      width: 100,
      sorter: (a: LogStats, b: LogStats) => a.error_count - b.error_count,
    },
    {
      title: 'Warnings',
      dataIndex: 'warning_count',
      key: 'warning_count',
      width: 100,
      sorter: (a: LogStats, b: LogStats) => a.warning_count - b.warning_count,
    },
    {
      title: 'Critical',
      dataIndex: 'critical_count',
      key: 'critical_count',
      width: 100,
      sorter: (a: LogStats, b: LogStats) => a.critical_count - b.critical_count,
    },
    {
      title: 'Timeouts',
      dataIndex: 'timeout_count',
      key: 'timeout_count',
      width: 100,
      sorter: (a: LogStats, b: LogStats) => a.timeout_count - b.timeout_count,
    },
    {
      title: 'Exceptions',
      dataIndex: 'exception_count',
      key: 'exception_count',
      width: 100,
      sorter: (a: LogStats, b: LogStats) => a.exception_count - b.exception_count,
    },
    {
      title: 'Unique IPs',
      dataIndex: 'unique_ips',
      key: 'unique_ips',
      width: 120,
      render: (ips: string[]) => ips.length,
      sorter: (a: LogStats, b: LogStats) => a.unique_ips.length - b.unique_ips.length,
    },
    {
      title: 'Processed At',
      dataIndex: 'processed_at',
      key: 'processed_at',
      width: 200,
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a: LogStats, b: LogStats) => new Date(a.processed_at).getTime() - new Date(b.processed_at).getTime(),
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {error && <Alert message={error} type="error" showIcon closable />}

        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Space style={{ width: '100%', justifyContent: 'space-between' }}>
              <Upload {...uploadProps}>
                <Button icon={<UploadOutlined />} type="primary">Upload Log File</Button>
              </Upload>

              <Space size="large">
                <Space>
                  <span>Active:</span>
                  <span style={{ color: '#1890ff', fontWeight: 'bold' }}>{queueStatus.active}</span>
                </Space>
                <Space>
                  <span>Completed:</span>
                  <span style={{ color: '#52c41a', fontWeight: 'bold' }}>{queueStatus.completed}</span>
                </Space>
                <Space>
                  <span>Failed:</span>
                  <span style={{ color: '#f5222d', fontWeight: 'bold' }}>{queueStatus.failed}</span>
                </Space>
                <Space>
                  <span>Waiting:</span>
                  <span style={{ color: '#faad14', fontWeight: 'bold' }}>{queueStatus.waiting}</span>
                </Space>
              </Space>
            </Space>
          </Col>

          <Col span={24}>
            <LiveStats />
          </Col>

          <Col span={24}>
            <Table
              columns={columns}
              dataSource={stats}
              rowKey="id"
              pagination={{ pageSize: 30 }}
              scroll={{ x: true }}
              size="middle"
              bordered
            />
          </Col>
        </Row>
      </Space>
    </div>
  );
}
