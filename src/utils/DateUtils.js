/**
 * DateUtils - Utility functions for date processing
 * Provides date parsing, formatting, and validation utilities
 */

/**
 * DateUtils class for date operations
 */
class DateUtils {
  /**
   * Parse date from various formats
   * Handles multiple input formats including MM/dd/yyyy, yyyy-MM-dd, Excel serial dates
   * @param {string|Date|number} dateInput - Date input to parse
   * @returns {Date|null} Parsed date or null if invalid
   */
  static parseDate(dateInput) {
    if (!dateInput) {
      return null;
    }

    // If already a Date object, validate and return
    if (dateInput instanceof Date) {
      return isNaN(dateInput.getTime()) ? null : dateInput;
    }

    // Handle Excel serial date numbers
    if (typeof dateInput === 'number') {
      return this.parseExcelDate(dateInput);
    }

    // Convert to string and handle various formats
    const str = dateInput.toString().trim();
    if (str === '' || str === 'N/A' || str === 'n/a') {
      return null;
    }

    try {
      // Try multiple date formats
      const formats = [
        // MM/dd/yyyy or MM-dd-yyyy
        /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
        // yyyy/MM/dd or yyyy-MM-dd
        /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
        // MM/dd/yy or MM-dd-yy
        /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
        // dd/MM/yyyy or dd-MM-yyyy (European format)
        /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/
      ];

      // Try MM/dd/yyyy format first (most common in US data)
      let match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (match) {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        
        if (this.isValidDateComponents(year, month, day)) {
          return new Date(year, month - 1, day); // Month is 0-based in JS
        }
      }

      // Try yyyy-MM-dd format (ISO format)
      match = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const day = parseInt(match[3], 10);
        
        if (this.isValidDateComponents(year, month, day)) {
          return new Date(year, month - 1, day);
        }
      }

      // Try MM/dd/yy format (2-digit year)
      match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
      if (match) {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        
        // Convert 2-digit year to 4-digit (assume 20xx for years 00-30, 19xx for 31-99)
        year = year <= 30 ? 2000 + year : 1900 + year;
        
        if (this.isValidDateComponents(year, month, day)) {
          return new Date(year, month - 1, day);
        }
      }

      // Try parsing with built-in Date constructor as fallback
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }

