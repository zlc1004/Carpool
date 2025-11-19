-- Update push_subscriptions table to support Expo push tokens
-- Add expo_push_token column and update existing structure

-- First, add the new column
ALTER TABLE push_subscriptions 
ADD COLUMN IF NOT EXISTS expo_push_token TEXT;

-- Update the table structure to better support Expo push tokens
-- Make endpoint optional since Expo uses tokens instead
ALTER TABLE push_subscriptions 
ALTER COLUMN endpoint DROP NOT NULL;

-- Add index for expo push tokens for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_expo_token 
ON push_subscriptions(expo_push_token);

-- Add constraint to ensure either endpoint or expo_push_token is provided
ALTER TABLE push_subscriptions 
ADD CONSTRAINT check_token_or_endpoint 
CHECK (endpoint IS NOT NULL OR expo_push_token IS NOT NULL);

-- Add comment explaining the dual support
COMMENT ON TABLE push_subscriptions IS 
'Stores push notification subscriptions supporting both web push (endpoint/keys) and Expo push tokens';

COMMENT ON COLUMN push_subscriptions.endpoint IS 
'Web push notification endpoint (optional if using Expo)';

COMMENT ON COLUMN push_subscriptions.expo_push_token IS 
'Expo push token for mobile notifications (optional if using web push)';

-- Update RLS policy to handle the new column
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON push_subscriptions;

CREATE POLICY "Users can manage their own subscriptions" ON push_subscriptions
    FOR ALL USING (user_id = auth.uid());
