/**
 * Main Google Apps Script Application Controller
 * Serves as the primary entry point and coordinates all backend services
 * Provides comprehensive error handling, recovery, and health monitoring
 */

/**
 * Application configuration and global state
 */
const APP_CONFIG = {
  version: '1.0.0',
  name: 'Contract Management Dashboard',
  maxExecutionTime: 270000, // 4.5 minutes (GAS limit is 5 minutes)
  healthCheckInterval: 30000, // 30 seconds
  cacheTimeout: 300000, // 5 minutes
  maxRetryAttempts: 3,
  enableLogging: true,
  enablePerformanceMonitoring: true
};

/**
 * Global application state
 */
let appState = {
  initialized: false,
  startTime: null,
  lastHealthCheck: null,
  activeUsers: new Set(),
  performanceMetrics: {
    requestCount: 0,
    averageResponseTime: 0,
    errorCount: 0,
    lastError: null
  },
  services: {
    dataService: null,
    financialAnalyzer: null,
    personnelManager: null,
    timelineTracker: null,
    exportService: null,
    accessController: null,
    securityAuditor: null
  }
};

/**
 * Initialize application services and perform startup checks
 */
function initializeApplication() {
  try {
    const startTime = new Date();
    appState.startTime = startTime;
    
    console.log(`Initializing ${APP_CONFIG.name} v${APP_CONFIG.version}...`);
    
    // Initialize core services
    appState.services.dataService = new DataService();
    appState.services.financialAnalyzer = new FinancialAnalyzer();
    appState.services.personnelManager = new PersonnelManager();
    appState.services.timelineTracker = new Timeline_Tracker();
    appState.services.exportService = new ExportService();
    appState.services.accessController = new AccessController();
    appState.services.securityAuditor = new SecurityAuditor();
    
    // Perform health checks
    performHealthCheck();
    
    // Set up periodic maintenance
    setupPeriodicMaintenance();
    
    appState.initialized = true;
    
    const initTime = new Date() - startTime;
    console.log(`Application initialized successfully in ${initTime}ms`);
    
    // Log initialization
    appState.services.securityAuditor.logEvent('application_initialized', {
      version: APP_CONFIG.version,
      initTime: initTime,
      timestamp: startTime.toISOString()
    });
    
    return {
      success: true,
      initTime: initTime,
      version: APP_CONFIG.version,
      services: Object.keys(appState.services)
    };
    
  } catch (error) {
    console.error('Application initialization failed:', error);
    appState.performanceMetrics.errorCount++;
    appState.performanceMetrics.lastError = {
      message: error.message,
      timestamp: new Date(),
      context: 'initialization'
    };
    
    throw new Error(`Application initialization failed: ${error.message}`);
  }
}

/**
 * Perform comprehensive health check of all services
 */
function performHealthCheck() {
  const healthReport = {
    timestamp: new Date(),
    overall: 'healthy',
    services: {},
    performance: appState.performanceMetrics,
    uptime: appState.startTime ? new Date() - appState.startTime : 0
  };
  
  try {
    // Check data service
    healthReport.services.dataService = checkDataServiceHealth();
    
    // Check financial analyzer
    healthReport.services.financialAnalyzer = checkFinancialAnalyzerHealth();
    
    // Check export service
    healthReport.services.exportService = checkExportServiceHealth();
    
    // Check access controller
    healthReport.services.accessController = checkAccessControllerHealth();
    
    // Check Google Apps Script quotas
    healthReport.services.gasQuotas = checkGASQuotas();
    
    // Determine overall health
    const unhealthyServices = Object.values(healthReport.services)
      .filter(status => status !== 'healthy').length;
    
    if (unhealthyServices > 0) {
      healthReport.overall = unhealthyServices > 2 ? 'critical' : 'warning';
    }
    
    appState.lastHealthCheck = healthReport;
    
    if (APP_CONFIG.enableLogging) {
      console.log('Health Check:', healthReport);
    }
    
    return healthReport;
    
  } catch (error) {
    console.error('Health check failed:', error);
    healthReport.overall = 'error';
    healthReport.error = error.message;
    return healthReport;
  }
}

