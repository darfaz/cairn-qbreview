-- Remove firm_id system - Part 2: Clean up firm_id columns and tables

-- Step 1: Update bulk_upload_history
ALTER TABLE public.bulk_upload_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.bulk_upload_history buh
SET user_id = (
  SELECT owner_id FROM public.firms WHERE id = buh.firm_id
)
WHERE user_id IS NULL AND firm_id IS NOT NULL;

DROP POLICY IF EXISTS "Users can view their firm's upload history" ON public.bulk_upload_history;
DROP POLICY IF EXISTS "Users can insert upload history for their firm" ON public.bulk_upload_history;

CREATE POLICY "Users can view their own upload history"
ON public.bulk_upload_history FOR SELECT
USING (auth.uid() = user_id OR auth.uid() = uploaded_by);

CREATE POLICY "Users can insert their own upload history"
ON public.bulk_upload_history FOR INSERT
WITH CHECK (auth.uid() = user_id AND auth.uid() = uploaded_by);

-- Step 2: Drop firm_id columns
ALTER TABLE public.clients DROP COLUMN IF EXISTS firm_id CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS firm_id CASCADE;
ALTER TABLE public.bulk_upload_history DROP COLUMN IF EXISTS firm_id CASCADE;

-- Step 3: Drop firms and firm_integrations tables
DROP TABLE IF EXISTS public.firm_integrations CASCADE;
DROP TABLE IF EXISTS public.firms CASCADE;