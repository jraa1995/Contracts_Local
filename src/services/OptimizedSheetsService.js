/**
 * OptimizedSheetsService - Stub for GAS server-side compatibility
 */
class OptimizedSheetsService {
  constructor() {
    this.apiCallStats = { totalCalls: 0, cacheHits: 0, cacheMisses: 0, bytesTransferred: 0 };
  }
  loadSheetData(spreadsheetId, sheetName) { return []; }
  getApiStats() { return { ...this.apiCallStats, totalDataMB: '0 MB', cacheHitRate: '0%' }; }
  healthCheck() { return { healthy: true }; }
}
