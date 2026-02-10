/**
 * FinancialAnalyzer - Handles financial calculations and analysis
 * Provides methods for budget analysis, spending trends, and risk assessment
 */

/**
 * FinancialAnalyzer class for financial data analysis
 */
class FinancialAnalyzer {
  constructor() {
    // Default risk threshold for ceiling value warnings (90%)
    this.ceilingRiskThreshold = 0.9;
    // Default overrun threshold for budget warnings (95%)
    this.overrunThreshold = 0.95;
  }

  /**
   * Calculate total financial values from contracts
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {FinancialSummary} Financial summary
   */
  calculateTotalValues(contracts) {
    if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
      return {
        totalContractValue: 0,
        totalCeilingValue: 0,
        activeContractsValue: 0,
        completedContractsValue: 0,
        averageContractValue: 0,
        budgetUtilization: 0
      };
    }

    let totalContractValue = 0;
    let totalCeilingValue = 0;
    let activeContractsValue = 0;
    let completedContractsValue = 0;

    for (const contract of contracts) {
      const awardValue = this._parseFinancialValue(contract.awardValue);
      const ceilingValue = this._parseFinancialValue(contract.ceiling);
      
      totalContractValue += awardValue;
      totalCeilingValue += ceilingValue;

      // Categorize by status
      if (contract.status === 'Active' || contract.status === 'ACTIVE') {
        activeContractsValue += awardValue;
      } else if (contract.status === 'Completed' || contract.status === 'COMPLETED') {
        completedContractsValue += awardValue;
      }
    }

    const averageContractValue = contracts.length > 0 ? totalContractValue / contracts.length : 0;
    const budgetUtilization = totalCeilingValue > 0 ? (totalContractValue / totalCeilingValue) * 100 : 0;

