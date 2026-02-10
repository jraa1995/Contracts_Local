/**
 * Timeline_Tracker - Service for tracking contract timelines and deadlines
 * Provides methods for date calculations, milestone tracking, and alert generation
 */

/**
 * Timeline_Tracker class for managing contract timeline operations
 */
class Timeline_Tracker {
  constructor() {
    this.alertThresholds = {
      critical: 7,    // 7 days or less
      warning: 30,    // 30 days or less
      upcoming: 90    // 90 days or less
    };
    
    this.priorityLevels = {
      OVERDUE: 'overdue',
      CRITICAL: 'critical',
      WARNING: 'warning', 
      UPCOMING: 'upcoming',
      NORMAL: 'normal'
    };
  }

  /**
   * Calculate days remaining for active contracts
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {Object[]} Array of contracts with days remaining calculations
   */
  calculateDaysRemaining(contracts) {
    if (!contracts || !Array.isArray(contracts)) {
      return [];
    }

    return contracts.map(contract => {
      const result = {
        ...contract,
        daysRemaining: null,
        isOverdue: false,
        isApproaching: false,
        priority: this.priorityLevels.NORMAL
      };

      // Use project end date as primary deadline, fall back to completion date
      const deadline = contract.projectEnd || contract.completionDate;
      
      if (!deadline || !(deadline instanceof Date) || isNaN(deadline.getTime())) {
        result.daysRemaining = null;
        result.priority = this.priorityLevels.NORMAL;
        return result;
      }

      // Calculate days remaining using DateUtils
      const daysRemaining = DateUtils.daysRemaining(deadline);
      result.daysRemaining = daysRemaining;

      // Determine if overdue
      result.isOverdue = DateUtils.isOverdue(deadline);
      
      // Determine if approaching deadline
      result.isApproaching = DateUtils.isApproaching(deadline, this.alertThresholds.upcoming);

      // Set priority based on days remaining
      result.priority = this.calculatePriority(daysRemaining, result.isOverdue);

      return result;
    });
  }

  /**
   * Calculate priority level based on days remaining
   * @param {number} daysRemaining - Days remaining until deadline
   * @param {boolean} isOverdue - Whether the contract is overdue
   * @returns {string} Priority level
   */
  calculatePriority(daysRemaining, isOverdue) {
    if (isOverdue || daysRemaining < 0) {
      return this.priorityLevels.OVERDUE;
    }
    
    if (daysRemaining <= this.alertThresholds.critical) {
      return this.priorityLevels.CRITICAL;
    }
    
    if (daysRemaining <= this.alertThresholds.warning) {
      return this.priorityLevels.WARNING;
    }
    
    if (daysRemaining <= this.alertThresholds.upcoming) {
      return this.priorityLevels.UPCOMING;
    }
    
    return this.priorityLevels.NORMAL;
  }

  /**
   * Get contracts that are overdue
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {ContractData[]} Array of overdue contracts
   */
  getOverdueContracts(contracts) {
    const contractsWithDays = this.calculateDaysRemaining(contracts);
    return contractsWithDays.filter(contract => contract.isOverdue);
  }

  /**
   * Get contracts approaching deadlines
   * @param {ContractData[]} contracts - Array of contract data
   * @param {number} thresholdDays - Days threshold for "approaching" (default: 30)
   * @returns {ContractData[]} Array of contracts approaching deadlines
   */
  getApproachingDeadlines(contracts, thresholdDays = null) {
    const threshold = thresholdDays || this.alertThresholds.warning;
    const contractsWithDays = this.calculateDaysRemaining(contracts);
    
    return contractsWithDays.filter(contract => {
      return !contract.isOverdue && 
             contract.daysRemaining !== null && 
             contract.daysRemaining >= 0 && 
             contract.daysRemaining <= threshold;
    });
  }