/**
 * Check data service health
 */
function checkDataServiceHealth() {
  try {
    if (!appState.services.dataService) return 'not_initialized';
    
    // Test basic functionality
    const testResult = appState.services.dataService.validateConnection();
    return testResult ? 'healthy' : 'warning';
    
  } catch (error) {
    console.error('Data service health check failed:', error);
    return 'error';
  }
}

/**
 * Check financial analyzer health
 */
function checkFinancialAnalyzerHealth() {
  try {
    if (!appState.services.financialAnalyzer) return 'not_initialized';
    
    // Test with minimal data
    const testData = [{ ceiling: 100, awardValue: 80, status: 'Active' }];
    const result = appState.services.financialAnalyzer.calculateTotalValues(testData);
    return result && result.totalContractValue === 80 ? 'healthy' : 'warning';
    
  } catch (error) {
    console.error('Financial analyzer health check failed:', error);
    return 'error';
  }
}

/**
 * Check export service health
 */
function checkExportServiceHealth() {
  try {
    if (!appState.services.exportService) return 'not_initialized';
    
    // Test configuration access
    const configs = appState.services.exportService.getAvailableConfigurations();
    return configs && Object.keys(configs).length > 0 ? 'healthy' : 'warning';
    
  } catch (error) {
    console.error('Export service health check failed:', error);
    return 'error';
  }
}

/**
 * Check access controller health
 */
function checkAccessControllerHealth() {
  try {
    if (!appState.services.accessController) return 'not_initialized';
    
    // Test user session
    const user = Session.getActiveUser();
    return user && user.getEmail() ? 'healthy' : 'warning';
    
  } catch (error) {
    console.error('Access controller health check failed:', error);
    return 'error';
  }
}

/**
 * Check Google Apps Script quotas and limits
 */
function checkGASQuotas() {
  try {
    const quotaInfo = {
      executionTime: new Date() - appState.startTime,
      maxExecutionTime: APP_CONFIG.maxExecutionTime,
      memoryUsage: 'unknown', // GAS doesn't provide direct memory info
      status: 'healthy'
    };
    
    // Check execution time
    if (quotaInfo.executionTime > APP_CONFIG.maxExecutionTime * 0.8) {
      quotaInfo.status = 'warning';
    }
    
    if (quotaInfo.executionTime > APP_CONFIG.maxExecutionTime * 0.95) {
      quotaInfo.status = 'critical';
    }
    
    return quotaInfo.status;
    
  } catch (error) {
    console.error('GAS quota check failed:', error);
    return 'error';
  }
}

/**
 * Set up periodic maintenance tasks
 */
function setupPeriodicMaintenance() {
  try {
    // Clean up old export files daily
    ScriptApp.newTrigger('cleanupExportFiles')
      .timeBased()
      .everyDays(1)
      .create();
    
    console.log('Periodic maintenance triggers set up successfully');
    
  } catch (error) {
    console.error('Failed to set up periodic maintenance:', error);
  }
}

/**
 * Serve the main dashboard HTML page with enhanced error handling
 * @returns {HtmlOutput} HTML page for the dashboard
 */
