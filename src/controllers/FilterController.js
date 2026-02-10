/**
 * FilterController - Manages filtering and search functionality
 * Handles all filtering operations and maintains filter state
 */

/**
 * FilterController class for data filtering operations
 */
class FilterController {
  constructor() {
    this.originalData = [];
    this.filteredData = [];
    this.activeFilters = {
      searchText: '',
      dateRange: null,
      status: [],
      organizations: [],
      contractTypes: [],
      personnel: [],
      financialRange: null
    };
  }

  /**
   * Initialize filters with data
   * @param {ContractData[]} data - Contract data to filter
   */
  initializeFilters(data) {
    if (!Array.isArray(data)) {
      throw new Error('Data must be an array');
    }
    
    this.originalData = data;
    this.filteredData = [...data];
    
    // Reset active filters
    this.activeFilters = {
      searchText: '',
      dateRange: null,
      status: [],
      organizations: [],
      contractTypes: [],
      personnel: [],
      financialRange: null
    };
  }

  /**
   * Apply text search filter across multiple fields
   * Searches contract titles, solicitation numbers, award numbers, and project identifiers
   * @param {string} searchTerm - Search term
   * @returns {ContractData[]} Filtered data
   */
  applyTextSearch(searchTerm) {
    if (!searchTerm || typeof searchTerm !== 'string') {
      this.activeFilters.searchText = '';
      return this._applyAllFilters();
    }

    this.activeFilters.searchText = searchTerm.toLowerCase().trim();
    return this._applyAllFilters();
  }

  /**
   * Apply date range filter for timeline fields
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} field - Date field to filter on ('awardDate', 'projectStart', 'projectEnd')
   * @returns {ContractData[]} Filtered data
   */
  applyDateRangeFilter(startDate, endDate, field = 'awardDate') {
    if (!startDate || !endDate) {
      this.activeFilters.dateRange = null;
      return this._applyAllFilters();
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format provided');
    }

    if (start > end) {
      throw new Error('Start date must be before end date');
    }

    this.activeFilters.dateRange = {
      startDate: start,
      endDate: end,
      field: field
    };

    return this._applyAllFilters();
  }

  /**
   * Apply multi-select filter for categorical data
   * @param {string} field - Field to filter on
   * @param {string[]} values - Values to filter by
   * @returns {ContractData[]} Filtered data
   */
  applyMultiSelectFilter(field, values) {
    if (!field || !Array.isArray(values)) {
      return this.filteredData;
    }

    // Map field names to filter categories
    const fieldMapping = {
      'status': 'status',
      'clientBureau': 'organizations',
      'orgCode': 'organizations',
      'contractType': 'contractTypes',
      'sector': 'organizations'
    };

    const filterCategory = fieldMapping[field];
    if (!filterCategory) {
      console.warn(`Unknown filter field: ${field}`);
      return this.filteredData;
    }

    // Store the field and values for this filter category
    this.activeFilters[filterCategory] = values.filter(v => v && v.trim());
    this.activeFilters[`${filterCategory}_field`] = field;

    return this._applyAllFilters();
  }

  /**
   * Apply personnel-based filtering
   * @param {string[]} personnelNames - Array of personnel names to filter by
   * @returns {ContractData[]} Filtered data
   */
  applyPersonnelFilter(personnelNames) {
    if (!Array.isArray(personnelNames)) {
      this.activeFilters.personnel = [];
      return this._applyAllFilters();
    }

    this.activeFilters.personnel = personnelNames.filter(name => name && name.trim());
    return this._applyAllFilters();
  }

  /**
   * Apply financial range filter
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @param {string} field - Financial field to filter on ('ceiling', 'awardValue')
   * @returns {ContractData[]} Filtered data
   */
  applyFinancialRangeFilter(min, max, field = 'awardValue') {
    if (min == null && max == null) {
      this.activeFilters.financialRange = null;
      return this._applyAllFilters();
    }

    const minVal = min != null ? Number(min) : Number.NEGATIVE_INFINITY;
    const maxVal = max != null ? Number(max) : Number.POSITIVE_INFINITY;

    if (isNaN(minVal) || isNaN(maxVal)) {
      throw new Error('Financial range values must be numbers');
    }

    if (minVal > maxVal) {
      throw new Error('Minimum value must be less than or equal to maximum value');
    }

    this.activeFilters.financialRange = {
      min: minVal,
      max: maxVal,
      field: field
    };

    return this._applyAllFilters();
  }

