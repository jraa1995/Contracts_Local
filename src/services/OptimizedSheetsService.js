/**
 * OptimizedSheetsService - Efficient Google Sheets API integration
 * Provides optimized data loading, intelligent caching, and minimal API calls
 */

/**
 * Optimized Google Sheets Service
 * Implements efficient data loading strategies with minimal API calls and intelligent caching
 */
class OptimizedSheetsService {
  constructor() {
    // API call optimization settings
    this.config = {
      // Batch reading configuration
      maxBatchSize: 10000, // Maximum rows per batch read
      optimalBatchSize: 1000, // Optimal batch size for performance
      minBatchSize: 100, // Minimum batch size
      
      // Range optimization
      enableRangeOptimization: true,
      maxEmptyRows: 50, // Stop reading after this many empty rows
      
      // Caching configuration
      enableIntelligentCaching: true,
      metadataCacheTTL: 60 * 60 * 1000, // 1 hour for metadata
      dataCacheTTL: 5 * 60 * 1000, // 5 minutes for data
      
      // API call limits
      maxConcurrentCalls: 3,
      callDelayMs: 100, // Delay between API calls
      
      // Change detection
      enableChangeDetection: true,
      checksumCacheTTL: 30 * 60 * 1000 // 30 minutes for checksums
    };
    
    // Initialize services
    this.cachingService = new CachingService();
    this.retryService = new RetryService();
    this.gasOptimization = new GASOptimizationService();
    
    // API call tracking
    this.apiCallStats = {
      totalCalls: 0,
      batchCalls: 0,
      metadataCalls: 0,
      cacheHits: 0,
      cacheMisses: 0,
      bytesTransferred: 0
    };
    
    // Sheet metadata cache
    this.sheetMetadata = new Map();
  }

