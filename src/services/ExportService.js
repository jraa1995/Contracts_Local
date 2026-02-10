/**
 * ExportService - Stub for GAS server-side compatibility
 * Actual CSV export is handled client-side in scripts.html
 */
class ExportService {
  constructor() {
    this.exportConfigurations = {
      summary: { name: 'Summary Report' },
      detailed: { name: 'Detailed Report' },
      financial: { name: 'Financial Analysis' },
      personnel: { name: 'Personnel Report' }
    };
  }
  getAvailableConfigurations() { return this.exportConfigurations; }
  setCurrentData(data) {}
  checkExportPermission(user) { return true; }
}
