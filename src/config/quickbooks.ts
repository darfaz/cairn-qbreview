export const quickbooksConfig = {
  clientId: '', // Configure this in your QuickBooks Developer account
  redirectUri: window.location.origin + '/#/qbo-callback',
  environment: 'sandbox', // Change to 'production' later
  authorizationUrl: 'https://appcenter.intuit.com/connect/oauth2',
  scope: 'com.intuit.quickbooks.accounting'
};
