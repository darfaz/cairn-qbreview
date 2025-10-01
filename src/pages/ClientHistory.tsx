import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Review {
  id: string;
  triggered_at: string;
  completed_at: string | null;
  status: string;
  action_items_count: number;
  sheet_url: string | null;
}

interface Client {
  id: string;
  client_name: string;
  realm_id: string;
}

const ClientHistory = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      fetchClientAndReviews();
    }
  }, [clientId]);

  const fetchClientAndReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id, client_name, realm_id')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch all reviews for this client
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('reviews')
        .select('id, triggered_at, completed_at, status, action_items_count, sheet_url')
        .eq('client_id', clientId)
        .order('triggered_at', { ascending: false });

      if (reviewsError) throw reviewsError;
      setReviews(reviewsData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load review history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, actionItemsCount: number) => {
    if (status === 'processing') {
      return <Badge variant="secondary">Processing</Badge>;
    }
    
    if (status === 'failed') {
      return <Badge variant="destructive">Failed</Badge>;
    }

    // For completed reviews, use color based on action items
    let variant: 'default' | 'secondary' | 'destructive' = 'default';
    let colorClass = '';
    
    if (actionItemsCount === 0) {
      colorClass = 'bg-green-500 hover:bg-green-600';
    } else if (actionItemsCount >= 1 && actionItemsCount <= 3) {
      colorClass = 'bg-yellow-500 hover:bg-yellow-600';
    } else {
      colorClass = 'bg-red-500 hover:bg-red-600';
    }

    return (
      <Badge className={colorClass}>
        {actionItemsCount} {actionItemsCount === 1 ? 'issue' : 'issues'}
      </Badge>
    );
  };

  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return 'N/A';
    try {
      return format(new Date(timestamp), 'MMM d, yyyy h:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-6 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <Card>
            <CardContent className="p-6">
              <p className="text-destructive">{error || 'Client not found'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{client.client_name}</CardTitle>
            <CardDescription>
              Realm ID: {client.realm_id} • {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'} found
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review History</CardTitle>
            <CardDescription>
              Complete history of all reviews for this client
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No reviews found for this client
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sheet</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-medium">
                        {formatTimestamp(review.triggered_at)}
                      </TableCell>
                      <TableCell>
                        {formatTimestamp(review.completed_at)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(review.status, review.action_items_count)}
                      </TableCell>
                      <TableCell>
                        {review.sheet_url ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 h-auto text-primary hover:text-primary-hover"
                            asChild
                          >
                            <a
                              href={review.sheet_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center space-x-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="text-xs">View</span>
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not available</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ClientHistory;
