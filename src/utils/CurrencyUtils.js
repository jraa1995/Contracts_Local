/**
 * CurrencyUtils - Utility functions for currency processing
 * Provides currency parsing, formatting, and validation utilities
 */

/**
 * CurrencyUtils class for currency operations
 */
class CurrencyUtils {
  /**
   * Parse currency string to number
   * Handles various currency formats including symbols, commas, and spaces
   * @param {string|number} currencyString - Currency string to parse
   * @returns {number} Parsed number value
   */
  static parseCurrency(currencyString) {
    if (currencyString === null || currencyString === undefined) {
      return 0;
    }

    // If already a number, return it
    if (typeof currencyString === 'number') {
      return isNaN(currencyString) ? 0 : currencyString;
    }

    // Convert to string and handle empty strings
    const str = currencyString.toString().trim();
    if (str === '' || str === 'N/A' || str === 'n/a') {
      return 0;
    }

    try {
      // Remove currency symbols, commas, spaces, and other formatting
      // Handle negative values in parentheses: ($1,000) -> -1000
      let cleaned = str;
      
      // Check for negative values in parentheses
      const isNegativeParens = /^\s*\(\s*.*\s*\)\s*$/.test(cleaned);
      if (isNegativeParens) {
        cleaned = cleaned.replace(/^\s*\(\s*/, '').replace(/\s*\)\s*$/, '');
      }

      // Remove currency symbols and formatting
      cleaned = cleaned.replace(/[$€£¥₹₽¢]/g, ''); // Common currency symbols
      cleaned = cleaned.replace(/[,\s]/g, ''); // Commas and spaces
      cleaned = cleaned.replace(/[^\d.-]/g, ''); // Keep only digits, dots, and hyphens

      // Handle multiple decimal points (keep only the last one)
      const parts = cleaned.split('.');
      if (parts.length > 2) {
        cleaned = parts.slice(0, -1).join('') + '.' + parts[parts.length - 1];
      }

      const parsed = parseFloat(cleaned);
      
      if (isNaN(parsed)) {
        console.warn(`Unable to parse currency value: "${currencyString}"`);
        return 0;
      }

      // Apply negative sign if value was in parentheses
      return isNegativeParens ? -Math.abs(parsed) : parsed;
    } catch (error) {
      console.error(`Error parsing currency "${currencyString}":`, error);
      return 0;
    }
  }

