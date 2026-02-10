/**
 * ValidationUtils - Utility functions for data validation
 * Provides validation functions for various data types and formats
 */

/**
 * ValidationUtils class for data validation operations
 */
class ValidationUtils {
  /**
   * Validate email address format
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid email format
   */
  static isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate required fields with detailed error reporting
   * @param {Object} data - Data object to validate
   * @param {string[]} requiredFields - Array of required field names
   * @param {number} rowNumber - Row number for error reporting
   * @returns {ValidationResult} Enhanced validation result
   */
  static validateRequiredFields(data, requiredFields, rowNumber = 1) {
    const errors = [];
    const warnings = [];
    const fieldErrors = [];
    
    requiredFields.forEach(field => {
      const value = data[field];
      const isEmpty = value === null || value === undefined || value === '';
      
      if (isEmpty) {
        const error = `Required field '${field}' is missing or empty`;
        errors.push(error);
        
        fieldErrors.push({
          field: field,
          row: rowNumber,
          error: error,
          severity: 'error'
        });
        
        // Log the field error
        if (typeof errorLogger !== 'undefined') {
          errorLogger.logFieldError(field, rowNumber, value, error, 'error');
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      processedRows: 1,
      validRows: errors.length === 0 ? 1 : 0,
      fieldErrors: fieldErrors,
      summary: {
        totalFields: requiredFields.length,
        validFields: requiredFields.length - errors.length,
        errorFields: errors.length,
        warningFields: 0
      },
      validatedAt: new Date()
    };
  }

  /**
   * Validate phone number format
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid phone format
   */
  static isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    
    // Enhanced phone validation supporting multiple formats
    const phoneRegex = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  /**
   * Sanitize string input
   * @param {string} input - String to sanitize
   * @returns {string} Sanitized string
   */
  static sanitizeString(input) {
    if (!input || typeof input !== 'string') return '';
    
    return input.trim().replace(/[<>]/g, '');
  }

  /**
   * Validate contract data completeness
   * @param {Object} contractData - Contract data to validate
   * @param {number} rowNumber - Row number for error reporting
   * @returns {ValidationResult} Validation result with detailed field analysis
   */
  static validateContractData(contractData, rowNumber = 1) {
    const errors = [];
    const warnings = [];
    const fieldErrors = [];

    // Define critical and optional fields
    const criticalFields = ['award', 'project', 'ceiling'];
    const importantFields = ['projectManager', 'contractingOfficer', 'awardDate', 'projectStart'];
    const optionalFields = ['solicitation', 'acquisition', 'completionDate'];

    // Validate critical fields
    criticalFields.forEach(field => {
      const value = contractData[field];
      if (!value || value === '') {
        const error = `Critical field '${field}' is missing`;
        errors.push(error);
        fieldErrors.push({
          field: field,
          row: rowNumber,
          error: error,
          severity: 'error'
        });
        
        if (typeof errorLogger !== 'undefined') {
          errorLogger.logFieldError(field, rowNumber, value, error, 'error');
        }
      }
    });

    // Validate important fields
    importantFields.forEach(field => {
      const value = contractData[field];
      if (!value || value === '') {
        const warning = `Important field '${field}' is missing`;
        warnings.push(warning);
        fieldErrors.push({
          field: field,
          row: rowNumber,
          error: warning,
          severity: 'warning'
        });
        
        if (typeof errorLogger !== 'undefined') {
          errorLogger.logFieldError(field, rowNumber, value, warning, 'warning');
        }
      }
    });

    // Validate personnel email addresses
    const personnelFields = ['projectManager', 'contractingOfficer', 'contractSpecialist', 'programManager'];
    personnelFields.forEach(field => {
      const person = contractData[field];
      if (person && person.email && !this.isValidEmail(person.email)) {
        const warning = `Invalid email format for ${field}: ${person.email}`;
        warnings.push(warning);
        fieldErrors.push({
          field: `${field}.email`,
          row: rowNumber,
          error: warning,
          severity: 'warning'
        });
        
        if (typeof errorLogger !== 'undefined') {
          errorLogger.logFieldError(`${field}.email`, rowNumber, person.email, warning, 'warning');
        }
      }
    });

    // Validate financial data relationships
    if (contractData.ceiling && contractData.awardValue) {
      if (contractData.ceiling < contractData.awardValue) {
        const error = `Award value (${contractData.awardValue}) exceeds ceiling (${contractData.ceiling})`;
        errors.push(error);
        fieldErrors.push({
          field: 'financial_relationship',
          row: rowNumber,
          error: error,
          severity: 'error'
        });
        
        if (typeof errorLogger !== 'undefined') {
          errorLogger.logFieldError('financial_relationship', rowNumber, 
            `ceiling: ${contractData.ceiling}, award: ${contractData.awardValue}`, error, 'error');
        }
      }
    }

    // Validate date relationships
    if (contractData.projectStart && contractData.projectEnd) {
      if (contractData.projectStart >= contractData.projectEnd) {
        const error = 'Project start date must be before project end date';
        errors.push(error);
        fieldErrors.push({
          field: 'date_relationship',
          row: rowNumber,
          error: error,
          severity: 'error'
        });
        
        if (typeof errorLogger !== 'undefined') {
          errorLogger.logFieldError('date_relationship', rowNumber, 
            `start: ${contractData.projectStart}, end: ${contractData.projectEnd}`, error, 'error');
        }
      }
    }

    const totalFields = criticalFields.length + importantFields.length + optionalFields.length;
    const errorFields = fieldErrors.filter(fe => fe.severity === 'error').length;
    const warningFields = fieldErrors.filter(fe => fe.severity === 'warning').length;

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      processedRows: 1,
      validRows: errors.length === 0 ? 1 : 0,
      fieldErrors: fieldErrors,
      summary: {
        totalFields: totalFields,
        validFields: totalFields - errorFields,
        errorFields: errorFields,
        warningFields: warningFields
      },
      validatedAt: new Date()
    };
  }

  /**
   * Validate financial data with comprehensive checks
   * @param {Object} financialData - Financial data to validate
   * @param {number} rowNumber - Row number for error reporting
   * @returns {ValidationResult} Validation result
   */
  static validateFinancialData(financialData, rowNumber = 1) {
    const errors = [];
    const warnings = [];
    const fieldErrors = [];

    const { ceiling, awardValue, remainingBudget } = financialData;

    // Validate ceiling value
    if (ceiling !== null && ceiling !== undefined) {
      if (typeof ceiling !== 'number' || isNaN(ceiling)) {
        const error = 'Ceiling value must be a valid number';
        errors.push(error);
        fieldErrors.push({
          field: 'ceiling',
          row: rowNumber,
          error: error,
          severity: 'error'
        });
      } else if (ceiling < 0) {
        const error = 'Ceiling value cannot be negative';
        errors.push(error);
        fieldErrors.push({
          field: 'ceiling',
          row: rowNumber,
          error: error,
          severity: 'error'
        });
      } else if (ceiling > 1000000000) { // $1B threshold
        const warning = 'Ceiling value is unusually high (>$1B)';
        warnings.push(warning);
        fieldErrors.push({
          field: 'ceiling',
          row: rowNumber,
          error: warning,
          severity: 'warning'
        });
      }
    }

    // Validate award value
    if (awardValue !== null && awardValue !== undefined) {
      if (typeof awardValue !== 'number' || isNaN(awardValue)) {
        const error = 'Award value must be a valid number';
        errors.push(error);
        fieldErrors.push({
          field: 'awardValue',
          row: rowNumber,
          error: error,
          severity: 'error'
        });
      } else if (awardValue < 0) {
        const error = 'Award value cannot be negative';
        errors.push(error);
        fieldErrors.push({
          field: 'awardValue',
          row: rowNumber,
          error: error,
          severity: 'error'
        });
      }
    }

    // Validate relationship between ceiling and award value
    if (ceiling && awardValue && typeof ceiling === 'number' && typeof awardValue === 'number') {
      if (awardValue > ceiling) {
        const error = `Award value ($${awardValue.toLocaleString()}) exceeds ceiling ($${ceiling.toLocaleString()})`;
        errors.push(error);
        fieldErrors.push({
          field: 'ceiling_award_relationship',
          row: rowNumber,
          error: error,
          severity: 'error'
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      processedRows: 1,
      validRows: errors.length === 0 ? 1 : 0,
      fieldErrors: fieldErrors,
      summary: {
        totalFields: 3, // ceiling, awardValue, remainingBudget
        validFields: 3 - fieldErrors.filter(fe => fe.severity === 'error').length,
        errorFields: fieldErrors.filter(fe => fe.severity === 'error').length,
        warningFields: fieldErrors.filter(fe => fe.severity === 'warning').length
      },
      validatedAt: new Date()
    };
  }

  /**
   * Validate date data with comprehensive checks
   * @param {Object} dateData - Date data to validate
   * @param {number} rowNumber - Row number for error reporting
   * @returns {ValidationResult} Validation result
   */
  static validateDateData(dateData, rowNumber = 1) {
    const errors = [];
    const warnings = [];
    const fieldErrors = [];

    const { awardDate, projectStart, projectEnd, completionDate } = dateData;

    // Validate individual dates
    const dateFields = [
      { name: 'awardDate', value: awardDate },
      { name: 'projectStart', value: projectStart },
      { name: 'projectEnd', value: projectEnd },
      { name: 'completionDate', value: completionDate }
    ];

    dateFields.forEach(field => {
      if (field.value && !(field.value instanceof Date) || (field.value instanceof Date && isNaN(field.value))) {
        const error = `${field.name} is not a valid date`;
        errors.push(error);
        fieldErrors.push({
          field: field.name,
          row: rowNumber,
          error: error,
          severity: 'error'
        });
      }
    });

    // Validate date relationships
    if (awardDate && projectStart && awardDate > projectStart) {
      const warning = 'Award date is after project start date';
      warnings.push(warning);
      fieldErrors.push({
        field: 'award_start_relationship',
        row: rowNumber,
        error: warning,
        severity: 'warning'
      });
    }

    if (projectStart && projectEnd && projectStart >= projectEnd) {
      const error = 'Project start date must be before project end date';
      errors.push(error);
      fieldErrors.push({
        field: 'start_end_relationship',
        row: rowNumber,
        error: error,
        severity: 'error'
      });
    }

    if (projectEnd && completionDate && completionDate < projectEnd) {
      const warning = 'Completion date is before project end date';
      warnings.push(warning);
      fieldErrors.push({
        field: 'end_completion_relationship',
        row: rowNumber,
        error: warning,
        severity: 'warning'
      });
    }

    return {
      isValid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      processedRows: 1,
      validRows: errors.length === 0 ? 1 : 0,
      fieldErrors: fieldErrors,
      summary: {
        totalFields: 4, // awardDate, projectStart, projectEnd, completionDate
        validFields: 4 - fieldErrors.filter(fe => fe.severity === 'error').length,
        errorFields: fieldErrors.filter(fe => fe.severity === 'error').length,
        warningFields: fieldErrors.filter(fe => fe.severity === 'warning').length
      },
      validatedAt: new Date()
    };
  }

  /**
   * Combine multiple validation results
   * @param {ValidationResult[]} results - Array of validation results to combine
   * @returns {ValidationResult} Combined validation result
   */
  static combineValidationResults(results) {
    const combinedErrors = [];
    const combinedWarnings = [];
    const combinedFieldErrors = [];
    let totalProcessedRows = 0;
    let totalValidRows = 0;
    let totalFields = 0;
    let totalValidFields = 0;
    let totalErrorFields = 0;
    let totalWarningFields = 0;

    results.forEach(result => {
      combinedErrors.push(...result.errors);
      combinedWarnings.push(...result.warnings);
      combinedFieldErrors.push(...result.fieldErrors);
      totalProcessedRows += result.processedRows;
      totalValidRows += result.validRows;
      
      if (result.summary) {
        totalFields += result.summary.totalFields;
        totalValidFields += result.summary.validFields;
        totalErrorFields += result.summary.errorFields;
        totalWarningFields += result.summary.warningFields;
      }
    });

    return {
      isValid: combinedErrors.length === 0,
      errors: combinedErrors,
      warnings: combinedWarnings,
      processedRows: totalProcessedRows,
      validRows: totalValidRows,
      fieldErrors: combinedFieldErrors,
      summary: {
        totalFields: totalFields,
        validFields: totalValidFields,
        errorFields: totalErrorFields,
        warningFields: totalWarningFields
      },
      validatedAt: new Date()
    };
  }
}