  /**
   * Track milestones and completion status
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {Object[]} Array of contracts with milestone tracking
   */
  trackMilestones(contracts) {
    if (!contracts || !Array.isArray(contracts)) {
      return [];
    }

    return contracts.map(contract => {
      const milestones = this.calculateMilestones(contract);
      
      return {
        ...contract,
        milestones: milestones,
        completionStatus: this.calculateCompletionStatus(contract, milestones),
        timelineHealth: this.assessTimelineHealth(contract, milestones)
      };
    });
  }

  /**
   * Calculate milestones for a contract
   * @param {ContractData} contract - Contract data
   * @returns {Object[]} Array of milestone objects
   */
  calculateMilestones(contract) {
    const milestones = [];
    const today = new Date();

    // Award milestone
    if (contract.awardDate) {
      milestones.push({
        name: 'Contract Award',
        date: contract.awardDate,
        type: 'award',
        status: this.getMilestoneStatus(contract.awardDate, today),
        daysFromToday: DateUtils.daysBetween(today, contract.awardDate)
      });
    }

    // Project start milestone
    if (contract.projectStart) {
      milestones.push({
        name: 'Project Start',
        date: contract.projectStart,
        type: 'start',
        status: this.getMilestoneStatus(contract.projectStart, today),
        daysFromToday: DateUtils.daysBetween(today, contract.projectStart)
      });
    }

    // Project end milestone
    if (contract.projectEnd) {
      milestones.push({
        name: 'Project End',
        date: contract.projectEnd,
        type: 'end',
        status: this.getMilestoneStatus(contract.projectEnd, today),
        daysFromToday: DateUtils.daysBetween(today, contract.projectEnd)
      });
    }

    // Completion milestone (if different from project end)
    if (contract.completionDate && 
        (!contract.projectEnd || contract.completionDate.getTime() !== contract.projectEnd.getTime())) {
      milestones.push({
        name: 'Actual Completion',
        date: contract.completionDate,
        type: 'completion',
        status: this.getMilestoneStatus(contract.completionDate, today),
        daysFromToday: DateUtils.daysBetween(today, contract.completionDate)
      });
    }

    // Sort milestones by date
    return milestones.sort((a, b) => a.date - b.date);
  }

  /**
   * Get milestone status relative to current date
   * @param {Date} milestoneDate - Milestone date
   * @param {Date} currentDate - Current date
   * @returns {string} Milestone status
   */
  getMilestoneStatus(milestoneDate, currentDate) {
    if (!milestoneDate || !(milestoneDate instanceof Date)) {
      return 'unknown';
    }

    const daysDiff = DateUtils.daysBetween(currentDate, milestoneDate);
    
    if (daysDiff < 0) {
      return 'completed'; // Past date
    } else if (daysDiff === 0) {
      return 'today';
    } else if (daysDiff <= 7) {
      return 'this_week';
    } else if (daysDiff <= 30) {
      return 'this_month';
    } else {
      return 'future';
    }
  }

  /**
   * Calculate completion status for a contract
   * @param {ContractData} contract - Contract data
   * @param {Object[]} milestones - Contract milestones
   * @returns {Object} Completion status information
   */
  calculateCompletionStatus(contract, milestones) {
    const today = new Date();
    const status = {
      phase: 'unknown',
      percentComplete: 0,
      isOnTrack: true,
      delayDays: 0,
      estimatedCompletion: null
    };

    // Determine current phase
    if (contract.completionDate && DateUtils.isOverdue(contract.completionDate)) {
      status.phase = 'completed';
      status.percentComplete = 100;
    } else if (contract.projectEnd && DateUtils.isOverdue(contract.projectEnd)) {
      status.phase = 'overdue';
      status.delayDays = Math.abs(DateUtils.daysRemaining(contract.projectEnd));
      status.isOnTrack = false;
    } else if (contract.projectStart && !DateUtils.isOverdue(contract.projectStart)) {
      status.phase = 'pre_start';
      status.percentComplete = 0;
    } else if (contract.projectStart && contract.projectEnd) {
      status.phase = 'in_progress';
      
      // Calculate percent complete based on time elapsed
      const totalDays = DateUtils.daysBetween(contract.projectStart, contract.projectEnd);
      const elapsedDays = DateUtils.daysBetween(contract.projectStart, today);
      
      if (totalDays > 0) {
        status.percentComplete = Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
      }
      
      // Check if on track
      const remainingDays = DateUtils.daysRemaining(contract.projectEnd);
      if (remainingDays < 0) {
        status.isOnTrack = false;
        status.delayDays = Math.abs(remainingDays);
      }
    }

    // Estimate completion date if in progress
    if (status.phase === 'in_progress' && contract.projectEnd) {
      status.estimatedCompletion = contract.projectEnd;
    }

    return status;
  }

