/**
 * SecurityIntegration - Integration layer for security services
 * Provides unified security interface for all dashboard components
 */

/**
 * SecurityIntegration class for coordinating security services
 */
class SecurityIntegration {
  constructor() {
    this.accessController = new AccessController();
    this.securityAuditor = new SecurityAuditor();
    this.isInitialized = false;
  }

  /**
   * Initialize security integration
   * @param {Object} config - Security configuration
   * @returns {boolean} Initialization success
   */
  initialize(config = {}) {
    try {
      // Set configuration options
      this.config = {
        domain: config.domain || null,
        sessionTimeout: config.sessionTimeout || 8 * 60 * 60 * 1000, // 8 hours
        enableAuditLogging: config.enableAuditLogging !== false, // Default true
        enableSuspiciousActivityDetection: config.enableSuspiciousActivityDetection !== false, // Default true
        ...config
      };

      this.isInitialized = true;
      
      // Log initialization
      this.securityAuditor.logAuditEvent(
        AuditCategory.SYSTEM_ADMINISTRATION,
        'security_system_initialized',
        'system',
        { config: this.config },
        RiskLevel.LOW
      );

      return true;
    } catch (error) {
      errorLogger.logSystemError(
        'SecurityIntegration',
        `Security initialization failed: ${error.message}`,
        error
      );
      return false;
    }
  }

  /**
   * Authenticate user and create session
   * @param {string} email - User email (optional, will use active session if not provided)
   * @returns {Object} Authentication result with session and permissions
   */
  authenticateUser(email = null) {
    try {
      const authResult = this.accessController.authenticateUser(email, this.config.domain);
      
      // Log authentication attempt
      this.securityAuditor.logAuthentication(
        email || 'unknown',
        authResult.success ? 'success' : 'failure',
        {
          method: 'google_workspace',
          failureReason: authResult.error || null,
          sessionId: authResult.session ? authResult.session.sessionId : null
        }
      );

      if (authResult.success && this.config.enableAuditLogging) {
        // Log user activity
        this.securityAuditor.logUserActivity(
          authResult.user.email,
          'user_login',
          {
            sessionId: authResult.session.sessionId,
            userRole: authResult.user.role,
            department: authResult.user.department
          }
        );
      }

      return authResult;
    } catch (error) {
      errorLogger.logSystemError(
        'SecurityIntegration',
        `Authentication error: ${error.message}`,
        error
      );
      
      return {
        success: false,
        error: 'Authentication system error',
        user: null
      };
    }
  }

  /**
   * Validate session and check permissions for data access
   * @param {string} sessionId - Session identifier
   * @param {string} operation - Operation being performed
   * @param {Object} context - Operation context
   * @returns {Object} Access validation result
   */
  validateDataAccess(sessionId, operation, context = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Security system not initialized');
      }

      const accessResult = this.accessController.checkDataAccess(sessionId, operation, context);
      
      if (accessResult.allowed && this.config.enableAuditLogging) {
        // Log successful data access
        this.securityAuditor.logDataAccess(
          accessResult.user.email,
          operation,
          {
            ...context,
            sessionId: sessionId,
            userRole: accessResult.user.role
          }
        );

        // Log user activity
        this.securityAuditor.logUserActivity(
          accessResult.user.email,
          `data_${operation}`,
          {
            sessionId: sessionId,
            operation: operation,
            resourcesAccessed: context.contractIds || [],
            dataVolume: context.recordCount || 0
          }
        );
      } else if (!accessResult.allowed) {
        // Log unauthorized access attempt
        this.securityAuditor.logUnauthorizedAccess(
          accessResult.user ? accessResult.user.email : 'unknown',
          context.resource || 'contract_data',
          {
            attemptedAction: operation,
            userRole: accessResult.user ? accessResult.user.role : null,
            requiredPermission: accessResult.requiredPermission,
            sessionId: sessionId
          }
        );
      }

