/**
 * ErrorLogger - Comprehensive error logging and reporting system
 * Provides centralized error logging, data quality reporting, and error analysis
 */

/**
 * ErrorLogger class for managing error logging and data quality reporting
 */
class ErrorLogger {
  constructor() {
    this.errorLog = [];
    this.maxLogSize = 1000; // Maximum number of log entries to keep
    this.logLevels = {
      ERROR: 'ERROR',
      WARN: 'WARN', 
      INFO: 'INFO'
    };
  }

  /**
   * Log an error with detailed context
   * @param {string} level - Error level (ERROR, WARN, INFO)
   * @param {string} source - Source component/function
   * @param {string} message - Error message
   * @param {Object} context - Additional context data
   * @param {Error} originalError - Original error object if available
   * @returns {string} Error ID
   */
  logError(level, source, message, context = {}, originalError = null) {
    const errorId = this.generateErrorId();
    const timestamp = new Date();
    
    const logEntry = {
      id: errorId,
      timestamp: timestamp,
      level: level,
      source: source,
      message: message,
      context: context,
      originalError: originalError,
      stackTrace: originalError ? originalError.stack : null
    };

    // Add to error log
    this.errorLog.push(logEntry);
    
    // Maintain log size limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift(); // Remove oldest entry
    }

    // Console logging for development
    this.consoleLog(logEntry);
    
