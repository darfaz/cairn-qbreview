import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface QBCompany {
  id: string;
  name: string;
  realmId: string;
  lastSync?: Date;
  selected: boolean;
}

interface CompanySelectionProps {
  onComplete?: () => void;
}

export function CompanySelection({ onComplete }: CompanySelectionProps) {
  const [companies, setCompanies] = useState<QBCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    fetchAccessibleCompanies();
  }, []);

  const fetchAccessibleCompanies = async () => {
    try {
      // This would typically call a Supabase Edge Function
      // For now, we'll simulate the response
      const mockCompanies: QBCompany[] = [
        { id: '1', name: 'ABC Corp', realmId: '193514489870354', selected: false },
        { id: '2', name: 'XYZ Industries', realmId: '193514489870355', selected: false },
        { id: '3', name: 'Smith & Associates', realmId: '193514489870356', selected: false },
      ];
      
      setCompanies(mockCompanies);
    } catch (error) {
      console.error('Error fetching companies:', error);
      toast.error('Failed to fetch accessible companies');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCompany = (companyId: string) => {
    setCompanies(prev => 
      prev.map(company => 
        company.id === companyId 
          ? { ...company, selected: !company.selected }
          : company
      )
    );
  };

  const selectAll = () => {
    setCompanies(prev => prev.map(company => ({ ...company, selected: true })));
  };

  const deselectAll = () => {
    setCompanies(prev => prev.map(company => ({ ...company, selected: false })));
  };

  const connectSelectedCompanies = async () => {
    const selectedCompanies = companies.filter(c => c.selected);
    
    if (selectedCompanies.length === 0) {
      toast.error('Please select at least one company to connect');
      return;
    }

    setIsConnecting(true);
    
    try {
      // Get current user
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Create client records for selected companies
      const clientsToInsert = selectedCompanies.map(company => ({
        name: company.name,
        realm_id: company.realmId,
        qbo_company_name: company.name,
        firm_id: null, // Will be set by RLS policy
        connection_status: 'connected' as const,
        status: 'green' as const,
        is_active: true
      }));

      const { error } = await supabase
        .from('clients')
        .insert(clientsToInsert);

      if (error) throw error;

      toast.success(`Successfully connected ${selectedCompanies.length} companies`);
      onComplete?.();
      
    } catch (error) {
      console.error('Error connecting companies:', error);
      toast.error('Failed to connect selected companies');
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p>Loading accessible companies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold">Select Companies to Monitor</h2>
        <p className="text-muted-foreground">
          Choose which QuickBooks companies you want to connect and monitor
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={selectAll}>
          Select All
        </Button>
        <Button variant="outline" onClick={deselectAll}>
          Deselect All
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12"></TableHead>
              <TableHead>Company Name</TableHead>
              <TableHead>Realm ID</TableHead>
              <TableHead>Last Sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => (
              <TableRow key={company.id}>
                <TableCell>
                  <Checkbox
                    checked={company.selected}
                    onCheckedChange={() => toggleCompany(company.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">{company.name}</TableCell>
                <TableCell>{company.realmId}</TableCell>
                <TableCell>
                  {company.lastSync ? company.lastSync.toLocaleDateString() : 'Never'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={connectSelectedCompanies}
          disabled={isConnecting || companies.filter(c => c.selected).length === 0}
          size="lg"
        >
          {isConnecting ? 'Connecting...' : `Connect Selected Companies (${companies.filter(c => c.selected).length})`}
        </Button>
      </div>
    </div>
  );
}