/**
 * GASOptimizationService - Handles Google Apps Script specific optimizations
 * Manages execution time limits, quota usage, and batch processing
 */

/**
 * Google Apps Script Optimization Service
 * Provides execution time monitoring, quota management, and batch processing
 */
class GASOptimizationService {
  constructor() {
    // Execution time limits (in milliseconds)
    this.MAX_EXECUTION_TIME = 6 * 60 * 1000; // 6 minutes
    this.SAFE_EXECUTION_TIME = 5.5 * 60 * 1000; // 5.5 minutes (safety buffer)
    this.BATCH_CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds
    
    // Quota limits
    this.SHEETS_API_QUOTA = {
      readRequests: 100, // per 100 seconds
      writeRequests: 100, // per 100 seconds
      dailyQuota: 20000 // daily limit
    };
    
    // Execution tracking
    this.executionStartTime = null;
    this.quotaUsage = {
      readRequests: 0,
      writeRequests: 0,
      lastReset: new Date()
    };
    
    // Batch processing configuration
    this.batchConfig = {
      defaultBatchSize: 100,
      maxBatchSize: 500,
      minBatchSize: 10
    };
    
    // Performance metrics
    this.metrics = {
      totalExecutionTime: 0,
      batchesProcessed: 0,
      quotaExceeded: 0,
      timeoutOccurred: 0
    };
  }

  /**
   * Initialize execution monitoring
   * Call this at the start of any long-running operation
   */
  startExecution() {
    this.executionStartTime = new Date();
    console.log('GAS Optimization: Execution started at', this.executionStartTime);
  }

  /**
   * Get elapsed execution time in milliseconds
   * @returns {number} Elapsed time in milliseconds
   */
  getElapsedTime() {
    if (!this.executionStartTime) {
      return 0;
    }
    return new Date().getTime() - this.executionStartTime.getTime();
  }

  /**
   * Get remaining execution time in milliseconds
   * @returns {number} Remaining time in milliseconds
   */
  getRemainingTime() {
    const elapsed = this.getElapsedTime();
    return Math.max(0, this.SAFE_EXECUTION_TIME - elapsed);
  }

  /**
   * Check if execution should continue or if we're approaching time limit
   * @returns {Object} Status object with continue flag and remaining time
   */
  checkExecutionStatus() {
    const elapsed = this.getElapsedTime();
    const remaining = this.getRemainingTime();
    const shouldContinue = elapsed < this.SAFE_EXECUTION_TIME;
    
    const status = {
      shouldContinue: shouldContinue,
      elapsedTime: elapsed,
      remainingTime: remaining,
      percentUsed: (elapsed / this.SAFE_EXECUTION_TIME) * 100,
      timeoutRisk: elapsed > (this.SAFE_EXECUTION_TIME * 0.8) // 80% threshold
    };
    
    if (!shouldContinue) {
      console.warn('GAS Optimization: Approaching execution time limit', status);
      this.metrics.timeoutOccurred++;
    }
    
    return status;
  }

