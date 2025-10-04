export const getQuickBooksConfig = () => {
  // Get current environment
  const isDevelopment = window.location.hostname.includes('lovable.app') || 
                        window.location.hostname === 'localhost';
  
  return {
    clientId: 'ABC26AQKsKFuq5zbtbGukJeU3bGgwWiHodDbsJk5AeGnqRu7Tg',
    redirectUri: `${window.location.origin}/qbo-callback`,
    environment: isDevelopment ? 'sandbox' : 'production',
    authorizationUrl: 'https://appcenter.intuit.com/connect/oauth2',
    scope: 'com.intuit.quickbooks.accounting'
  };
};

// Also export individual getters
export const getClientId = () => getQuickBooksConfig().clientId;
export const getRedirectUri = () => getQuickBooksConfig().redirectUri;
export const getEnvironment = () => getQuickBooksConfig().environment;