  /**
   * Assess timeline health for a contract
   * @param {ContractData} contract - Contract data
   * @param {Object[]} milestones - Contract milestones
   * @returns {Object} Timeline health assessment
   */
  assessTimelineHealth(contract, milestones) {
    const health = {
      score: 100, // Start with perfect score
      status: 'healthy',
      issues: [],
      recommendations: []
    };

    // Check for missing critical dates
    if (!contract.awardDate) {
      health.score -= 10;
      health.issues.push('Missing award date');
    }

    if (!contract.projectStart) {
      health.score -= 15;
      health.issues.push('Missing project start date');
    }

    if (!contract.projectEnd) {
      health.score -= 20;
      health.issues.push('Missing project end date');
    }

    // Check for date logic issues
    if (contract.awardDate && contract.projectStart && contract.awardDate > contract.projectStart) {
      health.score -= 15;
      health.issues.push('Award date is after project start date');
      health.recommendations.push('Verify and correct date sequence');
    }

    if (contract.projectStart && contract.projectEnd && contract.projectStart >= contract.projectEnd) {
      health.score -= 25;
      health.issues.push('Project start date is not before project end date');
      health.recommendations.push('Correct project timeline dates');
    }

    // Check for overdue status
    if (contract.projectEnd && DateUtils.isOverdue(contract.projectEnd)) {
      const overdueDays = Math.abs(DateUtils.daysRemaining(contract.projectEnd));
      health.score -= Math.min(30, overdueDays); // Cap penalty at 30 points
      health.issues.push(`Contract is ${overdueDays} days overdue`);
      health.recommendations.push('Review project status and update timeline');
    }

    // Check for unrealistic timelines
    if (contract.projectStart && contract.projectEnd) {
      const duration = DateUtils.daysBetween(contract.projectStart, contract.projectEnd);
      if (duration < 1) {
        health.score -= 20;
        health.issues.push('Project duration is less than 1 day');
      } else if (duration > 3650) { // More than 10 years
        health.score -= 10;
        health.issues.push('Project duration is unusually long');
        health.recommendations.push('Verify project timeline is correct');
      }
    }

    // Determine overall status
    if (health.score >= 90) {
      health.status = 'healthy';
    } else if (health.score >= 70) {
      health.status = 'warning';
    } else if (health.score >= 50) {
      health.status = 'concerning';
    } else {
      health.status = 'critical';
    }

    return health;
  }

  /**
   * Generate deadline alerts for contracts
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {Object[]} Array of alert objects
   */
  generateDeadlineAlerts(contracts) {
    const alerts = [];
    const contractsWithDays = this.calculateDaysRemaining(contracts);

    contractsWithDays.forEach(contract => {
      const alert = this.createAlert(contract);
      if (alert) {
        alerts.push(alert);
      }
    });

    // Sort alerts by priority and days remaining
    return alerts.sort((a, b) => {
      const priorityOrder = {
        [this.priorityLevels.OVERDUE]: 0,
        [this.priorityLevels.CRITICAL]: 1,
        [this.priorityLevels.WARNING]: 2,
        [this.priorityLevels.UPCOMING]: 3
      };
      
      const aPriority = priorityOrder[a.priority] || 999;
      const bPriority = priorityOrder[b.priority] || 999;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // If same priority, sort by days remaining (most urgent first)
      return (a.daysRemaining || 0) - (b.daysRemaining || 0);
    });
  }