  /**
   * Process data in batches with execution time monitoring
   * @param {Array} data - Data to process
   * @param {Function} processingFunction - Function to process each batch
   * @param {Object} options - Processing options
   * @returns {Object} Processing results
   */
  async processBatches(data, processingFunction, options = {}) {
    const batchSize = options.batchSize || this.calculateOptimalBatchSize(data.length);
    const results = [];
    const errors = [];
    let processedCount = 0;
    
    console.log(`GAS Optimization: Processing ${data.length} items in batches of ${batchSize}`);
    
    this.startExecution();
    
    try {
      for (let i = 0; i < data.length; i += batchSize) {
        // Check execution time before processing each batch
        const status = this.checkExecutionStatus();
        
        if (!status.shouldContinue) {
          console.warn('GAS Optimization: Stopping batch processing due to time limit');
          break;
        }
        
        // Create batch
        const batch = data.slice(i, Math.min(i + batchSize, data.length));
        
        try {
          // Process batch with timeout protection
          const batchResult = await this.processWithTimeout(
            () => processingFunction(batch, i, processedCount),
            status.remainingTime
          );
          
          results.push(...(Array.isArray(batchResult) ? batchResult : [batchResult]));
          processedCount += batch.length;
          this.metrics.batchesProcessed++;
          
          // Log progress
          if (processedCount % (batchSize * 5) === 0 || processedCount === data.length) {
            console.log(`GAS Optimization: Processed ${processedCount}/${data.length} items (${Math.round((processedCount/data.length)*100)}%)`);
          }
          
          // Brief pause to prevent quota exhaustion
          if (i + batchSize < data.length) {
            await this.smartDelay(batch.length);
          }
          
        } catch (error) {
          console.error(`GAS Optimization: Error processing batch ${i}-${i+batch.length}:`, error);
          errors.push({
            batchStart: i,
            batchEnd: i + batch.length,
            error: error.message,
            timestamp: new Date()
          });
          
          // Continue with next batch unless it's a critical error
          if (this.isCriticalError(error)) {
            throw error;
          }
        }
      }
      
    } catch (error) {
      console.error('GAS Optimization: Critical error in batch processing:', error);
      throw error;
    }
    
    const finalStatus = this.checkExecutionStatus();
    this.metrics.totalExecutionTime += finalStatus.elapsedTime;
    
    return {
      results: results,
      errors: errors,
      processedCount: processedCount,
      totalItems: data.length,
      executionTime: finalStatus.elapsedTime,
      batchesProcessed: this.metrics.batchesProcessed,
      success: errors.length === 0,
      partialSuccess: processedCount > 0 && processedCount < data.length
    };
  }