      console.warn(`Unable to parse date: "${str}"`);
      return null;
    } catch (error) {
      console.error(`Error parsing date "${str}":`, error);
      return null;
    }
  }

  /**
   * Parse Excel serial date number
   * @param {number} serialDate - Excel serial date number
   * @returns {Date|null} Parsed date or null if invalid
   */
  static parseExcelDate(serialDate) {
    if (typeof serialDate !== 'number' || isNaN(serialDate)) {
      return null;
    }

    // Excel epoch starts at January 1, 1900 (but Excel incorrectly treats 1900 as a leap year)
    // JavaScript Date epoch starts at January 1, 1970
    const excelEpoch = new Date(1900, 0, 1);
    const jsEpoch = new Date(1970, 0, 1);
    
    // Calculate days between Excel epoch and JS epoch
    const daysBetweenEpochs = Math.floor((jsEpoch - excelEpoch) / (24 * 60 * 60 * 1000));
    
    // Convert Excel serial date to JavaScript date
    const jsSerialDate = serialDate - daysBetweenEpochs - 2; // -2 to account for Excel's leap year bug
    const date = new Date(jsSerialDate * 24 * 60 * 60 * 1000);
    
    return isNaN(date.getTime()) ? null : date;
  }

  /**
   * Validate date components
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @param {number} day - Day (1-31)
   * @returns {boolean} True if valid date components
   */
  static isValidDateComponents(year, month, day) {
    if (year < 1900 || year > 2100) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    
    // Check for valid day in month
    const daysInMonth = new Date(year, month, 0).getDate();
    return day <= daysInMonth;
  }

  /**
   * Format date for display
   * @param {Date} date - Date to format
   * @param {string} format - Format string ('short', 'long', 'iso', 'custom')
   * @returns {string} Formatted date string
   */
  static formatDate(date, format = 'short') {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return '';
    }

    try {
      switch (format) {
        case 'short':
          return date.toLocaleDateString('en-US'); // MM/dd/yyyy
        case 'long':
          return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'iso':
          return date.toISOString().split('T')[0]; // yyyy-MM-dd
        case 'custom':
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${month}/${day}/${year}`;
        default:
          return date.toLocaleDateString('en-US');
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  }

  /**
   * Calculate days between dates
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {number} Number of days between dates (can be negative)
   */
  static daysBetween(startDate, endDate) {
    if (!startDate || !endDate || !(startDate instanceof Date) || !(endDate instanceof Date)) {
      return 0;
    }

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 0;
    }

    const timeDiff = endDate.getTime() - startDate.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Calculate days remaining from current date
   * @param {Date} endDate - End date
   * @returns {number} Number of days remaining (negative if overdue)
   */
  static daysRemaining(endDate) {
    if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
      return 0;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0); // Reset time to start of day
    
    return this.daysBetween(today, end);
  }

  /**
   * Check if date is within range
   * @param {Date} date - Date to check
   * @param {Date} startDate - Range start date
   * @param {Date} endDate - Range end date
   * @returns {boolean} True if date is within range (inclusive)
   */
  static isDateInRange(date, startDate, endDate) {
    if (!date || !startDate || !endDate) {
      return false;
    }

    if (!(date instanceof Date) || !(startDate instanceof Date) || !(endDate instanceof Date)) {
      return false;
    }

    if (isNaN(date.getTime()) || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return false;
    }

    return date >= startDate && date <= endDate;
  }

  /**
   * Validate date and provide detailed error information
   * @param {any} dateInput - Date input to validate
   * @param {string} fieldName - Field name for error context
   * @returns {Object} Validation result
   */
  static validateDate(dateInput, fieldName = 'date') {
    const result = {
      isValid: false,
      date: null,
      error: null,
      warning: null
    };

    if (!dateInput) {
      result.error = `${fieldName} is empty or null`;
      return result;
    }

    const parsedDate = this.parseDate(dateInput);
    
    if (!parsedDate) {
      result.error = `${fieldName} could not be parsed: "${dateInput}"`;
      return result;
    }

    // Check for reasonable date ranges
    const currentYear = new Date().getFullYear();
    const dateYear = parsedDate.getFullYear();
    
    if (dateYear < 1990) {
      result.warning = `${fieldName} is unusually old: ${dateYear}`;
    } else if (dateYear > currentYear + 10) {
      result.warning = `${fieldName} is far in the future: ${dateYear}`;
    }

    result.isValid = true;
    result.date = parsedDate;
    return result;
  }

  /**
   * Handle timezone considerations
   * @param {Date} date - Date to adjust
   * @param {string} timezone - Target timezone (default: 'America/New_York')
   * @returns {Date} Adjusted date
   */
  static adjustForTimezone(date, timezone = 'America/New_York') {
    if (!date || !(date instanceof Date)) {
      return date;
    }

    try {
      // For contract data, we typically want to work with dates in a consistent timezone
      // This is a simplified approach - for production, consider using a proper timezone library
      const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
      return utcDate;
    } catch (error) {
      console.error('Error adjusting timezone:', error);
      return date;
    }
  }

  /**
   * Check if date is overdue
   * @param {Date} date - Date to check
   * @returns {boolean} True if date is in the past
   */
  static isOverdue(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }

    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    return date < today;
  }

  /**
   * Check if date is approaching (within specified days)
   * @param {Date} date - Date to check
   * @param {number} days - Number of days threshold (default: 30)
   * @returns {boolean} True if date is approaching
   */
  static isApproaching(date, days = 30) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return false;
    }

    const daysRemaining = this.daysRemaining(date);
    return daysRemaining >= 0 && daysRemaining <= days;
  }

  /**
   * Get fiscal year from date (assuming October 1 start)
   * @param {Date} date - Date to get fiscal year for
   * @returns {number} Fiscal year
   */
  static getFiscalYear(date) {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    const month = date.getMonth(); // 0-based
    
    // If month is October (9) or later, fiscal year is next calendar year
    return month >= 9 ? year + 1 : year;
  }
}