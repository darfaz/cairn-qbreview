import { quickbooksConfig } from '@/config/quickbooks';

// Generate random state for CSRF protection
function generateState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Build authorization URL
export function getQuickBooksAuthUrl() {
  const state = generateState();
  
  // Store state in sessionStorage for validation later
  sessionStorage.setItem('qb_oauth_state', state);
  
  const params = new URLSearchParams({
    client_id: quickbooksConfig.clientId,
    scope: quickbooksConfig.scope,
    redirect_uri: quickbooksConfig.redirectUri,
    response_type: 'code',
    state: state
  });
  
  return `${quickbooksConfig.authorizationUrl}?${params.toString()}`;
}

// Redirect to QuickBooks OAuth
export function connectToQuickBooks() {
  // Validate configuration
  if (!quickbooksConfig.clientId || quickbooksConfig.clientId === 'REPLACE_WITH_YOUR_CLIENT_ID') {
    alert('QuickBooks integration not configured. Please contact support.');
    console.error('QuickBooks Client ID not configured');
    return;
  }
  
  try {
    const authUrl = getQuickBooksAuthUrl();
    console.log('Redirecting to:', authUrl); // For debugging
    window.location.href = authUrl;
  } catch (error) {
    console.error('Error initiating QuickBooks OAuth:', error);
    alert('Failed to connect to QuickBooks. Please try again.');
  }
}
