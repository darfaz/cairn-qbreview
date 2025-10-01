import { supabase } from '@/integrations/supabase/client';

export async function addQBOClient(clientData: {
  realm_id: string;
  client_name: string;
  user_id: string;
}) {
  try {
    // First, check if the realm_id already exists
    const { data: existingClient, error: checkError } = await supabase
      .from('clients')
      .select('*')
      .eq('realm_id', clientData.realm_id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw checkError;
    }

    if (existingClient) {
      // Update existing client instead of inserting
      const { data, error } = await supabase
        .from('clients')
        .update({
          client_name: clientData.client_name,
          updated_at: new Date().toISOString(),
        })
        .eq('realm_id', clientData.realm_id)
        .select()
        .single();

      if (error) throw error;
      
      return {
        success: true,
        action: 'updated',
        data,
        message: `Client "${clientData.client_name}" updated successfully`
      };
    } else {
      // Insert new client
      const { data, error } = await supabase
        .from('clients')
        .insert({
          realm_id: clientData.realm_id,
          client_name: clientData.client_name,
          user_id: clientData.user_id,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        action: 'created',
        data,
        message: `Client "${clientData.client_name}" added successfully`
      };
    }
  } catch (error: any) {
    console.error('Error adding QBO client:', error);
    
    // Provide user-friendly error messages
    if (error.code === '23505') { // PostgreSQL duplicate key error
      return {
        success: false,
        error: `A client with Realm ID ${clientData.realm_id} already exists`
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to add client'
    };
  }
}