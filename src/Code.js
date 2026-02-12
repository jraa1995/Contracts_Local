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

// ============================================================================
// OPTIMIZED BULK DATA RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Generate a quick hash of the dataset for cache invalidation
 * Checks lastRow + spot check of first/last cells to detect changes
 * @returns {string} Hash representing current dataset state
 */
function getDatasetHash() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AL_Extract');
    if (!sheet) return 'error_no_sheet';

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    // Spot check: first data cell and last data cell
    var firstCell = '';
    var lastCell = '';

    if (lastRow >= 3) {
      try {
        firstCell = String(sheet.getRange(3, 1).getValue());
        lastCell = String(sheet.getRange(lastRow, lastCol).getValue());
      } catch (e) {
        // If cell read fails, just use row/col info
      }
    }

    // Create hash from row count + cell samples
    var hashInput = lastRow + '_' + lastCol + '_' + firstCell + '_' + lastCell;
    return Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, hashInput)
      .map(function(byte) { return (byte & 0xFF).toString(16).padStart(2, '0'); })
      .join('');

  } catch (e) {
    console.error('Error computing dataset hash:', e);
    return 'error_' + new Date().getTime();
  }
}

/**
 * Retrieve and decompress cached bulk data
 * @param {string} cacheKey - Base cache key
 * @returns {Array|null} Decompressed data or null if not found
 */
function getCachedBulkData(cacheKey) {
  try {
    var cache = CacheService.getScriptCache();

    // Get metadata about cached chunks
    var metaKey = cacheKey + '_meta';
    var metaStr = cache.get(metaKey);

    if (!metaStr) {
      console.log('No cached data found for key:', cacheKey);
      return null;
    }

    var meta = JSON.parse(metaStr);
    var chunkCount = meta.chunkCount;

    // Retrieve all chunks
    var chunks = [];
    for (var i = 0; i < chunkCount; i++) {
      var chunkKey = cacheKey + '_chunk_' + i;
      var chunk = cache.get(chunkKey);

      if (!chunk) {
        console.warn('Missing chunk', i, 'for cache key:', cacheKey);
        return null; // Cache incomplete, return null
      }

      chunks.push(chunk);
    }

    // Combine chunks and decompress
    var compressed = chunks.join('');
    var blob = Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(compressed), 'application/x-gzip'));
    var jsonStr = blob.getDataAsString();
    var data = JSON.parse(jsonStr);

    console.log('Successfully retrieved cached data:', data.length, 'rows from', chunkCount, 'chunks');
    return data;

  } catch (e) {
    console.error('Error retrieving cached bulk data:', e);
    return null;
  }
}

/**
 * Compress and store data in cache chunks
 * @param {string} cacheKey - Base cache key
 * @param {Array} data - Data to cache
 * @param {number} ttl - Time to live in seconds (default 21600 = 6 hours)
 * @returns {boolean} Success indicator
 */
function setCachedBulkData(cacheKey, data, ttl) {
  try {
    ttl = ttl || 21600; // 6 hours default (max for CacheService)
    var cache = CacheService.getScriptCache();

    // Compress data
    var jsonStr = JSON.stringify(data);
    var compressed = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(jsonStr)));

    var compressedSize = compressed.length;
    console.log('Compressed data size:', compressedSize, 'bytes');

    // Split into chunks (90KB each to stay under 100KB limit with overhead)
    var maxChunkSize = 90000;
    var chunks = [];

    for (var i = 0; i < compressed.length; i += maxChunkSize) {
      chunks.push(compressed.substring(i, Math.min(i + maxChunkSize, compressed.length)));
    }

    console.log('Split into', chunks.length, 'chunks');

    // Store chunks
    for (var j = 0; j < chunks.length; j++) {
      var chunkKey = cacheKey + '_chunk_' + j;
      cache.put(chunkKey, chunks[j], ttl);
    }

    // Store metadata
    var meta = {
      chunkCount: chunks.length,
      originalSize: jsonStr.length,
      compressedSize: compressedSize,
      rowCount: data.length,
      timestamp: new Date().toISOString()
    };

    cache.put(cacheKey + '_meta', JSON.stringify(meta), ttl);

    console.log('Successfully cached', data.length, 'rows in', chunks.length, 'chunks');
    return true;

  } catch (e) {
    console.error('Error caching bulk data:', e);
    return false;
  }
}