    return {
      totalContractValue,
      totalCeilingValue,
      activeContractsValue,
      completedContractsValue,
      averageContractValue,
      budgetUtilization
    };
  }

  /**
   * Analyze budget utilization with organizational and sector breakdowns
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {BudgetAnalysis} Budget analysis results
   */
  analyzeBudgetUtilization(contracts) {
    if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
      return {
        totalBudget: 0,
        allocatedBudget: 0,
        remainingBudget: 0,
        utilizationRate: 0,
        organizationBreakdown: [],
        sectorBreakdown: []
      };
    }

    let totalBudget = 0;
    let allocatedBudget = 0;
    const organizationMap = new Map();
    const sectorMap = new Map();

    for (const contract of contracts) {
      const ceilingValue = this._parseFinancialValue(contract.ceiling);
      const awardValue = this._parseFinancialValue(contract.awardValue);
      const remainingBudget = this._parseFinancialValue(contract.remainingBudget);

      totalBudget += ceilingValue;
      allocatedBudget += awardValue;

      // Organization breakdown
      const org = contract.clientBureau || contract.orgCode || 'Unknown';
      if (!organizationMap.has(org)) {
        organizationMap.set(org, { 
          name: org, 
          totalBudget: 0, 
          allocatedBudget: 0, 
          remainingBudget: 0,
          contractCount: 0
        });
      }
      const orgData = organizationMap.get(org);
      orgData.totalBudget += ceilingValue;
      orgData.allocatedBudget += awardValue;
      orgData.remainingBudget += remainingBudget;
      orgData.contractCount += 1;

      // Sector breakdown
      const sector = contract.sector || 'Unknown';
      if (!sectorMap.has(sector)) {
        sectorMap.set(sector, { 
          name: sector, 
          totalBudget: 0, 
          allocatedBudget: 0, 
          remainingBudget: 0,
          contractCount: 0
        });
      }
      const sectorData = sectorMap.get(sector);
      sectorData.totalBudget += ceilingValue;
      sectorData.allocatedBudget += awardValue;
      sectorData.remainingBudget += remainingBudget;
      sectorData.contractCount += 1;
    }

    const remainingBudget = totalBudget - allocatedBudget;
    const utilizationRate = totalBudget > 0 ? allocatedBudget / totalBudget : 0;

    return {
      totalBudget,
      allocatedBudget,
      remainingBudget,
      utilizationRate,
      organizationBreakdown: Array.from(organizationMap.values()),
      sectorBreakdown: Array.from(sectorMap.values())
    };
  }

  /**
   * Handle multi-year contracts with time-based budget allocations
   * @param {ContractData[]} contracts - Array of contract data
   * @param {number} fiscalYear - Target fiscal year for analysis
   * @returns {Object} Multi-year analysis results
   */
  analyzeMultiYearContracts(contracts, fiscalYear) {
    if (!contracts || !Array.isArray(contracts)) {
      return {
        fiscalYear,
        totalMultiYearValue: 0,
        currentYearAllocation: 0,
        futureYearAllocations: 0,
        contractsByYear: [],
        budgetDistribution: []
      };
    }

    const multiYearContracts = contracts.filter(contract => 
      this._isMultiYearContract(contract)
    );

    let totalMultiYearValue = 0;
    let currentYearAllocation = 0;
    let futureYearAllocations = 0;
    const contractsByYear = [];
    const budgetDistribution = [];

    for (const contract of multiYearContracts) {
      const contractValue = this._parseFinancialValue(contract.awardValue);
      const yearlyAllocation = this._calculateYearlyAllocation(contract, fiscalYear);
      
      totalMultiYearValue += contractValue;
      
      if (yearlyAllocation.fiscalYear === fiscalYear) {
        currentYearAllocation += yearlyAllocation.allocation;
      } else if (yearlyAllocation.fiscalYear > fiscalYear) {
        futureYearAllocations += yearlyAllocation.allocation;
      }

      contractsByYear.push({
        contractId: contract.award,
        projectTitle: contract.project,
        totalValue: contractValue,
        yearlyAllocations: this._getAllYearlyAllocations(contract)
      });

      budgetDistribution.push(yearlyAllocation);
    }

    return {
      fiscalYear,
      totalMultiYearValue,
      currentYearAllocation,
      futureYearAllocations,
      contractsByYear,
      budgetDistribution
    };
  }

  /**
   * Identify financial risks and threshold detection
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {RiskAssessment[]} Array of risk assessments
   */
  identifyFinancialRisks(contracts) {
    if (!contracts || !Array.isArray(contracts)) {
      return [];
    }

    const risks = [];

    for (const contract of contracts) {
      const awardValue = this._parseFinancialValue(contract.awardValue);
      const ceilingValue = this._parseFinancialValue(contract.ceiling);
      const remainingBudget = this._parseFinancialValue(contract.remainingBudget);

      // Check for ceiling value risks
      if (ceilingValue > 0) {
        const utilizationRate = awardValue / ceilingValue;
        
        if (utilizationRate >= this.overrunThreshold) {
          risks.push({
            contractId: contract.award,
            riskType: 'CEILING_OVERRUN',
            severity: 'HIGH',
            description: `Contract is at ${(utilizationRate * 100).toFixed(1)}% of ceiling value ($${awardValue.toLocaleString()} of $${ceilingValue.toLocaleString()})`,
            identifiedDate: new Date(),
            recommendedActions: [
              'Review contract modifications',
              'Assess remaining work scope',
              'Consider ceiling increase if justified',
              'Monitor spending closely'
            ],
            metrics: {
              utilizationRate,
              awardValue,
              ceilingValue,
              remainingCeiling: ceilingValue - awardValue
            }
          });
        } else if (utilizationRate >= this.ceilingRiskThreshold) {
          risks.push({
            contractId: contract.award,
            riskType: 'CEILING_WARNING',
            severity: 'MEDIUM',
            description: `Contract approaching ceiling limit at ${(utilizationRate * 100).toFixed(1)}% utilization`,
            identifiedDate: new Date(),
            recommendedActions: [
              'Monitor spending trends',
              'Review upcoming deliverables',
              'Plan for potential modifications'
            ],
            metrics: {
              utilizationRate,
              awardValue,
              ceilingValue,
              remainingCeiling: ceilingValue - awardValue
            }
          });
        }
      }

      // Check for budget depletion risks
      if (remainingBudget <= 0 && contract.status === 'Active') {
        risks.push({
          contractId: contract.award,
          riskType: 'BUDGET_DEPLETED',
          severity: 'HIGH',
          description: 'Contract has no remaining budget but is still active',
          identifiedDate: new Date(),
          recommendedActions: [
            'Verify contract status',
            'Review final deliverables',
            'Process contract closure if complete'
          ],
          metrics: {
            remainingBudget,
            awardValue,
            ceilingValue
          }
        });
      }

      // Check for timeline vs budget risks
      const timelineRisk = this._assessTimelineBudgetRisk(contract);
      if (timelineRisk) {
        risks.push(timelineRisk);
      }

      // Check for unusual financial patterns
      const patternRisk = this._assessFinancialPatterns(contract);
      if (patternRisk) {
        risks.push(patternRisk);
      }
    }

    return risks.sort((a, b) => {
      const severityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Generate spending analysis by organization, sector, and time period
   * @param {ContractData[]} contracts - Array of contract data
   * @param {string} groupBy - Grouping criteria ('organization', 'sector', 'time')
   * @param {string} timePeriod - Time period for analysis ('month', 'quarter', 'year')
   * @returns {Object} Spending analysis results
   */
  generateSpendingAnalysis(contracts, groupBy = 'organization', timePeriod = 'year') {
    if (!contracts || !Array.isArray(contracts)) {
      return {
        groupBy,
        timePeriod,
        totalSpending: 0,
        groupedData: [],
        trends: []
      };
    }

    let totalSpending = 0;
    const groupedData = new Map();
    const timeSeriesData = new Map();

    for (const contract of contracts) {
      const awardValue = this._parseFinancialValue(contract.awardValue);
      totalSpending += awardValue;

      // Group by specified criteria
      let groupKey;
      switch (groupBy) {
        case 'organization':
          groupKey = contract.clientBureau || contract.orgCode || 'Unknown';
          break;
        case 'sector':
          groupKey = contract.sector || 'Unknown';
          break;
        case 'contractType':
          groupKey = contract.contractType || 'Unknown';
          break;
        default:
          groupKey = 'All';
      }

      if (!groupedData.has(groupKey)) {
        groupedData.set(groupKey, {
          name: groupKey,
          totalSpending: 0,
          contractCount: 0,
          averageContractValue: 0,
          contracts: []
        });
      }

      const groupData = groupedData.get(groupKey);
      groupData.totalSpending += awardValue;
      groupData.contractCount += 1;
      groupData.contracts.push(contract.award);

      // Time series analysis
      if (contract.awardDate) {
        const timeKey = this._getTimePeriodKey(contract.awardDate, timePeriod);
        if (!timeSeriesData.has(timeKey)) {
          timeSeriesData.set(timeKey, {
            period: timeKey,
            totalSpending: 0,
            contractCount: 0
          });
        }
        const timeData = timeSeriesData.get(timeKey);
        timeData.totalSpending += awardValue;
        timeData.contractCount += 1;
      }
    }

    // Calculate averages
    for (const [key, data] of groupedData) {
      data.averageContractValue = data.contractCount > 0 ? data.totalSpending / data.contractCount : 0;
    }

    return {
      groupBy,
      timePeriod,
      totalSpending,
      groupedData: Array.from(groupedData.values()).sort((a, b) => b.totalSpending - a.totalSpending),
      trends: Array.from(timeSeriesData.values()).sort((a, b) => a.period.localeCompare(b.period))
    };
  }

  /**
   * Generate spending trends over time
   * @param {ContractData[]} contracts - Array of contract data
   * @param {string} period - Time period for trends ('month', 'quarter', 'year')
   * @returns {TrendData} Trend analysis data
   */
  generateSpendingTrends(contracts, period = 'year') {
    if (!contracts || !Array.isArray(contracts)) {
      return {
        period: period,
        dataPoints: []
      };
    }

    const timeSeriesMap = new Map();

    for (const contract of contracts) {
      if (!contract.awardDate) continue;

      const awardValue = this._parseFinancialValue(contract.awardValue);
      const timeKey = this._getTimePeriodKey(contract.awardDate, period);

      if (!timeSeriesMap.has(timeKey)) {
        timeSeriesMap.set(timeKey, {
          date: this._getDateFromTimeKey(timeKey, period),
          value: 0,
          category: 'Total Spending',
          contractCount: 0,
          averageValue: 0
        });
      }

      const timeData = timeSeriesMap.get(timeKey);
      timeData.value += awardValue;
      timeData.contractCount += 1;
      timeData.averageValue = timeData.value / timeData.contractCount;
    }

    const dataPoints = Array.from(timeSeriesMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return {
      period: period,
      dataPoints: dataPoints
    };
  }

  // Private helper methods

  /**
   * Parse financial value from various formats
   * @private
   */
  _parseFinancialValue(value) {
    if (typeof value === 'number') {
      return Math.max(0, value);
    }
    
    if (typeof value === 'string') {
      // Remove currency symbols, commas, and whitespace
      const cleaned = value.replace(/[$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    }
    
    return 0;
  }

  /**
   * Check if contract spans multiple years
   * @private
   */
  _isMultiYearContract(contract) {
    if (!contract.projectStart || !contract.projectEnd) {
      return false;
    }

    const startYear = new Date(contract.projectStart).getFullYear();
    const endYear = new Date(contract.projectEnd).getFullYear();
    
    return endYear > startYear;
  }

  /**
   * Calculate yearly budget allocation for a contract
   * @private
   */
  _calculateYearlyAllocation(contract, fiscalYear) {
    const totalValue = this._parseFinancialValue(contract.awardValue);
    const startDate = new Date(contract.projectStart);
    const endDate = new Date(contract.projectEnd);
    
    if (!startDate || !endDate) {
      return {
        fiscalYear,
        allocation: totalValue,
        percentage: 100
      };
    }

    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24);
    const fiscalYearStart = new Date(fiscalYear - 1, 9, 1); // Oct 1
    const fiscalYearEnd = new Date(fiscalYear, 8, 30); // Sep 30

    const overlapStart = new Date(Math.max(startDate, fiscalYearStart));
    const overlapEnd = new Date(Math.min(endDate, fiscalYearEnd));

    if (overlapStart > overlapEnd) {
      return {
        fiscalYear,
        allocation: 0,
        percentage: 0
      };
    }

    const overlapDays = (overlapEnd - overlapStart) / (1000 * 60 * 60 * 24);
    const percentage = totalDays > 0 ? (overlapDays / totalDays) * 100 : 0;
    const allocation = (percentage / 100) * totalValue;

    return {
      fiscalYear,
      allocation,
      percentage
    };
  }

  /**
   * Get all yearly allocations for a contract
   * @private
   */
  _getAllYearlyAllocations(contract) {
    if (!contract.projectStart || !contract.projectEnd) {
      return [];
    }

    const startYear = new Date(contract.projectStart).getFullYear();
    const endYear = new Date(contract.projectEnd).getFullYear();
    const allocations = [];

    for (let year = startYear; year <= endYear + 1; year++) {
      const allocation = this._calculateYearlyAllocation(contract, year);
      if (allocation.allocation > 0) {
        allocations.push(allocation);
      }
    }

    return allocations;
  }

  /**
   * Assess timeline vs budget risk
   * @private
   */
  _assessTimelineBudgetRisk(contract) {
    if (!contract.projectEnd || contract.status !== 'Active') {
      return null;
    }

    const now = new Date();
    const endDate = new Date(contract.projectEnd);
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
    
    const awardValue = this._parseFinancialValue(contract.awardValue);
    const remainingBudget = this._parseFinancialValue(contract.remainingBudget);
    const budgetUtilization = awardValue > 0 ? (awardValue - remainingBudget) / awardValue : 0;

    // Risk if timeline is short but budget utilization is low
    if (daysRemaining <= 30 && budgetUtilization < 0.5) {
      return {
        contractId: contract.award,
        riskType: 'TIMELINE_BUDGET_MISMATCH',
        severity: 'MEDIUM',
        description: `Contract ends in ${daysRemaining} days but only ${(budgetUtilization * 100).toFixed(1)}% of budget utilized`,
        identifiedDate: new Date(),
        recommendedActions: [
          'Review project progress',
          'Assess remaining deliverables',
          'Consider timeline extension if needed'
        ],
        metrics: {
          daysRemaining,
          budgetUtilization,
          remainingBudget
        }
      };
    }

    return null;
  }

  /**
   * Assess unusual financial patterns
   * @private
   */
  _assessFinancialPatterns(contract) {
    const awardValue = this._parseFinancialValue(contract.awardValue);
    const ceilingValue = this._parseFinancialValue(contract.ceiling);

    // Risk if award value exceeds ceiling (should not happen)
    if (awardValue > ceilingValue && ceilingValue > 0) {
      return {
        contractId: contract.award,
        riskType: 'AWARD_EXCEEDS_CEILING',
        severity: 'HIGH',
        description: `Award value ($${awardValue.toLocaleString()}) exceeds ceiling value ($${ceilingValue.toLocaleString()})`,
        identifiedDate: new Date(),
        recommendedActions: [
          'Verify data accuracy',
          'Review contract modifications',
          'Correct ceiling value if necessary'
        ],
        metrics: {
          awardValue,
          ceilingValue,
          excess: awardValue - ceilingValue
        }
      };
    }

    return null;
  }

  /**
   * Get time period key for grouping
   * @private
   */
  _getTimePeriodKey(date, period) {
    const d = new Date(date);
    const year = d.getFullYear();
    
    switch (period) {
      case 'month':
        return `${year}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      case 'quarter':
        const quarter = Math.floor(d.getMonth() / 3) + 1;
        return `${year}-Q${quarter}`;
      case 'year':
      default:
        return String(year);
    }
  }

  /**
   * Convert time key back to date
   * @private
   */
  _getDateFromTimeKey(timeKey, period) {
    switch (period) {
      case 'month':
        const [year, month] = timeKey.split('-');
        return new Date(parseInt(year), parseInt(month) - 1, 1);
      case 'quarter':
        const [qYear, quarter] = timeKey.split('-Q');
        const qMonth = (parseInt(quarter) - 1) * 3;
        return new Date(parseInt(qYear), qMonth, 1);
      case 'year':
      default:
        return new Date(parseInt(timeKey), 0, 1);
    }
  }
}