  /**
   * Create an alert for a contract if needed
   * @param {ContractData} contract - Contract with calculated days remaining
   * @returns {Object|null} Alert object or null if no alert needed
   */
  createAlert(contract) {
    if (contract.priority === this.priorityLevels.NORMAL) {
      return null; // No alert needed for normal priority
    }

    const deadline = contract.projectEnd || contract.completionDate;
    if (!deadline) {
      return null; // Can't create alert without deadline
    }

    const alert = {
      id: `alert_${contract.award || contract.project}_${Date.now()}`,
      contractId: contract.award || contract.project,
      contractTitle: contract.project || contract.award,
      priority: contract.priority,
      type: 'deadline',
      message: this.generateAlertMessage(contract),
      deadline: deadline,
      daysRemaining: contract.daysRemaining,
      isOverdue: contract.isOverdue,
      createdAt: new Date(),
      actionRequired: this.getRequiredActions(contract),
      personnel: this.getAlertPersonnel(contract)
    };

    return alert;
  }

  /**
   * Generate alert message based on contract status
   * @param {ContractData} contract - Contract data
   * @returns {string} Alert message
   */
  generateAlertMessage(contract) {
    const contractName = contract.project || contract.award || 'Unknown Contract';
    const daysRemaining = contract.daysRemaining;

    if (contract.isOverdue) {
      const overdueDays = Math.abs(daysRemaining);
      return `${contractName} is ${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue`;
    }

    switch (contract.priority) {
      case this.priorityLevels.CRITICAL:
        return `${contractName} deadline in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} - CRITICAL`;
      case this.priorityLevels.WARNING:
        return `${contractName} deadline in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} - Action needed`;
      case this.priorityLevels.UPCOMING:
        return `${contractName} deadline approaching in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`;
      default:
        return `${contractName} requires attention`;
    }
  }

  /**
   * Get required actions based on contract priority
   * @param {ContractData} contract - Contract data
   * @returns {string[]} Array of required actions
   */
  getRequiredActions(contract) {
    const actions = [];

    if (contract.isOverdue) {
      actions.push('Review project status immediately');
      actions.push('Contact project manager for status update');
      actions.push('Determine if contract modification is needed');
      actions.push('Update project timeline');
    } else {
      switch (contract.priority) {
        case this.priorityLevels.CRITICAL:
          actions.push('Immediate attention required');
          actions.push('Verify project completion status');
          actions.push('Prepare for contract closeout');
          break;
        case this.priorityLevels.WARNING:
          actions.push('Review project progress');
          actions.push('Confirm completion timeline');
          actions.push('Prepare necessary documentation');
          break;
        case this.priorityLevels.UPCOMING:
          actions.push('Monitor project progress');
          actions.push('Schedule status review meeting');
          break;
      }
    }

    return actions;
  }

  /**
   * Get personnel to notify for alerts
   * @param {ContractData} contract - Contract data
   * @returns {PersonnelInfo[]} Array of personnel to notify
   */
  getAlertPersonnel(contract) {
    const personnel = [];

    if (contract.projectManager && contract.projectManager.name && contract.projectManager.name !== 'Unknown') {
      personnel.push(contract.projectManager);
    }

    if (contract.contractingOfficer && contract.contractingOfficer.name && contract.contractingOfficer.name !== 'Unknown') {
      personnel.push(contract.contractingOfficer);
    }

    if (contract.programManager && contract.programManager.name && contract.programManager.name !== 'Unknown') {
      personnel.push(contract.programManager);
    }

    return personnel;
  }

