/**
 * Core data models and interfaces for the Contract Management Dashboard
 * These are TypeScript-style interfaces implemented as JSDoc comments for Google Apps Script
 */

/**
 * @typedef {Object} PersonnelInfo
 * @property {string} name - Full name of the personnel
 * @property {string} email - Email address
 * @property {string} role - Role/position title
 * @property {string} organization - Organization or department
 * @property {string} [phone] - Optional phone number
 */

/**
 * @typedef {Object} ContractData
 * @property {string} award - Award number/identifier
 * @property {string} project - Project identifier
 * @property {string} solicitation - Solicitation number
 * @property {string} acquisition - Acquisition identifier
 * @property {number} ceiling - Contract ceiling value
 * @property {number} awardValue - Award value amount
 * @property {number} remainingBudget - Remaining budget amount
 * @property {PersonnelInfo} projectManager - Project manager information
 * @property {PersonnelInfo} contractingOfficer - Contracting officer information
 * @property {PersonnelInfo} contractSpecialist - Contract specialist information
 * @property {PersonnelInfo} programManager - Program manager information
 * @property {Date} awardDate - Contract award date
 * @property {Date} projectStart - Project start date
 * @property {Date} projectEnd - Project end date
 * @property {Date} [completionDate] - Actual completion date (optional)
 * @property {string} clientBureau - Client bureau/organization
 * @property {string} orgCode - Organization code
 * @property {string} sector - Business sector
 * @property {string} contractType - Type of contract
 * @property {string} status - Contract status
 * @property {string} competitionType - Competition type
 * @property {string} commerciality - Commerciality classification
 * @property {string[]} flags - Array of contract flags
 * @property {string} securityLevel - Security classification level
 * @property {Date} lastModified - Last modification timestamp
 * @property {string} modificationStatus - Modification status
 */

/**
 * @typedef {Object} FilterCriteria
 * @property {string} [searchText] - Text search term
 * @property {Object} [dateRange] - Date range filter
 * @property {Date} dateRange.startDate - Start date of range
 * @property {Date} dateRange.endDate - End date of range
 * @property {'awardDate'|'projectStart'|'projectEnd'} dateRange.field - Date field to filter on
 * @property {string[]} [status] - Array of contract statuses to filter by
 * @property {string[]} [organizations] - Array of organizations to filter by
 * @property {string[]} [contractTypes] - Array of contract types to filter by
 * @property {string[]} [personnel] - Array of personnel names to filter by
 * @property {Object} [financialRange] - Financial range filter
 * @property {number} financialRange.min - Minimum value
 * @property {number} financialRange.max - Maximum value
 * @property {'ceiling'|'awardValue'} financialRange.field - Financial field to filter on
 */

/**
 * @typedef {Object} FinancialSummary
 * @property {number} totalContractValue - Total value of all contracts
 * @property {number} totalCeilingValue - Total ceiling value
 * @property {number} activeContractsValue - Value of active contracts
 * @property {number} completedContractsValue - Value of completed contracts
 * @property {number} averageContractValue - Average contract value
 * @property {number} budgetUtilization - Budget utilization percentage
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - Whether validation passed
 * @property {string[]} errors - Array of error messages
 * @property {string[]} warnings - Array of warning messages
 * @property {number} processedRows - Number of rows processed
 * @property {number} validRows - Number of valid rows
 * @property {Object[]} fieldErrors - Array of field-specific errors
 * @property {string} fieldErrors[].field - Field name with error
 * @property {number} fieldErrors[].row - Row number (1-based)
 * @property {string} fieldErrors[].error - Error message
 * @property {string} fieldErrors[].severity - Error severity (error, warning, info)
 * @property {Object} summary - Summary statistics
 * @property {number} summary.totalFields - Total fields processed
 * @property {number} summary.validFields - Valid fields count
 * @property {number} summary.errorFields - Fields with errors
 * @property {number} summary.warningFields - Fields with warnings
 * @property {Date} validatedAt - Timestamp of validation
 */

