/**
 * DashboardController - Stub for GAS server-side compatibility
 * Actual dashboard coordination is handled client-side in scripts.html
 */
class DashboardController {
  constructor() {
    this.contractData = [];
    this.filteredData = [];
    this.isInitialized = false;
  }
  initialize() { this.isInitialized = true; }
  loadData() { return []; }
  refreshDashboard() {}
  cleanup() {}
}
