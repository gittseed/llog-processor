'use client';

import { useState, useEffect } from 'react';
import { Button, Upload, message, Space, Typography, Row, Col, Progress, Table, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { createClient } from '@supabase/supabase-js';
import LiveStats from './LiveStats';

const { Title } = Typography;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    fetchStats();
    const queueInterval = setInterval(fetchQueueStatus, 2000);

    return () => {
      clearInterval(queueInterval);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
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
        cache: 'no-store'
      });
      if (!response.ok) throw new Error('Failed to fetch queue status');
      const data = await response.json();
      setQueueStatus(data);
    } catch (err) {
      console.error('Error fetching queue status:', err);
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadStatus('Preparing upload...');

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);

      // Use XMLHttpRequest for upload progress
      const xhr = new XMLHttpRequest();
      
      // Setup promise to handle completion
      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
            setUploadStatus(`Uploading: ${progress}%`);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (e) {
              reject(new Error('Invalid response format'));
            }
          } else {
            try {
              const error = JSON.parse(xhr.responseText);
              reject(new Error(error.error || 'Upload failed'));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error occurred'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });
      });

      // Start upload
      xhr.open('POST', '/api/upload-logs');
      xhr.send(formData);

      // Wait for completion
      const result = await uploadPromise;
      message.success('File uploaded successfully and queued for processing');
      setUploadStatus('Upload complete!');
      
      // Reset after a short delay
      setTimeout(() => {
        setUploadProgress(0);
        setUploadStatus('');
      }, 2000);

    } catch (error: any) {
      console.error('Upload error:', error);
      message.error(`Upload failed: ${error.message}`);
      setUploadStatus('Upload failed');
    } finally {
      setUploading(false);
    }
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
      width: 200,
      render: (ips: string[]) => ips?.length || 0,
    },
    {
      title: 'Processed At',
      dataIndex: 'processed_at',
      key: 'processed_at',
      width: 200,
      render: (date: string) => new Date(date).toLocaleString(),
      sorter: (a: LogStats, b: LogStats) => new Date(a.processed_at).getTime() - new Date(b.processed_at).getTime(),
    },
  ];

  return (
    <div className="p-6">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={2}>Log File Analysis Dashboard</Title>
            {error && <Alert message={error} type="error" showIcon />}
          </Space>
        </Col>

        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload.Dragger
              name="file"
              multiple={false}
              showUploadList={false}
              accept=".log,.txt"
              beforeUpload={(file) => {
                handleUpload(file);
                return false;
              }}
              disabled={uploading}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Click or drag log file to upload</p>
              {uploadStatus && (
                <p className="ant-upload-hint" style={{ marginTop: '8px' }}>
                  {uploadStatus}
                </p>
              )}
            </Upload.Dragger>

            {uploading && (
              <Progress 
                percent={uploadProgress} 
                status={uploadProgress === 100 ? "success" : "active"} 
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            )}
          </Space>
        </Col>

        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Title level={4}>Queue Status</Title>
            <Row gutter={16}>
              <Col>
                <Space>
                  Active: {queueStatus.active}
                  Waiting: {queueStatus.waiting}
                  Completed: {queueStatus.completed}
                  Failed: {queueStatus.failed}
                </Space>
              </Col>
            </Row>
          </Space>
        </Col>

        <Col span={24}>
          <LiveStats />
        </Col>

        <Col span={24}>
          <Title level={4}>Processing Results</Title>
          <Table
            dataSource={stats}
            columns={columns}
            rowKey="id"
            scroll={{ x: true }}
            pagination={{
              defaultPageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
            }}
          />
        </Col>
      </Row>
    </div>
  );
}
