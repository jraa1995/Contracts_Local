/**
 * OptimizationManager - Coordinates all Google Apps Script optimizations
 * Provides centralized management of execution time, quota, caching, and API optimization
 */

/**
 * Optimization Manager for Google Apps Script
 * Coordinates all optimization services and provides unified optimization strategies
 */
class OptimizationManager {
  constructor() {
    // Initialize optimization services
    this.gasOptimization = new GASOptimizationService();
    this.cachingService = new CachingService();
    this.retryService = new RetryService();
    this.optimizedSheets = new OptimizedSheetsService();
    
    // Optimization configuration
    this.config = {
      // Global optimization settings
      enableAllOptimizations: true,
      enableExecutionTimeMonitoring: true,
      enableQuotaManagement: true,
      enableIntelligentCaching: true,
      enableBatchProcessing: true,
      enableRetryLogic: true,
      
      // Performance thresholds
      maxExecutionTimePercent: 80, // Stop at 80% of execution time limit
      maxQuotaUsagePercent: 85, // Alert at 85% quota usage
      minCacheHitRate: 60, // Target 60% cache hit rate
      
      // Optimization strategies
      strategies: {
        smallDataset: { // < 100 rows
          enableCaching: true,
          enableBatching: false,
          cacheTimeout: 10 * 60 * 1000, // 10 minutes
          retryAttempts: 3
        },
        mediumDataset: { // 100-1000 rows
          enableCaching: true,
          enableBatching: true,
          batchSize: 200,
          cacheTimeout: 5 * 60 * 1000, // 5 minutes
          retryAttempts: 5
        },
        largeDataset: { // > 1000 rows
          enableCaching: true,
          enableBatching: true,
          batchSize: 100,
          cacheTimeout: 2 * 60 * 1000, // 2 minutes
          retryAttempts: 7,
          enablePreloading: true
        }
      }
    };
    
    // Performance monitoring
    this.performanceMonitor = {
      operationTimes: [],
      quotaUsageHistory: [],
      cachePerformance: [],
      errorRates: [],
      optimizationImpact: {
        timesSaved: 0,
        apiCallsReduced: 0,
        errorsAvoided: 0
      }
    };
    
    // Optimization recommendations
    this.recommendations = [];
  }

  /**
   * Initialize optimization manager with configuration
   * @param {Object} config - Configuration options
   */
  initialize(config = {}) {
    this.config = { ...this.config, ...config };
    
    console.log('OptimizationManager: Initialized with configuration:', {
      enableAllOptimizations: this.config.enableAllOptimizations,
      strategies: Object.keys(this.config.strategies)
    });
    
    // Start performance monitoring
    this.startPerformanceMonitoring();
  }

  /**
   * Optimize data loading operation
   * @param {Function} dataLoader - Data loading function
   * @param {Object} options - Optimization options
   * @returns {Promise} Optimized data loading result
   */
  async optimizeDataLoading(dataLoader, options = {}) {
    const startTime = new Date();
    
    try {
      // Start execution monitoring
      this.gasOptimization.startExecution();
      
      // Determine optimization strategy based on expected data size
      const strategy = this.selectOptimizationStrategy(options.expectedDataSize);
      
      console.log(`OptimizationManager: Using ${strategy.name} strategy for data loading`);
      
      // Apply optimizations based on strategy
      let result;
      
      if (strategy.config.enableCaching) {
        // Use caching optimization
        result = await this.optimizeWithCaching(dataLoader, strategy, options);
      } else {
        // Direct loading with other optimizations
        result = await this.optimizeWithoutCaching(dataLoader, strategy, options);
      }
      
      // Record performance metrics
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();
      
      this.recordPerformanceMetrics({
        operation: 'dataLoading',
        executionTime: executionTime,
        strategy: strategy.name,
        success: true,
        dataSize: result ? (Array.isArray(result) ? result.length : 1) : 0
      });
      
      console.log(`OptimizationManager: Data loading completed in ${executionTime}ms using ${strategy.name} strategy`);
      
      return result;
      
    } catch (error) {
      const endTime = new Date();
      const executionTime = endTime.getTime() - startTime.getTime();
      
      this.recordPerformanceMetrics({
        operation: 'dataLoading',
        executionTime: executionTime,
        strategy: 'unknown',
        success: false,
        error: error.message
      });
      
      console.error('OptimizationManager: Data loading failed:', error);
      throw error;
    }
  }

