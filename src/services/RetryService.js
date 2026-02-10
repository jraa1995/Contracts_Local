/**
 * RetryService - Stub for GAS server-side compatibility
 * Removed setTimeout/Promise usage that can crash GAS runtime
 */
class RetryService {
  constructor() {
    this.stats = { totalAttempts: 0, totalRetries: 0, successfulRetries: 0, failedOperations: 0, circuitBreakerTrips: 0 };
  }
  executeWithRetry(operation) { return operation(); }
  retrySheetOperation(operation) { return operation(); }
  retryDataProcessing(operation) { return operation(); }
  getStats() { return { ...this.stats, successRate: '100%', circuitBreakers: [] }; }
  reset() {}
  healthCheck() { return { healthy: true, openCircuits: 0 }; }
}
