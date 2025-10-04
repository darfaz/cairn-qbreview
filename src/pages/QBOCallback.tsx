import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

export default function QBOCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [companyName, setCompanyName] = useState('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Get params from URL
        const success = searchParams.get('success') === 'true';
        const realm_id = searchParams.get('realm_id');
        const error = searchParams.get('error');
        const state = searchParams.get('state');

        // Verify state to prevent CSRF
        const storedState = localStorage.getItem('qbo_oauth_state');
        if (storedState) {
          const parsedState = JSON.parse(storedState);
          
          if (parsedState.state !== state) {
            throw new Error('Invalid state parameter - possible CSRF attack');
          }

          // Check if state is not too old (5 minutes)
          if (Date.now() - parsedState.timestamp > 5 * 60 * 1000) {
            throw new Error('OAuth state expired');
          }

          setCompanyName(parsedState.clientName);
          
          // Clear state
          localStorage.removeItem('qbo_oauth_state');
        }

        if (success && realm_id) {
          setStatus('success');
          setMessage('QuickBooks connected successfully!');
        } else {
          setStatus('error');
          setMessage(error || 'Failed to connect to QuickBooks');
        }
      } catch (err) {
        console.error('Callback processing error:', err);
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      }
    };

    processCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader showSearch={false} />

      <main className="container mx-auto px-6 py-8">
        <div className="max-w-md mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle className="text-center">QuickBooks Connection</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center space-y-4">
              {status === 'loading' && (
                <>
                  <Loader2 className="w-16 h-16 animate-spin text-primary" />
                  <p className="text-center text-muted-foreground">
                    Processing connection...
                  </p>
                </>
              )}

              {status === 'success' && (
                <>
                  <CheckCircle2 className="w-16 h-16 text-green-500" />
                  <div className="text-center space-y-2">
                    <p className="font-semibold text-lg">{message}</p>
                    {companyName && (
                      <p className="text-muted-foreground">
                        Company: {companyName}
                      </p>
                    )}
                  </div>
                  <Button onClick={() => navigate('/clients')} className="w-full">
                    Continue to Clients
                  </Button>
                </>
              )}

              {status === 'error' && (
                <>
                  <XCircle className="w-16 h-16 text-destructive" />
                  <div className="text-center space-y-2">
                    <p className="font-semibold text-lg">Connection Failed</p>
                    <p className="text-sm text-muted-foreground">{message}</p>
                  </div>
                  <Button 
                    onClick={() => navigate('/clients')} 
                    variant="outline"
                    className="w-full"
                  >
                    Return to Clients
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