  /**
   * Get priority-based highlighting configuration
   * @param {string} priority - Priority level
   * @returns {Object} Highlighting configuration
   */
  getPriorityHighlighting(priority) {
    const highlighting = {
      [this.priorityLevels.OVERDUE]: {
        color: '#dc3545',      // Red
        backgroundColor: '#f8d7da',
        borderColor: '#dc3545',
        textColor: '#721c24',
        icon: '⚠️',
        urgency: 'high'
      },
      [this.priorityLevels.CRITICAL]: {
        color: '#fd7e14',      // Orange
        backgroundColor: '#fff3cd',
        borderColor: '#fd7e14',
        textColor: '#856404',
        icon: '🔥',
        urgency: 'high'
      },
      [this.priorityLevels.WARNING]: {
        color: '#ffc107',      // Yellow
        backgroundColor: '#fff3cd',
        borderColor: '#ffc107',
        textColor: '#856404',
        icon: '⚡',
        urgency: 'medium'
      },
      [this.priorityLevels.UPCOMING]: {
        color: '#17a2b8',      // Info blue
        backgroundColor: '#d1ecf1',
        borderColor: '#17a2b8',
        textColor: '#0c5460',
        icon: '📅',
        urgency: 'low'
      },
      [this.priorityLevels.NORMAL]: {
        color: '#28a745',      // Green
        backgroundColor: '#d4edda',
        borderColor: '#28a745',
        textColor: '#155724',
        icon: '✅',
        urgency: 'none'
      }
    };

    return highlighting[priority] || highlighting[this.priorityLevels.NORMAL];
  }

  /**
   * Set custom alert thresholds
   * @param {Object} thresholds - Custom threshold configuration
   */
  setAlertThresholds(thresholds) {
    this.alertThresholds = {
      ...this.alertThresholds,
      ...thresholds
    };
  }

  /**
   * Get timeline summary statistics
   * @param {ContractData[]} contracts - Array of contract data
   * @returns {Object} Timeline summary statistics
   */
  getTimelineSummary(contracts) {
    const contractsWithDays = this.calculateDaysRemaining(contracts);
    
    const summary = {
      totalContracts: contracts.length,
      overdueContracts: 0,
      criticalContracts: 0,
      warningContracts: 0,
      upcomingContracts: 0,
      normalContracts: 0,
      contractsWithoutDeadlines: 0,
      averageDaysRemaining: 0,
      earliestDeadline: null,
      latestDeadline: null
    };

    let totalDaysRemaining = 0;
    let contractsWithDeadlines = 0;
    const deadlines = [];

    contractsWithDays.forEach(contract => {
      switch (contract.priority) {
        case this.priorityLevels.OVERDUE:
          summary.overdueContracts++;
          break;
        case this.priorityLevels.CRITICAL:
          summary.criticalContracts++;
          break;
        case this.priorityLevels.WARNING:
          summary.warningContracts++;
          break;
        case this.priorityLevels.UPCOMING:
          summary.upcomingContracts++;
          break;
        default:
          summary.normalContracts++;
      }

      if (contract.daysRemaining !== null) {
        totalDaysRemaining += contract.daysRemaining;
        contractsWithDeadlines++;
        
        const deadline = contract.projectEnd || contract.completionDate;
        if (deadline) {
          deadlines.push(deadline);
        }
      } else {
        summary.contractsWithoutDeadlines++;
      }
    });

    // Calculate average days remaining
    if (contractsWithDeadlines > 0) {
      summary.averageDaysRemaining = Math.round(totalDaysRemaining / contractsWithDeadlines);
    }

    // Find earliest and latest deadlines
    if (deadlines.length > 0) {
      deadlines.sort((a, b) => a - b);
      summary.earliestDeadline = deadlines[0];
      summary.latestDeadline = deadlines[deadlines.length - 1];
    }

    return summary;
  }
}