import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const CompanySelectionPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to dashboard since OAuth functionality has been removed
    navigate('/');
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">Webhook Integration Pending</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4 p-8">
          <h2 className="text-2xl font-semibold">Webhook Integration Pending</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            QuickBooks integration will be available via webhook. OAuth functionality has been removed.
          </p>
        </div>
      </main>
    </div>
  );
};

export default CompanySelectionPage;