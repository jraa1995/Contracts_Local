/**
 * DataService - Handles Google Sheets integration and data processing
 * Provides methods for loading, validating, and transforming contract data
 */

/**
 * DataService class for managing contract data operations
 */
class DataService {
  constructor(spreadsheetId = null) {
    this.cachedData = null;
    this.lastCacheTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.spreadsheetId = spreadsheetId;
    this.sheetName = 'AL_Extract'; // Sheet containing contract data
    
    // Initialize optimization manager (coordinates all optimization services)
    this.optimizationManager = new OptimizationManager();
    this.optimizationManager.initialize({
      enableAllOptimizations: true,
      enableExecutionTimeMonitoring: true,
      enableQuotaManagement: true,
      enableIntelligentCaching: true
    });
    
    // Legacy optimization services (for backward compatibility)
    this.gasOptimization = this.optimizationManager.gasOptimization;
    this.cachingService = this.optimizationManager.cachingService;
    this.retryService = this.optimizationManager.retryService;
    
    // Performance tracking
    this.performanceMetrics = {
      loadTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
      retryAttempts: 0,
      batchProcessingTime: 0
    };
  }

  /**
   * Load contract data from Google Sheets with comprehensive optimization
   * @returns {ContractData[]} Array of contract data
   */
  async loadContractData() {
    try {
      // Use optimization manager for comprehensive optimization
      return await this.optimizationManager.optimizeDataLoading(
        () => this.loadAndProcessData(),
        {
          cacheKey: this.cachingService.createContractDataKey(
            this.spreadsheetId || 'active',
            this.sheetName
          ),
          cachePrefix: 'contractData',
          expectedDataSize: null, // Will be determined dynamically
          batchable: true,
          operationId: 'load_contract_data',
          timeout: 300000 // 5 minutes
        }
      );
      
    } catch (error) {
      console.error('Error loading contract data:', error);
      throw new Error(`Failed to load contract data: ${error.message}`);
    }
  }

  /**
   * Synchronous version for Google Apps Script server-side calls
   * @returns {ContractData[]} Array of contract data
   */
  loadContractDataSync() {
    try {
      // Check cache first
      const cacheKey = this.cachingService.createContractDataKey(
        this.spreadsheetId || 'active',
        this.sheetName
      );
      
      const cachedData = this.cachingService.get(cacheKey, 'contractData');
      if (cachedData) {
        console.log('DataService: Returning cached data');
        this.performanceMetrics.cacheHits++;
        return cachedData;
      }
      
      this.performanceMetrics.cacheMisses++;
      
      // Load data directly (synchronous)
      const rawData = this.loadRawDataFromSheetsDirectly();
      
      // Validate data integrity
      const validationResult = this.validateDataIntegrity(rawData);
      
      if (!validationResult.isValid) {
        console.error('Data validation failed:', validationResult.errors);
      }

      // Transform raw data
      const transformedData = this.transformRawData(rawData);
      
      // Cache the result
      this.cachingService.set(cacheKey, transformedData, 'contractData');
      
      console.log(`DataService: Loaded and transformed ${transformedData.length} contracts`);
      return transformedData;
      
    } catch (error) {
      console.error('Error loading contract data (sync):', error);
      throw new Error(`Failed to load contract data: ${error.message}`);
    }
  }

  /**
   * Load and process data with optimization and retry logic
   * @returns {ContractData[]} Processed contract data
   */
  async loadAndProcessData() {
    const startTime = new Date();
    
    try {
      // Load raw data with retry logic
      const rawData = await this.retryService.retrySheetOperation(
        () => this.loadRawDataFromSheets(),
        {
          operationId: 'load_sheet_data',
          timeout: 60000 // 1 minute timeout
        }
      );
      
      // Validate data integrity
      const validationResult = this.validateDataIntegrity(rawData);
      
      if (!validationResult.isValid) {
        console.error('Data validation failed:', validationResult.errors);
        // Continue processing but log errors
      }

      // Transform raw data using batch processing for large datasets
      let transformedData;
      
      if (rawData.length > 100) { // Use batch processing for large datasets
        transformedData = await this.batchTransformData(rawData);
      } else {
        transformedData = this.transformRawData(rawData);
      }
      
      // Cache the processed data
      this.cacheData(transformedData);
      
      const endTime = new Date();
      const loadTime = endTime.getTime() - startTime.getTime();
      this.performanceMetrics.loadTimes.push(loadTime);
      
      console.log(`DataService: Loaded and processed ${transformedData.length} contracts in ${loadTime}ms`);
      
      return transformedData;
      
    } catch (error) {
      console.error('Error in loadAndProcessData:', error);
      throw error;
    }
  }

