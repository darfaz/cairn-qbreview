import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [firmChecking, setFirmChecking] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const checkAndCreateFirm = async () => {
      if (!user) {
        setFirmChecking(false);
        return;
      }

      try {
        // Check if user has a firm
        const { data: profile } = await supabase
          .from('profiles')
          .select('firm_id')
          .eq('id', user.id)
          .single();

        if (!profile?.firm_id) {
          // Auto-create firm for user
          const { data: newFirm, error: firmError } = await supabase
            .from('firms')
            .insert({
              firm_name: `${user.email}'s Firm`,
              owner_id: user.id
            })
            .select()
            .single();

          if (firmError) throw firmError;

          // Update profile with new firm_id
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ firm_id: newFirm.id })
            .eq('id', user.id);

          if (profileError) throw profileError;

          toast({
            title: 'Welcome!',
            description: 'Your firm has been created successfully.',
          });
        }
      } catch (error) {
        console.error('Error checking/creating firm:', error);
        toast({
          title: 'Error',
          description: 'Failed to set up your account. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setFirmChecking(false);
      }
    };

    if (!loading) {
      checkAndCreateFirm();
    }
  }, [user, loading, toast]);

  if (loading || firmChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;