/**
 * RetryService - Intelligent retry logic for Google Apps Script API calls
 * Provides exponential backoff, circuit breaker pattern, and error classification
 */

/**
 * Retry Service for handling transient failures in Google Apps Script
 * Implements intelligent retry strategies with exponential backoff and circuit breaker
 */
class RetryService {
  constructor() {
    // Retry configuration
    this.config = {
      // Default retry settings
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      jitterRange: 0.1, // 10% jitter
      
      // Circuit breaker settings
      circuitBreakerThreshold: 5, // failures before opening circuit
      circuitBreakerTimeout: 60000, // 1 minute before trying again
      
      // Timeout settings
      defaultTimeout: 30000, // 30 seconds
      longTimeout: 120000, // 2 minutes for large operations
    };
    
    // Circuit breaker state
    this.circuitBreakers = new Map();
    
    // Retry statistics
    this.stats = {
      totalAttempts: 0,
      totalRetries: 0,
      successfulRetries: 0,
      failedOperations: 0,
      circuitBreakerTrips: 0
    };
    
    // Error classification patterns
    this.errorPatterns = {
      retryable: [
        /timeout/i,
        /service unavailable/i,
        /internal error/i,
        /temporary failure/i,
        /rate limit/i,
        /quota.*exceeded/i,
        /connection.*reset/i,
        /network.*error/i,
        /server.*error/i,
        /503/,
        /502/,
        /500/
      ],
      nonRetryable: [
        /permission denied/i,
        /authentication.*failed/i,
        /invalid.*credentials/i,
        /not found/i,
        /bad request/i,
        /unauthorized/i,
        /forbidden/i,
        /401/,
        /403/,
        /404/,
        /400/
      ],
      quotaExceeded: [
        /quota.*exceeded/i,
        /rate.*limit/i,
        /too many requests/i,
        /429/
      ]
    };
  }

