import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  storeQBOTokens, 
  getQBOTokens, 
  ensureValidTokens, 
  revokeQBOTokens 
} from '@/lib/tokenSecurity';

/**
 * Secure hook for managing QuickBooks Online tokens
 * 
 * This hook provides a secure interface for storing, retrieving, and managing
 * QBO API tokens with built-in encryption and validation.
 */
export const useQBOTokens = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Store encrypted tokens
  const storeTokens = useCallback(async (
    clientId: string,
    accessToken: string,
    refreshToken: string,
    expiresAt: string,
    realmId: string
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      await storeQBOTokens(clientId, accessToken, refreshToken, expiresAt, realmId);
      toast.success('QuickBooks connection established securely');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to store tokens';
      setError(errorMessage);
      toast.error(`Connection failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Retrieve and decrypt tokens
  const retrieveTokens = useCallback(async (clientId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const tokens = await getQBOTokens(clientId);
      return { success: true, tokens };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve tokens';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Check token validity and refresh if needed
  const validateTokens = useCallback(async (clientId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await ensureValidTokens(clientId);
      
      if (result.needsRefresh) {
        toast.warning('QuickBooks tokens need refresh');
      }
      
      return { 
        success: true, 
        needsRefresh: result.needsRefresh, 
        tokens: result.tokens 
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Token validation failed';
      setError(errorMessage);
      toast.error(`Validation failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Securely revoke tokens
  const revokeTokens = useCallback(async (clientId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await revokeQBOTokens(clientId);
      toast.success('QuickBooks connection revoked successfully');
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to revoke tokens';
      setError(errorMessage);
      toast.error(`Revocation failed: ${errorMessage}`);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  // Check if client has valid tokens
  const hasValidTokens = useCallback(async (clientId: string) => {
    try {
      const result = await validateTokens(clientId);
      return result.success && !result.needsRefresh;
    } catch {
      return false;
    }
  }, [validateTokens]);

  return {
    loading,
    error,
    storeTokens,
    retrieveTokens,
    validateTokens,
    revokeTokens,
    hasValidTokens
  };
};