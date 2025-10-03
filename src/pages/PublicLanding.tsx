import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, LogIn, UserPlus } from 'lucide-react';
import bescoredLogo from '@/assets/bescored-logo.png';
import { SummaryCards } from '@/components/dashboard/SummaryCards';
import { ClientGrid } from '@/components/dashboard/ClientGrid';
import { BulkReconciliationControls } from '@/components/dashboard/BulkReconciliationControls';
import { generateMockClients, mockSummary } from '@/data/mockClients';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const PublicLanding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  
  const allClients = useMemo(() => generateMockClients(105), []);
  
  const filteredClients = useMemo(() => {
    if (!searchQuery) return allClients.slice(0, 20);
    
    return allClients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.realmId.includes(searchQuery)
    ).slice(0, 20);
  }, [allClients, searchQuery]);

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleDemoAction = () => {
    toast({
      title: 'Demo Mode',
      description: 'Sign in to access full functionality',
      variant: 'default',
    });
  };

  if (loading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Auth Buttons */}
      <header className="bg-transparent">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0, margin: 0 }}>
              <img 
                src={bescoredLogo} 
                alt="BeScored" 
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  boxShadow: 'none',
                  display: 'block',
                  height: '12rem',
                  width: 'auto'
                }} 
              />
            </div>
            
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate('/auth')}>
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
              <Button onClick={() => navigate('/auth')}>
                <UserPlus className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            Automated Reconciliation Reviews
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your accounting workflow with automated reconciliation reviews, 
            real-time status tracking, and seamless integration.
          </p>
          <div className="bg-muted/50 p-4 rounded-lg mb-8">
            <p className="text-sm text-muted-foreground">
              👆 This is a live demo. Sign up to connect your own clients.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards summary={mockSummary} />
        
        {/* Bulk Reconciliation Controls */}
        <div className="mb-8">
          <BulkReconciliationControls
            selectedClientIds={selectedClientIds}
            onSelectionChange={setSelectedClientIds}
            totalClients={filteredClients.length}
            allClientIds={filteredClients.map(c => c.id)}
          />
        </div>

        {/* Client Grid */}
        <ClientGrid
          clients={filteredClients}
          onRunReconciliation={handleDemoAction}
          onViewHistory={handleDemoAction}
          onReconnect={handleDemoAction}
          selectedClientIds={selectedClientIds}
          onSelectionChange={setSelectedClientIds}
        />

        {/* CTA Section */}
        <div className="mt-16 text-center bg-muted/30 rounded-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Connect your clients and start automating your reconciliation reviews today.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Start Free Trial
            </Button>
            <Button variant="outline" size="lg" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublicLanding;