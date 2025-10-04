export const quickbooksConfig = {
  clientId: 'ABC26AQKsKFuq5zbtbGukJeU3bGgwWiHodDbsJk5AeGnqRu7Tg',
  redirectUri: window.location.origin + '/#/qbo-callback',
  environment: 'sandbox', // Change to 'production' later
  authorizationUrl: 'https://appcenter.intuit.com/connect/oauth2',
  scope: 'com.intuit.quickbooks.accounting'
};
