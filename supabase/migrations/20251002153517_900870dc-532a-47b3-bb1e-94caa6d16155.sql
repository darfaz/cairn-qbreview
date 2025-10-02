-- Update function to set search_path for security
CREATE OR REPLACE FUNCTION public.set_review_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.action_items_count = 0 THEN
    NEW.status = 'Clean';
  ELSIF NEW.action_items_count BETWEEN 1 AND 3 THEN
    NEW.status = 'Review';
  ELSIF NEW.action_items_count >= 4 THEN
    NEW.status = 'Action';
  END IF;
  
  RETURN NEW;
END;
$$;