/**
 * Invalidate all cached data
 * @returns {Object} Result of cache invalidation
 */
function invalidateCache() {
  try {
    var cache = CacheService.getScriptCache();

    // Remove specific cache keys
    var keysToRemove = [
      'bulk_contracts',
      'bulk_contracts_meta',
      'aggregated_metadata'
    ];

    // Also remove chunk keys (up to 20 chunks max expected)
    for (var i = 0; i < 20; i++) {
      keysToRemove.push('bulk_contracts_chunk_' + i);
    }

    cache.removeAll(keysToRemove);

    console.log('Cache invalidated:', keysToRemove.length, 'keys removed');

    return {
      success: true,
      keysRemoved: keysToRemove.length,
      timestamp: new Date().toISOString()
    };

  } catch (e) {
    console.error('Error invalidating cache:', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Get ALL contract data in a single bulk response
 * Reads all data at once, filters to 19 columns, compresses and caches
 * @returns {Object} { success, data, hash, cached, rowCount, compressionRatio }
 */
function getContractDataBulk() {
  try {
    var startTime = new Date();

    // Get current dataset hash
    var currentHash = getDatasetHash();
    var cacheKey = 'bulk_contracts';
    var cache = CacheService.getScriptCache();

    // Check if hash matches cached version
    var cachedHash = cache.get('bulk_contracts_hash');

    if (cachedHash === currentHash) {
      console.log('Dataset hash match, attempting to retrieve from cache');
      var cachedData = getCachedBulkData(cacheKey);

      if (cachedData) {
        var cacheTime = new Date() - startTime;
        console.log('Returned cached data in', cacheTime, 'ms');

        return {
          success: true,
          data: cachedData,
          hash: currentHash,
          cached: true,
          rowCount: cachedData.length,
          responseTime: cacheTime
        };
      }
    }

    console.log('Cache miss or hash mismatch, reading from sheet');

    // Read from sheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('AL_Extract');
    if (!sheet) {
      return { success: false, error: 'AL_Extract sheet not found' };
    }

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow < 3) {
      return { success: true, data: [], hash: currentHash, cached: false, rowCount: 0 };
    }

    // Read headers from row 2
    var headers = sheet.getRange(2, 1, 1, lastCol).getValues()[0];

    // Define the 19 wanted columns
    var wantedColumns = [
      'AWARD_STATUS', 'APEXNAME', 'EMP_ORG_SHORT_NAME',
      'AWARD_TITLE', 'AWARD', 'PROJECT', 'CONTRACT_TYPE',
      'CEILING', 'PM', 'CO', 'CS', 'PROJECT_TITLE',
      'PROJECT_START', 'PROJECT_END', 'Client_Bureau',
      'client_organization', 'FLAGS', 'Mod_Status', 'IGE'
    ];

    // Build column index map
    var colMap = {};
    for (var j = 0; j < headers.length; j++) {
      var h = String(headers[j]).trim();
      if (wantedColumns.indexOf(h) !== -1) {
        colMap[h] = j;
      }
    }

    console.log('Found', Object.keys(colMap).length, 'of', wantedColumns.length, 'wanted columns');

    // Read ALL data rows in one call (rows 3 to lastRow)
    var numRows = lastRow - 2;
    var readStart = new Date();
    var allValues = sheet.getRange(3, 1, numRows, lastCol).getValues();
    var readTime = new Date() - readStart;
    console.log('Read', numRows, 'rows x', lastCol, 'columns in', readTime, 'ms');

    // Filter to wanted columns
    var tz = Session.getScriptTimeZone();
    var data = [];
    var filterStart = new Date();

    for (var i = 0; i < allValues.length; i++) {
      var row = allValues[i];

      // Skip empty rows
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

    var filterTime = new Date() - filterStart;
    console.log('Filtered to', data.length, 'rows in', filterTime, 'ms');

    // Cache the data
    var cacheStart = new Date();
    var cached = setCachedBulkData(cacheKey, data, 21600); // 6 hours

    if (cached) {
      // Store hash to indicate cache is valid
      cache.put('bulk_contracts_hash', currentHash, 21600);
    }

    var cacheTime = new Date() - cacheStart;
    console.log('Cached data in', cacheTime, 'ms');

    var totalTime = new Date() - startTime;
    var originalSize = numRows * lastCol;
    var filteredSize = data.length * wantedColumns.length;
    var compressionRatio = ((1 - (filteredSize / originalSize)) * 100).toFixed(1);

    console.log('Total processing time:', totalTime, 'ms');
    console.log('Data reduction:', originalSize, '->', filteredSize, '(' + compressionRatio + '% reduction)');

    return {
      success: true,
      data: data,
      hash: currentHash,
      cached: false,
      rowCount: data.length,
      originalColumns: lastCol,
      filteredColumns: wantedColumns.length,
      compressionRatio: compressionRatio + '%',
      responseTime: totalTime,
      readTime: readTime,
      filterTime: filterTime,
      cacheTime: cacheTime
    };

  } catch (e) {
    console.error('Error in getContractDataBulk:', e);
    return {
      success: false,
      error: e.message,
      stack: e.stack
    };
  }
}

/**
 * Get server-side pre-aggregated metadata for dashboard
 * Computes summary cards, filter options, and chart data
 * @returns {Object} Aggregated metadata for immediate client rendering
 */
function getAggregatedMetadata() {
  try {
    var startTime = new Date();
    var cacheKey = 'aggregated_metadata';
    var cache = CacheService.getScriptCache();

    // Check if we have cached metadata matching current dataset
    var currentHash = getDatasetHash();
    var cachedMetaStr = cache.get(cacheKey);

    if (cachedMetaStr) {
      try {
        var cachedMeta = JSON.parse(cachedMetaStr);
        if (cachedMeta.datasetHash === currentHash) {
          console.log('Returning cached aggregated metadata');
          cachedMeta.cached = true;
          return cachedMeta;
        }
      } catch (parseError) {
        console.warn('Failed to parse cached metadata:', parseError);
      }
    }

    console.log('Computing aggregated metadata from scratch');

    // Get bulk data (will use cache if available)
    var bulkResult = getContractDataBulk();

    if (!bulkResult.success) {
      return { success: false, error: bulkResult.error };
    }

    var contracts = bulkResult.data;

    // Helper function to parse currency strings
    var parseCurrency = function(val) {
      if (typeof val === 'number') return val;
      if (typeof val === 'string') {
        // Remove currency symbols, commas, spaces
        var cleaned = val.replace(/[$,\s]/g, '');
        var num = parseFloat(cleaned);
        return isNaN(num) ? 0 : num;
      }
      return 0;
    };

    // Initialize aggregation structures
    var statusSet = {};
    var orgSet = {};
    var typeSet = {};
    var statusCounts = {};
    var orgCeilingSums = {};
    var yearCounts = {};
    var yearCeilingSums = {};

    var activeCount = 0;
    var completedCount = 0;
    var totalCeiling = 0;

    // Process all contracts
    for (var i = 0; i < contracts.length; i++) {
      var c = contracts[i];

      // Summary card metrics
      var status = String(c.AWARD_STATUS || '').trim();
      var ceiling = parseCurrency(c.CEILING || 0);

      totalCeiling += ceiling;

      if (status.toLowerCase() === 'active') {
        activeCount++;
      }
      if (status.toLowerCase() === 'completed' || status.toLowerCase() === 'closed') {
        completedCount++;
      }

      // Filter options
      if (status) statusSet[status] = true;

      var org = String(c.Client_Bureau || c.client_organization || '').trim();
      if (org) orgSet[org] = true;

      var type = String(c.CONTRACT_TYPE || '').trim();
      if (type) typeSet[type] = true;

      // Chart data - Status counts
      if (status) {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }

      // Chart data - Org ceiling sums
      if (org) {
        orgCeilingSums[org] = (orgCeilingSums[org] || 0) + ceiling;
      }

      // Chart data - Timeline by year
      var startDate = c.PROJECT_START;
      if (startDate) {
        var year = '';
        if (typeof startDate === 'string' && startDate.length >= 4) {
          year = startDate.substring(0, 4);
        } else if (startDate instanceof Date) {
          year = String(startDate.getFullYear());
        }

        if (year && year.match(/^\d{4}$/)) {
          yearCounts[year] = (yearCounts[year] || 0) + 1;
          yearCeilingSums[year] = (yearCeilingSums[year] || 0) + ceiling;
        }
      }
    }

    // Build filter options arrays
    var filterOptions = {
      statuses: Object.keys(statusSet).sort(),
      organizations: Object.keys(orgSet).sort(),
      types: Object.keys(typeSet).sort()
    };

    // Build chart data - Status distribution
    var statusChartData = [];
    for (var st in statusCounts) {
      statusChartData.push({ status: st, count: statusCounts[st] });
    }
    statusChartData.sort(function(a, b) { return b.count - a.count; });

    // Build chart data - Top 10 orgs by ceiling + Other
    var orgChartData = [];
    for (var org in orgCeilingSums) {
      orgChartData.push({ org: org, ceiling: orgCeilingSums[org] });
    }
    orgChartData.sort(function(a, b) { return b.ceiling - a.ceiling; });

    var topOrgs = orgChartData.slice(0, 10);
    var otherOrgs = orgChartData.slice(10);

    if (otherOrgs.length > 0) {
      var otherCeiling = 0;
      for (var k = 0; k < otherOrgs.length; k++) {
        otherCeiling += otherOrgs[k].ceiling;
      }
      topOrgs.push({ org: 'Other', ceiling: otherCeiling });
    }

    // Build chart data - Timeline by year
    var timelineChartData = [];
    for (var yr in yearCounts) {
      timelineChartData.push({
        year: yr,
        count: yearCounts[yr],
        ceiling: yearCeilingSums[yr]
      });
    }
    timelineChartData.sort(function(a, b) {
      return parseInt(a.year) - parseInt(b.year);
    });

    // Build chart data in {labels, data} format for client
    var statusLabels = statusChartData.map(function(e) { return e.status; });
    var statusValues = statusChartData.map(function(e) { return e.count; });

    var orgLabels = topOrgs.map(function(e) { return e.org; });
    var orgValues = topOrgs.map(function(e) { return e.ceiling; });

    var timelineLabels = timelineChartData.map(function(e) { return e.year; });
    var timelineValues = timelineChartData.map(function(e) { return e.count; });
    var trendValues = timelineChartData.map(function(e) { return e.ceiling; });

    // Compute insights: contracts expiring within 30 days
    var expiringCount = 0;
    var now = new Date();
    var thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    for (var m = 0; m < contracts.length; m++) {
      var endDate = contracts[m].PROJECT_END;
      if (endDate) {
        var ed = new Date(endDate);
        if (!isNaN(ed.getTime()) && ed >= now && ed <= thirtyDaysFromNow) {
          expiringCount++;
        }
      }
    }

    // Assemble metadata response (matching frontend API contract)
    var metadata = {
      success: true,
      datasetHash: currentHash,
      cached: false,

      summary: {
        totalContracts: contracts.length,
        activeCount: activeCount,
        completedCount: completedCount,
        totalCeiling: totalCeiling
      },

      filters: filterOptions,

      charts: {
        status: { labels: statusLabels, data: statusValues, label: 'Contracts' },
        organization: { labels: orgLabels, data: orgValues, label: 'Ceiling Value' },
        timeline: { labels: timelineLabels, data: timelineValues, label: 'Contracts' },
        trends: { labels: timelineLabels, data: trendValues, label: 'Total Ceiling' }
      },

      insights: {
        expiringWithin30Days: expiringCount,
        portfolioChange: null
      },

      deltas: {},

      timestamp: new Date().toISOString(),
      computeTime: new Date() - startTime
    };

    // Cache the metadata (shorter TTL since it's smaller)
    try {
      cache.put(cacheKey, JSON.stringify(metadata), 3600); // 1 hour
      console.log('Cached aggregated metadata');
    } catch (cacheError) {
      console.warn('Failed to cache metadata:', cacheError);
    }

    console.log('Computed aggregated metadata in', metadata.computeTime, 'ms');

    return metadata;

  } catch (e) {
    console.error('Error in getAggregatedMetadata:', e);
    return {
      success: false,
      error: e.message,
      stack: e.stack
    };
  }
}

// ============================================================================
// END OPTIMIZED BULK DATA RETRIEVAL FUNCTIONS
// ============================================================================

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