      return accessResult;
    } catch (error) {
      errorLogger.logSystemError(
        'SecurityIntegration',
        `Data access validation error: ${error.message}`,
        error
      );
      
      return {
        allowed: false,
        error: 'Access validation system error',
        user: null
      };
    }
  }

  /**
   * Secure data loading with access control
   * @param {string} sessionId - Session identifier
   * @param {Object} filters - Data filters
   * @returns {Object} Secure data loading result
   */
  secureDataLoad(sessionId, filters = {}) {
    const accessCheck = this.validateDataAccess(sessionId, 'read', {
      resource: 'contract_data',
      filters: filters,
      operation: 'bulk_read'
    });

    if (!accessCheck.allowed) {
      return {
        success: false,
        error: accessCheck.error || 'Access denied',
        data: null
      };
    }

    try {
      // Load data using DataService
      const dataService = new DataService();
      const contractData = dataService.loadContractData();
      
      // Apply security filtering based on user role
      const filteredData = this.applySecurityFiltering(contractData, accessCheck.user);
      
      // Log data access details
      this.securityAuditor.logDataAccess(
        accessCheck.user.email,
        'bulk_read',
        {
          sessionId: sessionId,
          recordCount: filteredData.length,
          filters: filters,
          securityFiltering: true
        }
      );

      return {
        success: true,
        data: filteredData,
        user: accessCheck.user,
        recordCount: filteredData.length
      };
    } catch (error) {
      errorLogger.logSystemError(
        'SecurityIntegration',
        `Secure data load error: ${error.message}`,
        error
      );
      
      return {
        success: false,
        error: 'Data loading error',
        data: null
      };
    }
  }

  /**
   * Secure data export with comprehensive logging
   * @param {string} sessionId - Session identifier
   * @param {Object[]} data - Data to export
   * @param {string} format - Export format
   * @param {Object} context - Export context
   * @returns {Object} Secure export result
   */
  secureDataExport(sessionId, data, format, context = {}) {
    const accessCheck = this.validateDataAccess(sessionId, 'export', {
      resource: 'contract_data',
      recordCount: data.length,
      exportFormat: format,
      ...context
    });

    if (!accessCheck.allowed) {
      return {
        success: false,
        error: accessCheck.error || 'Export access denied',
        data: null
      };
    }

    try {
      // Apply additional security filtering for exports
      const secureData = this.applyExportSecurityFiltering(data, accessCheck.user);
      
      // Log export activity with detailed context
      this.securityAuditor.logAuditEvent(
        AuditCategory.EXPORT_ACTIVITY,
        'data_export',
        accessCheck.user.email,
        {
          sessionId: sessionId,
          recordCount: secureData.length,
          originalRecordCount: data.length,
          exportFormat: format,
          dataSize: JSON.stringify(secureData).length,
          securityFiltering: true,
          exportContext: context
        },
        secureData.length > 100 ? RiskLevel.MEDIUM : RiskLevel.LOW
      );

      return {
        success: true,
        data: secureData,
        user: accessCheck.user,
        recordCount: secureData.length
      };
    } catch (error) {
      errorLogger.logSystemError(
        'SecurityIntegration',
        `Secure data export error: ${error.message}`,
        error
      );
      
      return {
        success: false,
        error: 'Data export error',
        data: null
      };
    }
  }

  /**
   * Apply security filtering based on user role and permissions
   * @param {Object[]} data - Contract data
   * @param {Object} user - User information
   * @returns {Object[]} Filtered data
   */
  applySecurityFiltering(data, user) {
    if (!data || !Array.isArray(data)) {
      return [];
    }

    // Admin users see all data
    if (user.role === UserRole.ADMIN) {
      return data;
    }

    // Manager users see data from their department and public data
    if (user.role === UserRole.MANAGER) {
      return data.filter(contract => {
        // Show public contracts or contracts from user's department
        return contract.securityLevel === 'Public' || 
               contract.securityLevel === 'Internal' ||
               contract.clientBureau === user.department ||
               this.isUserAssignedToContract(user, contract);
      });
    }

    // Viewer users see only public data and contracts they're assigned to
    if (user.role === UserRole.VIEWER) {
      return data.filter(contract => {
        return contract.securityLevel === 'Public' ||
               this.isUserAssignedToContract(user, contract);
      });
    }

    // Default: no access
    return [];
  }

  /**
   * Apply additional security filtering for exports
   * @param {Object[]} data - Contract data
   * @param {Object} user - User information
   * @returns {Object[]} Filtered data for export
   */
  applyExportSecurityFiltering(data, user) {
    // First apply standard security filtering
    let filteredData = this.applySecurityFiltering(data, user);
    
    // Remove sensitive fields based on user role
    if (user.role !== UserRole.ADMIN) {
      filteredData = filteredData.map(contract => {
        const sanitizedContract = { ...contract };
        
        // Remove internal tracking fields
        delete sanitizedContract._rowNumber;
        delete sanitizedContract._rawData;
        delete sanitizedContract._validation;
        delete sanitizedContract._error;
        
        // Viewers get limited financial information
        if (user.role === UserRole.VIEWER) {
          // Round financial values to thousands for viewers
          if (sanitizedContract.ceiling) {
            sanitizedContract.ceiling = Math.round(sanitizedContract.ceiling / 1000) * 1000;
          }
          if (sanitizedContract.awardValue) {
            sanitizedContract.awardValue = Math.round(sanitizedContract.awardValue / 1000) * 1000;
          }
          if (sanitizedContract.remainingBudget) {
            sanitizedContract.remainingBudget = Math.round(sanitizedContract.remainingBudget / 1000) * 1000;
          }
        }
        
        return sanitizedContract;
      });
    }
    
    return filteredData;
  }

  /**
   * Check if user is assigned to a contract
   * @param {Object} user - User information
   * @param {Object} contract - Contract data
   * @returns {boolean} True if user is assigned to contract
   */
  isUserAssignedToContract(user, contract) {
    const userEmail = user.email.toLowerCase();
    
    // Check all personnel roles in the contract
    const personnelRoles = [
      contract.projectManager,
      contract.contractingOfficer,
      contract.contractSpecialist,
      contract.programManager
    ];
    
    return personnelRoles.some(person => 
      person && person.email && person.email.toLowerCase() === userEmail
    );
  }

  /**
   * Log user logout
   * @param {string} sessionId - Session identifier
   * @returns {boolean} Logout success
   */
  logout(sessionId) {
    try {
      const session = this.accessController.sessions.get(sessionId);
      const userEmail = session ? session.user.email : 'unknown';
      
      const logoutResult = this.accessController.logout(sessionId);
      
      if (logoutResult && this.config.enableAuditLogging) {
        this.securityAuditor.logUserActivity(
          userEmail,
          'user_logout',
          {
            sessionId: sessionId,
            logoutTime: new Date()
          }
        );
      }
      
      return logoutResult;
    } catch (error) {
      errorLogger.logSystemError(
        'SecurityIntegration',
        `Logout error: ${error.message}`,
        error
      );
      return false;
    }
  }

  /**
   * Get security dashboard data for administrators
   * @param {string} sessionId - Admin session identifier
   * @returns {Object} Security dashboard data
   */
  getSecurityDashboard(sessionId) {
    const accessCheck = this.validateDataAccess(sessionId, 'view_audit_logs', {
      resource: 'security_dashboard'
    });

    if (!accessCheck.allowed) {
      return {
        success: false,
        error: 'Access denied to security dashboard',
        data: null
      };
    }

    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - (24 * 60 * 60 * 1000));
      const last7Days = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

      const dashboardData = {
        summary: {
          activeSessions: this.accessController.getActiveSessionsCount(),
          lockedAccounts: this.accessController.lockedAccounts.size,
          recentAlerts: this.securityAuditor.getAlertsByStatus('open', 10).length,
          last24HourEvents: this.securityAuditor.auditLog.filter(e => e.timestamp >= last24Hours).length
        },
        recentEvents: this.securityAuditor.getRecentSecurityEvents(20),
        recentAlerts: this.securityAuditor.getAlertsByStatus('open', 10),
        securityReport: this.securityAuditor.generateAuditReport(last7Days, now),
        systemHealth: {
          securitySystemStatus: 'operational',
          lastSecurityScan: now,
          configurationStatus: 'secure'
        }
      };

      // Log dashboard access
      this.securityAuditor.logUserActivity(
        accessCheck.user.email,
        'security_dashboard_access',
        {
          sessionId: sessionId,
          dashboardSections: Object.keys(dashboardData)
        }
      );

      return {
        success: true,
        data: dashboardData,
        user: accessCheck.user
      };
    } catch (error) {
      errorLogger.logSystemError(
        'SecurityIntegration',
        `Security dashboard error: ${error.message}`,
        error
      );
      
      return {
        success: false,
        error: 'Security dashboard system error',
        data: null
      };
    }
  }

  /**
   * Generate comprehensive security report
   * @param {string} sessionId - Admin session identifier
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @returns {Object} Security report
   */
  generateSecurityReport(sessionId, startDate = null, endDate = null) {
    const accessCheck = this.validateDataAccess(sessionId, 'view_audit_logs', {
      resource: 'security_reports'
    });

    if (!accessCheck.allowed) {
      return {
        success: false,
        error: 'Access denied to security reports',
        report: null
      };
    }

    try {
      const auditReport = this.securityAuditor.generateAuditReport(startDate, endDate);
      const securityReport = this.accessController.generateSecurityReport(startDate, endDate);
      
      const combinedReport = {
        reportId: `COMBINED_${auditReport.reportId}_${securityReport.reportId}`,
        generatedAt: new Date(),
        generatedBy: accessCheck.user.email,
        period: auditReport.period,
        auditSummary: auditReport.summary,
        securitySummary: securityReport.summary,
        trends: auditReport.trends,
        securityMetrics: auditReport.securityMetrics,
        recommendations: [
          ...auditReport.recommendations,
          ...securityReport.recommendations
        ],
        detailedEvents: {
          auditEvents: auditReport.summary.totalEvents,
          securityEvents: securityReport.summary.totalEvents,
          alerts: this.securityAuditor.alertLog.length
        }
      };

      // Log report generation
      this.securityAuditor.logAuditEvent(
        AuditCategory.SYSTEM_ADMINISTRATION,
        'security_report_generated',
        accessCheck.user.email,
        {
          reportId: combinedReport.reportId,
          period: combinedReport.period,
          sessionId: sessionId
        },
        RiskLevel.LOW
      );

      return {
        success: true,
        report: combinedReport,
        user: accessCheck.user
      };
    } catch (error) {
      errorLogger.logSystemError(
        'SecurityIntegration',
        `Security report generation error: ${error.message}`,
        error
      );
      
      return {
        success: false,
        error: 'Security report generation error',
        report: null
      };
    }
  }

  /**
   * Get current security status
   * @returns {Object} Security system status
   */
  getSecurityStatus() {
    return {
      initialized: this.isInitialized,
      activeSessionsCount: this.accessController.getActiveSessionsCount(),
      lockedAccountsCount: this.accessController.lockedAccounts.size,
      auditLogSize: this.securityAuditor.auditLog.length,
      alertLogSize: this.securityAuditor.alertLog.length,
      systemHealth: 'operational',
      lastHealthCheck: new Date()
    };
  }
}

// Create global instance for use throughout the application
const securityIntegration = new SecurityIntegration();