  /**
   * Format number as currency
   * @param {number} amount - Amount to format
   * @param {string} currency - Currency code (default: USD)
   * @param {number} decimals - Number of decimal places (default: 2)
   * @returns {string} Formatted currency string
   */
  static formatCurrency(amount, currency = 'USD', decimals = 2) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '$0.00';
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(amount);
    } catch (error) {
      // Fallback formatting if Intl.NumberFormat fails
      const sign = amount < 0 ? '-' : '';
      const absAmount = Math.abs(amount);
      const formatted = absAmount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      return `${sign}$${formatted}`;
    }
  }

  /**
   * Validate currency value
   * @param {any} value - Value to validate
   * @returns {boolean} True if valid currency value
   */
  static isValidCurrency(value) {
    if (value === null || value === undefined) {
      return false;
    }

    // If it's already a number, check if it's valid
    if (typeof value === 'number') {
      return !isNaN(value) && isFinite(value);
    }

    // Try to parse it and see if we get a valid number
    const parsed = this.parseCurrency(value);
    return !isNaN(parsed) && isFinite(parsed);
  }

  /**
   * Validate financial data ranges and relationships
   * @param {Object} financialData - Object containing financial values
   * @returns {Object} Validation result with errors and warnings
   */
  static validateFinancialData(financialData) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const { ceiling, awardValue, remainingBudget } = financialData;

    // Parse values
    const ceilingNum = this.parseCurrency(ceiling);
    const awardNum = this.parseCurrency(awardValue);
    const remainingNum = this.parseCurrency(remainingBudget);

    // Validate ceiling value
    if (ceilingNum < 0) {
      result.errors.push('Ceiling value cannot be negative');
      result.isValid = false;
    }

    // Validate award value
    if (awardNum < 0) {
      result.errors.push('Award value cannot be negative');
      result.isValid = false;
    }

    // Validate relationship between ceiling and award value
    if (ceilingNum > 0 && awardNum > 0 && awardNum > ceilingNum) {
      result.warnings.push('Award value exceeds ceiling value');
    }

    // Validate remaining budget
    if (remainingBudget !== null && remainingBudget !== undefined) {
      if (remainingNum < 0) {
        result.warnings.push('Remaining budget is negative (overrun detected)');
      }
      
      if (ceilingNum > 0 && remainingNum > ceilingNum) {
        result.warnings.push('Remaining budget exceeds ceiling value');
      }
    }

    // Check for unreasonably large values (potential data entry errors)
    const maxReasonableValue = 1000000000; // $1 billion
    if (ceilingNum > maxReasonableValue) {
      result.warnings.push('Ceiling value is unusually large');
    }
    if (awardNum > maxReasonableValue) {
      result.warnings.push('Award value is unusually large');
    }

    return result;
  }

  /**
   * Calculate percentage
   * @param {number} part - Part value
   * @param {number} total - Total value
   * @returns {number} Percentage (0-100)
   */
  static calculatePercentage(part, total) {
    if (!total || total === 0) {
      return 0;
    }

    if (typeof part !== 'number' || typeof total !== 'number') {
      return 0;
    }

    const percentage = (part / total) * 100;
    return Math.round(percentage * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate remaining budget
   * @param {number} ceiling - Ceiling amount
   * @param {number} spent - Amount spent
   * @returns {number} Remaining budget
   */
  static calculateRemainingBudget(ceiling, spent) {
    const ceilingNum = this.parseCurrency(ceiling);
    const spentNum = this.parseCurrency(spent);
    
    return ceilingNum - spentNum;
  }

  /**
   * Check if contract is approaching ceiling threshold
   * @param {number} spent - Amount spent
   * @param {number} ceiling - Ceiling amount
   * @param {number} threshold - Threshold percentage (default: 90%)
   * @returns {boolean} True if approaching threshold
   */
  static isApproachingCeiling(spent, ceiling, threshold = 90) {
    const ceilingNum = this.parseCurrency(ceiling);
    const spentNum = this.parseCurrency(spent);
    
    if (ceilingNum <= 0) {
      return false;
    }

    const utilizationPercentage = this.calculatePercentage(spentNum, ceilingNum);
    return utilizationPercentage >= threshold;
  }

  /**
   * Format large numbers with appropriate units (K, M, B)
   * @param {number} amount - Amount to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted amount with units
   */
  static formatLargeNumber(amount, decimals = 1) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0';
    }

    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';

    if (absAmount >= 1000000000) {
      return `${sign}${(absAmount / 1000000000).toFixed(decimals)}B`;
    } else if (absAmount >= 1000000) {
      return `${sign}${(absAmount / 1000000).toFixed(decimals)}M`;
    } else if (absAmount >= 1000) {
      return `${sign}${(absAmount / 1000).toFixed(decimals)}K`;
    } else {
      return `${sign}${absAmount.toFixed(decimals)}`;
    }
  }

  /**
   * Handle invalid financial formats with error logging
   * @param {any} value - Value that failed parsing
   * @param {string} fieldName - Name of the field for error context
   * @returns {Object} Error information
   */
  static handleInvalidFormat(value, fieldName) {
    const error = {
      field: fieldName,
      value: value,
      error: 'Invalid financial format',
      timestamp: new Date(),
      parsedValue: 0
    };

    console.error(`Invalid financial format in field "${fieldName}":`, value);
    return error;
  }
}