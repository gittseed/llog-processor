-- Drop old table if exists
DROP TABLE IF EXISTS public.log_stats;

-- Create the table
CREATE TABLE IF NOT EXISTS public.log_stats (
    id SERIAL PRIMARY KEY,
    file_id TEXT NOT NULL,
    error_count INT DEFAULT 0,
    warning_count INT DEFAULT 0,
    critical_count INT DEFAULT 0,
    timeout_count INT DEFAULT 0,
    exception_count INT DEFAULT 0,
    unique_ips TEXT[],
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update log_stats table to add completed_at and other missing columns
ALTER TABLE log_stats
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT,
ADD COLUMN IF NOT EXISTS processing_time TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