  /**
   * Load data from Google Sheets with optimization
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {Object} options - Loading options
   * @returns {Promise<any[][]>} Sheet data
   */
  async loadSheetData(spreadsheetId, sheetName, options = {}) {
    const startTime = new Date();
    
    try {
      // Get or create sheet metadata
      const metadata = await this.getSheetMetadata(spreadsheetId, sheetName);
      
      // Check for cached data with change detection
      if (this.config.enableChangeDetection) {
        const cachedData = await this.getCachedDataWithChangeDetection(
          spreadsheetId, 
          sheetName, 
          metadata
        );
        
        if (cachedData) {
          this.apiCallStats.cacheHits++;
          console.log(`OptimizedSheets: Cache hit for ${sheetName}`);
          return cachedData;
        }
      }
      
      this.apiCallStats.cacheMisses++;
      
      // Load data using optimized strategy
      const data = await this.loadDataOptimized(spreadsheetId, sheetName, metadata, options);
      
      // Cache the loaded data
      if (this.config.enableIntelligentCaching) {
        await this.cacheDataWithMetadata(spreadsheetId, sheetName, data, metadata);
      }
      
      const endTime = new Date();
      const loadTime = endTime.getTime() - startTime.getTime();
      
      console.log(`OptimizedSheets: Loaded ${data.length} rows from ${sheetName} in ${loadTime}ms`);
      
      return data;
      
    } catch (error) {
      console.error(`OptimizedSheets: Error loading sheet data for ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Get sheet metadata with caching
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @returns {Promise<Object>} Sheet metadata
   */
  async getSheetMetadata(spreadsheetId, sheetName) {
    const metadataKey = `metadata_${spreadsheetId}_${sheetName}`;
    
    // Try cache first
    let metadata = this.cachingService.get(metadataKey, { prefix: 'metadata' });
    
    if (metadata) {
      return metadata;
    }
    
    // Load metadata from API
    metadata = await this.retryService.retrySheetOperation(
      () => this.loadSheetMetadataFromAPI(spreadsheetId, sheetName),
      {
        operationId: `metadata_${sheetName}`,
        timeout: 30000
      }
    );
    
    // Cache metadata
    this.cachingService.set(metadataKey, metadata, {
      prefix: 'metadata',
      ttl: this.config.metadataCacheTTL
    });
    
    this.apiCallStats.metadataCalls++;
    
    return metadata;
  }

  /**
   * Load sheet metadata from Google Sheets API
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @returns {Object} Sheet metadata
   */
  loadSheetMetadataFromAPI(spreadsheetId, sheetName) {
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        throw new Error(`Sheet '${sheetName}' not found`);
      }
      
      const lastRow = sheet.getLastRow();
      const lastColumn = sheet.getLastColumn();
      const maxRows = sheet.getMaxRows();
      const maxColumns = sheet.getMaxColumns();
      
      // Get sheet properties for change detection
      const sheetId = sheet.getSheetId();
      
      const metadata = {
        sheetId: sheetId,
        lastRow: lastRow,
        lastColumn: lastColumn,
        maxRows: maxRows,
        maxColumns: maxColumns,
        hasData: lastRow > 0 && lastColumn > 0,
        dataRange: lastRow > 0 && lastColumn > 0 ? `A1:${this.columnToLetter(lastColumn)}${lastRow}` : null,
        lastModified: new Date(),
        checksum: this.calculateMetadataChecksum(lastRow, lastColumn, sheetId)
      };
      
      console.log(`OptimizedSheets: Loaded metadata for ${sheetName}:`, {
        dataRange: metadata.dataRange,
        rows: lastRow,
        columns: lastColumn
      });
      
      return metadata;
      
    } catch (error) {
      console.error(`Error loading metadata for sheet ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Load data using optimized strategy
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {Object} metadata - Sheet metadata
   * @param {Object} options - Loading options
   * @returns {Promise<any[][]>} Sheet data
   */
  async loadDataOptimized(spreadsheetId, sheetName, metadata, options = {}) {
    if (!metadata.hasData) {
      console.log(`OptimizedSheets: No data in sheet ${sheetName}`);
      return [];
    }
    
    const config = { ...this.config, ...options };
    
    // Determine optimal loading strategy based on data size
    if (metadata.lastRow <= config.optimalBatchSize) {
      // Small dataset - load all at once
      return await this.loadDataSingleCall(spreadsheetId, sheetName, metadata);
    } else {
      // Large dataset - use batch loading
      return await this.loadDataBatched(spreadsheetId, sheetName, metadata, config);
    }
  }

  /**
   * Load data in a single API call for small datasets
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {Object} metadata - Sheet metadata
   * @returns {Promise<any[][]>} Sheet data
   */
  async loadDataSingleCall(spreadsheetId, sheetName, metadata) {
    return await this.retryService.retrySheetOperation(
      () => {
        const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
        const sheet = spreadsheet.getSheetByName(sheetName);
        
        if (!sheet) {
          throw new Error(`Sheet '${sheetName}' not found`);
        }
        
        // Use the exact data range to minimize data transfer
        const range = sheet.getRange(metadata.dataRange);
        const values = range.getValues();
        
        this.apiCallStats.totalCalls++;
        this.apiCallStats.bytesTransferred += this.estimateDataSize(values);
        
        console.log(`OptimizedSheets: Single call loaded ${values.length} rows from ${sheetName}`);
        
        return values;
      },
      {
        operationId: `load_single_${sheetName}`,
        timeout: 60000
      }
    );
  }

  /**
   * Load data in batches for large datasets
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {Object} metadata - Sheet metadata
   * @param {Object} config - Configuration options
   * @returns {Promise<any[][]>} Sheet data
   */
  async loadDataBatched(spreadsheetId, sheetName, metadata, config) {
    const batchSize = Math.min(config.optimalBatchSize, metadata.lastRow);
    const totalBatches = Math.ceil(metadata.lastRow / batchSize);
    const allData = [];
    
    console.log(`OptimizedSheets: Loading ${metadata.lastRow} rows in ${totalBatches} batches of ${batchSize}`);
    
    // Create batch operations
    const batchOperations = [];
    
    for (let i = 0; i < totalBatches; i++) {
      const startRow = i * batchSize + 1;
      const endRow = Math.min(startRow + batchSize - 1, metadata.lastRow);
      
      batchOperations.push({
        id: `batch_${i}`,
        fn: () => this.loadDataRange(spreadsheetId, sheetName, startRow, endRow, metadata.lastColumn),
        options: {
          operationId: `batch_${sheetName}_${i}`,
          timeout: 45000
        }
      });
    }
    
    // Execute batches with controlled concurrency
    const batchResults = await this.retryService.batchRetry(batchOperations, {
      concurrency: config.maxConcurrentCalls,
      delayBetweenBatches: config.callDelayMs,
      failFast: false
    });
    
    // Combine batch results
    batchResults.results.forEach(result => {
      if (result.success && result.result) {
        allData.push(...result.result);
      }
    });
    
    // Log batch loading statistics
    console.log(`OptimizedSheets: Batch loading completed - ${batchResults.successCount}/${batchResults.totalOperations} batches successful`);
    
    if (batchResults.errors.length > 0) {
      console.warn(`OptimizedSheets: ${batchResults.errors.length} batch errors occurred`);
    }
    
    this.apiCallStats.batchCalls += batchResults.successCount;
    
    return allData;
  }

  /**
   * Load a specific range of data
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {number} startRow - Start row (1-based)
   * @param {number} endRow - End row (1-based)
   * @param {number} lastColumn - Last column with data
   * @returns {any[][]} Range data
   */
  loadDataRange(spreadsheetId, sheetName, startRow, endRow, lastColumn) {
    try {
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheet = spreadsheet.getSheetByName(sheetName);
      
      if (!sheet) {
        throw new Error(`Sheet '${sheetName}' not found`);
      }
      
      const rangeNotation = `A${startRow}:${this.columnToLetter(lastColumn)}${endRow}`;
      const range = sheet.getRange(rangeNotation);
      const values = range.getValues();
      
      this.apiCallStats.totalCalls++;
      this.apiCallStats.bytesTransferred += this.estimateDataSize(values);
      
      console.log(`OptimizedSheets: Loaded range ${rangeNotation} (${values.length} rows)`);
      
      return values;
      
    } catch (error) {
      console.error(`Error loading range ${startRow}:${endRow} from ${sheetName}:`, error);
      throw error;
    }
  }

  /**
   * Get cached data with change detection
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {Object} metadata - Current sheet metadata
   * @returns {Promise<any[][]|null>} Cached data or null
   */
  async getCachedDataWithChangeDetection(spreadsheetId, sheetName, metadata) {
    const dataKey = this.cachingService.createContractDataKey(spreadsheetId, sheetName);
    const checksumKey = `checksum_${spreadsheetId}_${sheetName}`;
    
    // Get cached data and checksum
    const cachedData = this.cachingService.get(dataKey, { prefix: 'sheetData' });
    const cachedChecksum = this.cachingService.get(checksumKey, { prefix: 'metadata' });
    
    if (!cachedData || !cachedChecksum) {
      return null;
    }
    
    // Compare checksums to detect changes
    const currentChecksum = metadata.checksum;
    
    if (cachedChecksum === currentChecksum) {
      console.log(`OptimizedSheets: Data unchanged for ${sheetName}, using cache`);
      return cachedData;
    }
    
    console.log(`OptimizedSheets: Data changed for ${sheetName}, cache invalidated`);
    
    // Invalidate cache if data changed
    this.cachingService.delete(dataKey, { prefix: 'sheetData' });
    this.cachingService.delete(checksumKey, { prefix: 'metadata' });
    
    return null;
  }

  /**
   * Cache data with metadata
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {any[][]} data - Data to cache
   * @param {Object} metadata - Sheet metadata
   */
  async cacheDataWithMetadata(spreadsheetId, sheetName, data, metadata) {
    try {
      const dataKey = this.cachingService.createContractDataKey(spreadsheetId, sheetName);
      const checksumKey = `checksum_${spreadsheetId}_${sheetName}`;
      
      // Cache data
      this.cachingService.set(dataKey, data, {
        prefix: 'sheetData',
        ttl: this.config.dataCacheTTL
      });
      
      // Cache checksum for change detection
      this.cachingService.set(checksumKey, metadata.checksum, {
        prefix: 'metadata',
        ttl: this.config.checksumCacheTTL
      });
      
      console.log(`OptimizedSheets: Cached ${data.length} rows for ${sheetName}`);
      
    } catch (error) {
      console.error(`Error caching data for ${sheetName}:`, error);
    }
  }

  /**
   * Calculate metadata checksum for change detection
   * @param {number} lastRow - Last row with data
   * @param {number} lastColumn - Last column with data
   * @param {number} sheetId - Sheet ID
   * @returns {string} Checksum
   */
  calculateMetadataChecksum(lastRow, lastColumn, sheetId) {
    // Simple checksum based on sheet dimensions and ID
    const data = `${sheetId}_${lastRow}_${lastColumn}_${new Date().toDateString()}`;
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return hash.toString(36);
  }

  /**
   * Convert column number to letter notation
   * @param {number} column - Column number (1-based)
   * @returns {string} Column letter(s)
   */
  columnToLetter(column) {
    let result = '';
    while (column > 0) {
      column--;
      result = String.fromCharCode(65 + (column % 26)) + result;
      column = Math.floor(column / 26);
    }
    return result;
  }

  /**
   * Estimate data size in bytes
   * @param {any[][]} data - Data to estimate
   * @returns {number} Estimated size in bytes
   */
  estimateDataSize(data) {
    if (!data || data.length === 0) return 0;
    
    // Estimate based on JSON serialization
    try {
      return JSON.stringify(data).length * 2; // UTF-16 encoding
    } catch (error) {
      // Fallback estimation
      return data.length * (data[0] ? data[0].length : 0) * 50; // 50 bytes per cell average
    }
  }

  /**
   * Preload frequently accessed sheets
   * @param {Array} sheetConfigs - Array of sheet configuration objects
   * @returns {Promise} Promise that resolves when preloading is complete
   */
  async preloadSheets(sheetConfigs) {
    console.log(`OptimizedSheets: Preloading ${sheetConfigs.length} sheets`);
    
    const preloadOperations = sheetConfigs.map(config => ({
      id: `preload_${config.sheetName}`,
      fn: () => this.loadSheetData(config.spreadsheetId, config.sheetName, config.options),
      options: {
        operationId: `preload_${config.sheetName}`,
        timeout: 120000 // 2 minutes for preloading
      }
    }));
    
    const results = await this.retryService.batchRetry(preloadOperations, {
      concurrency: 2, // Lower concurrency for preloading
      delayBetweenBatches: 2000, // Longer delay
      failFast: false
    });
    
    console.log(`OptimizedSheets: Preloading completed - ${results.successCount}/${results.totalOperations} sheets loaded`);
    
    return results;
  }

  /**
   * Get API call statistics
   * @returns {Object} API call statistics
   */
  getApiStats() {
    const totalDataMB = (this.apiCallStats.bytesTransferred / (1024 * 1024)).toFixed(2);
    const cacheHitRate = this.apiCallStats.cacheHits + this.apiCallStats.cacheMisses > 0
      ? ((this.apiCallStats.cacheHits / (this.apiCallStats.cacheHits + this.apiCallStats.cacheMisses)) * 100).toFixed(2)
      : '0';
    
    return {
      ...this.apiCallStats,
      totalDataMB: totalDataMB + ' MB',
      cacheHitRate: cacheHitRate + '%',
      averageBytesPerCall: this.apiCallStats.totalCalls > 0 
        ? Math.round(this.apiCallStats.bytesTransferred / this.apiCallStats.totalCalls)
        : 0
    };
  }

  /**
   * Clear all caches related to a specific spreadsheet
   * @param {string} spreadsheetId - Spreadsheet ID
   */
  clearSpreadsheetCache(spreadsheetId) {
    try {
      this.cachingService.invalidateRelatedCache(spreadsheetId, null);
      console.log(`OptimizedSheets: Cleared cache for spreadsheet ${spreadsheetId}`);
    } catch (error) {
      console.error(`Error clearing cache for spreadsheet ${spreadsheetId}:`, error);
    }
  }

  /**
   * Health check for the optimized sheets service
   * @returns {Object} Health status
   */
  healthCheck() {
    const cacheStats = this.cachingService.getStats();
    const retryStats = this.retryService.getStats();
    const gasStats = this.gasOptimization.getStats();
    
    return {
      healthy: true,
      apiStats: this.getApiStats(),
      cacheHealth: {
        hitRate: cacheStats.hitRate,
        entries: cacheStats.memoryEntries
      },
      retryHealth: {
        successRate: retryStats.successRate,
        circuitBreakers: retryStats.circuitBreakers.length
      },
      gasHealth: {
        quotaUsage: gasStats.quotaUsage,
        executionTime: gasStats.currentExecution
      }
    };
  }
}