/**
 * @typedef {Object} DataQualityReport
 * @property {ValidationResult} validation - Validation results
 * @property {Object} completeness - Data completeness analysis
 * @property {number} completeness.totalFields - Total expected fields
 * @property {number} completeness.populatedFields - Fields with data
 * @property {number} completeness.completenessScore - Completeness percentage (0-100)
 * @property {Object[]} completeness.missingFields - Fields with missing data
 * @property {Object} consistency - Data consistency analysis
 * @property {Object[]} consistency.inconsistencies - Detected inconsistencies
 * @property {Object} accuracy - Data accuracy metrics
 * @property {Object[]} accuracy.outliers - Detected outliers
 * @property {Object[]} accuracy.formatErrors - Format validation errors
 * @property {Date} generatedAt - Report generation timestamp
 * @property {string} reportId - Unique report identifier
 */

/**
 * @typedef {Object} ErrorLogEntry
 * @property {string} id - Unique error ID
 * @property {Date} timestamp - When error occurred
 * @property {string} level - Error level (ERROR, WARN, INFO)
 * @property {string} source - Source component/function
 * @property {string} message - Error message
 * @property {Object} context - Additional context data
 * @property {number} [context.row] - Row number if applicable
 * @property {string} [context.field] - Field name if applicable
 * @property {any} [context.value] - Value that caused error
 * @property {Error} [originalError] - Original error object if available
 * @property {string} [stackTrace] - Stack trace if available
 */

/**
 * @typedef {Object} PersonnelAssignment
 * @property {PersonnelInfo} person - Personnel information
 * @property {string[]} contractIds - Array of assigned contract IDs
 * @property {number} totalContractValue - Total value of assigned contracts
 * @property {number} workloadScore - Calculated workload score
 */

/**
 * @typedef {Object} WorkloadAnalysis
 * @property {PersonnelAssignment[]} assignments - Array of personnel assignments
 * @property {number} averageWorkload - Average workload across all personnel
 * @property {PersonnelAssignment[]} overloadedPersonnel - Personnel with high workload
 * @property {PersonnelAssignment[]} underutilizedPersonnel - Personnel with low workload
 */

/**
 * @typedef {Object} BudgetAnalysis
 * @property {number} totalBudget - Total budget amount
 * @property {number} allocatedBudget - Currently allocated budget
 * @property {number} remainingBudget - Remaining available budget
 * @property {number} utilizationRate - Budget utilization rate (0-1)
 * @property {Object[]} organizationBreakdown - Budget breakdown by organization
 * @property {Object[]} sectorBreakdown - Budget breakdown by sector
 */

/**
 * @typedef {Object} RiskAssessment
 * @property {string} contractId - Contract identifier
 * @property {string} riskType - Type of risk identified
 * @property {string} severity - Risk severity level
 * @property {string} description - Risk description
 * @property {Date} identifiedDate - When risk was identified
 * @property {string[]} recommendedActions - Recommended mitigation actions
 */

/**
 * @typedef {Object} TrendData
 * @property {string} period - Time period (month, quarter, year)
 * @property {Object[]} dataPoints - Array of trend data points
 * @property {Date} dataPoints[].date - Date of data point
 * @property {number} dataPoints[].value - Value at that date
 * @property {string} dataPoints[].category - Category or grouping
 */

/**
 * Contract status enumeration
 * @readonly
 * @enum {string}
 */
const ContractStatus = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
  ON_HOLD: 'On Hold'
};

/**
 * Security level enumeration
 * @readonly
 * @enum {string}
 */
const SecurityLevel = {
  PUBLIC: 'Public',
  INTERNAL: 'Internal',
  CONFIDENTIAL: 'Confidential',
  RESTRICTED: 'Restricted'
};

/**
 * Contract type enumeration
 * @readonly
 * @enum {string}
 */
const ContractType = {
  FIXED_PRICE: 'Fixed Price',
  COST_PLUS: 'Cost Plus',
  TIME_AND_MATERIALS: 'Time and Materials',
  INDEFINITE_DELIVERY: 'Indefinite Delivery'
};