  /**
   * Batch transform data for large datasets
   * @param {any[][]} rawData - Raw data to transform
   * @returns {ContractData[]} Transformed contract data
   */
  async batchTransformData(rawData) {
    const startTime = new Date();
    
    if (!rawData || rawData.length < 2) {
      return [];
    }

    const headers = rawData[0];
    const dataRows = rawData.slice(1);
    const columnMap = this.createColumnMapping(headers);
    
    // Process data in batches using GAS optimization service
    const batchResult = await this.gasOptimization.processBatches(
      dataRows,
      (batch, batchIndex, processedCount) => {
        const batchTransformed = [];
        
        for (let i = 0; i < batch.length; i++) {
          const row = batch[i];
          const globalRowIndex = batchIndex + i + 2; // +2 for 1-based indexing and header
          
          // Skip empty rows
          const hasData = row.some(cell => cell !== null && cell !== undefined && cell !== '');
          if (!hasData) {
            continue;
          }

          try {
            const contractData = this.transformRowToContractData(row, columnMap, globalRowIndex);
            if (contractData) {
              batchTransformed.push(contractData);
            }
          } catch (error) {
            console.error(`Error transforming row ${globalRowIndex}:`, error);
            // Continue processing other rows
          }
        }
        
        return batchTransformed;
      },
      {
        batchSize: this.gasOptimization.calculateOptimalBatchSize(dataRows.length)
      }
    );
    
    const endTime = new Date();
    this.performanceMetrics.batchProcessingTime = endTime.getTime() - startTime.getTime();
    
    console.log(`DataService: Batch transformation completed - ${batchResult.processedCount}/${batchResult.totalItems} items processed`);
    
    if (batchResult.errors.length > 0) {
      console.warn(`DataService: ${batchResult.errors.length} batch processing errors occurred`);
    }
    
    return batchResult.results.flat(); // Flatten batch results
  }

  /**
   * Load raw data from Google Sheets using optimized sheets service
   * @returns {any[][]} Raw sheet data as 2D array
   */
  async loadRawDataFromSheets() {
    try {
      // Use optimized sheets service for efficient data loading
      const data = await this.optimizationManager.optimizeSheetOperation(
        this.spreadsheetId,
        this.sheetName,
        {
          enableCaching: true,
          enableBatching: true,
          timeout: 120000 // 2 minutes for sheet operations
        }
      );
      
      if (data.length === 0) {
        throw new Error('No data found in the sheet');
      }

      console.log(`DataService: Loaded ${data.length} rows from sheet '${this.sheetName}' using optimized service`);
      return data;
      
    } catch (error) {
      console.error('Error loading raw data from sheets:', error);
      
      // Fallback to direct API call if optimized service fails
      console.log('DataService: Falling back to direct API call');
      return this.loadRawDataFromSheetsDirectly();
    }
  }

  /**
   * Fallback method for direct Google Sheets API access
   * @returns {any[][]} Raw sheet data as 2D array
   */
  loadRawDataFromSheetsDirectly() {
    try {
      // Track quota usage
      this.gasOptimization.trackQuotaUsage('read', 1);
      
      let spreadsheet;
      
      // If no spreadsheet ID provided, try to get the active spreadsheet
      if (!this.spreadsheetId) {
        try {
          spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
        } catch (error) {
          throw new Error('No active spreadsheet found and no spreadsheet ID provided');
        }
      } else {
        try {
          spreadsheet = SpreadsheetApp.openById(this.spreadsheetId);
        } catch (error) {
          throw new Error(`Cannot access spreadsheet with ID: ${this.spreadsheetId}`);
        }
      }

      const sheet = spreadsheet.getSheetByName(this.sheetName);
      if (!sheet) {
        throw new Error(`Sheet '${this.sheetName}' not found in spreadsheet`);
      }

      // Get all data from the sheet efficiently
      const range = sheet.getDataRange();
      const values = range.getValues();
      
      if (values.length === 0) {
        throw new Error('No data found in the sheet');
      }

      console.log(`DataService: Loaded ${values.length} rows from sheet '${this.sheetName}' (direct API)`);
      return values;
      
    } catch (error) {
      console.error('Error loading raw data from sheets directly:', error);
      throw error;
    }
  }

