export const getQuickBooksConfig = () => {
  // Get current environment
  const isDevelopment = window.location.hostname.includes('lovable.app') || 
                        window.location.hostname === 'localhost';
  
  return {
    clientId: 'ABXzBl76HALJ2Vl6gBOManUvfOVb0r4mwFrsKNcbS8Mc4rcjqN',
    redirectUri: `${window.location.origin}/qbo-callback`,
    environment: isDevelopment ? 'sandbox' : 'production',
    authorizationUrl: 'https://appcenter.intuit.com/connect/oauth2',
    scope: 'com.intuit.quickbooks.accounting com.intuit.quickbooks.company.all'
  };
};

// Also export individual getters
export const getClientId = () => getQuickBooksConfig().clientId;
export const getRedirectUri = () => getQuickBooksConfig().redirectUri;
export const getEnvironment = () => getQuickBooksConfig().environment;
