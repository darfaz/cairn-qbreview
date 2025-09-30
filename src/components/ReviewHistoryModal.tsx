import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Review {
  id: string;
  status: string;
  action_items_count: number;
  triggered_at: string;
  completed_at: string | null;
  sheet_url: string | null;
}

interface ReviewHistoryModalProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReviewHistoryModal({ clientId, clientName, open, onOpenChange }: ReviewHistoryModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      fetchReviews();
    }
  }, [open, clientId]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('client_id', clientId)
        .order('triggered_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setReviews(data || []);
    } catch (err: any) {
      toast.error(`Failed to load review history: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, actionItems: number) => {
    if (status === 'processing') {
      return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
    }
    if (status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }
    if (status === 'completed') {
      if (actionItems === 0) {
        return <Badge className="bg-green-100 text-green-800">Clean</Badge>;
      } else if (actionItems <= 3) {
        return <Badge className="bg-yellow-100 text-yellow-800">{actionItems} Items</Badge>;
      } else {
        return <Badge variant="destructive">{actionItems} Items</Badge>;
      }
    }
    return <Badge variant="secondary">{status}</Badge>;
  };

  const calculateDuration = (triggeredAt: string, completedAt: string | null) => {
    if (!completedAt) return 'N/A';
    const start = new Date(triggeredAt);
    const end = new Date(completedAt);
    const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review History</DialogTitle>
          <DialogDescription>{clientName}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">No reviews yet.</p>
            <p className="text-sm text-muted-foreground">Click 'Run' to start the first review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {format(new Date(review.triggered_at), 'MMM dd, yyyy hh:mm a')}
                      </span>
                      {getStatusBadge(review.status, review.action_items_count)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Duration: {calculateDuration(review.triggered_at, review.completed_at)}
                    </div>
                  </div>
                  {review.sheet_url && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(review.sheet_url!, '_blank')}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      View Report
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