  /**
   * Validate data integrity with enhanced error logging
   * @param {any[][]} data - Raw data to validate (2D array)
   * @returns {ValidationResult} Enhanced validation results
   */
  validateDataIntegrity(data) {
    const fieldErrors = [];
    let processedRows = 0;
    let validRows = 0;

    if (!data || !Array.isArray(data)) {
      const error = 'Data is not a valid array';
      errorLogger.logDataProcessingError('validateDataIntegrity', 0, error, data);
      return errorLogger.createValidationResult(false, [error], [], 0, 0, fieldErrors);
    }

    if (data.length === 0) {
      const error = 'No data rows found';
      errorLogger.logDataProcessingError('validateDataIntegrity', 0, error);
      return errorLogger.createValidationResult(false, [error], [], 0, 0, fieldErrors);
    }

    // Validate header row exists
    if (data.length < 2) {
      const error = 'No data rows found (only header row present)';
      errorLogger.logDataProcessingError('validateDataIntegrity', 1, error);
      return errorLogger.createValidationResult(false, [error], [], 0, 0, fieldErrors);
    }

    const headers = data[0];
    const requiredFields = [
      'AWARD', 'PROJECT', 'SOLICITATION', 'ACQUISITION',
      'CEILING', 'PM1 Name', 'CO1 Name', 'CS1 Name',
      'Day of AWARD_DATE_CO', 'PROJECT_START', 'PROJECT_END'
    ];

    const errors = [];
    const warnings = [];

    // Check for required columns
    const missingFields = requiredFields.filter(field => 
      !headers.some(header => header && header.toString().includes(field))
    );

    if (missingFields.length > 0) {
      const warning = `Missing recommended fields: ${missingFields.join(', ')}`;
      warnings.push(warning);
      errorLogger.logError('WARN', 'DataIntegrityValidator', warning, { 
        missingFields: missingFields,
        type: 'missing_columns'
      });
    }

    // Validate data rows with detailed field-level validation
    processedRows = data.length - 1; // Exclude header row
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowNumber = i + 1; // 1-based indexing
      let isValidRow = true;

      // Check if row has minimum required data
      if (!row || row.length === 0) {
        const error = `Row ${rowNumber}: Empty row`;
        errors.push(error);
        fieldErrors.push({
          field: 'entire_row',
          row: rowNumber,
          error: 'Empty row',
          severity: 'error'
        });
        errorLogger.logFieldError('entire_row', rowNumber, null, 'Empty row', 'error');
        isValidRow = false;
        continue;
      }

      // Check for completely empty rows
      const hasData = row.some(cell => cell !== null && cell !== undefined && cell !== '');
      if (!hasData) {
        const warning = `Row ${rowNumber}: Row appears to be empty`;
        warnings.push(warning);
        fieldErrors.push({
          field: 'entire_row',
          row: rowNumber,
          error: 'Row appears to be empty',
          severity: 'warning'
        });
        errorLogger.logFieldError('entire_row', rowNumber, null, 'Row appears to be empty', 'warning');
        continue;
      }

      // Validate individual fields in the row
      headers.forEach((header, colIndex) => {
        if (header && requiredFields.some(rf => header.toString().includes(rf))) {
          const cellValue = row[colIndex];
          
          // Check for missing required field values
          if (cellValue === null || cellValue === undefined || cellValue === '') {
            const fieldError = `Missing value for required field '${header}'`;
            fieldErrors.push({
              field: header,
              row: rowNumber,
              error: fieldError,
              severity: 'warning'
            });
            errorLogger.logFieldError(header, rowNumber, cellValue, fieldError, 'warning');
          }
          
          // Validate specific field types
          if (header.includes('CEILING') || header.includes('IGE')) {
            if (cellValue && !this.isValidFinancialValue(cellValue)) {
              const fieldError = `Invalid financial format: ${cellValue}`;
              fieldErrors.push({
                field: header,
                row: rowNumber,
                error: fieldError,
                severity: 'error'
              });
              errorLogger.logFieldError(header, rowNumber, cellValue, fieldError, 'error');
              isValidRow = false;
            }
          }
          
          if (header.includes('DATE') || header.includes('START') || header.includes('END')) {
            if (cellValue && !this.isValidDateValue(cellValue)) {
              const fieldError = `Invalid date format: ${cellValue}`;
              fieldErrors.push({
                field: header,
                row: rowNumber,
                error: fieldError,
                severity: 'warning'
              });
              errorLogger.logFieldError(header, rowNumber, cellValue, fieldError, 'warning');
            }
          }
          
          if (header.includes('Email')) {
            if (cellValue && !ValidationUtils.isValidEmail(cellValue)) {
              const fieldError = `Invalid email format: ${cellValue}`;
              fieldErrors.push({
                field: header,
                row: rowNumber,
                error: fieldError,
                severity: 'warning'
              });
              errorLogger.logFieldError(header, rowNumber, cellValue, fieldError, 'warning');
            }
          }
        }
      });

      if (isValidRow) {
        validRows++;
      }
    }

    // Set overall validity based on critical errors only
    const criticalErrors = fieldErrors.filter(fe => fe.severity === 'error');
    const isValid = errors.length === 0 && criticalErrors.length === 0;

