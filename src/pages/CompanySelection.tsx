import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CompanySelection } from '@/components/quickbooks/CompanySelection';
import { toast } from 'sonner';

const CompanySelectionPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Check for OAuth callback parameters
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      toast.error('QuickBooks connection failed');
      navigate('/');
      return;
    }

    if (code) {
      // OAuth successful, code will be handled by the CompanySelection component
      toast.success('QuickBooks connection successful! Please select companies to monitor.');
    }
  }, [searchParams, navigate]);

  const handleComplete = () => {
    navigate('/');
    toast.success('Companies connected successfully!');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">QuickBooks Company Selection</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <CompanySelection onComplete={handleComplete} />
      </main>
    </div>
  );
};

export default CompanySelectionPage;