  /**
   * Optimize with caching
   * @param {Function} dataLoader - Data loading function
   * @param {Object} strategy - Optimization strategy
   * @param {Object} options - Options
   * @returns {Promise} Result with caching optimization
   */
  async optimizeWithCaching(dataLoader, strategy, options) {
    const cacheKey = options.cacheKey || 'default_data_load';
    
    return await this.cachingService.getOrSet(
      cacheKey,
      async () => {
        // Load data with other optimizations
        return await this.optimizeWithoutCaching(dataLoader, strategy, options);
      },
      {
        ttl: strategy.config.cacheTimeout,
        prefix: options.cachePrefix || 'optimized'
      }
    );
  }

  /**
   * Optimize without caching
   * @param {Function} dataLoader - Data loading function
   * @param {Object} strategy - Optimization strategy
   * @param {Object} options - Options
   * @returns {Promise} Result with other optimizations
   */
  async optimizeWithoutCaching(dataLoader, strategy, options) {
    // Apply retry logic
    if (this.config.enableRetryLogic) {
      return await this.retryService.executeWithRetry(
        async () => {
          // Apply batch processing if enabled
          if (strategy.config.enableBatching && options.batchable) {
            return await this.optimizeWithBatching(dataLoader, strategy, options);
          } else {
            // Direct execution with timeout monitoring
            return await this.gasOptimization.optimizedDataLoad(dataLoader, {
              timeout: options.timeout || 300000 // 5 minutes default
            });
          }
        },
        {
          maxRetries: strategy.config.retryAttempts,
          operationId: options.operationId || 'optimized_data_load'
        }
      );
    } else {
      // Direct execution
      return await dataLoader();
    }
  }

  /**
   * Optimize with batch processing
   * @param {Function} dataLoader - Data loading function
   * @param {Object} strategy - Optimization strategy
   * @param {Object} options - Options
   * @returns {Promise} Result with batch optimization
   */
  async optimizeWithBatching(dataLoader, strategy, options) {
    // This would be used for operations that can be batched
    // For now, delegate to GAS optimization service
    return await this.gasOptimization.optimizedDataLoad(dataLoader, {
      timeout: options.timeout || 300000
    });
  }

  /**
   * Select optimization strategy based on data characteristics
   * @param {number} expectedDataSize - Expected data size
   * @returns {Object} Selected strategy
   */
  selectOptimizationStrategy(expectedDataSize) {
    if (!expectedDataSize || expectedDataSize < 100) {
      return {
        name: 'smallDataset',
        config: this.config.strategies.smallDataset
      };
    } else if (expectedDataSize < 1000) {
      return {
        name: 'mediumDataset',
        config: this.config.strategies.mediumDataset
      };
    } else {
      return {
        name: 'largeDataset',
        config: this.config.strategies.largeDataset
      };
    }
  }

  /**
   * Optimize Google Sheets operations
   * @param {string} spreadsheetId - Spreadsheet ID
   * @param {string} sheetName - Sheet name
   * @param {Object} options - Options
   * @returns {Promise} Optimized sheets operation result
   */
  async optimizeSheetOperation(spreadsheetId, sheetName, options = {}) {
    try {
      // Use optimized sheets service
      const result = await this.optimizedSheets.loadSheetData(
        spreadsheetId,
        sheetName,
        options
      );
      
      // Record optimization impact
      const sheetsStats = this.optimizedSheets.getApiStats();
      this.performanceMonitor.optimizationImpact.apiCallsReduced += 
        (sheetsStats.cacheHits || 0);
      
      return result;
      
    } catch (error) {
      console.error('OptimizationManager: Sheet operation failed:', error);
      throw error;
    }
  }