    return errorLogger.createValidationResult(isValid, errors, warnings, processedRows, validRows, fieldErrors);
  }

  /**
   * Check if a value is a valid financial value
   * @param {any} value - Value to check
   * @returns {boolean} True if valid financial value
   */
  isValidFinancialValue(value) {
    if (value === null || value === undefined || value === '') return false;
    
    // Try to parse as currency
    try {
      const parsed = CurrencyUtils.parseCurrency(value);
      return !isNaN(parsed) && parsed >= 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a value is a valid date value
   * @param {any} value - Value to check
   * @returns {boolean} True if valid date value
   */
  isValidDateValue(value) {
    if (value === null || value === undefined || value === '') return false;
    
    // Try to parse as date
    try {
      const dateValidation = DateUtils.validateDate(value, 'test');
      return dateValidation.date instanceof Date && !isNaN(dateValidation.date);
    } catch (error) {
      return false;
    }
  }

  /**
   * Transform raw sheet data into ContractData objects
   * @param {any[][]} rawData - Raw data from sheets (2D array)
   * @returns {ContractData[]} Transformed contract data
   */
  transformRawData(rawData) {
    if (!rawData || rawData.length < 2) {
      return [];
    }

    const headers = rawData[0];
    const dataRows = rawData.slice(1);
    const transformedData = [];

    // Create column index mapping
    const columnMap = this.createColumnMapping(headers);

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      
      // Skip empty rows
      const hasData = row.some(cell => cell !== null && cell !== undefined && cell !== '');
      if (!hasData) {
        continue;
      }

      try {
        const contractData = this.transformRowToContractData(row, columnMap, i + 2); // +2 for 1-based indexing and header
        if (contractData) {
          transformedData.push(contractData);
        }
      } catch (error) {
        console.error(`Error transforming row ${i + 2}:`, error);
        // Continue processing other rows
      }
    }

    return transformedData;
  }

  /**
   * Create column mapping from headers
   * @param {string[]} headers - Header row from sheet
   * @returns {Object} Column mapping object
   */
  createColumnMapping(headers) {
    const mapping = {};
    
    headers.forEach((header, index) => {
      if (header) {
        const cleanHeader = header.toString().trim();
        mapping[cleanHeader] = index;
      }
    });

    return mapping;
  }

  /**
   * Transform a single row to ContractData object with comprehensive validation and null-safe handling
   * @param {any[]} row - Data row
   * @param {Object} columnMap - Column mapping
   * @param {number} rowNumber - Row number for error reporting
   * @returns {ContractData|null} Transformed contract data or null if invalid
   */
  transformRowToContractData(row, columnMap, rowNumber) {
    try {
      // Helper function to get cell value safely with null handling
      const getCell = (columnName) => {
        const index = columnMap[columnName];
        if (index === undefined) {
          return null;
        }
        const value = row[index];
        return NullSafeUtils.safeGet(value, null);
      };

      // Process financial data using CurrencyUtils with null-safe handling
      const ceilingValue = getCell('CEILING');
      const igeValue = getCell('IGE');
      
      let ceiling = 0;
      let awardValue = 0;
      let remainingBudget = 0;

      try {
        ceiling = CurrencyUtils.parseCurrency(ceilingValue);
      } catch (error) {
        ceiling = NullSafeUtils.safeNumber(ceilingValue, 0);
        errorLogger.logFieldError('CEILING', rowNumber, ceilingValue, 
          `Currency parsing failed: ${error.message}`, 'warning');
      }

      try {
        awardValue = CurrencyUtils.parseCurrency(igeValue);
      } catch (error) {
        awardValue = NullSafeUtils.safeNumber(igeValue, 0);
        errorLogger.logFieldError('IGE', rowNumber, igeValue, 
          `Currency parsing failed: ${error.message}`, 'warning');
      }

      try {
        remainingBudget = CurrencyUtils.calculateRemainingBudget(ceiling, awardValue);
      } catch (error) {
        remainingBudget = Math.max(0, ceiling - awardValue);
        errorLogger.logFieldError('remainingBudget', rowNumber, null, 
          `Budget calculation failed: ${error.message}`, 'warning');
      }

      // Validate financial data using enhanced validation
      const financialValidation = ValidationUtils.validateFinancialData({
        ceiling: ceiling,
        awardValue: awardValue,
        remainingBudget: remainingBudget
      }, rowNumber);

      // Process and validate date fields with null-safe handling
      const awardDateValidation = this.safeValidateDate(getCell('Day of AWARD_DATE_CO'), 'Award Date', rowNumber);
      const projectStartValidation = this.safeValidateDate(getCell('PROJECT_START'), 'Project Start', rowNumber);
      const projectEndValidation = this.safeValidateDate(getCell('PROJECT_END'), 'Project End', rowNumber);
      const completionDateValidation = this.safeValidateDate(getCell('EST_ULTIMATE_COMPLETION'), 'Completion Date', rowNumber);

      // Validate date relationships
      const dateValidation = ValidationUtils.validateDateData({
        awardDate: awardDateValidation.date,
        projectStart: projectStartValidation.date,
        projectEnd: projectEndValidation.date,
        completionDate: completionDateValidation.date
      }, rowNumber);

      // Create personnel objects with null-safe validation
      const projectManager = this.createSafePersonnelInfo({
        name: getCell('PM1 Name'),
        email: getCell('PM1 Email'),
        role: 'Project Manager',
        organization: getCell('APEXNAME')
      }, 'PM1', rowNumber);

      const contractingOfficer = this.createSafePersonnelInfo({
        name: getCell('CO1 Name'),
        email: getCell('CO1 Email'),
        role: 'Contracting Officer',
        organization: getCell('APEXNAME')
      }, 'CO1', rowNumber);

      const contractSpecialist = this.createSafePersonnelInfo({
        name: getCell('CS1 Name'),
        email: getCell('CS1 Email'),
        role: 'Contract Specialist',
        organization: getCell('APEXNAME')
      }, 'CS1', rowNumber);

      const programManager = this.createSafePersonnelInfo({
        name: getCell('PPM'),
        email: getCell('PPM Email'),
        role: 'Program Manager',
        organization: getCell('APEXNAME')
      }, 'PPM', rowNumber);

      // Create ContractData object with null-safe handling
      const contractData = NullSafeUtils.safeContractData({
        // Identifiers
        award: this.cleanString(getCell('AWARD')),
        project: this.cleanString(getCell('PROJECT')),
        solicitation: this.cleanString(getCell('SOLICITATION')),
        acquisition: this.cleanString(getCell('ACQUISITION')),
        
        // Financial Information (processed)
        ceiling: ceiling,
        awardValue: awardValue,
        remainingBudget: remainingBudget,
        
        // Personnel
        projectManager: projectManager,
        contractingOfficer: contractingOfficer,
        contractSpecialist: contractSpecialist,
        programManager: programManager,
        
        // Timeline (processed using DateUtils)
        awardDate: awardDateValidation.date,
        projectStart: projectStartValidation.date,
        projectEnd: projectEndValidation.date,
        completionDate: completionDateValidation.date,
        
        // Organization
        clientBureau: this.cleanString(getCell('Client_Bureau')),
        orgCode: this.cleanString(getCell('ORGCODE')),
        sector: this.cleanString(getCell('lfedsim_sector_friendly')),
        
        // Contract Details
        contractType: this.cleanString(getCell('CONTRACT_TYPE')),
        status: this.cleanString(getCell('AWARD_STATUS')),
        competitionType: this.cleanString(getCell('COMPETITION_TYPE')),
        commerciality: this.cleanString(getCell('Commerciality')),
        
        // Compliance and Flags
        flags: this.parseFlags(getCell('FLAGS')),
        securityLevel: this.extractSecurityLevel(getCell('FLAGS')),
        
        // Metadata
        lastModified: new Date(),
        modificationStatus: this.cleanString(getCell('Mod_Status'))
      });

      // Add internal tracking with null-safe handling
      contractData._rowNumber = NullSafeUtils.safeNumber(rowNumber, 0);
      contractData._rawData = NullSafeUtils.safeArray(row, []);

      // Perform comprehensive contract data validation
      const contractValidation = ValidationUtils.validateContractData(contractData, rowNumber);

      // Combine all validation results
      const combinedValidation = ValidationUtils.combineValidationResults([
        financialValidation,
        dateValidation,
        contractValidation
      ]);

      // Store validation results in contract data
      contractData._validation = NullSafeUtils.safeValidationResult(combinedValidation);
      contractData._financialValidation = NullSafeUtils.safeValidationResult(financialValidation);
      contractData._dateValidation = NullSafeUtils.safeValidationResult(dateValidation);

      // Log any critical errors
      if (!combinedValidation.isValid) {
        errorLogger.logDataProcessingError(
          'transformRowToContractData',
          rowNumber,
          `Contract data validation failed: ${combinedValidation.errors.join(', ')}`,
          { contractId: contractData.award || contractData.project }
        );
      }

      // Log warnings if present
      if (combinedValidation.warnings.length > 0) {
        errorLogger.logError(
          'WARN',
          'DataTransformer',
          `Contract data validation warnings for row ${rowNumber}: ${combinedValidation.warnings.join(', ')}`,
          { 
            contractId: contractData.award || contractData.project,
            warnings: combinedValidation.warnings
          }
        );
      }

      return contractData;
    } catch (error) {
      errorLogger.logSystemError(
        'DataTransformer',
        `Error transforming row ${rowNumber}: ${error.message}`,
        error
      );
      
      // Return a minimal safe contract object on error
      return NullSafeUtils.safeContractData({
        award: `ERROR_ROW_${rowNumber}`,
        project: `ERROR_ROW_${rowNumber}`,
        _rowNumber: rowNumber,
        _error: error.message
      });
    }
  }

  /**
   * Safely validate a date value with comprehensive error handling
   * @param {any} value - Date value to validate
   * @param {string} fieldName - Field name for error reporting
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Object} Date validation result
   */
  safeValidateDate(value, fieldName, rowNumber) {
    try {
      if (NullSafeUtils.isEmpty(value)) {
        return {
          date: null,
          error: null,
          warning: `${fieldName} is empty`
        };
      }

      const validation = DateUtils.validateDate(value, fieldName);
      
      // Log validation issues
      if (validation.error) {
        errorLogger.logFieldError(fieldName, rowNumber, value, validation.error, 'error');
      }
      if (validation.warning) {
        errorLogger.logFieldError(fieldName, rowNumber, value, validation.warning, 'warning');
      }

      return validation;
    } catch (error) {
      errorLogger.logFieldError(fieldName, rowNumber, value, 
        `Date validation failed: ${error.message}`, 'error');
      
      return {
        date: null,
        error: `Date validation failed: ${error.message}`,
        warning: null
      };
    }
  }

  /**
   * Create a safe PersonnelInfo object with validation
   * @param {Object} data - Raw personnel data
   * @param {string} rolePrefix - Role prefix for error reporting
   * @param {number} rowNumber - Row number for error reporting
   * @returns {PersonnelInfo} Safe personnel object
   */
  createSafePersonnelInfo(data, rolePrefix, rowNumber) {
    const safePersonnel = NullSafeUtils.safePersonnelInfo(data);
    
    // Validate email if provided
    if (safePersonnel.email && !ValidationUtils.isValidEmail(safePersonnel.email)) {
      errorLogger.logFieldError(
        `${rolePrefix}_Email`, 
        rowNumber, 
        safePersonnel.email, 
        `Invalid email format: ${safePersonnel.email}`, 
        'warning'
      );
      
      // Keep the invalid email but mark it as invalid
      safePersonnel.email = `INVALID: ${safePersonnel.email}`;
    }
    
    // Log warning if name is missing for important roles
    if (!safePersonnel.name || safePersonnel.name === 'Unknown') {
      errorLogger.logFieldError(
        `${rolePrefix}_Name`, 
        rowNumber, 
        safePersonnel.name, 
        `Missing name for ${safePersonnel.role}`, 
        'warning'
      );
    }
    
    return safePersonnel;
  }

  /**
   * Clean string values with null-safe handling
   * @param {any} value - Value to clean
   * @returns {string} Cleaned string
   */
  cleanString(value) {
    return NullSafeUtils.safeString(value, '');
  }

  /**
   * Parse flags from comma-separated string with null-safe handling
   * @param {string} flagsString - Flags string
   * @returns {string[]} Array of flags
   */
  parseFlags(flagsString) {
    return NullSafeUtils.safeArray(flagsString, []);
  }

  /**
   * Validate date relationships for logical consistency
   * @param {Object} dates - Object containing parsed dates
   * @param {number} rowNumber - Row number for error reporting
   * @returns {Object} Validation result
   */
  validateDateRelationships(dates, rowNumber) {
    const result = {
      isValid: true,
      errors: [],
      warnings: []
    };

    const { awardDate, projectStart, projectEnd, completionDate } = dates;

    // Award date should be before or equal to project start
    if (awardDate && projectStart && awardDate > projectStart) {
      result.warnings.push('Award date is after project start date');
    }

    // Project start should be before project end
    if (projectStart && projectEnd && projectStart >= projectEnd) {
      result.errors.push('Project start date is not before project end date');
      result.isValid = false;
    }

    // Completion date should be on or after project end
    if (projectEnd && completionDate && completionDate < projectEnd) {
      result.warnings.push('Completion date is before project end date');
    }

    // Check for unreasonable date ranges
    if (projectStart && projectEnd) {
      const projectDuration = DateUtils.daysBetween(projectStart, projectEnd);
      if (projectDuration > 3650) { // More than 10 years
        result.warnings.push(`Project duration is unusually long: ${Math.round(projectDuration / 365)} years`);
      } else if (projectDuration < 1) {
        result.warnings.push('Project duration is less than 1 day');
      }
    }

    return result;
  }

  /**
   * Extract security level from flags with null-safe handling
   * @param {string} flagsString - Flags string
   * @returns {string} Security level
   */
  extractSecurityLevel(flagsString) {
    const safeFlags = NullSafeUtils.safeString(flagsString, '').toLowerCase();
    
    if (safeFlags.includes('security classification level')) {
      const match = safeFlags.match(/security classification level (\d+)/);
      return match ? `Level ${match[1]}` : 'Unclassified';
    }
    
    // Check for other security indicators
    if (safeFlags.includes('confidential')) return 'Confidential';
    if (safeFlags.includes('restricted')) return 'Restricted';
    if (safeFlags.includes('secret')) return 'Secret';
    if (safeFlags.includes('top secret')) return 'Top Secret';
    
    return 'Unclassified';
  }

  /**
   * Cache contract data using the caching service
   * @param {ContractData[]} data - Data to cache
   */
  cacheData(data) {
    try {
      const cacheKey = this.cachingService.createContractDataKey(
        this.spreadsheetId || 'active',
        this.sheetName
      );
      
      this.cachingService.set(cacheKey, data, {
        prefix: 'contractData',
        ttl: this.cacheTimeout
      });
      
      // Also maintain legacy cache for backward compatibility
      this.cachedData = data;
      this.lastCacheTime = new Date();
      
      console.log(`DataService: Cached ${data.length} contracts`);
    } catch (error) {
      console.error('Error caching data:', error);
      // Fallback to legacy cache
      this.cachedData = data;
      this.lastCacheTime = new Date();
    }
  }

  /**
   * Get cached contract data with optimization
   * @returns {ContractData[]|null} Cached data or null if expired
   */
  getCachedData() {
    try {
      const cacheKey = this.cachingService.createContractDataKey(
        this.spreadsheetId || 'active',
        this.sheetName
      );
      
      const cachedData = this.cachingService.get(cacheKey, {
        prefix: 'contractData'
      });
      
      if (cachedData) {
        this.performanceMetrics.cacheHits++;
        return cachedData;
      }
      
      // Fallback to legacy cache
      if (!this.cachedData || !this.lastCacheTime) {
        this.performanceMetrics.cacheMisses++;
        return null;
      }
      
      const now = new Date();
      if (now.getTime() - this.lastCacheTime.getTime() > this.cacheTimeout) {
        this.cachedData = null;
        this.lastCacheTime = null;
        this.performanceMetrics.cacheMisses++;
        return null;
      }
      
      this.performanceMetrics.cacheHits++;
      return this.cachedData;
      
    } catch (error) {
      console.error('Error getting cached data:', error);
      this.performanceMetrics.cacheMisses++;
      return null;
    }
  }

  /**
   * Set spreadsheet ID for data source
   * @param {string} spreadsheetId - Google Sheets spreadsheet ID
   */
  setSpreadsheetId(spreadsheetId) {
    this.spreadsheetId = spreadsheetId;
    // Clear cache when changing data source
    this.cachedData = null;
    this.lastCacheTime = null;
  }

  /**
   * Set sheet name for data source
   * @param {string} sheetName - Sheet name within the spreadsheet
   */
  setSheetName(sheetName) {
    this.sheetName = sheetName;
    // Clear cache when changing data source
    this.cachedData = null;
    this.lastCacheTime = null;
  }

  /**
   * Clear cached data with optimization service integration
   */
  clearCache() {
    try {
      // Clear from caching service
      const cacheKey = this.cachingService.createContractDataKey(
        this.spreadsheetId || 'active',
        this.sheetName
      );
      
      this.cachingService.delete(cacheKey, { prefix: 'contractData' });
      
      // Clear legacy cache
      this.cachedData = null;
      this.lastCacheTime = null;
      
      console.log('DataService: Cache cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Fallback to legacy cache clearing
      this.cachedData = null;
      this.lastCacheTime = null;
    }
  }

  /**
   * Get comprehensive performance metrics including optimization status
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const optimizationStatus = this.optimizationManager.getOptimizationStatus();
    
    const avgLoadTime = this.performanceMetrics.loadTimes.length > 0
      ? this.performanceMetrics.loadTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.loadTimes.length
      : 0;
    
    return {
      dataService: {
        ...this.performanceMetrics,
        averageLoadTime: Math.round(avgLoadTime),
        cacheHitRate: this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses > 0
          ? ((this.performanceMetrics.cacheHits / (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses)) * 100).toFixed(2) + '%'
          : '0%'
      },
      optimization: optimizationStatus,
      recommendations: optimizationStatus.performance.recentRecommendations
    };
  }

  /**
   * Get optimization health status
   * @returns {Object} Health status
   */
  getOptimizationHealth() {
    return this.optimizationManager.healthCheck();
  }

  /**
   * Optimize data loading for large datasets
   * @param {Object} options - Optimization options
   * @returns {Promise<ContractData[]>} Optimized data loading result
   */
  async optimizedLoadContractData(options = {}) {
    const config = {
      enableBatching: true,
      batchSize: options.batchSize || null, // Auto-calculate if not provided
      enableCaching: true,
      enableRetry: true,
      timeout: options.timeout || 300000, // 5 minutes default
      ...options
    };
    
    try {
      return await this.gasOptimization.optimizedDataLoad(
        async () => {
          if (config.enableCaching) {
            return await this.loadContractData();
          } else {
            return await this.loadAndProcessData();
          }
        },
        {
          timeout: config.timeout
        }
      );
      
    } catch (error) {
      console.error('Optimized data loading failed:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive data quality report
   * @param {any[][]} rawData - Raw data to analyze
   * @param {ContractData[]} processedData - Processed contract data
   * @returns {DataQualityReport} Comprehensive data quality report
   */
  getDataQualityReport(rawData, processedData = []) {
    try {
      // First validate the raw data
      const validation = this.validateDataIntegrity(rawData);
      
      // Generate comprehensive report using ErrorLogger
      const report = errorLogger.generateDataQualityReport(rawData, validation, processedData);
      
      // Add additional DataService-specific metrics
      report.dataServiceMetrics = {
        cacheStatus: this.cachedData ? 'cached' : 'not_cached',
        lastCacheTime: this.lastCacheTime,
        spreadsheetId: this.spreadsheetId,
        sheetName: this.sheetName,
        transformationSuccess: processedData.length,
        transformationFailures: Math.max(0, (rawData.length - 1) - processedData.length)
      };

      // Add processing statistics
      report.processingStats = {
        rawDataRows: rawData.length - 1, // Exclude header
        processedRows: processedData.length,
        successRate: rawData.length > 1 ? (processedData.length / (rawData.length - 1)) * 100 : 0,
        averageFieldsPerRow: rawData.length > 0 ? rawData[0].length : 0
      };

      // Add validation summary by severity
      const errorsByField = {};
      const warningsByField = {};
      
      if (validation.fieldErrors) {
        validation.fieldErrors.forEach(fieldError => {
          if (fieldError.severity === 'error') {
            errorsByField[fieldError.field] = (errorsByField[fieldError.field] || 0) + 1;
          } else if (fieldError.severity === 'warning') {
            warningsByField[fieldError.field] = (warningsByField[fieldError.field] || 0) + 1;
          }
        });
      }

      report.fieldAnalysis = {
        fieldsWithErrors: Object.keys(errorsByField),
        fieldsWithWarnings: Object.keys(warningsByField),
        errorsByField: errorsByField,
        warningsByField: warningsByField
      };

      // Add recommendations based on analysis
      report.recommendations = this.generateDataQualityRecommendations(report);

      return report;
    } catch (error) {
      errorLogger.logSystemError(
        'DataService',
        `Error generating data quality report: ${error.message}`,
        error
      );
      
      // Return minimal report on error
      return {
        validation: { isValid: false, errors: [error.message], warnings: [], processedRows: 0, validRows: 0 },
        completeness: { totalFields: 0, populatedFields: 0, completenessScore: 0, missingFields: [] },
        consistency: { inconsistencies: [] },
        accuracy: { outliers: [], formatErrors: [] },
        generatedAt: new Date(),
        reportId: 'ERROR_REPORT',
        error: error.message
      };
    }
  }

  /**
   * Generate data quality recommendations based on report analysis
   * @param {DataQualityReport} report - Data quality report
   * @returns {string[]} Array of recommendations
   */
  generateDataQualityRecommendations(report) {
    const recommendations = [];

    // Completeness recommendations
    if (report.completeness.completenessScore < 80) {
      recommendations.push('Data completeness is below 80%. Consider reviewing data collection processes.');
    }

    if (report.completeness.missingFields.length > 0) {
      const topMissingFields = Object.entries(
        report.completeness.missingFields.reduce((acc, field) => {
          acc[field.field] = (acc[field.field] || 0) + 1;
          return acc;
        }, {})
      )
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([field]) => field);

      recommendations.push(`Focus on improving data collection for: ${topMissingFields.join(', ')}`);
    }

    // Validation recommendations
    if (report.validation.errors.length > 0) {
      recommendations.push(`Address ${report.validation.errors.length} critical data errors before proceeding.`);
    }

    if (report.validation.warnings.length > 10) {
      recommendations.push('High number of data warnings detected. Consider data quality training for data entry personnel.');
    }

    // Consistency recommendations
    if (report.consistency.inconsistencies.length > 0) {
      const errorInconsistencies = report.consistency.inconsistencies.filter(i => i.severity === 'error');
      if (errorInconsistencies.length > 0) {
        recommendations.push(`Fix ${errorInconsistencies.length} data consistency errors to improve data reliability.`);
      }
    }

    // Accuracy recommendations
    if (report.accuracy.formatErrors.length > 0) {
      recommendations.push('Implement data format validation at the point of entry to reduce format errors.');
    }

    if (report.accuracy.outliers.length > 0) {
      recommendations.push('Review statistical outliers to ensure they represent valid data points.');
    }

    // Processing recommendations
    if (report.processingStats && report.processingStats.successRate < 90) {
      recommendations.push('Low data processing success rate. Review data transformation logic and error handling.');
    }

    return recommendations;
  }
}