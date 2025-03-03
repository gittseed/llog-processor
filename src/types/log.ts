export interface LogEntry {
  timestamp: string
  level: string
  message: string
  payload?: Record<string, any>
  ip?: string
}

export interface LogStats {
  id: number
  file_id: string
  error_count: number
  warning_count: number
  critical_count: number
  timeout_count: number
  exception_count: number
  unique_ips: string[]
  status: 'processing' | 'completed' | 'failed'
  processed_at: string
  keywords: Record<string, any>
}

export interface QueueStatus {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
}

export interface JobProgress {
  id: string
  progress: number
  data: any
}

export interface JobCompleted {
  id: string
  data: any
}

export interface JobFailed {
  id: string
  error: string
  data: any
}