  /**
   * Clear all active filters
   */
  clearAllFilters() {
    this.activeFilters = {
      searchText: '',
      dateRange: null,
      status: [],
      organizations: [],
      contractTypes: [],
      personnel: [],
      financialRange: null
    };
    this.filteredData = [...this.originalData];
  }

  /**
   * Clear specific filter
   * @param {string} filterType - Type of filter to clear
   */
  clearFilter(filterType) {
    if (this.activeFilters.hasOwnProperty(filterType)) {
      if (Array.isArray(this.activeFilters[filterType])) {
        this.activeFilters[filterType] = [];
      } else if (typeof this.activeFilters[filterType] === 'string') {
        this.activeFilters[filterType] = '';
      } else {
        this.activeFilters[filterType] = null;
      }
      this._applyAllFilters();
    }
  }

  /**
   * Get currently filtered data
   * @returns {ContractData[]} Current filtered data
   */
  getFilteredData() {
    return this.filteredData;
  }

  /**
   * Get active filter summary
   * @returns {Object} Summary of active filters
   */
  getActiveFilterSummary() {
    const summary = {};
    
    if (this.activeFilters.searchText) {
      summary.searchText = this.activeFilters.searchText;
    }
    
    if (this.activeFilters.dateRange) {
      summary.dateRange = `${this.activeFilters.dateRange.startDate.toLocaleDateString()} - ${this.activeFilters.dateRange.endDate.toLocaleDateString()}`;
    }
    
    ['status', 'organizations', 'contractTypes', 'personnel'].forEach(filter => {
      if (this.activeFilters[filter] && this.activeFilters[filter].length > 0) {
        summary[filter] = this.activeFilters[filter].length;
      }
    });
    
    if (this.activeFilters.financialRange) {
      const range = this.activeFilters.financialRange;
      summary.financialRange = `$${range.min.toLocaleString()} - $${range.max.toLocaleString()}`;
    }
    
    return summary;
  }

