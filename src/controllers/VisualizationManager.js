/**
 * VisualizationManager - Stub for GAS server-side compatibility
 * Actual chart rendering is handled client-side in scripts.html via Chart.js
 */
class VisualizationManager {
  constructor() {
    this.charts = {};
  }
  initializeCharts(data) {}
  updateCharts(data) {}
  exportChartImages() { return []; }
  cleanup() {}
}
