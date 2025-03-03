-- Create log_stats table
CREATE TABLE IF NOT EXISTS log_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    lines_processed INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    warning_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    processing_time INTERVAL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies
ALTER TABLE log_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own log stats"
    ON log_stats FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own log stats"
    ON log_stats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own log stats"
    ON log_stats FOR UPDATE
    USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_log_stats_user_id ON log_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_log_stats_job_id ON log_stats(job_id);
CREATE INDEX IF NOT EXISTS idx_log_stats_created_at ON log_stats(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_log_stats_updated_at
    BEFORE UPDATE ON log_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