  /**
   * Get unique values for a field (for populating dropdown filters)
   * @param {string} field - Field name
   * @returns {string[]} Array of unique values
   */
  getUniqueValues(field) {
    if (!this.originalData || this.originalData.length === 0) {
      return [];
    }

    const values = new Set();
    
    this.originalData.forEach(contract => {
      let value = this._getFieldValue(contract, field);
      if (value != null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => values.add(String(v)));
        } else {
          values.add(String(value));
        }
      }
    });

    return Array.from(values).sort();
  }

  /**
   * Apply all active filters to the original data
   * Uses logical AND operations to combine multiple filters
   * @private
   * @returns {ContractData[]} Filtered data
   */
  _applyAllFilters() {
    let filtered = [...this.originalData];

    // Apply text search filter
    if (this.activeFilters.searchText) {
      filtered = filtered.filter(contract => this._matchesTextSearch(contract, this.activeFilters.searchText));
    }

    // Apply date range filter
    if (this.activeFilters.dateRange) {
      filtered = filtered.filter(contract => this._matchesDateRange(contract, this.activeFilters.dateRange));
    }

    // Apply status filter
    if (this.activeFilters.status && this.activeFilters.status.length > 0) {
      const field = this.activeFilters.status_field || 'status';
      filtered = filtered.filter(contract => {
        const value = this._getFieldValue(contract, field);
        return this.activeFilters.status.includes(String(value));
      });
    }

    // Apply organizations filter
    if (this.activeFilters.organizations && this.activeFilters.organizations.length > 0) {
      const field = this.activeFilters.organizations_field || 'clientBureau';
      filtered = filtered.filter(contract => {
        const value = this._getFieldValue(contract, field);
        return this.activeFilters.organizations.includes(String(value));
      });
    }

    // Apply contract types filter
    if (this.activeFilters.contractTypes && this.activeFilters.contractTypes.length > 0) {
      const field = this.activeFilters.contractTypes_field || 'contractType';
      filtered = filtered.filter(contract => {
        const value = this._getFieldValue(contract, field);
        return this.activeFilters.contractTypes.includes(String(value));
      });
    }

    // Apply personnel filter
    if (this.activeFilters.personnel && this.activeFilters.personnel.length > 0) {
      filtered = filtered.filter(contract => this._matchesPersonnelFilter(contract, this.activeFilters.personnel));
    }

    // Apply financial range filter
    if (this.activeFilters.financialRange) {
      filtered = filtered.filter(contract => this._matchesFinancialRange(contract, this.activeFilters.financialRange));
    }

    this.filteredData = filtered;
    return this.filteredData;
  }

  /**
   * Check if contract matches text search across multiple fields
   * @private
   * @param {ContractData} contract - Contract to check
   * @param {string} searchTerm - Search term (already lowercased)
   * @returns {boolean} True if contract matches search
   */
  _matchesTextSearch(contract, searchTerm) {
    // Search across contract titles, solicitation numbers, award numbers, and project identifiers
    const searchFields = [
      'award', 'project', 'solicitation', 'acquisition',
      'AWARD_TITLE', 'PROJECT_TITLE', // Handle both data model and CSV field names
      'title', 'projectTitle' // Alternative field names
    ];

    return searchFields.some(field => {
      const value = this._getFieldValue(contract, field);
      return value && String(value).toLowerCase().includes(searchTerm);
    });
  }

  /**
   * Check if contract matches date range filter
   * @private
   * @param {ContractData} contract - Contract to check
   * @param {Object} dateRange - Date range filter
   * @returns {boolean} True if contract matches date range
   */
  _matchesDateRange(contract, dateRange) {
    const fieldValue = this._getFieldValue(contract, dateRange.field);
    if (!fieldValue) return false;

    const contractDate = new Date(fieldValue);
    if (isNaN(contractDate.getTime())) return false;

    return contractDate >= dateRange.startDate && contractDate <= dateRange.endDate;
  }

  /**
   * Check if contract matches personnel filter
   * @private
   * @param {ContractData} contract - Contract to check
   * @param {string[]} personnelNames - Personnel names to match
   * @returns {boolean} True if contract matches personnel filter
   */
  _matchesPersonnelFilter(contract, personnelNames) {
    // Check all personnel fields
    const personnelFields = ['PM', 'CO', 'CS', 'PPM', 'projectManager', 'contractingOfficer', 'contractSpecialist', 'programManager'];
    
    return personnelFields.some(field => {
      const personnel = this._getFieldValue(contract, field);
      if (!personnel) return false;

      // Handle both string names and personnel objects
      const name = typeof personnel === 'object' ? personnel.name : String(personnel);
      return personnelNames.some(filterName => 
        name && name.toLowerCase().includes(filterName.toLowerCase())
      );
    });
  }

  /**
   * Check if contract matches financial range filter
   * @private
   * @param {ContractData} contract - Contract to check
   * @param {Object} financialRange - Financial range filter
   * @returns {boolean} True if contract matches financial range
   */
  _matchesFinancialRange(contract, financialRange) {
    const fieldValue = this._getFieldValue(contract, financialRange.field);
    if (fieldValue == null) return false;

    const numValue = this._parseFinancialValue(fieldValue);
    if (isNaN(numValue)) return false;

    return numValue >= financialRange.min && numValue <= financialRange.max;
  }

  /**
   * Get field value from contract, handling different field name formats
   * @private
   * @param {ContractData} contract - Contract object
   * @param {string} field - Field name
   * @returns {any} Field value
   */
  _getFieldValue(contract, field) {
    if (!contract || !field) return null;

    // Direct field access
    if (contract.hasOwnProperty(field)) {
      return contract[field];
    }

    // Handle common field name variations
    const fieldMappings = {
      'awardDate': ['Day of AWARD_DATE_CO', 'AWARD_DATE_CO', 'awardDate'],
      'projectStart': ['PROJECT_START', 'CHANGED_POP_START', 'projectStart'],
      'projectEnd': ['PROJECT_END', 'POP_COMPLETION', 'projectEnd'],
      'ceiling': ['CEILING', 'ceiling'],
      'awardValue': ['AWARD', 'awardValue'],
      'status': ['AWARD_STATUS', 'status'],
      'clientBureau': ['Client_Bureau', 'CLIENT_BUREAU', 'clientBureau'],
      'orgCode': ['ORGCODE', 'orgCode'],
      'contractType': ['CONTRACT_TYPE', 'contractType'],
      'sector': ['lfedsim_sector_friendly', 'sector']
    };

    if (fieldMappings[field]) {
      for (const mappedField of fieldMappings[field]) {
        if (contract.hasOwnProperty(mappedField)) {
          return contract[mappedField];
        }
      }
    }

    return null;
  }

  /**
   * Parse financial value from string format
   * @private
   * @param {any} value - Value to parse
   * @returns {number} Parsed number
   */
  _parseFinancialValue(value) {
    if (typeof value === 'number') return value;
    if (!value) return 0;

    // Remove currency symbols, commas, and whitespace
    const cleanValue = String(value).replace(/[$,\s]/g, '');
    return parseFloat(cleanValue) || 0;
  }
}