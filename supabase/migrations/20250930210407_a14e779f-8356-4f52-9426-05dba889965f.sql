-- Remove Dropbox OAuth fields from firms table
ALTER TABLE firms 
DROP COLUMN IF EXISTS dropbox_connected,
DROP COLUMN IF EXISTS dropbox_access_token;