  /**
   * Execute operation with retry logic
   * @param {Function} operation - Operation to execute
   * @param {Object} options - Retry options
   * @returns {Promise} Promise that resolves with operation result
   */
  async executeWithRetry(operation, options = {}) {
    const config = { ...this.config, ...options };
    const operationId = options.operationId || 'unknown';
    
    // Check circuit breaker
    if (this.isCircuitOpen(operationId)) {
      throw new Error(`Circuit breaker is open for operation: ${operationId}`);
    }
    
    let lastError;
    let attempt = 0;
    
    while (attempt <= config.maxRetries) {
      this.stats.totalAttempts++;
      
      try {
        console.log(`Retry attempt ${attempt + 1}/${config.maxRetries + 1} for operation: ${operationId}`);
        
        // Execute operation with timeout
        const result = await this.executeWithTimeout(operation, config.timeout || config.defaultTimeout);
        
        // Success - reset circuit breaker
        this.recordSuccess(operationId);
        
        if (attempt > 0) {
          this.stats.successfulRetries++;
          console.log(`Operation succeeded after ${attempt} retries: ${operationId}`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        console.error(`Attempt ${attempt} failed for operation ${operationId}:`, error.message);
        
        // Classify error
        const errorType = this.classifyError(error);
        
        // Handle non-retryable errors
        if (errorType === 'nonRetryable') {
          console.log(`Non-retryable error detected for ${operationId}, stopping retries`);
          this.recordFailure(operationId);
          throw error;
        }
        
        // Handle quota exceeded errors with longer delay
        if (errorType === 'quotaExceeded') {
          console.log(`Quota exceeded error detected for ${operationId}, using extended delay`);
          if (attempt <= config.maxRetries) {
            await this.delay(Math.min(config.maxDelay * 2, 60000)); // Extended delay for quota
          }
          continue;
        }
        
        // Check if we should retry
        if (attempt > config.maxRetries) {
          console.log(`Max retries exceeded for operation: ${operationId}`);
          this.recordFailure(operationId);
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt, config);
        console.log(`Retrying operation ${operationId} in ${delay}ms`);
        
        await this.delay(delay);
      }
    }
    
    // All retries failed
    this.stats.failedOperations++;
    this.stats.totalRetries += attempt - 1;
    
    throw new Error(`Operation failed after ${config.maxRetries + 1} attempts: ${lastError.message}`);
  }

  /**
   * Execute operation with timeout
   * @param {Function} operation - Operation to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @returns {Promise} Promise that resolves with operation result or rejects on timeout
   */
  async executeWithTimeout(operation, timeoutMs) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      
      Promise.resolve(operation())
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  /**
   * Classify error type for retry decision
   * @param {Error} error - Error to classify
   * @returns {string} Error classification
   */
  classifyError(error) {
    const errorMessage = error.message || error.toString();
    
    // Check for quota exceeded patterns first
    if (this.errorPatterns.quotaExceeded.some(pattern => pattern.test(errorMessage))) {
      return 'quotaExceeded';
    }
    
    // Check for non-retryable patterns
    if (this.errorPatterns.nonRetryable.some(pattern => pattern.test(errorMessage))) {
      return 'nonRetryable';
    }
    
    // Check for retryable patterns
    if (this.errorPatterns.retryable.some(pattern => pattern.test(errorMessage))) {
      return 'retryable';
    }
    
    // Default to retryable for unknown errors (conservative approach)
    return 'retryable';
  }

  /**
   * Calculate delay with exponential backoff and jitter
   * @param {number} attempt - Current attempt number (1-based)
   * @param {Object} config - Retry configuration
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt, config) {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ (attempt - 1))
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    const jitter = delay * config.jitterRange * (Math.random() * 2 - 1); // ±jitterRange
    delay += jitter;
    
    return Math.max(0, Math.round(delay));
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if circuit breaker is open for operation
   * @param {string} operationId - Operation identifier
   * @returns {boolean} True if circuit is open
   */
  isCircuitOpen(operationId) {
    const breaker = this.circuitBreakers.get(operationId);
    
    if (!breaker) {
      return false;
    }
    
    if (breaker.state === 'open') {
      // Check if timeout has passed
      if (new Date().getTime() - breaker.openedAt > this.config.circuitBreakerTimeout) {
        // Move to half-open state
        breaker.state = 'half-open';
        console.log(`Circuit breaker moved to half-open for operation: ${operationId}`);
        return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * Record successful operation
   * @param {string} operationId - Operation identifier
   */
  recordSuccess(operationId) {
    const breaker = this.circuitBreakers.get(operationId);
    
    if (breaker) {
      if (breaker.state === 'half-open') {
        // Success in half-open state - close the circuit
        breaker.state = 'closed';
        breaker.failures = 0;
        console.log(`Circuit breaker closed for operation: ${operationId}`);
      } else if (breaker.state === 'closed') {
        // Reset failure count on success
        breaker.failures = 0;
      }
    }
  }

  /**
   * Record failed operation
   * @param {string} operationId - Operation identifier
   */
  recordFailure(operationId) {
    let breaker = this.circuitBreakers.get(operationId);
    
    if (!breaker) {
      breaker = {
        state: 'closed',
        failures: 0,
        openedAt: null
      };
      this.circuitBreakers.set(operationId, breaker);
    }
    
    breaker.failures++;
    
    // Check if we should open the circuit
    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.state = 'open';
      breaker.openedAt = new Date().getTime();
      this.stats.circuitBreakerTrips++;
      console.warn(`Circuit breaker opened for operation: ${operationId} (${breaker.failures} failures)`);
    }
  }

  /**
   * Retry Google Sheets API operations with specific optimizations
   * @param {Function} sheetsOperation - Sheets API operation
   * @param {Object} options - Retry options
   * @returns {Promise} Promise that resolves with operation result
   */
  async retrySheetOperation(sheetsOperation, options = {}) {
    const sheetsConfig = {
      ...this.config,
      maxRetries: 5, // More retries for Sheets API
      baseDelay: 2000, // Longer base delay
      maxDelay: 60000, // Longer max delay
      timeout: options.timeout || this.config.longTimeout,
      operationId: options.operationId || 'sheets_operation',
      ...options
    };
    
    return this.executeWithRetry(sheetsOperation, sheetsConfig);
  }

  /**
   * Retry data processing operations
   * @param {Function} processingOperation - Data processing operation
   * @param {Object} options - Retry options
   * @returns {Promise} Promise that resolves with operation result
   */
  async retryDataProcessing(processingOperation, options = {}) {
    const processingConfig = {
      ...this.config,
      maxRetries: 2, // Fewer retries for processing (usually deterministic)
      baseDelay: 500, // Shorter delay
      timeout: options.timeout || this.config.defaultTimeout,
      operationId: options.operationId || 'data_processing',
      ...options
    };
    
    return this.executeWithRetry(processingOperation, processingConfig);
  }

  /**
   * Batch retry operations with intelligent scheduling
   * @param {Array} operations - Array of operation objects
   * @param {Object} options - Batch retry options
   * @returns {Promise} Promise that resolves with batch results
   */
  async batchRetry(operations, options = {}) {
    const batchConfig = {
      concurrency: options.concurrency || 3,
      delayBetweenBatches: options.delayBetweenBatches || 1000,
      failFast: options.failFast || false,
      ...options
    };
    
    const results = [];
    const errors = [];
    
    // Process operations in batches
    for (let i = 0; i < operations.length; i += batchConfig.concurrency) {
      const batch = operations.slice(i, i + batchConfig.concurrency);
      
      console.log(`Processing batch ${Math.floor(i / batchConfig.concurrency) + 1}/${Math.ceil(operations.length / batchConfig.concurrency)}`);
      
      // Execute batch operations concurrently
      const batchPromises = batch.map(async (operation, index) => {
        try {
          const result = await this.executeWithRetry(
            operation.fn,
            {
              ...operation.options,
              operationId: operation.id || `batch_${i + index}`
            }
          );
          
          return {
            success: true,
            result: result,
            operationId: operation.id || `batch_${i + index}`
          };
          
        } catch (error) {
          const errorResult = {
            success: false,
            error: error.message,
            operationId: operation.id || `batch_${i + index}`
          };
          
          if (batchConfig.failFast) {
            throw error;
          }
          
          return errorResult;
        }
      });
      
      try {
        const batchResults = await Promise.all(batchPromises);
        
        // Separate successful results from errors
        batchResults.forEach(result => {
          if (result.success) {
            results.push(result);
          } else {
            errors.push(result);
          }
        });
        
        // Delay between batches to manage load
        if (i + batchConfig.concurrency < operations.length) {
          await this.delay(batchConfig.delayBetweenBatches);
        }
        
      } catch (error) {
        if (batchConfig.failFast) {
          throw error;
        }
        
        errors.push({
          success: false,
          error: error.message,
          operationId: `batch_${Math.floor(i / batchConfig.concurrency)}`
        });
      }
    }
    
    return {
      results: results,
      errors: errors,
      totalOperations: operations.length,
      successCount: results.length,
      errorCount: errors.length,
      successRate: (results.length / operations.length) * 100
    };
  }

  /**
   * Get retry statistics
   * @returns {Object} Retry statistics
   */
  getStats() {
    const successRate = this.stats.totalAttempts > 0 
      ? ((this.stats.totalAttempts - this.stats.failedOperations) / this.stats.totalAttempts) * 100 
      : 0;
    
    const retryRate = this.stats.totalAttempts > 0 
      ? (this.stats.totalRetries / this.stats.totalAttempts) * 100 
      : 0;
    
    return {
      ...this.stats,
      successRate: successRate.toFixed(2) + '%',
      retryRate: retryRate.toFixed(2) + '%',
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([id, breaker]) => ({
        operationId: id,
        state: breaker.state,
        failures: breaker.failures,
        openedAt: breaker.openedAt
      }))
    };
  }

  /**
   * Reset circuit breakers and statistics
   * @param {string} operationId - Optional specific operation to reset
   */
  reset(operationId = null) {
    if (operationId) {
      this.circuitBreakers.delete(operationId);
      console.log(`Reset circuit breaker for operation: ${operationId}`);
    } else {
      this.circuitBreakers.clear();
      this.stats = {
        totalAttempts: 0,
        totalRetries: 0,
        successfulRetries: 0,
        failedOperations: 0,
        circuitBreakerTrips: 0
      };
      console.log('Reset all circuit breakers and statistics');
    }
  }

  /**
   * Create a retry wrapper for a function
   * @param {Function} fn - Function to wrap
   * @param {Object} options - Retry options
   * @returns {Function} Wrapped function with retry logic
   */
  createRetryWrapper(fn, options = {}) {
    return async (...args) => {
      return this.executeWithRetry(() => fn(...args), options);
    };
  }

  /**
   * Health check for retry service
   * @returns {Object} Health status
   */
  healthCheck() {
    const openCircuits = Array.from(this.circuitBreakers.values())
      .filter(breaker => breaker.state === 'open').length;
    
    const halfOpenCircuits = Array.from(this.circuitBreakers.values())
      .filter(breaker => breaker.state === 'half-open').length;
    
    return {
      healthy: openCircuits === 0,
      openCircuits: openCircuits,
      halfOpenCircuits: halfOpenCircuits,
      totalCircuits: this.circuitBreakers.size,
      stats: this.getStats()
    };
  }
}