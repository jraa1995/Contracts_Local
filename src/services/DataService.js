/**
 * DataService - Stub for GAS server-side compatibility
 * Actual data loading is handled by getContractPage/getContractInfo in Code.js
 */
class DataService {
  constructor() {
    this.cachedData = null;
    this.sheetName = 'AL_Extract';
  }
  loadContractData() { return []; }
  loadContractDataSync() { return []; }
  validateConnection() { return true; }
  validateDataIntegrity(data) { return { isValid: true, errors: [], warnings: [] }; }
  clearCache() { this.cachedData = null; }
}
