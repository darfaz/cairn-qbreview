import { getQuickBooksConfig } from '@/config/quickbooks';

function generateState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

export function getQuickBooksAuthUrl(): string {
  const config = getQuickBooksConfig();
  const state = generateState();
  
  // Store state in sessionStorage
  sessionStorage.setItem('qb_oauth_state', state);
  
  const params = new URLSearchParams({
    client_id: config.clientId,
    scope: config.scope,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    state: state
  });
  
  const authUrl = `${config.authorizationUrl}?${params.toString()}`;
  console.log('QuickBooks OAuth URL:', authUrl);
  console.log('Redirect URI:', config.redirectUri);
  
  return authUrl;
}

export function connectToQuickBooks(): void {
  const config = getQuickBooksConfig();
  
  console.log('=== QuickBooks OAuth Configuration ===');
  console.log('1. Client ID:', config.clientId);
  console.log('2. Redirect URI:', config.redirectUri);
  console.log('3. Auth URL:', config.authorizationUrl);
  console.log('4. Scope:', config.scope);
  console.log('5. Environment:', config.environment);
  console.log('6. Window Origin:', window.location.origin);
  
  if (!config.clientId || config.clientId.includes('REPLACE')) {
    alert('QuickBooks Client ID not configured. Please contact support.');
    return;
  }
  
  try {
    const state = generateState();
    sessionStorage.setItem('qb_oauth_state', state);
    
    const params = new URLSearchParams({
      client_id: config.clientId,
      scope: config.scope,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      state: state
    });
    
    const authUrl = `${config.authorizationUrl}?${params.toString()}`;
    
    console.log('=== Full OAuth URL ===');
    console.log(authUrl);
    
    // Show alert with redirect URI for user to verify
    const confirmed = confirm(
      `About to redirect to QuickBooks OAuth.\n\n` +
      `Redirect URI being used:\n${config.redirectUri}\n\n` +
      `Make sure this EXACT URL is added in your Intuit Developer Portal under Keys & OAuth > Redirect URIs.\n\n` +
      `Click OK to continue, or Cancel to abort.`
    );
    
    if (!confirmed) {
      console.log('User cancelled OAuth flow');
      return;
    }
    
    console.log('Redirecting to QuickBooks OAuth...');
    window.location.href = authUrl;
    
  } catch (error) {
    console.error('Error initiating QuickBooks OAuth:', error);
    alert('Failed to connect to QuickBooks. Please try again.');
  }
}
