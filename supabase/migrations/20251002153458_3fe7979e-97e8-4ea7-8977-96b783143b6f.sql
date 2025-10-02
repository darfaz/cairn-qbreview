-- Create function to set review status based on action items count
CREATE OR REPLACE FUNCTION public.set_review_status()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set status on insert
CREATE TRIGGER trigger_set_review_status
  BEFORE INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.set_review_status();