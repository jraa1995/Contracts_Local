/**
 * PersonnelManager - Handles personnel data and workload analysis
 * Provides methods for managing personnel assignments and organizational structure
 */

/**
 * PersonnelManager class for personnel data management
 */
class PersonnelManager {
  constructor() {
    this.personnelCache = new Map();
    this.workloadThresholds = {
      overloaded: 10, // More than 10 contracts
      underutilized: 2 // Less than 2 contracts
    };
  }

  /**
   * Get personnel assignments from contracts
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {PersonnelAssignment[]} Array of personnel assignments
   */
  getPersonnelAssignments(contracts) {
    if (!contracts || !Array.isArray(contracts)) {
      return [];
    }

    const personnelMap = new Map();

    // Process each contract to extract personnel assignments
    contracts.forEach(contract => {
      if (!contract) return;

      // Extract all personnel roles from the contract
      const roles = ['projectManager', 'contractingOfficer', 'contractSpecialist', 'programManager'];
      
      roles.forEach(role => {
        const person = contract[role];
        if (person && person.name && person.email) {
          const key = `${person.name}|${person.email}`;
          
          if (!personnelMap.has(key)) {
            personnelMap.set(key, {
              person: {
                name: person.name,
                email: person.email,
                role: person.role || role,
                organization: person.organization || contract.clientBureau || 'Unknown'
              },
              contractIds: [],
              totalContractValue: 0,
              workloadScore: 0
            });
          }

          const assignment = personnelMap.get(key);
          assignment.contractIds.push(contract.award || contract.project || 'Unknown');
          assignment.totalContractValue += (contract.awardValue || 0);
        }
      });
    });

    // Calculate workload scores and convert to array
    const assignments = Array.from(personnelMap.values()).map(assignment => {
      assignment.workloadScore = this._calculateWorkloadScore(assignment);
      return assignment;
    });

    // Sort by workload score (highest first)
    return assignments.sort((a, b) => b.workloadScore - a.workloadScore);
  }

  /**
   * Calculate workload distribution across personnel
   * @param {ContractData[]} contracts - Array of contract data (optional, uses cached if not provided)
   * @returns {WorkloadAnalysis} Workload analysis results
   */
  calculateWorkloadDistribution(contracts = null) {
    const assignments = contracts ? this.getPersonnelAssignments(contracts) : [];
    
    if (assignments.length === 0) {
      return {
        assignments: [],
        averageWorkload: 0,
        overloadedPersonnel: [],
        underutilizedPersonnel: []
      };
    }

    // Calculate average workload
    const totalWorkload = assignments.reduce((sum, assignment) => sum + assignment.workloadScore, 0);
    const averageWorkload = totalWorkload / assignments.length;

    // Identify overloaded and underutilized personnel
    const overloadedPersonnel = assignments.filter(assignment => 
      assignment.contractIds.length > this.workloadThresholds.overloaded
    );

    const underutilizedPersonnel = assignments.filter(assignment => 
      assignment.contractIds.length < this.workloadThresholds.underutilized
    );

    return {
      assignments,
      averageWorkload,
      overloadedPersonnel,
      underutilizedPersonnel
    };
  }

  /**
   * Validate contact information for personnel
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {ValidationResult[]} Array of validation results
   */
  validateContactInformation(contracts = []) {
    const validationResults = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/; // Basic international phone format

    if (!contracts || !Array.isArray(contracts)) {
      return [{
        isValid: false,
        errors: ['Invalid contracts data provided'],
        warnings: [],
        processedRows: 0,
        validRows: 0,
        fieldErrors: [],
        summary: {
          totalFields: 0,
          validFields: 0,
          errorFields: 1,
          warningFields: 0
        },
        validatedAt: new Date()
      }];
    }

    let processedRows = 0;
    let validRows = 0;
    const fieldErrors = [];
    const roles = ['projectManager', 'contractingOfficer', 'contractSpecialist', 'programManager'];

    contracts.forEach((contract, index) => {
      if (!contract) return;
      
      processedRows++;
      let contractValid = true;

      roles.forEach(role => {
        const person = contract[role];
        if (person) {
          // Validate name
          if (!person.name || typeof person.name !== 'string' || person.name.trim().length === 0) {
            fieldErrors.push({
              field: `${role}.name`,
              row: index + 1,
              error: 'Name is required and must be a non-empty string',
              severity: 'error'
            });
            contractValid = false;
          }

          // Validate email
          if (!person.email || !emailRegex.test(person.email)) {
            fieldErrors.push({
              field: `${role}.email`,
              row: index + 1,
              error: 'Valid email address is required',
              severity: 'error'
            });
            contractValid = false;
          }

          // Validate phone (if provided)
          if (person.phone && !phoneRegex.test(person.phone.replace(/[\s\-\(\)]/g, ''))) {
            fieldErrors.push({
              field: `${role}.phone`,
              row: index + 1,
              error: 'Invalid phone number format',
              severity: 'warning'
            });
          }

          // Validate organization
          if (!person.organization || person.organization.trim().length === 0) {
            fieldErrors.push({
              field: `${role}.organization`,
              row: index + 1,
              error: 'Organization information is recommended',
              severity: 'warning'
            });
          }
        }
      });

      if (contractValid) {
        validRows++;
      }
    });

    const totalFields = processedRows * roles.length * 4; // 4 fields per person (name, email, phone, org)
    const errorFields = fieldErrors.filter(e => e.severity === 'error').length;
    const warningFields = fieldErrors.filter(e => e.severity === 'warning').length;
    const validFields = totalFields - errorFields - warningFields;

    validationResults.push({
      isValid: errorFields === 0,
      errors: fieldErrors.filter(e => e.severity === 'error').map(e => e.error),
      warnings: fieldErrors.filter(e => e.severity === 'warning').map(e => e.error),
      processedRows,
      validRows,
      fieldErrors,
      summary: {
        totalFields,
        validFields,
        errorFields,
        warningFields
      },
      validatedAt: new Date()
    });

    return validationResults;
  }

