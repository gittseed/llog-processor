'use client';

import { useState, useEffect } from 'react';
import { Button, Upload, message, Space, Typography, Row, Col, Progress, Table, Alert, Input, Collapse } from 'antd';
import { UploadOutlined, SearchOutlined } from '@ant-design/icons';
import LiveStats from './LiveStats';
import { useRouter } from 'next/navigation';
import { useSupabase } from './providers/SupabaseProvider';

const { Title } = Typography;
const { Panel } = Collapse;

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

interface JobStats extends LogStats {
  state: string;
  progress: number;
  processedOn: string;
  finishedOn: string;
  attemptsMade: number;
}

export default function Dashboard() {
  const router = useRouter();
  const { supabase } = useSupabase();
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
  const [jobId, setJobId] = useState('');
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [jobLoading, setJobLoading] = useState(false);

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

  const fetchJobStats = async () => {
    if (!jobId) return;
    
    setJobLoading(true);
    try {
      const response = await fetch(`/api/stats/${jobId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch job stats');
      }
      const data = await response.json();
      setJobStats(data);
      setError('');
    } catch (err: any) {
      console.error('Error fetching job stats:', err);
      message.error(err.message);
      setJobStats(null);
    } finally {
      setJobLoading(false);
    }
  };

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setUploadStatus('Preparing upload...');

      // Convert FileList to array and sort by size
      const filesArray = Array.from(files).sort((a, b) => a.size - b.size);
      
      // Track processed files to avoid duplicates
      const processedFiles = new Set();
      
      // Upload files sequentially, but process them in parallel
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        
        // Skip if we've already processed this file
        if (processedFiles.has(file.name)) {
          continue;
        }
        processedFiles.add(file.name);
        
        setUploadStatus(`Uploading file ${i + 1}/${filesArray.length}: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        
        const uploadPromise = new Promise((resolve, reject) => {
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              setUploadProgress(progress);
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

        xhr.open('POST', '/api/upload-logs');
        xhr.send(formData);

        await uploadPromise;
        message.success(`File ${file.name} uploaded successfully and queued for processing`);
      }

      setUploadStatus('All uploads complete!');
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

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/');
      router.refresh();
      message.success('Signed out successfully');
    } catch (error: any) {
      console.error('Error signing out:', error);
      message.error(error.message || 'Failed to sign out');
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
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>Log Processing Dashboard</Title>
        <Button onClick={handleSignOut} danger>
          Sign Out
        </Button>
      </div>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          
        </Col>

        <Col span={24}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload.Dragger
              name="file"
              multiple={true}
              showUploadList={false}
              accept=".log,.txt"
              beforeUpload={(file, fileList) => {
                if (fileList.indexOf(file) === 0) {
                  handleUpload(fileList as unknown as FileList);
                }
                return false;
              }}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">Click or drag log files to this area to upload</p>
              <p className="ant-upload-hint">Support for .log and .txt files</p>
            </Upload.Dragger>

            {uploading && (
              <div style={{ marginTop: '16px' }}>
                <Progress percent={uploadProgress} status={uploading ? 'active' : undefined} />
                <div style={{ marginTop: '8px', textAlign: 'center' }}>{uploadStatus}</div>
              </div>
            )}
          </Space>
        </Col>

        <Col span={24}>
          <Collapse defaultActiveKey={['queue']}>
            <Panel header="Queue Status" key="queue">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row gutter={[16, 16]}>
                  <Col span={4}>
                    <Alert message="Active" type="info" description={queueStatus.active} />
                  </Col>
                  <Col span={4}>
                    <Alert message="Completed" type="success" description={queueStatus.completed} />
                  </Col>
                  <Col span={4}>
                    <Alert message="Failed" type="error" description={queueStatus.failed} />
                  </Col>
                  <Col span={4}>
                    <Alert message="Delayed" type="warning" description={queueStatus.delayed} />
                  </Col>
                  <Col span={4}>
                    <Alert message="Waiting" type="info" description={queueStatus.waiting} />
                  </Col>
                </Row>
                
                <div style={{ marginTop: '16px' }}>
                  <Title level={4}>Live Processing</Title>
                  <LiveStats />
                </div>
              </Space>
            </Panel>
          </Collapse>
        </Col>

        <Col span={24}>
          <Collapse>
            <Panel 
              header="Search Job by ID" 
              key="jobSearch"
              extra={
                <Space>
                  {jobId && (
                    <Button 
                      type="text" 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setJobId('');
                        setJobStats(null);
                      }}
                      style={{ color: '#999' }}
                    >
                      ✕
                    </Button>
                  )}
                </Space>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Input
                    placeholder="Enter Job ID"
                    value={jobId}
                    onChange={(e) => setJobId(e.target.value)}
                    style={{ width: '200px' }}
                    prefix={<SearchOutlined />}
                  />
                  <Button 
                    type="primary"
                    onClick={fetchJobStats}
                    loading={jobLoading}
                  >
                    Search
                  </Button>
                </Space>

                {jobStats && (
                  <div style={{ marginTop: '16px' }}>
                    <Row gutter={[16, 16]}>
                      <Col span={8}>
                        <Alert
                          message="Job Status"
                          description={
                            <div>
                              <p><strong>State:</strong> {jobStats.state}</p>
                              <p><strong>Progress:</strong> {jobStats.progress}%</p>
                              <p><strong>Attempts:</strong> {jobStats.attemptsMade}</p>
                            </div>
                          }
                          type={jobStats.state === 'completed' ? 'success' : 'info'}
                        />
                      </Col>
                      <Col span={8}>
                        <Alert
                          message="Processing Times"
                          description={
                            <div>
                              <p><strong>Started:</strong> {new Date(jobStats.processedOn).toLocaleString()}</p>
                              {jobStats.finishedOn && (
                                <p><strong>Finished:</strong> {new Date(jobStats.finishedOn).toLocaleString()}</p>
                              )}
                            </div>
                          }
                          type="info"
                        />
                      </Col>
                      <Col span={8}>
                        <Alert
                          message="Results"
                          description={
                            <div>
                              <p><strong>Errors:</strong> {jobStats.error_count}</p>
                              <p><strong>Warnings:</strong> {jobStats.warning_count}</p>
                              <p><strong>Critical:</strong> {jobStats.critical_count}</p>
                            </div>
                          }
                          type={jobStats.error_count > 0 ? 'warning' : 'success'}
                        />
                      </Col>
                    </Row>
                  </div>
                )}
              </Space>
            </Panel>
          </Collapse>
        </Col>

        <Col span={24}>
          <Collapse defaultActiveKey={['results']}>
            <Panel 
              header="Processing Results" 
              key="results"
              extra={
                <Button 
                  type="primary"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchStats();
                  }}
                  style={{ marginRight: '16px' }}
                >
                  Refresh
                </Button>
              }
            >
              <Table
                dataSource={stats}
                columns={columns}
                rowKey="file_id"
                scroll={{ x: true }}
                loading={stats.length === 0}
              />
            </Panel>
          </Collapse>
        </Col>
      </Row>
    </div>
  );
}
