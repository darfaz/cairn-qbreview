# QuickBooks API Token Security Model

## Overview

This application implements a comprehensive multi-layered security model to protect QuickBooks API tokens from unauthorized access. The security model addresses the critical vulnerability where tokens could be stolen by malicious users.

## Security Layers

### 1. Database-Level Security (RLS Policies)

#### Enhanced Row-Level Security
- **Firm-Based Access Control**: Users can only access tokens for clients belonging to their firm
- **Role-Based Permissions**: Different roles have different levels of access
  - `admin`, `manager`, `owner`: Can modify tokens
  - Other roles: Read-only access to tokens for their firm's clients

#### Security Definer Functions
- `user_can_access_qbo_connection()`: Validates user can view tokens
- `user_can_modify_qbo_tokens()`: Validates user can modify tokens
- These functions prevent recursive RLS issues while maintaining security

#### Audit Logging
- All token access attempts are logged to `notification_logs`
- Tracks: user ID, client ID, action type, timestamp
- Enables security monitoring and compliance

### 2. Application-Level Encryption

#### Token Encryption (`src/lib/tokenSecurity.ts`)
- **AES-CBC Encryption**: Industry-standard symmetric encryption
- **Session-Based Keys**: Encryption keys derived from user session data
- **Random IVs**: Each encryption uses a unique initialization vector
- **Web Crypto API**: Uses browser's native crypto functions for security

#### Secure Storage Pattern
```typescript
// Tokens are encrypted before database storage
const encryptedToken = await encryptToken(plainTextToken);
await supabase.from('qbo_connections').insert({
  access_token: encryptedToken,
  // ... other fields
});

// Tokens are decrypted when retrieved
const { data } = await supabase.from('qbo_connections').select('*');
const plainTextToken = await decryptToken(data.access_token);
```

### 3. Safe Data Access

#### Secure View (`qbo_connections_safe`)
- Never exposes raw tokens in queries
- Shows only token status (`ENCRYPTED` or `MISSING`)
- Safe for general application queries

#### Token Management Hook (`src/hooks/useQBOTokens.tsx`)
- Abstracted token operations with built-in security
- Error handling and user feedback
- Automatic token validation and refresh detection

## Security Best Practices Implementation

### 1. Principle of Least Privilege
- Users can only access data for their firm's clients
- Role-based permissions for sensitive operations
- Separate functions for viewing vs modifying tokens

### 2. Defense in Depth
- **Database Level**: RLS policies and constraints
- **Application Level**: Encryption and validation
- **Access Level**: Firm-based segregation

### 3. Audit Trail
- All token access is logged
- Security events are tracked in `notification_logs`
- Enables forensic analysis if needed

### 4. Data Validation
- Token length validation (minimum 10 characters)
- Connection status constraints
- Required field validation

## Usage Examples

### Storing Tokens Securely
```typescript
import { useQBOTokens } from '@/hooks/useQBOTokens';

const { storeTokens } = useQBOTokens();

await storeTokens(
  clientId,
  accessToken,
  refreshToken,
  expiresAt,
  realmId
);
```

### Retrieving Tokens Securely
```typescript
const { retrieveTokens } = useQBOTokens();

const result = await retrieveTokens(clientId);
if (result.success) {
  const { accessToken, refreshToken } = result.tokens;
  // Use tokens for QuickBooks API calls
}
```

### Token Validation
```typescript
const { validateTokens } = useQBOTokens();

const result = await validateTokens(clientId);
if (result.needsRefresh) {
  // Implement token refresh logic
}
```

## Security Considerations

### For Developers

1. **Never Log Tokens**: Avoid logging decrypted tokens to console
2. **Use Secure View**: Query `qbo_connections_safe` for general operations
3. **Validate Permissions**: Always check user permissions before token operations
4. **Handle Errors Securely**: Don't expose sensitive error details to users

### For Production

1. **Environment Variables**: Use secure environment variables for encryption keys
2. **HTTPS Only**: Ensure all communications use HTTPS
3. **Token Rotation**: Implement regular token refresh cycles
4. **Monitoring**: Monitor audit logs for suspicious activity

## Database Schema Security

### Enhanced Constraints
- `check_tokens_not_empty`: Ensures tokens meet minimum security standards
- `qbo_connections_connection_status_check`: Validates connection status values
- Unique constraints on critical fields

### Indexes for Security
- `idx_qbo_connections_client_id_status`: Optimized secure queries
- `idx_qbo_connections_expires_at`: Token expiration monitoring
- `idx_profiles_firm_id`: Firm-based access optimization

## Threat Model Addressed

### Before Security Implementation
- ❌ Any authenticated user could access any QBO tokens
- ❌ Tokens stored in plain text
- ❌ No audit trail
- ❌ No access controls beyond basic authentication

### After Security Implementation
- ✅ Firm-based access control
- ✅ Role-based permissions
- ✅ Client-side token encryption
- ✅ Comprehensive audit logging
- ✅ Defense in depth security model
- ✅ Safe data access patterns

## Compliance

This security model helps meet compliance requirements for:
- **SOX**: Audit trails and access controls
- **PCI DSS**: Data protection and access controls
- **GDPR**: Data protection and privacy by design
- **SOC 2**: Security, availability, and confidentiality

## Security Monitoring

Monitor these metrics for security health:
- Failed token access attempts (check `notification_logs`)
- Token access patterns (unusual access times/volumes)
- Connection status changes
- Encryption/decryption failures

---

**Note**: This security model provides strong protection against token theft, but security is an ongoing process. Regularly review and update security measures as threats evolve.