    return errorId;
  }

  /**
   * Log a field-specific validation error
   * @param {string} field - Field name
   * @param {number} row - Row number (1-based)
   * @param {any} value - Field value that caused error
   * @param {string} error - Error message
   * @param {string} severity - Error severity (error, warning, info)
   * @returns {string} Error ID
   */
  logFieldError(field, row, value, error, severity = 'error') {
    const context = {
      field: field,
      row: row,
      value: value,
      type: 'field_validation'
    };

    const level = severity.toUpperCase() === 'ERROR' ? this.logLevels.ERROR : 
                  severity.toUpperCase() === 'WARNING' ? this.logLevels.WARN : 
                  this.logLevels.INFO;

    return this.logError(
      level,
      'FieldValidator',
      `Field '${field}' validation ${severity}: ${error}`,
      context
    );
  }

  /**
   * Log a data processing error
   * @param {string} operation - Operation being performed
   * @param {number} row - Row number if applicable
   * @param {string} error - Error message
   * @param {any} data - Data that caused error
   * @returns {string} Error ID
   */
  logDataProcessingError(operation, row, error, data = null) {
    const context = {
      operation: operation,
      row: row,
      data: data,
      type: 'data_processing'
    };

    return this.logError(
      this.logLevels.ERROR,
      'DataProcessor',
      `Data processing error in ${operation}: ${error}`,
      context
    );
  }

  /**
   * Log a system error
   * @param {string} component - Component where error occurred
   * @param {string} error - Error message
   * @param {Error} originalError - Original error object
   * @returns {string} Error ID
   */
  logSystemError(component, error, originalError = null) {
    const context = {
      component: component,
      type: 'system_error'
    };

    return this.logError(
      this.logLevels.ERROR,
      component,
      error,
      context,
      originalError
    );
  }

  /**
   * Create a comprehensive ValidationResult with detailed error tracking
   * @param {boolean} isValid - Whether validation passed overall
   * @param {string[]} errors - Array of general error messages
   * @param {string[]} warnings - Array of general warning messages
   * @param {number} processedRows - Number of rows processed
   * @param {number} validRows - Number of valid rows
   * @param {Object[]} fieldErrors - Array of field-specific errors
   * @returns {ValidationResult} Enhanced validation result
   */
  createValidationResult(isValid, errors = [], warnings = [], processedRows = 0, validRows = 0, fieldErrors = []) {
    // Calculate summary statistics
    const totalFields = fieldErrors.length;
    const errorFields = fieldErrors.filter(fe => fe.severity === 'error').length;
    const warningFields = fieldErrors.filter(fe => fe.severity === 'warning').length;
    const validFields = totalFields - errorFields;

    return {
      isValid: isValid,
      errors: errors,
      warnings: warnings,
      processedRows: processedRows,
      validRows: validRows,
      fieldErrors: fieldErrors,
      summary: {
        totalFields: totalFields,
        validFields: validFields,
        errorFields: errorFields,
        warningFields: warningFields
      },
      validatedAt: new Date()
    };
  }

  /**
   * Generate a comprehensive data quality report
   * @param {any[][]} rawData - Raw data to analyze
   * @param {ValidationResult} validation - Validation results
   * @param {ContractData[]} processedData - Processed contract data
   * @returns {DataQualityReport} Comprehensive data quality report
   */
  generateDataQualityReport(rawData, validation, processedData = []) {
    const reportId = this.generateReportId();
    const generatedAt = new Date();

    // Analyze data completeness
    const completeness = this.analyzeDataCompleteness(rawData, processedData);
    
    // Analyze data consistency
    const consistency = this.analyzeDataConsistency(processedData);
    
    // Analyze data accuracy
    const accuracy = this.analyzeDataAccuracy(processedData, validation);

    return {
      validation: validation,
      completeness: completeness,
      consistency: consistency,
      accuracy: accuracy,
      generatedAt: generatedAt,
      reportId: reportId
    };
  }

  /**
   * Analyze data completeness
   * @param {any[][]} rawData - Raw data array
   * @param {ContractData[]} processedData - Processed data array
   * @returns {Object} Completeness analysis
   */
  analyzeDataCompleteness(rawData, processedData) {
    if (!rawData || rawData.length < 2) {
      return {
        totalFields: 0,
        populatedFields: 0,
        completenessScore: 0,
        missingFields: []
      };
    }

    const headers = rawData[0];
    const dataRows = rawData.slice(1);
    const totalFields = headers.length * dataRows.length;
    let populatedFields = 0;
    const missingFields = [];

    // Count populated fields and track missing ones
    dataRows.forEach((row, rowIndex) => {
      headers.forEach((header, colIndex) => {
        const value = row[colIndex];
        const hasValue = value !== null && value !== undefined && value !== '';
        
        if (hasValue) {
          populatedFields++;
        } else {
          missingFields.push({
            field: header,
            row: rowIndex + 2, // +2 for 1-based indexing and header row
            column: colIndex + 1
          });
        }
      });
    });

    const completenessScore = totalFields > 0 ? (populatedFields / totalFields) * 100 : 0;

    return {
      totalFields: totalFields,
      populatedFields: populatedFields,
      completenessScore: Math.round(completenessScore * 100) / 100,
      missingFields: missingFields
    };
  }

  /**
   * Analyze data consistency
   * @param {ContractData[]} processedData - Processed contract data
   * @returns {Object} Consistency analysis
   */
  analyzeDataConsistency(processedData) {
    const inconsistencies = [];

    processedData.forEach((contract, index) => {
      // Check financial consistency
      if (contract.ceiling && contract.awardValue && contract.ceiling < contract.awardValue) {
        inconsistencies.push({
          type: 'financial_inconsistency',
          row: contract._rowNumber || index + 2,
          field: 'ceiling_vs_award',
          message: 'Award value exceeds ceiling value',
          severity: 'error'
        });
      }

      // Check date consistency
      if (contract.projectStart && contract.projectEnd && contract.projectStart >= contract.projectEnd) {
        inconsistencies.push({
          type: 'date_inconsistency',
          row: contract._rowNumber || index + 2,
          field: 'project_dates',
          message: 'Project start date is not before end date',
          severity: 'error'
        });
      }

      // Check personnel email consistency
      [contract.projectManager, contract.contractingOfficer, contract.contractSpecialist, contract.programManager].forEach(person => {
        if (person && person.name && person.email && !ValidationUtils.isValidEmail(person.email)) {
          inconsistencies.push({
            type: 'email_format_inconsistency',
            row: contract._rowNumber || index + 2,
            field: `${person.role}_email`,
            message: `Invalid email format for ${person.name}: ${person.email}`,
            severity: 'warning'
          });
        }
      });
    });

    return {
      inconsistencies: inconsistencies
    };
  }

  /**
   * Analyze data accuracy
   * @param {ContractData[]} processedData - Processed contract data
   * @param {ValidationResult} validation - Validation results
   * @returns {Object} Accuracy analysis
   */
  analyzeDataAccuracy(processedData, validation) {
    const outliers = [];
    const formatErrors = [];

    // Detect financial outliers
    if (processedData.length > 0) {
      const ceilingValues = processedData.map(c => c.ceiling).filter(v => v && v > 0);
      const awardValues = processedData.map(c => c.awardValue).filter(v => v && v > 0);

      if (ceilingValues.length > 0) {
        const ceilingStats = this.calculateStatistics(ceilingValues);
        const ceilingOutliers = this.detectOutliers(processedData, 'ceiling', ceilingStats);
        outliers.push(...ceilingOutliers);
      }

      if (awardValues.length > 0) {
        const awardStats = this.calculateStatistics(awardValues);
        const awardOutliers = this.detectOutliers(processedData, 'awardValue', awardStats);
        outliers.push(...awardOutliers);
      }
    }

    // Extract format errors from validation
    if (validation.fieldErrors) {
      validation.fieldErrors.forEach(fieldError => {
        if (fieldError.error.toLowerCase().includes('format') || 
            fieldError.error.toLowerCase().includes('invalid')) {
          formatErrors.push({
            field: fieldError.field,
            row: fieldError.row,
            error: fieldError.error,
            severity: fieldError.severity
          });
        }
      });
    }

    return {
      outliers: outliers,
      formatErrors: formatErrors
    };
  }

  /**
   * Calculate basic statistics for a numeric array
   * @param {number[]} values - Array of numeric values
   * @returns {Object} Statistics object
   */
  calculateStatistics(values) {
    if (!values || values.length === 0) {
      return { mean: 0, median: 0, stdDev: 0, q1: 0, q3: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];

    return { mean, median, stdDev, q1, q3 };
  }

  /**
   * Detect outliers using IQR method
   * @param {ContractData[]} data - Contract data array
   * @param {string} field - Field to analyze for outliers
   * @param {Object} stats - Statistics for the field
   * @returns {Object[]} Array of detected outliers
   */
  detectOutliers(data, field, stats) {
    const outliers = [];
    const iqr = stats.q3 - stats.q1;
    const lowerBound = stats.q1 - (1.5 * iqr);
    const upperBound = stats.q3 + (1.5 * iqr);

    data.forEach((contract, index) => {
      const value = contract[field];
      if (value && (value < lowerBound || value > upperBound)) {
        outliers.push({
          type: 'statistical_outlier',
          row: contract._rowNumber || index + 2,
          field: field,
          value: value,
          message: `Value ${value} is a statistical outlier (outside ${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)})`,
          severity: 'info'
        });
      }
    });

    return outliers;
  }

  /**
   * Get error log entries by level
   * @param {string} level - Error level to filter by
   * @param {number} limit - Maximum number of entries to return
   * @returns {ErrorLogEntry[]} Filtered error log entries
   */
  getErrorsByLevel(level, limit = 100) {
    return this.errorLog
      .filter(entry => entry.level === level)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Get error log entries by source
   * @param {string} source - Source component to filter by
   * @param {number} limit - Maximum number of entries to return
   * @returns {ErrorLogEntry[]} Filtered error log entries
   */
  getErrorsBySource(source, limit = 100) {
    return this.errorLog
      .filter(entry => entry.source === source)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Get recent error log entries
   * @param {number} limit - Maximum number of entries to return
   * @returns {ErrorLogEntry[]} Recent error log entries
   */
  getRecentErrors(limit = 50) {
    return this.errorLog
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Clear error log
   */
  clearErrorLog() {
    this.errorLog = [];
  }

  /**
   * Get error log statistics
   * @returns {Object} Error log statistics
   */
  getErrorLogStats() {
    const total = this.errorLog.length;
    const errors = this.errorLog.filter(e => e.level === this.logLevels.ERROR).length;
    const warnings = this.errorLog.filter(e => e.level === this.logLevels.WARN).length;
    const info = this.errorLog.filter(e => e.level === this.logLevels.INFO).length;

    return {
      total: total,
      errors: errors,
      warnings: warnings,
      info: info,
      errorRate: total > 0 ? (errors / total) * 100 : 0
    };
  }

  /**
   * Generate unique error ID
   * @returns {string} Unique error ID
   */
  generateErrorId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `ERR_${timestamp}_${random}`;
  }

  /**
   * Generate unique report ID
   * @returns {string} Unique report ID
   */
  generateReportId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `RPT_${timestamp}_${random}`;
  }

  /**
   * Console logging with appropriate formatting
   * @param {ErrorLogEntry} logEntry - Log entry to output
   */
  consoleLog(logEntry) {
    const timestamp = logEntry.timestamp.toISOString();
    const message = `[${timestamp}] ${logEntry.level} [${logEntry.source}]: ${logEntry.message}`;
    
    switch (logEntry.level) {
      case this.logLevels.ERROR:
        console.error(message, logEntry.context);
        if (logEntry.originalError) {
          console.error('Original error:', logEntry.originalError);
        }
        break;
      case this.logLevels.WARN:
        console.warn(message, logEntry.context);
        break;
      case this.logLevels.INFO:
        console.info(message, logEntry.context);
        break;
      default:
        console.log(message, logEntry.context);
    }
  }

  /**
   * Export error log to CSV format
   * @returns {string} CSV formatted error log
   */
  exportErrorLogToCSV() {
    if (this.errorLog.length === 0) {
      return 'No errors to export';
    }

    const headers = ['ID', 'Timestamp', 'Level', 'Source', 'Message', 'Row', 'Field', 'Value'];
    const csvRows = [headers.join(',')];

    this.errorLog.forEach(entry => {
      const row = [
        entry.id,
        entry.timestamp.toISOString(),
        entry.level,
        entry.source,
        `"${entry.message.replace(/"/g, '""')}"`, // Escape quotes
        entry.context.row || '',
        entry.context.field || '',
        entry.context.value ? `"${entry.context.value.toString().replace(/"/g, '""')}"` : ''
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }
}

// Create global instance for use throughout the application
const errorLogger = new ErrorLogger();