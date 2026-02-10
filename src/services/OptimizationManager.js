/**
 * OptimizationManager - Stub for GAS server-side compatibility
 * Removed service instantiation and setInterval calls that crash the runtime
 */
class OptimizationManager {
  constructor() {
    this.gasOptimization = null;
    this.cachingService = null;
    this.retryService = null;
    this.optimizedSheets = null;
  }
  initialize(config) {}
  getOptimizationStatus() { return { overall: { healthy: true } }; }
  reset() {}
  healthCheck() { return { healthy: true }; }
}
