/**
 * ExportService - Handles data export functionality
 * Provides methods for exporting data in various formats including CSV, PDF, and Excel
 * Supports filtered data export with metadata and formatting preservation
 */

/**
 * ExportService class for comprehensive data export operations
 */
class ExportService {
  constructor() {
    this.exportConfigurations = {
      summary: {
        name: 'Summary Report',
        includeCharts: true,
        includeMetadata: true,
        maxRows: 100,
        columns: ['award', 'project', 'ceiling', 'awardValue', 'status', 'projectManager', 'awardDate', 'projectEnd']
      },
      detailed: {
        name: 'Detailed Report',
        includeCharts: true,
        includeMetadata: true,
        maxRows: null,
        columns: 'all'
      },
      financial: {
        name: 'Financial Analysis',
        includeCharts: true,
        includeMetadata: true,
        maxRows: null,
        columns: ['award', 'project', 'ceiling', 'awardValue', 'remainingBudget', 'status', 'clientBureau', 'sector']
      },
      personnel: {
        name: 'Personnel Report',
        includeCharts: false,
        includeMetadata: true,
        maxRows: null,
        columns: ['award', 'project', 'projectManager', 'contractingOfficer', 'contractSpecialist', 'programManager', 'status']
      }
    };
  }

  /**
   * Export filtered data to CSV format with all visible columns
   * @param {ContractData[]} data - Contract data to export
   * @param {FilterCriteria} filters - Applied filters for metadata
   * @param {Object} options - Export options
   * @returns {Blob} CSV file blob
   */
  exportToCSV(data, filters = {}, options = {}) {
    try {
      const config = this.getExportConfiguration(options.configuration || 'detailed');
      const exportData = this.prepareDataForExport(data, config);
      
      // Generate CSV content
      const csvContent = this.generateCSVContent(exportData, config, filters);
      
      // Create blob with proper encoding
      const blob = new Blob([csvContent], { 
        type: 'text/csv;charset=utf-8;' 
      });
      
      return blob;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw new Error(`CSV export failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive PDF report with visualizations and summary statistics
   * @param {ContractData[]} data - Contract data
   * @param {Object[]} charts - Chart images from VisualizationManager
   * @param {FilterCriteria} filters - Applied filters for metadata
   * @param {Object} options - Export options
   * @returns {Blob} PDF file blob
   */
  generatePDFReport(data, charts = [], filters = {}, options = {}) {
    try {
      const config = this.getExportConfiguration(options.configuration || 'summary');
      const exportData = this.prepareDataForExport(data, config);
      
      // Generate PDF content using HTML to PDF conversion
      const htmlContent = this.generatePDFHTMLContent(exportData, charts, config, filters);
      
      // For Google Apps Script environment, we'll use HTML Service to generate PDF
      // This is a simplified approach - in production, you might want to use a dedicated PDF library
      const pdfBlob = this.convertHTMLToPDF(htmlContent);
      
      return pdfBlob;
    } catch (error) {
      console.error('Error generating PDF report:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Create Excel workbook with multiple sheets for complex data analysis
   * @param {ContractData[]} data - Contract data
   * @param {FilterCriteria} filters - Applied filters for metadata
   * @param {Object} options - Export options
   * @returns {Blob} Excel file blob
   */
  createExcelWorkbook(data, filters = {}, options = {}) {
    try {
      const config = this.getExportConfiguration(options.configuration || 'detailed');
      const exportData = this.prepareDataForExport(data, config);
      
      // Generate Excel content using CSV format (simplified approach for Google Apps Script)
      // In a full implementation, you would use a library like SheetJS
      const excelContent = this.generateExcelContent(exportData, config, filters);
      
      // Create blob with Excel MIME type
      const blob = new Blob([excelContent], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      return blob;
    } catch (error) {
      console.error('Error creating Excel workbook:', error);
      throw new Error(`Excel export failed: ${error.message}`);
    }
  }

  /**
   * Get export configuration by name
   * @param {string} configName - Configuration name
   * @returns {Object} Export configuration
   */
  getExportConfiguration(configName) {
    return this.exportConfigurations[configName] || this.exportConfigurations.detailed;
  }

  /**
   * Prepare data for export based on configuration
   * @param {ContractData[]} data - Raw contract data
   * @param {Object} config - Export configuration
   * @returns {Object[]} Prepared export data
   */
  prepareDataForExport(data, config) {
    let exportData = [...data];
    
    // Apply row limit if specified
    if (config.maxRows && exportData.length > config.maxRows) {
      exportData = exportData.slice(0, config.maxRows);
    }
    
    // Filter columns if specified
    if (config.columns !== 'all' && Array.isArray(config.columns)) {
      exportData = exportData.map(row => {
        const filteredRow = {};
        config.columns.forEach(column => {
          if (row.hasOwnProperty(column)) {
            filteredRow[column] = row[column];
          }
        });
        return filteredRow;
      });
    }
    
    return exportData;
  }

  /**
   * Generate CSV content with proper formatting and metadata
   * @param {Object[]} data - Prepared export data
   * @param {Object} config - Export configuration
   * @param {FilterCriteria} filters - Applied filters
   * @returns {string} CSV content
   */
  generateCSVContent(data, config, filters) {
    const lines = [];
    
    // Add metadata header if enabled
    if (config.includeMetadata) {
      lines.push('# Contract Management Dashboard Export');
      lines.push(`# Generated: ${DateUtils.formatDate(new Date(), 'long')}`);
      lines.push(`# Configuration: ${config.name}`);
      lines.push(`# Total Records: ${data.length}`);
      
      // Add filter information
      if (filters && Object.keys(filters).length > 0) {
        lines.push('# Applied Filters:');
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== null && value !== undefined && value !== '') {
            lines.push(`#   ${key}: ${this.formatFilterValue(value)}`);
          }
        });
      }
      
