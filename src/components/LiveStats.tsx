import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Alert, Progress, Card, Row, Col, Typography, Tag, Space, Timeline, List } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface ProcessingLog {
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  timestamp: string;
  details?: {
    errors: number;
    keywords: {
      error: number;
      warning: number;
      critical: number;
      timeout: number;
      exception: number;
    };
    ipAddresses: string[];
  };
  progress?: number;
}

interface JobProgress {
  jobId: string;
  progress: number;
}

export default function LiveStats() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingLogs, setProcessingLogs] = useState<ProcessingLog[]>([]);
  const [currentProgress, setCurrentProgress] = useState<JobProgress | null>(null);

  useEffect(() => {
    const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    console.log('🔌 Connecting to socket server at:', SOCKET_URL);
    
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on('connect', () => {
      console.log('✅ Connected to socket server');
      setConnected(true);
      setError(null);
    });

    socketInstance.on('disconnect', () => {
      console.log('❌ Disconnected from socket server');
      setConnected(false);
      setProcessingLogs(prev => [
        {
          type: 'warning',
          message: 'Disconnected from WebSocket server',
          timestamp: new Date().toISOString()
        },
        ...prev
      ]);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('🚫 Socket connection error:', err);
      setError(`Connection error: ${err.message}`);
      setConnected(false);
    });

    socketInstance.on('processing.log', (data: ProcessingLog) => {
      console.log('📝 Received processing.log event:', data);
      
      // Update progress if present
      if (data.progress !== undefined) {
        setCurrentProgress(prev => {
          // Only update if progress is higher or there's no previous progress
          if (!prev || data.progress! > prev.progress) {
            return {
              jobId: data.message.split(' ').pop() || '',
              progress: data.progress!
            };
          }
          return prev;
        });
      }

      // Clear progress on job completion
      if (data.type === 'success' && data.message.includes('completed successfully')) {
        setCurrentProgress(null);
      }

      setProcessingLogs(prev => {
        const newLogs = [data, ...prev];
        return newLogs.slice(0, 50); // Keep last 50 logs
      });
    });

    setSocket(socketInstance);

    return () => {
      console.log('🧹 Cleaning up socket connection');
      socketInstance.disconnect();
    };
  }, []);

  const renderProcessingLogs = () => {
    return (
      <Card 
        title={
          <Space>
            <span>Processing Logs</span>
            {currentProgress && (
              <Progress 
                percent={currentProgress.progress} 
                size="small" 
                status="active"
                style={{ width: 200 }}
              />
            )}
          </Space>
        }
        style={{ marginTop: '20px' }}
        bodyStyle={{ 
          height: '400px',
          overflowY: 'auto',
          padding: '0 24px'
        }}
      >
        {processingLogs.length === 0 ? (
          <Alert
            message="No processing logs yet"
            description="Upload a file to see processing logs"
            type="info"
            showIcon
          />
        ) : (
          <Timeline
            mode="left"
            style={{ marginTop: '24px' }}
            items={processingLogs.map((log, index) => ({
              color: log.type === 'success' ? 'green' :
                     log.type === 'error' ? 'red' :
                     log.type === 'warning' ? 'orange' : 'blue',
              children: (
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <Space>
                    <Tag color={
                      log.type === 'success' ? 'success' :
                      log.type === 'error' ? 'error' :
                      log.type === 'warning' ? 'warning' : 'processing'
                    }>
                      {log.type.toUpperCase()}
                    </Tag>
                    <Text>{log.message}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Text>
                  </Space>
                  {log.details && (
                    <div style={{ 
                      marginTop: '8px', 
                      background: '#f5f5f5', 
                      padding: '8px', 
                      borderRadius: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      <Space direction="vertical" size={4}>
                        <Text strong>Analysis Results:</Text>
                        <Space wrap>
                          <Tag color="red">Errors: {log.details.errors}</Tag>
                          <Tag color="orange">Warnings: {log.details.keywords.warning}</Tag>
                          <Tag color="red">Critical: {log.details.keywords.critical}</Tag>
                          <Tag color="orange">Timeouts: {log.details.keywords.timeout}</Tag>
                          <Tag color="red">Exceptions: {log.details.keywords.exception}</Tag>
                        </Space>
                        {log.details.ipAddresses && log.details.ipAddresses.length > 0 && (
                          <>
                            <Text strong>IP Addresses Found:</Text>
                            <List
                              size="small"
                              dataSource={log.details.ipAddresses}
                              renderItem={ip => (
                                <List.Item>
                                  <Tag>{ip}</Tag>
                                </List.Item>
                              )}
                              style={{ 
                                maxHeight: '100px', 
                                overflowY: 'auto',
                                background: 'white',
                                borderRadius: '4px',
                                padding: '4px'
                              }}
                            />
                          </>
                        )}
                      </Space>
                    </div>
                  )}
                </Space>
              )
            }))}
          />
        )}
      </Card>
    );
  };

  return (
    <div style={{ padding: '20px' }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: '20px' }}>
        <Col>
          <Title level={4}>
            <DatabaseOutlined /> Live Processing Dashboard
          </Title>
        </Col>
        <Col>
          <Tag color={connected ? 'success' : 'error'}>
            {connected ? 'Connected' : 'Disconnected'}
          </Tag>
        </Col>
      </Row>
      {error && (
        <Alert
          message="Connection Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: '20px' }}
        />
      )}
      {renderProcessingLogs()}
    </div>
  );
}
