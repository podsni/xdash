-- Create shared_items table for secure credential sharing
CREATE TABLE IF NOT EXISTS shared_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL,
    account_id UUID NOT NULL,
    encrypted_data TEXT NOT NULL,
    password_hash TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    max_views INTEGER,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_shared_items_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_shared_items_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Create share_access_logs table for audit trail
CREATE TABLE IF NOT EXISTS share_access_logs (
    id SERIAL PRIMARY KEY,
    share_id TEXT NOT NULL,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    success BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_share_access_logs_share FOREIGN KEY (share_id) REFERENCES shared_items(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_items_expires ON shared_items(expires_at);
CREATE INDEX IF NOT EXISTS idx_shared_items_user ON shared_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_items_account ON shared_items(account_id);
CREATE INDEX IF NOT EXISTS idx_share_access_logs_share ON share_access_logs(share_id);
CREATE INDEX IF NOT EXISTS idx_share_access_logs_accessed ON share_access_logs(accessed_at);

-- Add comment for documentation
COMMENT ON TABLE shared_items IS 'Stores encrypted shared credentials with expiration and access control';
COMMENT ON TABLE share_access_logs IS 'Audit trail for shared item access attempts';
