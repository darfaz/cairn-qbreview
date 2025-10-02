-- Drop the trigger that sets review status
DROP TRIGGER IF EXISTS trigger_set_review_status ON public.reviews;

-- Drop the function that sets review status
DROP FUNCTION IF EXISTS public.set_review_status();

-- Drop any check constraints on the status column (if they exist)
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_status_check;