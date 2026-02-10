/**
 * NullSafeUtils - Utility functions for robust null and empty value handling
 * Provides null-safe operations and graceful degradation for missing data
 */

/**
 * NullSafeUtils class for handling null, undefined, and empty values
 */
class NullSafeUtils {
  /**
   * Safely get a value with fallback
   * @param {any} value - Value to check
   * @param {any} fallback - Fallback value if original is null/undefined/empty
   * @returns {any} Original value or fallback
   */
  static safeGet(value, fallback = '') {
    if (value === null || value === undefined) {
      return fallback;
    }
    
    // Handle empty strings
    if (typeof value === 'string' && value.trim() === '') {
      return fallback;
    }
    
    return value;
  }

  /**
   * Safely get a string value with trimming and fallback
   * @param {any} value - Value to convert to string
   * @param {string} fallback - Fallback string
   * @returns {string} Safe string value
   */
  static safeString(value, fallback = '') {
    if (value === null || value === undefined) {
      return fallback;
    }
    
    const stringValue = value.toString().trim();
    return stringValue === '' ? fallback : stringValue;
  }

  /**
   * Safely get a numeric value with fallback
   * @param {any} value - Value to convert to number
   * @param {number} fallback - Fallback number
   * @returns {number} Safe numeric value
   */
  static safeNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    
    const numValue = Number(value);
    return isNaN(numValue) ? fallback : numValue;
  }

  /**
   * Safely get a boolean value with fallback
   * @param {any} value - Value to convert to boolean
   * @param {boolean} fallback - Fallback boolean
   * @returns {boolean} Safe boolean value
   */
  static safeBoolean(value, fallback = false) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    
    // Handle string representations
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase().trim();
      if (lowerValue === 'true' || lowerValue === 'yes' || lowerValue === '1') {
        return true;
      }
      if (lowerValue === 'false' || lowerValue === 'no' || lowerValue === '0') {
        return false;
      }
      return fallback;
    }
    
    return Boolean(value);
  }

  /**
   * Safely get a date value with fallback
   * @param {any} value - Value to convert to date
   * @param {Date|null} fallback - Fallback date
   * @returns {Date|null} Safe date value
   */
  static safeDate(value, fallback = null) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    
    try {
      const dateValue = new Date(value);
      return isNaN(dateValue.getTime()) ? fallback : dateValue;
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Safely get an array value with fallback
   * @param {any} value - Value to ensure is array
   * @param {any[]} fallback - Fallback array
   * @returns {any[]} Safe array value
   */
  static safeArray(value, fallback = []) {
    if (value === null || value === undefined) {
      return fallback;
    }
    
    if (Array.isArray(value)) {
      return value;
    }
    
    // Try to convert string to array (comma-separated)
    if (typeof value === 'string' && value.trim() !== '') {
      return value.split(',').map(item => item.trim()).filter(item => item !== '');
    }
    
    return fallback;
  }

  /**
   * Safely get an object value with fallback
   * @param {any} value - Value to ensure is object
   * @param {Object} fallback - Fallback object
   * @returns {Object} Safe object value
   */
  static safeObject(value, fallback = {}) {
    if (value === null || value === undefined) {
      return fallback;
    }
    
    if (typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }
    
    return fallback;
  }

  /**
   * Safely access nested object properties
   * @param {Object} obj - Object to access
   * @param {string} path - Dot-notation path (e.g., 'user.profile.name')
   * @param {any} fallback - Fallback value
   * @returns {any} Value at path or fallback
   */
  static safeAccess(obj, path, fallback = null) {
    if (!obj || typeof obj !== 'object') {
      return fallback;
    }
    
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return fallback;
      }
      current = current[key];
    }
    
    return current === null || current === undefined ? fallback : current;
  }

  /**
   * Create a null-safe PersonnelInfo object
   * @param {Object} data - Raw personnel data
   * @returns {PersonnelInfo} Safe personnel object
   */
  static safePersonnelInfo(data) {
    const safeData = this.safeObject(data, {});
    
    return {
      name: this.safeString(safeData.name, 'Unknown'),
      email: this.safeString(safeData.email, ''),
      role: this.safeString(safeData.role, 'Unspecified'),
      organization: this.safeString(safeData.organization, 'Unknown'),
      phone: this.safeString(safeData.phone, '')
    };
  }

  /**
   * Create a null-safe ContractData object with all required fields
   * @param {Object} data - Raw contract data
   * @returns {ContractData} Safe contract object with defaults
   */
  static safeContractData(data) {
    const safeData = this.safeObject(data, {});
    
    return {
      // Identifiers - use safe strings with meaningful defaults
      award: this.safeString(safeData.award, 'UNKNOWN_AWARD'),
      project: this.safeString(safeData.project, 'UNKNOWN_PROJECT'),
      solicitation: this.safeString(safeData.solicitation, ''),
      acquisition: this.safeString(safeData.acquisition, ''),
      
      // Financial Information - use safe numbers with 0 defaults
      ceiling: this.safeNumber(safeData.ceiling, 0),
      awardValue: this.safeNumber(safeData.awardValue, 0),
      remainingBudget: this.safeNumber(safeData.remainingBudget, 0),
      
      // Personnel - use safe personnel objects
      projectManager: this.safePersonnelInfo(safeData.projectManager),
      contractingOfficer: this.safePersonnelInfo(safeData.contractingOfficer),
      contractSpecialist: this.safePersonnelInfo(safeData.contractSpecialist),
      programManager: this.safePersonnelInfo(safeData.programManager),
      
      // Timeline - use safe dates
      awardDate: this.safeDate(safeData.awardDate, null),
      projectStart: this.safeDate(safeData.projectStart, null),
      projectEnd: this.safeDate(safeData.projectEnd, null),
      completionDate: this.safeDate(safeData.completionDate, null),
      
      // Organization - use safe strings
      clientBureau: this.safeString(safeData.clientBureau, 'Unknown Bureau'),
      orgCode: this.safeString(safeData.orgCode, ''),
      sector: this.safeString(safeData.sector, 'Unspecified'),
      
      // Contract Details - use safe strings with defaults
      contractType: this.safeString(safeData.contractType, 'Unknown Type'),
      status: this.safeString(safeData.status, 'Unknown Status'),
      competitionType: this.safeString(safeData.competitionType, 'Unknown'),
      commerciality: this.safeString(safeData.commerciality, 'Unknown'),
      
      // Compliance and Flags - use safe arrays and strings
      flags: this.safeArray(safeData.flags, []),
      securityLevel: this.safeString(safeData.securityLevel, 'Unclassified'),
      
      // Metadata - use safe values with defaults
      lastModified: this.safeDate(safeData.lastModified, new Date()),
      modificationStatus: this.safeString(safeData.modificationStatus, 'Unknown')
    };
  }

  /**
   * Check if a value is considered empty (null, undefined, empty string, empty array, empty object)
   * @param {any} value - Value to check
   * @returns {boolean} True if value is considered empty
   */
  static isEmpty(value) {
    if (value === null || value === undefined) {
      return true;
    }
    
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    
    if (Array.isArray(value)) {
      return value.length === 0;
    }
    
    if (typeof value === 'object') {
      return Object.keys(value).length === 0;
    }
    
    return false;
  }

  /**
   * Check if a value has meaningful content
   * @param {any} value - Value to check
   * @returns {boolean} True if value has meaningful content
   */
  static hasContent(value) {
    return !this.isEmpty(value);
  }

  /**
   * Safely merge two objects, handling null values
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  static safeMerge(target, source) {
    const safeTarget = this.safeObject(target, {});
    const safeSource = this.safeObject(source, {});
    
    const result = { ...safeTarget };
    
    Object.keys(safeSource).forEach(key => {
      const sourceValue = safeSource[key];
      if (sourceValue !== null && sourceValue !== undefined) {
        result[key] = sourceValue;
      }
    });
    
    return result;
  }

  /**
   * Create a safe filter criteria object
   * @param {Object} criteria - Raw filter criteria
   * @returns {FilterCriteria} Safe filter criteria
   */
  static safeFilterCriteria(criteria) {
    const safeCriteria = this.safeObject(criteria, {});
    
    const result = {};
    
    // Safe search text
    if (this.hasContent(safeCriteria.searchText)) {
      result.searchText = this.safeString(safeCriteria.searchText);
    }
    
    // Safe date range
    if (safeCriteria.dateRange && typeof safeCriteria.dateRange === 'object') {
      const dateRange = safeCriteria.dateRange;
      if (this.hasContent(dateRange.startDate) || this.hasContent(dateRange.endDate)) {
        result.dateRange = {
          startDate: this.safeDate(dateRange.startDate),
          endDate: this.safeDate(dateRange.endDate),
          field: this.safeString(dateRange.field, 'awardDate')
        };
      }
    }
    
    // Safe array filters
    ['status', 'organizations', 'contractTypes', 'personnel'].forEach(field => {
      const arrayValue = this.safeArray(safeCriteria[field]);
      if (arrayValue.length > 0) {
        result[field] = arrayValue;
      }
    });
    
    // Safe financial range
    if (safeCriteria.financialRange && typeof safeCriteria.financialRange === 'object') {
      const financialRange = safeCriteria.financialRange;
      if (this.hasContent(financialRange.min) || this.hasContent(financialRange.max)) {
        result.financialRange = {
          min: this.safeNumber(financialRange.min, 0),
          max: this.safeNumber(financialRange.max, Number.MAX_SAFE_INTEGER),
          field: this.safeString(financialRange.field, 'ceiling')
        };
      }
    }
    
    return result;
  }

  /**
   * Safely format currency values
   * @param {any} value - Value to format as currency
   * @param {string} currency - Currency symbol
   * @param {any} fallback - Fallback value if formatting fails
   * @returns {string} Formatted currency string
   */
  static safeCurrencyFormat(value, currency = '$', fallback = '$0.00') {
    const numValue = this.safeNumber(value, 0);
    
    try {
      return `${currency}${numValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Safely format date values
   * @param {any} value - Value to format as date
   * @param {string} format - Date format ('short', 'long', 'iso')
   * @param {string} fallback - Fallback string if formatting fails
   * @returns {string} Formatted date string
   */
  static safeDateFormat(value, format = 'short', fallback = 'Unknown Date') {
    const dateValue = this.safeDate(value);
    
    if (!dateValue) {
      return fallback;
    }
    
    try {
      switch (format) {
        case 'iso':
          return dateValue.toISOString().split('T')[0];
        case 'long':
          return dateValue.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        case 'short':
        default:
          return dateValue.toLocaleDateString('en-US');
      }
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Safely join array elements
   * @param {any} value - Value to join (should be array)
   * @param {string} separator - Separator string
   * @param {string} fallback - Fallback if not array or empty
   * @returns {string} Joined string
   */
  static safeJoin(value, separator = ', ', fallback = '') {
    const arrayValue = this.safeArray(value);
    
    if (arrayValue.length === 0) {
      return fallback;
    }
    
    return arrayValue
      .map(item => this.safeString(item))
      .filter(item => item !== '')
      .join(separator);
  }

  /**
   * Create a safe validation result with proper defaults
   * @param {Object} validation - Raw validation result
   * @returns {ValidationResult} Safe validation result
   */
  static safeValidationResult(validation) {
    const safeValidation = this.safeObject(validation, {});
    
    return {
      isValid: this.safeBoolean(safeValidation.isValid, false),
      errors: this.safeArray(safeValidation.errors, []),
      warnings: this.safeArray(safeValidation.warnings, []),
      processedRows: this.safeNumber(safeValidation.processedRows, 0),
      validRows: this.safeNumber(safeValidation.validRows, 0),
      fieldErrors: this.safeArray(safeValidation.fieldErrors, []),
      summary: this.safeObject(safeValidation.summary, {
        totalFields: 0,
        validFields: 0,
        errorFields: 0,
        warningFields: 0
      }),
      validatedAt: this.safeDate(safeValidation.validatedAt, new Date())
    };
  }
}