  /**
   * Start performance monitoring
   */
  startPerformanceMonitoring() {
    // Only run in browser environment
    if (typeof setInterval === 'undefined') {
      console.log('OptimizationManager: Performance monitoring skipped (not in browser environment)');
      return;
    }
    
    // Monitor execution time
    setInterval(() => {
      if (this.config.enableExecutionTimeMonitoring) {
        this.monitorExecutionTime();
      }
    }, 30000); // Check every 30 seconds
    
    // Monitor quota usage
    setInterval(() => {
      if (this.config.enableQuotaManagement) {
        this.monitorQuotaUsage();
      }
    }, 60000); // Check every minute
    
    console.log('OptimizationManager: Performance monitoring started');
  }

  /**
   * Monitor execution time and provide warnings
   */
  monitorExecutionTime() {
    const status = this.gasOptimization.checkExecutionStatus();
    
    if (status.percentUsed > this.config.maxExecutionTimePercent) {
      console.warn(`OptimizationManager: Execution time warning - ${status.percentUsed.toFixed(1)}% used`);
      
      this.recommendations.push({
        type: 'execution_time',
        severity: 'warning',
        message: `Execution time is at ${status.percentUsed.toFixed(1)}%. Consider optimizing or breaking into smaller operations.`,
        timestamp: new Date()
      });
    }
    
    // Record metrics
    this.performanceMonitor.operationTimes.push({
      timestamp: new Date(),
      percentUsed: status.percentUsed,
      remainingTime: status.remainingTime
    });
    
    // Keep only recent metrics (last 100 entries)
    if (this.performanceMonitor.operationTimes.length > 100) {
      this.performanceMonitor.operationTimes = this.performanceMonitor.operationTimes.slice(-100);
    }
  }

  /**
   * Monitor quota usage and provide warnings
   */
  monitorQuotaUsage() {
    const gasMetrics = this.gasOptimization.getMetrics();
    
    if (gasMetrics.quotaUsage) {
      const readUsagePercent = (gasMetrics.quotaUsage.readRequests / 100) * 100; // Assuming 100 per 100 seconds limit
      const writeUsagePercent = (gasMetrics.quotaUsage.writeRequests / 100) * 100;
      
      if (readUsagePercent > this.config.maxQuotaUsagePercent || 
          writeUsagePercent > this.config.maxQuotaUsagePercent) {
        
        console.warn(`OptimizationManager: Quota usage warning - Read: ${readUsagePercent.toFixed(1)}%, Write: ${writeUsagePercent.toFixed(1)}%`);
        
        this.recommendations.push({
          type: 'quota_usage',
          severity: 'warning',
          message: `Quota usage is high. Read: ${readUsagePercent.toFixed(1)}%, Write: ${writeUsagePercent.toFixed(1)}%`,
          timestamp: new Date()
        });
      }
      
      // Record metrics
      this.performanceMonitor.quotaUsageHistory.push({
        timestamp: new Date(),
        readUsagePercent: readUsagePercent,
        writeUsagePercent: writeUsagePercent
      });
      
      // Keep only recent metrics
      if (this.performanceMonitor.quotaUsageHistory.length > 100) {
        this.performanceMonitor.quotaUsageHistory = this.performanceMonitor.quotaUsageHistory.slice(-100);
      }
    }
  }

  /**
   * Record performance metrics
   * @param {Object} metrics - Performance metrics to record
   */
  recordPerformanceMetrics(metrics) {
    // Add to operation times if it's a timed operation
    if (metrics.executionTime) {
      this.performanceMonitor.operationTimes.push({
        timestamp: new Date(),
        operation: metrics.operation,
        executionTime: metrics.executionTime,
        strategy: metrics.strategy,
        success: metrics.success,
        dataSize: metrics.dataSize
      });
    }
    
    // Record cache performance
    const cacheStats = this.cachingService.getStats();
    this.performanceMonitor.cachePerformance.push({
      timestamp: new Date(),
      hitRate: parseFloat(cacheStats.hitRate),
      entries: cacheStats.memoryEntries
    });
    
    // Generate recommendations based on performance
    this.generatePerformanceRecommendations(metrics);
  }