  /**
   * Generate organizational hierarchy from personnel data
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {Object} Organizational structure
   */
  generateOrganizationalHierarchy(contracts = []) {
    if (!contracts || !Array.isArray(contracts)) {
      return {};
    }

    const hierarchy = {};
    const assignments = this.getPersonnelAssignments(contracts);

    // Group personnel by organization
    assignments.forEach(assignment => {
      const org = assignment.person.organization || 'Unknown';
      
      if (!hierarchy[org]) {
        hierarchy[org] = {
          name: org,
          personnel: [],
          totalContracts: 0,
          totalValue: 0,
          roles: {}
        };
      }

      hierarchy[org].personnel.push(assignment.person);
      hierarchy[org].totalContracts += assignment.contractIds.length;
      hierarchy[org].totalValue += assignment.totalContractValue;

      // Track roles within organization
      const role = assignment.person.role || 'Unknown';
      if (!hierarchy[org].roles[role]) {
        hierarchy[org].roles[role] = {
          count: 0,
          personnel: []
        };
      }
      hierarchy[org].roles[role].count++;
      hierarchy[org].roles[role].personnel.push(assignment.person.name);
    });

    return hierarchy;
  }

  /**
   * Get personnel workload analysis for specific person
   * @param {string} personName - Name of the person
   * @param {string} personEmail - Email of the person
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {Object} Individual workload analysis
   */
  getPersonnelWorkload(personName, personEmail, contracts = []) {
    const assignments = this.getPersonnelAssignments(contracts);
    const person = assignments.find(a => 
      a.person.name === personName && a.person.email === personEmail
    );

    if (!person) {
      return {
        found: false,
        person: null,
        workload: null
      };
    }

    return {
      found: true,
      person: person.person,
      workload: {
        contractCount: person.contractIds.length,
        totalValue: person.totalContractValue,
        workloadScore: person.workloadScore,
        contracts: person.contractIds,
        averageContractValue: person.contractIds.length > 0 ? 
          person.totalContractValue / person.contractIds.length : 0
      }
    };
  }

  /**
   * Filter contracts by personnel assignment
   * @param {ContractData[]} contracts - Array of contract data
   * @param {string} personName - Name of the person to filter by
   * @param {string} personEmail - Email of the person to filter by
   * @returns {ContractData[]} Filtered contracts assigned to the person
   */
  filterContractsByPersonnel(contracts, personName, personEmail) {
    if (!contracts || !Array.isArray(contracts) || !personName || !personEmail) {
      return [];
    }

    return contracts.filter(contract => {
      if (!contract) return false;

      const roles = ['projectManager', 'contractingOfficer', 'contractSpecialist', 'programManager'];
      
      return roles.some(role => {
        const person = contract[role];
        return person && 
               person.name === personName && 
               person.email === personEmail;
      });
    });
  }

  /**
   * Calculate workload score for a personnel assignment
   * @private
   * @param {PersonnelAssignment} assignment - Personnel assignment data
   * @returns {number} Calculated workload score
   */
  _calculateWorkloadScore(assignment) {
    const contractCount = assignment.contractIds.length;
    const totalValue = assignment.totalContractValue;
    
    // Base score from contract count (weighted heavily)
    let score = contractCount * 10;
    
    // Add value-based component (normalized to millions)
    const valueComponent = totalValue / 1000000;
    score += valueComponent * 5;
    
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Set workload thresholds for analysis
   * @param {number} overloadedThreshold - Threshold for overloaded personnel
   * @param {number} underutilizedThreshold - Threshold for underutilized personnel
   */
  setWorkloadThresholds(overloadedThreshold, underutilizedThreshold) {
    if (typeof overloadedThreshold === 'number' && overloadedThreshold > 0) {
      this.workloadThresholds.overloaded = overloadedThreshold;
    }
    if (typeof underutilizedThreshold === 'number' && underutilizedThreshold >= 0) {
      this.workloadThresholds.underutilized = underutilizedThreshold;
    }
  }

  /**
   * Get personnel statistics summary
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {Object} Personnel statistics summary
   */
  getPersonnelStatistics(contracts = []) {
    const assignments = this.getPersonnelAssignments(contracts);
    const workloadAnalysis = this.calculateWorkloadDistribution(contracts);
    
    if (assignments.length === 0) {
      return {
        totalPersonnel: 0,
        totalContracts: 0,
        totalValue: 0,
        averageContractsPerPerson: 0,
        averageValuePerPerson: 0,
        overloadedCount: 0,
        underutilizedCount: 0
      };
    }

    const totalContracts = assignments.reduce((sum, a) => sum + a.contractIds.length, 0);
    const totalValue = assignments.reduce((sum, a) => sum + a.totalContractValue, 0);

    return {
      totalPersonnel: assignments.length,
      totalContracts,
      totalValue,
      averageContractsPerPerson: totalContracts / assignments.length,
      averageValuePerPerson: totalValue / assignments.length,
      overloadedCount: workloadAnalysis.overloadedPersonnel.length,
      underutilizedCount: workloadAnalysis.underutilizedPersonnel.length
    };
  }
}