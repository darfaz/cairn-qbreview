import { Search, Settings, UserCircle, Bell, LogOut, Users, Filter } from 'lucide-react';
import bescoredLogo from '@/assets/bescored-logo.png';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardHeaderProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
  showSearch?: boolean;
}

export function DashboardHeader({ searchQuery = '', onSearchChange, statusFilter = 'all', onStatusFilterChange, showSearch = true }: DashboardHeaderProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    } else {
      navigate('/landing');
    }
  };

  return (
    <header className="p-0 m-0 border-0 shadow-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/')}
            className="hover:opacity-80 transition-opacity p-0 m-0 border-0 shadow-none"
          >
            <img 
              src={bescoredLogo} 
              alt="BeScored" 
              className="block h-72 w-auto"
            />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          {showSearch && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger className="w-40">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
          
          <Button variant="ghost" size="sm" onClick={() => navigate('/clients')} title="Clients">
            <Users className="w-4 h-4" />
          </Button>
          
          <Button variant="ghost" size="sm">
            <Bell className="w-4 h-4" />
          </Button>
          
          <Button variant="ghost" size="sm" onClick={() => navigate('/settings')}>
            <Settings className="w-4 h-4" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <UserCircle className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user?.email || 'Account'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}