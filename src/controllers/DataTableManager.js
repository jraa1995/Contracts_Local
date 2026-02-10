/**
 * DataTableManager - Stub for GAS server-side compatibility
 * Actual table rendering is handled client-side in scripts.html
 */
class DataTableManager {
  constructor() {
    this.currentData = [];
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.currentPage = 1;
    this.pageSize = 50;
  }
  renderTable(data) { this.currentData = data || []; }
  initialize(data) { this.currentData = data || []; }
  getTableConfig() { return {}; }
  setTableConfig(config) {}
}