  /**
   * Process a function with timeout protection
   * @param {Function} fn - Function to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise} Promise that resolves with function result or rejects on timeout
   */
  async processWithTimeout(fn, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      try {
        const result = fn();
        clearTimeout(timeout);
        resolve(result);
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  /**
   * Calculate optimal batch size based on data size and available time
   * @param {number} dataSize - Total number of items to process
   * @returns {number} Optimal batch size
   */
  calculateOptimalBatchSize(dataSize) {
    const remainingTime = this.getRemainingTime();
    const estimatedTimePerItem = 50; // milliseconds per item (conservative estimate)
    
    // Calculate how many items we can process in remaining time
    const maxItemsInTime = Math.floor(remainingTime / estimatedTimePerItem);
    
    // Calculate batch size based on data size and time constraints
    let batchSize = Math.min(
      this.batchConfig.defaultBatchSize,
      Math.max(this.batchConfig.minBatchSize, Math.floor(maxItemsInTime / 10))
    );
    
    // Adjust based on data size
    if (dataSize < 50) {
      batchSize = Math.min(batchSize, dataSize);
    } else if (dataSize > 1000) {
      batchSize = Math.min(this.batchConfig.maxBatchSize, batchSize);
    }
    
    console.log(`GAS Optimization: Calculated batch size ${batchSize} for ${dataSize} items with ${remainingTime}ms remaining`);
    
    return batchSize;
  }

  /**
   * Smart delay between operations to manage quota usage
   * @param {number} operationsCount - Number of operations just performed
   */
  async smartDelay(operationsCount) {
    // Base delay to prevent quota exhaustion
    let delay = 100; // 100ms base delay
    
    // Increase delay based on quota usage
    if (this.quotaUsage.readRequests > this.SHEETS_API_QUOTA.readRequests * 0.8) {
      delay += 500; // Additional 500ms if approaching quota
    }
    
    // Increase delay based on operations count
    if (operationsCount > 50) {
      delay += operationsCount * 2; // 2ms per operation
    }
    
    // Ensure we don't delay too long
    delay = Math.min(delay, 2000); // Max 2 second delay
    
    if (delay > 100) {
      console.log(`GAS Optimization: Smart delay of ${delay}ms to manage quota`);
    }
    
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Track quota usage for Google Sheets API calls
   * @param {string} operationType - Type of operation ('read' or 'write')
   * @param {number} count - Number of operations performed
   */
  trackQuotaUsage(operationType, count = 1) {
    const now = new Date();
    
    // Reset quota tracking if it's been more than 100 seconds
    if (now.getTime() - this.quotaUsage.lastReset.getTime() > 100000) {
      this.quotaUsage.readRequests = 0;
      this.quotaUsage.writeRequests = 0;
      this.quotaUsage.lastReset = now;
    }
    
    if (operationType === 'read') {
      this.quotaUsage.readRequests += count;
    } else if (operationType === 'write') {
      this.quotaUsage.writeRequests += count;
    }
    
    // Check if approaching quota limits
    const readUsagePercent = (this.quotaUsage.readRequests / this.SHEETS_API_QUOTA.readRequests) * 100;
    const writeUsagePercent = (this.quotaUsage.writeRequests / this.SHEETS_API_QUOTA.writeRequests) * 100;
    
    if (readUsagePercent > 80 || writeUsagePercent > 80) {
      console.warn('GAS Optimization: Approaching quota limits', {
        readUsage: `${this.quotaUsage.readRequests}/${this.SHEETS_API_QUOTA.readRequests} (${readUsagePercent.toFixed(1)}%)`,
        writeUsage: `${this.quotaUsage.writeRequests}/${this.SHEETS_API_QUOTA.writeRequests} (${writeUsagePercent.toFixed(1)}%)`
      });
      
      if (readUsagePercent > 90 || writeUsagePercent > 90) {
        this.metrics.quotaExceeded++;
        throw new Error('Quota limit exceeded. Please wait before making more requests.');
      }
    }
  }

  /**
   * Check if an error is critical and should stop processing
   * @param {Error} error - Error to check
   * @returns {boolean} True if error is critical
   */
  isCriticalError(error) {
    const criticalPatterns = [
      'quota exceeded',
      'permission denied',
      'authentication failed',
      'service unavailable',
      'internal error'
    ];
    
    const errorMessage = error.message.toLowerCase();
    return criticalPatterns.some(pattern => errorMessage.includes(pattern));
  }

  /**
   * Get current performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentExecution: {
        elapsedTime: this.getElapsedTime(),
        remainingTime: this.getRemainingTime(),
        executionStatus: this.checkExecutionStatus()
      },
      quotaUsage: { ...this.quotaUsage },
      averageExecutionTime: this.metrics.batchesProcessed > 0 
        ? this.metrics.totalExecutionTime / this.metrics.batchesProcessed 
        : 0
    };
  }

  /**
   * Reset metrics and quota tracking
   */
  resetMetrics() {
    this.metrics = {
      totalExecutionTime: 0,
      batchesProcessed: 0,
      quotaExceeded: 0,
      timeoutOccurred: 0
    };
    
    this.quotaUsage = {
      readRequests: 0,
      writeRequests: 0,
      lastReset: new Date()
    };
    
    console.log('GAS Optimization: Metrics and quota tracking reset');
  }

  /**
   * Create a graceful shutdown handler for long-running operations
   * @param {Function} cleanupFunction - Function to call during shutdown
   * @returns {Function} Shutdown handler function
   */
  createGracefulShutdown(cleanupFunction) {
    return () => {
      const status = this.checkExecutionStatus();
      
      if (!status.shouldContinue || status.timeoutRisk) {
        console.log('GAS Optimization: Initiating graceful shutdown');
        
        try {
          if (cleanupFunction) {
            cleanupFunction(status);
          }
        } catch (error) {
          console.error('GAS Optimization: Error during cleanup:', error);
        }
        
        return {
          shutdown: true,
          reason: status.shouldContinue ? 'timeout_risk' : 'time_limit',
          status: status
        };
      }
      
      return { shutdown: false, status: status };
    };
  }

  /**
   * Optimize data loading operations with intelligent batching
   * @param {Function} loadFunction - Function that loads data
   * @param {Object} options - Loading options
   * @returns {Promise} Promise that resolves with loaded data
   */
  async optimizedDataLoad(loadFunction, options = {}) {
    const startTime = new Date();
    this.startExecution();
    
    try {
      // Track this as a read operation
      this.trackQuotaUsage('read', 1);
      
      // Execute with timeout protection
      const result = await this.processWithTimeout(
        loadFunction,
        options.timeout || this.getRemainingTime()
      );
      
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.log(`GAS Optimization: Data load completed in ${duration}ms`);
      
      return {
        data: result,
        loadTime: duration,
        success: true
      };
      
    } catch (error) {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      
      console.error(`GAS Optimization: Data load failed after ${duration}ms:`, error);
      
      return {
        data: null,
        loadTime: duration,
        success: false,
        error: error.message
      };
    }
  }
}