function doGet(e) {
  try {
    // Create and configure HTML output
    const template = HtmlService.createTemplateFromFile('dashboard');
    
    const htmlOutput = template.evaluate()
      .setTitle('Contract Management Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    
    return htmlOutput;
    
  } catch (error) {
    console.error('Error serving dashboard:', error);
    
    // Return error page
    return createErrorPage(error);
  }
}

/**
 * Create error page for critical failures
 */
function createErrorPage(error) {
  const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard Error</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .error-container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .error-title { color: #d32f2f; margin-bottom: 20px; }
        .error-message { background: #ffebee; padding: 15px; border-radius: 4px; margin: 20px 0; }
        .retry-button { background: #1976d2; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        .retry-button:hover { background: #1565c0; }
      </style>
    </head>
    <body>
      <div class="error-container">
        <h1 class="error-title">Dashboard Temporarily Unavailable</h1>
        <p>We're experiencing technical difficulties with the Contract Management Dashboard.</p>
        <div class="error-message">
          <strong>Error:</strong> ${error.message}
        </div>
        <p>Please try refreshing the page. If the problem persists, contact your system administrator.</p>
        <button class="retry-button" onclick="location.reload()">Retry</button>
      </div>
    </body>
    </html>
  `;
  
  return HtmlService.createHtmlOutput(errorHtml)
    .setTitle('Dashboard Error')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Update performance metrics
 */
function updatePerformanceMetrics(responseTime) {
  appState.performanceMetrics.requestCount++;
  
  // Calculate rolling average
  const currentAvg = appState.performanceMetrics.averageResponseTime;
  const count = appState.performanceMetrics.requestCount;
  appState.performanceMetrics.averageResponseTime = 
    ((currentAvg * (count - 1)) + responseTime) / count;
}

/**
 * Include external files in HTML templates with error handling
 * @param {string} filename - Name of file to include
 * @returns {string} File content
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    console.error(`Error including file ${filename}:`, error);
    return `<!-- Error loading ${filename}: ${error.message} -->`;
  }
}

/**
 * Get total number of contract rows and column info.
 * Called by client first to know how many pages to fetch.
 */
function getContractInfo() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AL_Extract');
    if (!sheet) return { success: false, error: 'AL_Extract sheet not found' };
    var lastRow = sheet.getLastRow();
    // Row 1 = numbers, Row 2 = headers, Row 3+ = data
    var dataRows = Math.max(0, lastRow - 2);
    return { success: true, totalRows: dataRows };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Get a page of contract data. 
 * @param {number} page - 0-based page index
 * @param {number} pageSize - rows per page (default 500)
 * @returns {Object} { success, data, page, totalPages }
 */
function getContractPage(page, pageSize) {
  try {
    page = page || 0;
    pageSize = pageSize || 500;
    
    var cacheKey = 'cp_' + page + '_' + pageSize;
    var cache = CacheService.getScriptCache();
    var cached = cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AL_Extract');
    if (!sheet) return { success: false, error: 'AL_Extract sheet not found' };
    
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var totalDataRows = Math.max(0, lastRow - 2);
    var totalPages = Math.ceil(totalDataRows / pageSize);
    
    if (page >= totalPages) {
      return { success: true, data: [], page: page, totalPages: totalPages };
    }
    
    // Read headers from row 2
    var headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
    
    // Essential columns only
    var want = [
      'AWARD_STATUS', 'APEXNAME', 'EMP_ORG_SHORT_NAME',
      'AWARD_TITLE', 'AWARD', 'PROJECT', 'CONTRACT_TYPE',
      'CEILING', 'PM', 'CO', 'CS', 'PROJECT_TITLE',
      'PROJECT_START', 'PROJECT_END', 'Client_Bureau',
      'client_organization', 'FLAGS', 'Mod_Status', 'IGE'
    ];
    
    var colMap = {};
    for (var j = 0; j < headers.length; j++) {
      var h = String(headers[j]).trim();
      if (want.indexOf(h) !== -1) {
        colMap[h] = j;
      }
    }
    
    // Calculate which rows to read (data starts at row 3)
    var startRow = 3 + (page * pageSize);
    var numRows = Math.min(pageSize, lastRow - startRow + 1);
    
    if (numRows <= 0) {
      return { success: true, data: [], page: page, totalPages: totalPages };
    }
    
    var values = sheet.getRange(startRow, 1, numRows, lastCol).getValues();
    var tz = Session.getScriptTimeZone();
    var data = [];
    
    for (var i = 0; i < values.length; i++) {
      var row = values[i];
      if (!row[1] && !row[2]) continue;
      
      var contract = {};
      for (var colName in colMap) {
        var val = row[colMap[colName]];
        if (val instanceof Date) {
          contract[colName] = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
        } else if (val === '' || val === null || val === undefined) {
          contract[colName] = '';
        } else {
          contract[colName] = val;
        }
      }
      data.push(contract);
    }
    
    var result = { success: true, data: data, page: page, totalPages: totalPages };
    
    // Cache this page (each page ~500 rows should be well under 100KB)
    try {
      cache.put(cacheKey, JSON.stringify(result), 300);
    } catch (ce) {
      // Cache failure is non-fatal
    }
    
    return result;
    
  } catch (error) {
    return { success: false, error: error.message, page: page };
  }
}

/**
 * Quick test: returns 5 rows to verify the pipeline works end-to-end.
 */
function getContractDataTest() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AL_Extract');
    if (!sheet) return { success: false, error: 'AL_Extract sheet not found' };
    
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];
    var rows = sheet.getRange(3, 1, 5, lastCol).getValues();
    var tz = Session.getScriptTimeZone();
    
    var want = ['AWARD_STATUS', 'AWARD', 'PROJECT', 'CEILING', 'PROJECT_TITLE',
                'PROJECT_START', 'PROJECT_END', 'Client_Bureau', 'CONTRACT_TYPE', 'IGE'];
    var colMap = {};
    for (var j = 0; j < headers.length; j++) {
      var h = String(headers[j]).trim();
      if (want.indexOf(h) !== -1) colMap[h] = j;
    }
    
    var data = [];
    for (var i = 0; i < rows.length; i++) {
      var contract = {};
      for (var colName in colMap) {
        var val = rows[i][colMap[colName]];
        if (val instanceof Date) {
          contract[colName] = Utilities.formatDate(val, tz, 'yyyy-MM-dd');
        } else {
          contract[colName] = (val === '' || val === null || val === undefined) ? '' : val;
        }
      }
      data.push(contract);
    }
    
    return { success: true, count: data.length, data: data, columns: Object.keys(colMap) };
  } catch (e) {
    return { success: false, error: e.message };
  }
}
/**
 * Enhanced API endpoint to get financial summary with error handling
 * @param {ContractData[]} contracts - Contract data
 * @returns {FinancialSummary} Financial summary
 */
function getFinancialSummary(contracts) {
  try {
    if (!appState.services.financialAnalyzer) {
      throw new Error('Financial analyzer not available');
    }
    
    if (!Array.isArray(contracts)) {
      throw new Error('Invalid contract data provided');
    }
    
    const summary = appState.services.financialAnalyzer.calculateTotalValues(contracts);
    
    // Log financial analysis
    if (appState.services.securityAuditor) {
      appState.services.securityAuditor.logEvent('financial_analysis', {
        user: Session.getActiveUser().getEmail(),
        contractCount: contracts.length,
        totalValue: summary.totalContractValue
      });
    }
    
    return summary;
    
  } catch (error) {
    console.error('Error calculating financial summary:', error);
    appState.performanceMetrics.errorCount++;
    throw new Error('Failed to calculate financial summary: ' + error.message);
  }
}

/**
 * Enhanced API endpoint to export data with comprehensive functionality and error recovery
 * @param {ContractData[]} data - Data to export
 * @param {string} format - Export format ('csv', 'pdf', 'excel')
 * @param {FilterCriteria} filters - Applied filters for metadata
 * @param {Object} options - Export options (configuration, etc.)
 * @returns {Object} Export result with download information
 */
function exportData(data, format, filters = {}, options = {}) {
  const requestStart = new Date();
  
  try {
    // Validate inputs
    if (!Array.isArray(data)) {
      throw new Error('Invalid data provided for export');
    }
    
    if (!format || typeof format !== 'string') {
      throw new Error('Export format must be specified');
    }
    
    // Ensure export service is available
    if (!appState.services.exportService) {
      throw new Error('Export service not available');
    }
    
    // Check user permissions
    const user = Session.getActiveUser();
    if (!user || !user.getEmail()) {
      throw new Error('User authentication required for export');
    }
    
    // Validate export permissions
    if (appState.services.accessController) {
      const canExport = appState.services.accessController.checkExportPermission(user);
      if (!canExport) {
        throw new Error('Insufficient permissions to export data');
      }
    }
    
    let blob;
    let filename;
    let mimeType;
    
    // Generate timestamp for filename
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd_HH-mm-ss');
    
    // Process export based on format
    switch (format.toLowerCase()) {
      case 'csv':
        blob = appState.services.exportService.exportToCSV(data, filters, options);
        filename = `contracts_export_${timestamp}.csv`;
        mimeType = 'text/csv';
        break;
        
      case 'pdf':
        // Get chart images if provided in options
        const charts = options.charts || [];
        blob = appState.services.exportService.generatePDFReport(data, charts, filters, options);
        filename = `contracts_report_${timestamp}.pdf`;
        mimeType = 'application/pdf';
        break;
        
      case 'excel':
        blob = appState.services.exportService.createExcelWorkbook(data, filters, options);
        filename = `contracts_workbook_${timestamp}.xlsx`;
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
        
      default:
        throw new Error('Unsupported export format: ' + format);
    }
    
    // Create temporary file in Google Drive for download
    const file = DriveApp.createFile(blob.setName(filename));
    
    // Set appropriate sharing permissions
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Calculate processing time
    const processingTime = new Date() - requestStart;
    
    // Log export activity
    if (appState.services.securityAuditor) {
      appState.services.securityAuditor.logEvent('data_exported', {
        user: user.getEmail(),
        format: format,
        recordCount: data.length,
        fileSize: blob.getBytes().length,
        processingTime: processingTime,
        filename: filename,
        filters: filters
      });
    }
    
    // Return comprehensive export result
    return {
      success: true,
      downloadUrl: file.getDownloadUrl(),
      filename: filename,
      fileId: file.getId(),
      size: blob.getBytes().length,
      mimeType: mimeType,
      format: format,
      recordCount: data.length,
      processingTime: processingTime,
      generatedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)).toISOString(), // 24 hours
      user: user.getEmail()
    };
    
  } catch (error) {
    console.error('Error exporting data:', error);
    appState.performanceMetrics.errorCount++;
    
    // Log export failure
    if (appState.services.securityAuditor) {
      appState.services.securityAuditor.logEvent('export_failed', {
        user: Session.getActiveUser()?.getEmail() || 'unknown',
        format: format,
        error: error.message,
        recordCount: data ? data.length : 0
      });
    }
    
    return {
      success: false,
      error: error.message,
      format: format,
      recordCount: data ? data.length : 0,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Enhanced API endpoint to get available export configurations
 * @returns {Object} Available export configurations with metadata
 */
function getExportConfigurations() {
  try {
    if (!appState.services.exportService) {
      throw new Error('Export service not available');
    }
    
    const configurations = appState.services.exportService.getAvailableConfigurations();
    
    // Add metadata about each configuration
    const enhancedConfigurations = {};
    for (const [key, config] of Object.entries(configurations)) {
      enhancedConfigurations[key] = {
        ...config,
        supportedFormats: ['csv', 'excel', 'pdf'],
        estimatedSize: config.maxRows ? `~${Math.ceil(config.maxRows / 100)}MB` : 'Variable',
        processingTime: config.maxRows ? `~${Math.ceil(config.maxRows / 1000)}s` : 'Variable'
      };
    }
    
    return {
      success: true,
      configurations: enhancedConfigurations,
      defaultConfiguration: 'summary',
      supportedFormats: ['csv', 'excel', 'pdf'],
      maxRecords: 10000,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error getting export configurations:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * API endpoint to export data with specific configuration
 * @param {ContractData[]} data - Data to export
 * @param {string} format - Export format
 * @param {FilterCriteria} filters - Applied filters
 * @param {string} configurationName - Configuration name
 * @returns {Object} Export result
 */
function exportWithConfiguration(data, format, filters, configurationName) {
  try {
    // Validate configuration name
    const configurations = appState.services.exportService.getAvailableConfigurations();
    if (!configurations[configurationName]) {
      throw new Error(`Unknown export configuration: ${configurationName}`);
    }
    
    return exportData(data, format, filters, { configuration: configurationName });
    
  } catch (error) {
    console.error('Error exporting with configuration:', error);
    return {
      success: false,
      error: error.message,
      configuration: configurationName,
      format: format
    };
  }
}

/**
 * Enhanced cleanup function for old export files with comprehensive management
 * @param {number} maxAgeHours - Maximum age in hours (default: 24)
 * @returns {Object} Cleanup result with detailed statistics
 */
function cleanupExportFiles(maxAgeHours = 24) {
  try {
    const startTime = new Date();
    const cutoffTime = new Date(Date.now() - (maxAgeHours * 60 * 60 * 1000));
    
    // Search for export files by pattern
    const searchPatterns = ['contracts_export_', 'contracts_report_', 'contracts_workbook_'];
    let totalDeleted = 0;
    let totalSize = 0;
    const deletedFiles = [];
    
    for (const pattern of searchPatterns) {
      const files = DriveApp.searchFiles(`title contains "${pattern}"`);
      
      while (files.hasNext()) {
        const file = files.next();
        
        if (file.getDateCreated() < cutoffTime) {
          const fileSize = file.getSize();
          const fileName = file.getName();
          
          try {
            DriveApp.removeFile(file);
            totalDeleted++;
            totalSize += fileSize;
            deletedFiles.push({
              name: fileName,
              size: fileSize,
              created: file.getDateCreated()
            });
          } catch (deleteError) {
            console.warn(`Failed to delete file ${fileName}:`, deleteError);
          }
        }
      }
    }
    
    const processingTime = new Date() - startTime;
    
    // Log cleanup activity
    if (appState.services.securityAuditor) {
      appState.services.securityAuditor.logEvent('export_cleanup', {
        deletedCount: totalDeleted,
        totalSize: totalSize,
        processingTime: processingTime,
        cutoffTime: cutoffTime.toISOString()
      });
    }
    
    return {
      success: true,
      deletedCount: totalDeleted,
      totalSize: totalSize,
      processingTime: processingTime,
      cutoffTime: cutoffTime.toISOString(),
      deletedFiles: deletedFiles.slice(0, 10), // Limit to first 10 for response size
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error cleaning up export files:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Enhanced API endpoint to validate user permissions with comprehensive access control
 * @returns {Object} User permission information with detailed capabilities
 */
function getUserPermissions() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    
    if (!email) {
      throw new Error('User not authenticated');
    }
    
    // Get detailed permissions from access controller
    let permissions = {
      email: email,
      canView: true,
      canEdit: false,
      canExport: true,
      canAdmin: false,
      roles: ['viewer'],
      restrictions: []
    };
    
    if (appState.services.accessController) {
      try {
        permissions = appState.services.accessController.getUserPermissions(user);
      } catch (accessError) {
        console.warn('Failed to get detailed permissions, using defaults:', accessError);
      }
    }
    
    // Add session information
    const sessionInfo = {
      loginTime: Session.getTemporaryActiveUserKey() ? new Date() : null,
      timezone: Session.getScriptTimeZone(),
      locale: Session.getActiveUserLocale()
    };
    
    // Log permission check
    if (appState.services.securityAuditor) {
      appState.services.securityAuditor.logEvent('permission_checked', {
        user: email,
        permissions: permissions.roles,
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      success: true,
      user: permissions,
      session: sessionInfo,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * API endpoint to get application status and health information
 * @returns {Object} Comprehensive application status
 */
function getApplicationStatus() {
  try {
    const healthReport = performHealthCheck();
    
    return {
      success: true,
      application: {
        name: APP_CONFIG.name,
        version: APP_CONFIG.version,
        initialized: appState.initialized,
        uptime: appState.startTime ? new Date() - appState.startTime : 0,
        startTime: appState.startTime
      },
      health: healthReport,
      performance: appState.performanceMetrics,
      activeUsers: appState.activeUsers.size,
      services: Object.keys(appState.services).map(key => ({
        name: key,
        status: appState.services[key] ? 'available' : 'unavailable'
      })),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error getting application status:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * API endpoint for emergency recovery procedures
 * @param {string} recoveryType - Type of recovery to perform
 * @returns {Object} Recovery result
 */
function performEmergencyRecovery(recoveryType = 'full') {
  try {
    const user = Session.getActiveUser();
    
    // Check admin permissions for recovery operations
    if (appState.services.accessController) {
      const permissions = appState.services.accessController.getUserPermissions(user);
      if (!permissions.canAdmin) {
        throw new Error('Administrative privileges required for recovery operations');
      }
    }
    
    const recoveryStart = new Date();
    const recoveryLog = [];
    
    switch (recoveryType) {
      case 'full':
        // Full application recovery
        recoveryLog.push('Starting full application recovery...');
        
        // Reinitialize services
        appState.initialized = false;
        const initResult = initializeApplication();
        recoveryLog.push(`Application reinitialized: ${initResult.success}`);
        
        // Clear caches
        if (appState.services.dataService) {
          appState.services.dataService.clearCache();
          recoveryLog.push('Data service cache cleared');
        }
        
        // Reset performance metrics
        appState.performanceMetrics = {
          requestCount: 0,
          averageResponseTime: 0,
          errorCount: 0,
          lastError: null
        };
        recoveryLog.push('Performance metrics reset');
        
        break;
        
      case 'cache':
        // Cache-only recovery
        if (appState.services.dataService) {
          appState.services.dataService.clearCache();
          recoveryLog.push('Data service cache cleared');
        }
        break;
        
      case 'services':
        // Service reinitialization
        appState.services.dataService = new DataService();
        appState.services.financialAnalyzer = new FinancialAnalyzer();
        appState.services.exportService = new ExportService();
        recoveryLog.push('Core services reinitialized');
        break;
        
      default:
        throw new Error(`Unknown recovery type: ${recoveryType}`);
    }
    
    const recoveryTime = new Date() - recoveryStart;
    
    // Log recovery operation
    if (appState.services.securityAuditor) {
      appState.services.securityAuditor.logEvent('emergency_recovery', {
        user: user.getEmail(),
        recoveryType: recoveryType,
        recoveryTime: recoveryTime,
        success: true,
        log: recoveryLog
      });
    }
    
    return {
      success: true,
      recoveryType: recoveryType,
      recoveryTime: recoveryTime,
      log: recoveryLog,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Emergency recovery failed:', error);
    
    if (appState.services.securityAuditor) {
      appState.services.securityAuditor.logEvent('recovery_failed', {
        user: Session.getActiveUser()?.getEmail() || 'unknown',
        recoveryType: recoveryType,
        error: error.message
      });
    }
    
    return {
      success: false,
      error: error.message,
      recoveryType: recoveryType,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test function for development and health monitoring
 * @returns {Object} Comprehensive test result
 */
function testFunction() {
  try {
    const testStart = new Date();
    
    // Test basic functionality
    const tests = {
      basicFunction: true,
      applicationInitialized: appState.initialized,
      servicesAvailable: Object.keys(appState.services).length > 0,
      userAuthentication: !!Session.getActiveUser().getEmail(),
      timestamp: new Date().toISOString()
    };
    
    // Test data service if available
    if (appState.services.dataService) {
      try {
        tests.dataServiceTest = appState.services.dataService.validateConnection();
      } catch (error) {
        tests.dataServiceTest = false;
        tests.dataServiceError = error.message;
      }
    }
    
    const testTime = new Date() - testStart;
    
    return {
      success: true,
      message: `${APP_CONFIG.name} v${APP_CONFIG.version} - All systems operational`,
      tests: tests,
      testTime: testTime,
      uptime: appState.startTime ? new Date() - appState.startTime : 0
    };
    
  } catch (error) {
    return {
      success: false,
      message: 'System test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Scheduled function to perform periodic maintenance
 */
function performScheduledMaintenance() {
  try {
    console.log('Starting scheduled maintenance...');
    
    // Clean up old export files
    const cleanupResult = cleanupExportFiles(24);
    console.log('Export cleanup result:', cleanupResult);
    
    // Perform health check
    const healthResult = performHealthCheck();
    console.log('Health check result:', healthResult);
    
    // Clear old performance data
    if (appState.performanceMetrics.requestCount > 10000) {
      appState.performanceMetrics.requestCount = Math.floor(appState.performanceMetrics.requestCount / 2);
      console.log('Performance metrics reset');
    }
    
    // Log maintenance completion
    if (appState.services.securityAuditor) {
      appState.services.securityAuditor.logEvent('scheduled_maintenance', {
        cleanupResult: cleanupResult.success,
        healthStatus: healthResult.overall,
        timestamp: new Date().toISOString()
      });
    }
    
    return {
      success: true,
      cleanup: cleanupResult,
      health: healthResult,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Scheduled maintenance failed:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}