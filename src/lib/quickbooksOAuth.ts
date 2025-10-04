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
  
  // Validate configuration
  if (!config.clientId || config.clientId.includes('REPLACE')) {
    console.error('QuickBooks Client ID not configured');
    alert('QuickBooks integration not configured. Please contact support.');
    return;
  }
  
  try {
    const authUrl = getQuickBooksAuthUrl();
    console.log('Redirecting to QuickBooks OAuth...');
    
    // Use window.location.href for redirect (not window.open)
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error initiating QuickBooks OAuth:', error);
    alert('Failed to connect to QuickBooks. Please try again.');
  }
}