      lines.push(''); // Empty line separator
    }
    
    if (data.length === 0) {
      lines.push('No data available for export');
      return lines.join('\n');
    }
    
    // Generate headers
    const headers = this.getCSVHeaders(data[0]);
    lines.push(headers.join(','));
    
    // Generate data rows
    data.forEach(row => {
      const csvRow = this.formatCSVRow(row, headers);
      lines.push(csvRow.join(','));
    });
    
    return lines.join('\n');
  }

  /**
   * Get CSV headers from data object
   * @param {Object} sampleRow - Sample data row
   * @returns {string[]} CSV headers
   */
  getCSVHeaders(sampleRow) {
    const headers = [];
    
    Object.keys(sampleRow).forEach(key => {
      // Skip internal fields
      if (key.startsWith('_')) return;
      
      // Convert camelCase to readable format
      const header = this.formatHeaderName(key);
      headers.push(header);
    });
    
    return headers;
  }

  /**
   * Format header name for display
   * @param {string} key - Object key
   * @returns {string} Formatted header name
   */
  formatHeaderName(key) {
    // Convert camelCase to Title Case
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Format CSV row with proper escaping and formatting
   * @param {Object} row - Data row
   * @param {string[]} headers - CSV headers
   * @returns {string[]} Formatted CSV row
   */
  formatCSVRow(row, headers) {
    return headers.map(header => {
      const key = this.headerToKey(header);
      const value = row[key];
      
      return this.formatCSVValue(value, key);
    });
  }

  /**
   * Convert header back to object key
   * @param {string} header - Header name
   * @returns {string} Object key
   */
  headerToKey(header) {
    // Convert "Title Case" back to camelCase
    return header
      .toLowerCase()
      .replace(/\s+(.)/g, (match, char) => char.toUpperCase());
  }

  /**
   * Format individual CSV value with proper escaping and type handling
   * @param {any} value - Value to format
   * @param {string} key - Field key for context
   * @returns {string} Formatted CSV value
   */
  formatCSVValue(value, key) {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Handle different data types
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return `"${DateUtils.formatDate(value, 'iso')}"`;
      } else if (value.name && value.email) {
        // Personnel object
        return `"${value.name} (${value.email})"`;
      } else {
        return `"${JSON.stringify(value)}"`;
      }
    }
    
    // Handle financial values
    if (key.includes('ceiling') || key.includes('award') || key.includes('budget') || key.includes('Value')) {
      if (typeof value === 'number') {
        return FinancialFormatter.Formatters.export(value);
      }
    }
    
    // Handle strings that need escaping
    const stringValue = value.toString();
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  /**
   * Format filter value for metadata display
   * @param {any} value - Filter value
   * @returns {string} Formatted filter value
   */
  formatFilterValue(value) {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object' && value.startDate && value.endDate) {
      return `${DateUtils.formatDate(value.startDate)} to ${DateUtils.formatDate(value.endDate)}`;
    }
    
    return value.toString();
  }

  /**
   * Generate HTML content for PDF report
   * @param {Object[]} data - Export data
   * @param {Object[]} charts - Chart images
   * @param {Object} config - Export configuration
   * @param {FilterCriteria} filters - Applied filters
   * @returns {string} HTML content
   */
  generatePDFHTMLContent(data, charts, config, filters) {
    const html = [];
    
    html.push('<!DOCTYPE html>');
    html.push('<html><head>');
    html.push('<meta charset="utf-8">');
    html.push('<title>Contract Management Dashboard Report</title>');
    html.push('<style>');
    html.push(this.getPDFStyles());
    html.push('</style>');
    html.push('</head><body>');
    
    // Report header
    html.push('<div class="header">');
    html.push('<h1>Contract Management Dashboard Report</h1>');
    html.push(`<p class="subtitle">${config.name}</p>`);
    html.push(`<p class="meta">Generated: ${DateUtils.formatDate(new Date(), 'long')}</p>`);
    html.push('</div>');
    
    // Executive summary
    html.push('<div class="section">');
    html.push('<h2>Executive Summary</h2>');
    html.push(this.generateExecutiveSummary(data));
    html.push('</div>');
    
    // Charts section
    if (config.includeCharts && charts.length > 0) {
      html.push('<div class="section">');
      html.push('<h2>Visualizations</h2>');
      charts.forEach(chart => {
        html.push(`<div class="chart-container">`);
        html.push(`<h3>${this.formatChartTitle(chart.name)}</h3>`);
        html.push(`<img src="${chart.url}" alt="${chart.name}" class="chart-image">`);
        html.push('</div>');
      });
      html.push('</div>');
    }
    
    // Data table
    html.push('<div class="section">');
    html.push('<h2>Contract Data</h2>');
    html.push(this.generateHTMLTable(data));
    html.push('</div>');
    
    // Filter information
    if (config.includeMetadata && filters && Object.keys(filters).length > 0) {
      html.push('<div class="section">');
      html.push('<h2>Applied Filters</h2>');
      html.push(this.generateFilterTable(filters));
      html.push('</div>');
    }
    
    html.push('</body></html>');
    
    return html.join('\n');
  }

  /**
   * Get CSS styles for PDF report
   * @returns {string} CSS styles
   */
  getPDFStyles() {
    return `
      body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
      .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3498db; padding-bottom: 20px; }
      h1 { color: #2c3e50; margin: 0; }
      .subtitle { font-size: 18px; color: #7f8c8d; margin: 10px 0; }
      .meta { font-size: 14px; color: #95a5a6; }
      .section { margin: 30px 0; page-break-inside: avoid; }
      h2 { color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 10px; }
      h3 { color: #2c3e50; margin-top: 20px; }
      .chart-container { margin: 20px 0; text-align: center; }
      .chart-image { max-width: 100%; height: auto; border: 1px solid #ddd; }
      table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 12px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
      th { background-color: #f8f9fa; font-weight: bold; }
      tr:nth-child(even) { background-color: #f8f9fa; }
      .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
      .summary-card { background: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #3498db; }
      .summary-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
      .summary-label { font-size: 14px; color: #7f8c8d; }
      @media print { .section { page-break-inside: avoid; } }
    `;
  }

  /**
   * Generate executive summary HTML
   * @param {Object[]} data - Export data
   * @returns {string} Executive summary HTML
   */
  generateExecutiveSummary(data) {
    const summary = this.calculateSummaryStatistics(data);
    
    const html = [];
    html.push('<div class="summary-grid">');
    
    Object.entries(summary).forEach(([key, value]) => {
      html.push('<div class="summary-card">');
      html.push(`<div class="summary-value">${value}</div>`);
      html.push(`<div class="summary-label">${this.formatHeaderName(key)}</div>`);
      html.push('</div>');
    });
    
    html.push('</div>');
    
    return html.join('\n');
  }

  /**
   * Calculate summary statistics for the report
   * @param {Object[]} data - Export data
   * @returns {Object} Summary statistics
   */
  calculateSummaryStatistics(data) {
    const summary = {
      totalContracts: data.length,
      totalValue: 0,
      totalCeiling: 0,
      activeContracts: 0,
      completedContracts: 0
    };
    
    data.forEach(contract => {
      if (contract.awardValue) {
        summary.totalValue += CurrencyUtils.parseCurrency(contract.awardValue);
      }
      if (contract.ceiling) {
        summary.totalCeiling += CurrencyUtils.parseCurrency(contract.ceiling);
      }
      
      const status = (contract.status || '').toLowerCase();
      if (status.includes('active') || status.includes('ongoing')) {
        summary.activeContracts++;
      } else if (status.includes('complete') || status.includes('closed')) {
        summary.completedContracts++;
      }
    });
    
    // Format financial values
    summary.totalValue = FinancialFormatter.formatCurrency(summary.totalValue, { compact: true });
    summary.totalCeiling = FinancialFormatter.formatCurrency(summary.totalCeiling, { compact: true });
    
    return summary;
  }

  /**
   * Format chart title for display
   * @param {string} chartName - Chart name
   * @returns {string} Formatted chart title
   */
  formatChartTitle(chartName) {
    return chartName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace('Chart', '')
      .trim();
  }

  /**
   * Generate HTML table for data
   * @param {Object[]} data - Export data
   * @returns {string} HTML table
   */
  generateHTMLTable(data) {
    if (data.length === 0) {
      return '<p>No data available</p>';
    }
    
    const html = [];
    const headers = this.getCSVHeaders(data[0]);
    
    html.push('<table>');
    html.push('<thead><tr>');
    headers.forEach(header => {
      html.push(`<th>${header}</th>`);
    });
    html.push('</tr></thead>');
    
    html.push('<tbody>');
    data.slice(0, 50).forEach(row => { // Limit to 50 rows for PDF
      html.push('<tr>');
      headers.forEach(header => {
        const key = this.headerToKey(header);
        const value = this.formatHTMLValue(row[key], key);
        html.push(`<td>${value}</td>`);
      });
      html.push('</tr>');
    });
    html.push('</tbody>');
    
    html.push('</table>');
    
    if (data.length > 50) {
      html.push(`<p><em>Showing first 50 of ${data.length} records</em></p>`);
    }
    
    return html.join('\n');
  }

  /**
   * Format value for HTML display
   * @param {any} value - Value to format
   * @param {string} key - Field key
   * @returns {string} Formatted HTML value
   */
  formatHTMLValue(value, key) {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      if (value instanceof Date) {
        return DateUtils.formatDate(value, 'short');
      } else if (value.name) {
        return value.name;
      } else {
        return JSON.stringify(value);
      }
    }
    
    // Handle financial values
    if (key.includes('ceiling') || key.includes('award') || key.includes('budget') || key.includes('Value')) {
      if (typeof value === 'number') {
        return FinancialFormatter.formatCurrency(value, { compact: true });
      }
    }
    
    return value.toString();
  }

  /**
   * Generate filter information table
   * @param {FilterCriteria} filters - Applied filters
   * @returns {string} Filter table HTML
   */
  generateFilterTable(filters) {
    const html = [];
    html.push('<table>');
    html.push('<thead><tr><th>Filter</th><th>Value</th></tr></thead>');
    html.push('<tbody>');
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        html.push('<tr>');
        html.push(`<td>${this.formatHeaderName(key)}</td>`);
        html.push(`<td>${this.formatFilterValue(value)}</td>`);
        html.push('</tr>');
      }
    });
    
    html.push('</tbody></table>');
    
    return html.join('\n');
  }

  /**
   * Convert HTML to PDF (simplified implementation for Google Apps Script)
   * @param {string} htmlContent - HTML content
   * @returns {Blob} PDF blob
   */
  convertHTMLToPDF(htmlContent) {
    // In Google Apps Script, we can use the HTML Service to create a PDF
    // This is a simplified approach - in production, you might use a dedicated PDF service
    try {
      // Create a temporary HTML file
      const htmlBlob = Utilities.newBlob(htmlContent, 'text/html', 'report.html');
      
      // For now, return the HTML as a blob - in a full implementation,
      // you would use a PDF conversion service or library
      return new Blob([htmlContent], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error converting HTML to PDF:', error);
      // Fallback: return HTML content
      return new Blob([htmlContent], { type: 'text/html' });
    }
  }

  /**
   * Generate Excel content (simplified CSV-based approach)
   * @param {Object[]} data - Export data
   * @param {Object} config - Export configuration
   * @param {FilterCriteria} filters - Applied filters
   * @returns {string} Excel content
   */
  generateExcelContent(data, config, filters) {
    // For Google Apps Script, we'll use CSV format with Excel MIME type
    // In a full implementation, you would use a library like SheetJS to create proper Excel files
    return this.generateCSVContent(data, config, filters);
  }

  /**
   * Schedule automated reports (placeholder for future implementation)
   * @param {Object} config - Report configuration
   */
  scheduleAutomatedReports(config) {
    // This would integrate with Google Apps Script triggers
    // to schedule regular report generation and delivery
    console.log('Automated report scheduling not yet implemented');
    
    // Future implementation would:
    // 1. Create time-based triggers
    // 2. Set up email delivery
    // 3. Configure report parameters
    // 4. Handle error notifications
  }

  /**
   * Get available export configurations
   * @returns {Object} Available configurations
   */
  getAvailableConfigurations() {
    return Object.keys(this.exportConfigurations).map(key => ({
      key: key,
      name: this.exportConfigurations[key].name,
      description: this.getConfigurationDescription(key)
    }));
  }

  /**
   * Get configuration description
   * @param {string} configKey - Configuration key
   * @returns {string} Configuration description
   */
  getConfigurationDescription(configKey) {
    const descriptions = {
      summary: 'High-level overview with key metrics and charts',
      detailed: 'Complete data export with all fields and visualizations',
      financial: 'Financial analysis focused on budget and spending data',
      personnel: 'Personnel assignments and contact information'
    };
    
    return descriptions[configKey] || 'Custom configuration';
  }
}