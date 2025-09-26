/**
 * Rate limiter for QuickBooks API calls to prevent exceeding limits
 */

interface RateLimitState {
  [companyId: string]: {
    callCount: number;
    windowStart: number;
    lastCall: number;
  };
}

class QBRateLimiter {
  private state: RateLimitState = {};
  private maxCallsPerMinute = 30; // Conservative limit
  private minDelayBetweenCalls = 1000; // 1 second minimum delay

  /**
   * Check if we can make a call for this company
   */
  canMakeCall(companyId: string): boolean {
    const now = Date.now();
    const company = this.state[companyId];

    if (!company) {
      this.state[companyId] = {
        callCount: 1,
        windowStart: now,
        lastCall: now
      };
      return true;
    }

    // Reset window if more than 1 minute has passed
    if (now - company.windowStart > 60000) {
      company.callCount = 1;
      company.windowStart = now;
      company.lastCall = now;
      return true;
    }

    // Check if we've exceeded the rate limit
    if (company.callCount >= this.maxCallsPerMinute) {
      return false;
    }

    // Check minimum delay between calls
    if (now - company.lastCall < this.minDelayBetweenCalls) {
      return false;
    }

    company.callCount++;
    company.lastCall = now;
    return true;
  }

  /**
   * Wait until we can make a call for this company
   */
  async waitForNextCall(companyId: string): Promise<void> {
    const now = Date.now();
    const company = this.state[companyId];

    if (!company) {
      return; // No previous calls, can proceed immediately
    }

    // Calculate delays needed
    const timeSinceLastCall = now - company.lastCall;
    const minDelayNeeded = Math.max(0, this.minDelayBetweenCalls - timeSinceLastCall);
    
    // If we're at the rate limit, wait until the window resets
    const windowTimeLeft = 60000 - (now - company.windowStart);
    const rateLimitDelay = company.callCount >= this.maxCallsPerMinute ? windowTimeLeft : 0;

    const totalDelay = Math.max(minDelayNeeded, rateLimitDelay);

    if (totalDelay > 0) {
      console.log(`Rate limiting: waiting ${totalDelay}ms for company ${companyId}`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }

  /**
   * Execute a function with exponential backoff on failure
   */
  async executeWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Process multiple companies with proper rate limiting
   */
  async processBulkOperation<T>(
    companyIds: string[],
    operation: (companyId: string) => Promise<T>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Array<{ companyId: string; result?: T; error?: string }>> {
    const results: Array<{ companyId: string; result?: T; error?: string }> = [];

    for (let i = 0; i < companyIds.length; i++) {
      const companyId = companyIds[i];
      
      try {
        // Wait for rate limit clearance
        await this.waitForNextCall(companyId);
        
        // Execute operation with exponential backoff
        const result = await this.executeWithBackoff(() => operation(companyId));
        
        results.push({ companyId, result });
        
        console.log(`Completed operation for company ${companyId} (${i + 1}/${companyIds.length})`);
        
      } catch (error) {
        console.error(`Operation failed for company ${companyId}:`, error);
        results.push({ 
          companyId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      // Report progress
      if (onProgress) {
        onProgress(i + 1, companyIds.length);
      }
    }

    return results;
  }

  /**
   * Reset rate limit state for a company (useful for testing)
   */
  resetCompany(companyId: string): void {
    delete this.state[companyId];
  }

  /**
   * Get current rate limit status for a company
   */
  getStatus(companyId: string): {
    callsInCurrentWindow: number;
    windowTimeRemaining: number;
    timeSinceLastCall: number;
  } {
    const now = Date.now();
    const company = this.state[companyId];

    if (!company) {
      return {
        callsInCurrentWindow: 0,
        windowTimeRemaining: 60000,
        timeSinceLastCall: Infinity
      };
    }

    return {
      callsInCurrentWindow: company.callCount,
      windowTimeRemaining: Math.max(0, 60000 - (now - company.windowStart)),
      timeSinceLastCall: now - company.lastCall
    };
  }
}

// Export a singleton instance
export const qbRateLimiter = new QBRateLimiter();