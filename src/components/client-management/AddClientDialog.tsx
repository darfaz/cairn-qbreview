import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const clientSchema = z.object({
  realmId: z.string()
    .min(1, 'Realm ID is required')
    .trim(),
  clientName: z.string()
    .min(1, 'Client name is required')
    .max(255, 'Client name must be less than 255 characters')
    .trim(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface AddClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientAdded: () => void;
}

export function AddClientDialog({ open, onOpenChange, onClientAdded }: AddClientDialogProps) {
  const { toast } = useToast();
  
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      realmId: '',
      clientName: '',
    },
  });

  const onSubmit = async (data: ClientFormData) => {
    try {
      // Get current user and their firm
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please log in to add clients",
          variant: "destructive",
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('firm_id')
        .eq('id', user.id)
        .single();

      if (!profile?.firm_id) {
        toast({
          title: "Firm association required",
          description: "Your account is not associated with a firm",
          variant: "destructive",
        });
        return;
      }

      // Insert the new client
      const { error } = await supabase
        .from('clients')
        .insert({
          firm_id: profile.firm_id,
          realm_id: data.realmId,
          client_name: data.clientName,
          name: data.clientName, // Keep both for compatibility
          created_by: user.id,
          connection_status: 'pending',
          is_active: true
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Client already exists",
            description: "A client with this Realm ID already exists",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Failed to add client",
            description: error.message,
            variant: "destructive",
          });
        }
        return;
      }

      toast({
        title: "Client added successfully",
        description: `${data.clientName} has been added to your client list`,
      });

      // Reset form and close dialog
      form.reset();
      onOpenChange(false);
      onClientAdded();
      
    } catch (error) {
      toast({
        title: "Unexpected error",
        description: "An error occurred while adding the client",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Client
          </DialogTitle>
          <DialogDescription>
            Add a new client to your QuickBooks review dashboard.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="realmId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Realm ID</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter QuickBooks Realm ID" 
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The unique QuickBooks company identifier
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter client company name" 
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The display name for this client
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 justify-end pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Adding...' : 'Add Client'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}