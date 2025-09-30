import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { exchangeCodeForToken, storeDropboxToken } from '@/lib/dropbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function DropboxCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        console.error('Dropbox OAuth error:', error, errorDescription);
        setStatus('error');
        toast.error(`Dropbox connection failed: ${errorDescription || error}`);
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      if (!code) {
        setStatus('error');
        toast.error('No authorization code received from Dropbox');
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      try {
        // Get current user's firm
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error('User not authenticated');
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('firm_id')
          .eq('id', user.id)
          .single();

        if (!profile?.firm_id) {
          throw new Error('No firm associated with user');
        }

        // Exchange code for token
        const { access_token, refresh_token } = await exchangeCodeForToken(code);

        // Store token in firms table
        await storeDropboxToken(profile.firm_id, access_token, refresh_token);

        setStatus('success');
        toast.success('Dropbox connected successfully!');
        setTimeout(() => navigate('/settings'), 2000);
      } catch (error: any) {
        console.error('Error processing Dropbox callback:', error);
        setStatus('error');
        toast.error(error.message || 'Failed to connect Dropbox');
        setTimeout(() => navigate('/settings'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-2xl font-semibold">Connecting to Dropbox...</h2>
            <p className="text-muted-foreground">Please wait while we complete the connection.</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">Connection Successful!</h2>
            <p className="text-muted-foreground">Redirecting you back to settings...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold">Connection Failed</h2>
            <p className="text-muted-foreground">Redirecting you back to settings...</p>
          </>
        )}
      </div>
    </div>
  );
}