  /**
   * Generate performance recommendations
   * @param {Object} metrics - Current performance metrics
   */
  generatePerformanceRecommendations(metrics) {
    const cacheStats = this.cachingService.getStats();
    const hitRate = parseFloat(cacheStats.hitRate);
    
    // Cache hit rate recommendations
    if (hitRate < this.config.minCacheHitRate) {
      this.recommendations.push({
        type: 'cache_performance',
        severity: 'info',
        message: `Cache hit rate is ${hitRate.toFixed(1)}%. Consider adjusting cache TTL or warming strategies.`,
        timestamp: new Date()
      });
    }
    
    // Execution time recommendations
    if (metrics.executionTime && metrics.executionTime > 60000) { // > 1 minute
      this.recommendations.push({
        type: 'execution_performance',
        severity: 'info',
        message: `Operation took ${(metrics.executionTime / 1000).toFixed(1)} seconds. Consider batch processing or caching.`,
        timestamp: new Date()
      });
    }
    
    // Keep only recent recommendations (last 50)
    if (this.recommendations.length > 50) {
      this.recommendations = this.recommendations.slice(-50);
    }
  }

  /**
   * Get comprehensive optimization status
   * @returns {Object} Optimization status and metrics
   */
  getOptimizationStatus() {
    const gasMetrics = this.gasOptimization.getMetrics();
    const cacheStats = this.cachingService.getStats();
    const retryStats = this.retryService.getStats();
    const sheetsStats = this.optimizedSheets.getApiStats();
    
    return {
      overall: {
        healthy: true,
        optimizationsEnabled: this.config.enableAllOptimizations,
        activeStrategies: Object.keys(this.config.strategies)
      },
      execution: {
        currentStatus: gasMetrics.currentExecution,
        totalExecutionTime: gasMetrics.totalExecutionTime,
        batchesProcessed: gasMetrics.batchesProcessed
      },
      caching: {
        hitRate: cacheStats.hitRate,
        entries: cacheStats.memoryEntries,
        totalSize: cacheStats.totalSize
      },
      retry: {
        successRate: retryStats.successRate,
        totalRetries: retryStats.totalRetries,
        circuitBreakers: retryStats.circuitBreakers.length
      },
      sheets: {
        apiCalls: sheetsStats.totalCalls,
        dataTransferred: sheetsStats.totalDataMB,
        cacheHitRate: sheetsStats.cacheHitRate
      },
      performance: {
        averageOperationTime: this.calculateAverageOperationTime(),
        optimizationImpact: this.performanceMonitor.optimizationImpact,
        recentRecommendations: this.recommendations.slice(-10)
      }
    };
  }

  /**
   * Calculate average operation time
   * @returns {number} Average operation time in milliseconds
   */
  calculateAverageOperationTime() {
    const recentOperations = this.performanceMonitor.operationTimes.slice(-20);
    
    if (recentOperations.length === 0) {
      return 0;
    }
    
    const totalTime = recentOperations.reduce((sum, op) => sum + (op.executionTime || 0), 0);
    return Math.round(totalTime / recentOperations.length);
  }

  /**
   * Reset all optimization services and metrics
   */
  reset() {
    this.gasOptimization.resetMetrics();
    this.cachingService.clear();
    this.retryService.reset();
    
    this.performanceMonitor = {
      operationTimes: [],
      quotaUsageHistory: [],
      cachePerformance: [],
      errorRates: [],
      optimizationImpact: {
        timesSaved: 0,
        apiCallsReduced: 0,
        errorsAvoided: 0
      }
    };
    
    this.recommendations = [];
    
    console.log('OptimizationManager: All services and metrics reset');
  }

  /**
   * Health check for all optimization services
   * @returns {Object} Health status
   */
  healthCheck() {
    const gasHealth = this.gasOptimization.getMetrics();
    const cacheHealth = this.cachingService.getStats();
    const retryHealth = this.retryService.healthCheck();
    const sheetsHealth = this.optimizedSheets.healthCheck();
    
    const overallHealthy = retryHealth.healthy && sheetsHealth.healthy;
    
    return {
      healthy: overallHealthy,
      services: {
        gasOptimization: {
          healthy: gasHealth.currentExecution ? gasHealth.currentExecution.shouldContinue : true,
          metrics: gasHealth
        },
        caching: {
          healthy: true,
          stats: cacheHealth
        },
        retry: retryHealth,
        sheets: sheetsHealth
      },
      recommendations: this.recommendations.slice(-5) // Last 5 recommendations
    };
  }
}