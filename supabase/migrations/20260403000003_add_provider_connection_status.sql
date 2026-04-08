-- Add provider integration connection status storage
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS composio_connection_status JSONB DEFAULT '{"calendar": "not_connected", "email": "not_connected", "provider": "composio"}';
