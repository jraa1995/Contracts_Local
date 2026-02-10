/**
 * AccessController - Comprehensive access control and security management
 * Handles Google Workspace authentication, role-based permissions, session management, and security logging
 */

/**
 * User role enumeration
 * @readonly
 * @enum {string}
 */
const UserRole = {
  ADMIN: 'Admin',
  MANAGER: 'Manager', 
  VIEWER: 'Viewer'
};

/**
 * Permission enumeration
 * @readonly
 * @enum {string}
 */
const Permission = {
  READ_CONTRACTS: 'read_contracts',
  WRITE_CONTRACTS: 'write_contracts',
  DELETE_CONTRACTS: 'delete_contracts',
  EXPORT_DATA: 'export_data',
  VIEW_FINANCIAL: 'view_financial',
  MANAGE_USERS: 'manage_users',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  SYSTEM_ADMIN: 'system_admin'
};

/**
 * Security event types
 * @readonly
 * @enum {string}
 */
const SecurityEventType = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  ACCESS_GRANTED: 'access_granted',
  ACCESS_DENIED: 'access_denied',
  DATA_ACCESS: 'data_access',
  DATA_EXPORT: 'data_export',
  PERMISSION_CHANGE: 'permission_change',
  SESSION_TIMEOUT: 'session_timeout',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};

/**
 * AccessController class for managing authentication, authorization, and security
 */
class AccessController {
  constructor() {
    this.sessions = new Map(); // Active user sessions
    this.securityLog = []; // Security event log
    this.maxLogSize = 5000; // Maximum security log entries
    this.sessionTimeout = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
    this.maxFailedAttempts = 5; // Maximum failed login attempts
    this.lockoutDuration = 30 * 60 * 1000; // 30 minutes lockout
    this.failedAttempts = new Map(); // Track failed login attempts
    this.lockedAccounts = new Map(); // Track locked accounts
    
    // Role-based permission mapping
    this.rolePermissions = new Map([
      [UserRole.ADMIN, [
        Permission.READ_CONTRACTS,
        Permission.WRITE_CONTRACTS,
        Permission.DELETE_CONTRACTS,
        Permission.EXPORT_DATA,
        Permission.VIEW_FINANCIAL,
        Permission.MANAGE_USERS,
        Permission.VIEW_AUDIT_LOGS,
        Permission.SYSTEM_ADMIN
      ]],
      [UserRole.MANAGER, [
        Permission.READ_CONTRACTS,
        Permission.WRITE_CONTRACTS,
        Permission.EXPORT_DATA,
        Permission.VIEW_FINANCIAL,
        Permission.VIEW_AUDIT_LOGS
      ]],
      [UserRole.VIEWER, [
        Permission.READ_CONTRACTS,
        Permission.VIEW_FINANCIAL
      ]]
    ]);
  }

  /**
   * Authenticate user through Google Workspace integration
   * @param {string} email - User email address
   * @param {string} domain - Expected domain for validation
   * @returns {Object} Authentication result
   */
  authenticateUser(email = null, domain = null) {
    try {
      // Get current user from Google Apps Script session
      let userEmail = email;
      
      if (!userEmail) {
        try {
          userEmail = Session.getActiveUser().getEmail();
        } catch (error) {
          this.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, null, {
            error: 'Unable to get active user session',
            originalError: error.message
          });
          return {
            success: false,
            error: 'Authentication failed: Unable to access user session',
            user: null
          };
        }
      }

      if (!userEmail) {
        this.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, null, {
          error: 'No user email available'
        });
        return {
          success: false,
          error: 'Authentication failed: No user email available',
          user: null
        };
      }

      // Check if account is locked
      if (this.isAccountLocked(userEmail)) {
        this.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, userEmail, {
          error: 'Account is locked due to too many failed attempts'
        });
        return {
          success: false,
          error: 'Account is temporarily locked. Please try again later.',
          user: null
        };
      }

      // Validate domain if specified
      if (domain && !userEmail.endsWith(`@${domain}`)) {
        this.recordFailedAttempt(userEmail);
        this.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, userEmail, {
          error: 'Domain validation failed',
          expectedDomain: domain,
          actualEmail: userEmail
        });
        return {
          success: false,
          error: 'Authentication failed: Invalid domain',
          user: null
        };
      }

      // Get user information from Google Workspace
      const userInfo = this.getUserInfo(userEmail);
      
      if (!userInfo) {
        this.recordFailedAttempt(userEmail);
        this.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, userEmail, {
          error: 'Unable to retrieve user information'
        });
        return {
          success: false,
          error: 'Authentication failed: Unable to retrieve user information',
          user: null
        };
      }

      // Clear failed attempts on successful authentication
      this.clearFailedAttempts(userEmail);

      // Create user session
      const session = this.createSession(userInfo);
      
      this.logSecurityEvent(SecurityEventType.LOGIN_SUCCESS, userEmail, {
        role: userInfo.role,
        sessionId: session.sessionId
      });

      return {
        success: true,
        user: userInfo,
        session: session,
        permissions: this.getUserPermissions(userInfo.role)
      };
    } catch (error) {
      this.logSecurityEvent(SecurityEventType.LOGIN_FAILURE, userEmail, {
        error: 'Authentication system error',
        originalError: error.message
      });
      
      errorLogger.logSystemError(
        'AccessController',
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
   * Get user information from Google Workspace
   * @param {string} email - User email address
   * @returns {Object|null} User information object
   */
  getUserInfo(email) {
    try {
      // In a real implementation, this would query Google Workspace Directory API
      // For now, we'll use a simplified approach with role determination logic
      
      const userInfo = {
        email: email,
        name: this.extractNameFromEmail(email),
        role: this.determineUserRole(email),
        department: this.extractDepartmentFromEmail(email),
        lastLogin: new Date(),
        isActive: true
      };

      return userInfo;
    } catch (error) {
      errorLogger.logSystemError(
        'AccessController',
        `Error getting user info for ${email}: ${error.message}`,
        error
      );
      return null;
    }
  }

  /**
   * Determine user role based on email or other criteria
   * @param {string} email - User email address
   * @returns {string} User role
   */
  determineUserRole(email) {
    // In a real implementation, this would query a user directory or database
    // For demonstration, we'll use simple email-based rules
    
    if (email.includes('admin') || email.includes('administrator')) {
      return UserRole.ADMIN;
    }
    
    if (email.includes('manager') || email.includes('supervisor') || email.includes('lead')) {
      return UserRole.MANAGER;
    }
    
    // Default role for regular users
    return UserRole.VIEWER;
  }

  /**
   * Extract name from email address
   * @param {string} email - User email address
   * @returns {string} Extracted name
   */
  extractNameFromEmail(email) {
    const localPart = email.split('@')[0];
    const nameParts = localPart.split('.');
    
    return nameParts
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  /**
   * Extract department from email domain or other indicators
   * @param {string} email - User email address
   * @returns {string} Department name
   */
  extractDepartmentFromEmail(email) {
    const domain = email.split('@')[1];
    
    // Simple department mapping based on domain or subdomain
    if (domain.includes('dhs')) return 'Department of Homeland Security';
    if (domain.includes('dod')) return 'Department of Defense';
    if (domain.includes('treasury')) return 'Department of Treasury';
    if (domain.includes('gsa')) return 'General Services Administration';
    
    return 'Government Agency';
  }

  /**
   * Create a new user session
   * @param {Object} userInfo - User information
   * @returns {Object} Session object
   */
  createSession(userInfo) {
    const sessionId = this.generateSessionId();
    const now = new Date();
    
    const session = {
      sessionId: sessionId,
      user: userInfo,
      createdAt: now,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + this.sessionTimeout),
      isActive: true,
      ipAddress: this.getCurrentIPAddress(),
      userAgent: this.getCurrentUserAgent()
    };

    this.sessions.set(sessionId, session);
    
    // Clean up expired sessions
    this.cleanupExpiredSessions();
    
    return session;
  }

  /**
   * Validate and refresh user session
   * @param {string} sessionId - Session identifier
   * @returns {Object} Session validation result
   */
  validateSession(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      
      if (!session) {
        this.logSecurityEvent(SecurityEventType.ACCESS_DENIED, null, {
          error: 'Invalid session ID',
          sessionId: sessionId
        });
        return {
          valid: false,
          error: 'Invalid session',
          user: null
        };
      }

      const now = new Date();
      
      // Check if session has expired
      if (now > session.expiresAt || !session.isActive) {
        this.sessions.delete(sessionId);
        this.logSecurityEvent(SecurityEventType.SESSION_TIMEOUT, session.user.email, {
          sessionId: sessionId,
          expiredAt: session.expiresAt
        });
        return {
          valid: false,
          error: 'Session expired',
          user: null
        };
      }

      // Update last activity and extend session
      session.lastActivity = now;
      session.expiresAt = new Date(now.getTime() + this.sessionTimeout);
      
      return {
        valid: true,
        session: session,
        user: session.user,
        permissions: this.getUserPermissions(session.user.role)
      };
    } catch (error) {
      errorLogger.logSystemError(
        'AccessController',
        `Session validation error: ${error.message}`,
        error
      );
      
      return {
        valid: false,
        error: 'Session validation error',
        user: null
      };
    }
  }

  /**
   * Check if user has specific permission
   * @param {string} userRole - User role
   * @param {string} permission - Permission to check
   * @returns {boolean} True if user has permission
   */
  hasPermission(userRole, permission) {
    const rolePermissions = this.rolePermissions.get(userRole);
    return rolePermissions ? rolePermissions.includes(permission) : false;
  }

  /**
   * Get all permissions for a user role
   * @param {string} userRole - User role
   * @returns {string[]} Array of permissions
   */
  getUserPermissions(userRole) {
    return this.rolePermissions.get(userRole) || [];
  }

  /**
   * Check access to contract data with detailed logging
   * @param {string} sessionId - Session identifier
   * @param {string} operation - Operation being performed
   * @param {Object} context - Additional context (contract IDs, filters, etc.)
   * @returns {Object} Access check result
   */
  checkDataAccess(sessionId, operation, context = {}) {
    try {
      const sessionValidation = this.validateSession(sessionId);
      
      if (!sessionValidation.valid) {
        this.logSecurityEvent(SecurityEventType.ACCESS_DENIED, null, {
          operation: operation,
          context: context,
          error: sessionValidation.error
        });
        return {
          allowed: false,
          error: sessionValidation.error,
          user: null
        };
      }

      const user = sessionValidation.user;
      const permissions = sessionValidation.permissions;
      
      // Check operation-specific permissions
      let requiredPermission;
      switch (operation) {
        case 'read':
          requiredPermission = Permission.READ_CONTRACTS;
          break;
        case 'write':
        case 'update':
          requiredPermission = Permission.WRITE_CONTRACTS;
          break;
        case 'delete':
          requiredPermission = Permission.DELETE_CONTRACTS;
          break;
        case 'export':
          requiredPermission = Permission.EXPORT_DATA;
          break;
        case 'view_financial':
          requiredPermission = Permission.VIEW_FINANCIAL;
          break;
        default:
          requiredPermission = Permission.READ_CONTRACTS;
      }

      const hasAccess = permissions.includes(requiredPermission);
      
      if (hasAccess) {
        this.logSecurityEvent(SecurityEventType.ACCESS_GRANTED, user.email, {
          operation: operation,
          permission: requiredPermission,
          context: context,
          sessionId: sessionId
        });
        
        // Log data access for audit trail
        this.logSecurityEvent(SecurityEventType.DATA_ACCESS, user.email, {
          operation: operation,
          context: context,
          timestamp: new Date()
        });
      } else {
        this.logSecurityEvent(SecurityEventType.ACCESS_DENIED, user.email, {
          operation: operation,
          requiredPermission: requiredPermission,
          userPermissions: permissions,
          context: context
        });
      }

      return {
        allowed: hasAccess,
        user: user,
        permissions: permissions,
        requiredPermission: requiredPermission
      };
    } catch (error) {
      errorLogger.logSystemError(
        'AccessController',
        `Data access check error: ${error.message}`,
        error
      );
      
      this.logSecurityEvent(SecurityEventType.ACCESS_DENIED, null, {
        operation: operation,
        context: context,
        error: 'System error during access check'
      });
      
      return {
        allowed: false,
        error: 'Access check system error',
        user: null
      };
    }
  }

  /**
   * Log user logout
   * @param {string} sessionId - Session identifier
   * @returns {boolean} Success status
   */
  logout(sessionId) {
    try {
      const session = this.sessions.get(sessionId);
      
      if (session) {
        this.logSecurityEvent(SecurityEventType.LOGOUT, session.user.email, {
          sessionId: sessionId,
          sessionDuration: new Date().getTime() - session.createdAt.getTime()
        });
        
        session.isActive = false;
        this.sessions.delete(sessionId);
      }
      
      return true;
    } catch (error) {
      errorLogger.logSystemError(
        'AccessController',
        `Logout error: ${error.message}`,
        error
      );
      return false;
    }
  }

  /**
   * Record failed login attempt
   * @param {string} email - User email
   */
  recordFailedAttempt(email) {
    const attempts = this.failedAttempts.get(email) || { count: 0, lastAttempt: null };
    attempts.count++;
    attempts.lastAttempt = new Date();
    
    this.failedAttempts.set(email, attempts);
    
    // Lock account if too many failed attempts
    if (attempts.count >= this.maxFailedAttempts) {
      this.lockAccount(email);
    }
  }

  /**
   * Clear failed login attempts for user
   * @param {string} email - User email
   */
  clearFailedAttempts(email) {
    this.failedAttempts.delete(email);
  }

  /**
   * Lock user account
   * @param {string} email - User email
   */
  lockAccount(email) {
    const lockUntil = new Date(Date.now() + this.lockoutDuration);
    this.lockedAccounts.set(email, lockUntil);
    
    this.logSecurityEvent(SecurityEventType.SUSPICIOUS_ACTIVITY, email, {
      action: 'account_locked',
      reason: 'Too many failed login attempts',
      lockUntil: lockUntil
    });
  }

  /**
   * Check if account is locked
   * @param {string} email - User email
   * @returns {boolean} True if account is locked
   */
  isAccountLocked(email) {
    const lockUntil = this.lockedAccounts.get(email);
    
    if (!lockUntil) {
      return false;
    }
    
    if (new Date() > lockUntil) {
      // Lock has expired, remove it
      this.lockedAccounts.delete(email);
      return false;
    }
    
    return true;
  }

  /**
   * Log security event
   * @param {string} eventType - Type of security event
   * @param {string} userEmail - User email (if applicable)
   * @param {Object} details - Event details
   * @returns {string} Event ID
   */
  logSecurityEvent(eventType, userEmail, details = {}) {
    const eventId = this.generateEventId();
    const timestamp = new Date();
    
    const securityEvent = {
      id: eventId,
      timestamp: timestamp,
      type: eventType,
      userEmail: userEmail,
      details: details,
      ipAddress: this.getCurrentIPAddress(),
      userAgent: this.getCurrentUserAgent()
    };

    this.securityLog.push(securityEvent);
    
    // Maintain log size limit
    if (this.securityLog.length > this.maxLogSize) {
      this.securityLog.shift(); // Remove oldest entry
    }

    // Also log to ErrorLogger for integration with existing logging
    const logLevel = this.getLogLevelForEvent(eventType);
    errorLogger.logError(
      logLevel,
      'AccessController',
      `Security Event: ${eventType} for user ${userEmail || 'unknown'}`,
      {
        eventType: eventType,
        userEmail: userEmail,
        details: details,
        securityEventId: eventId
      }
    );

    return eventId;
  }

  /**
   * Get appropriate log level for security event type
   * @param {string} eventType - Security event type
   * @returns {string} Log level
   */
  getLogLevelForEvent(eventType) {
    switch (eventType) {
      case SecurityEventType.LOGIN_FAILURE:
      case SecurityEventType.ACCESS_DENIED:
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        return 'ERROR';
      case SecurityEventType.SESSION_TIMEOUT:
      case SecurityEventType.PERMISSION_CHANGE:
        return 'WARN';
      default:
        return 'INFO';
    }
  }

  /**
   * Get security events by type
   * @param {string} eventType - Event type to filter by
   * @param {number} limit - Maximum number of events to return
   * @returns {Object[]} Filtered security events
   */
  getSecurityEventsByType(eventType, limit = 100) {
    return this.securityLog
      .filter(event => event.type === eventType)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Get security events by user
   * @param {string} userEmail - User email to filter by
   * @param {number} limit - Maximum number of events to return
   * @returns {Object[]} Filtered security events
   */
  getSecurityEventsByUser(userEmail, limit = 100) {
    return this.securityLog
      .filter(event => event.userEmail === userEmail)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Get recent security events
   * @param {number} limit - Maximum number of events to return
   * @returns {Object[]} Recent security events
   */
  getRecentSecurityEvents(limit = 50) {
    return this.securityLog
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Generate comprehensive security report
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @returns {Object} Security report
   */
  generateSecurityReport(startDate = null, endDate = null) {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // Default: last 7 days
    const end = endDate || now;
    
    const eventsInRange = this.securityLog.filter(event => 
      event.timestamp >= start && event.timestamp <= end
    );

    const report = {
      reportId: this.generateReportId(),
      generatedAt: now,
      period: {
        start: start,
        end: end
      },
      summary: {
        totalEvents: eventsInRange.length,
        loginAttempts: eventsInRange.filter(e => e.type === SecurityEventType.LOGIN_SUCCESS || e.type === SecurityEventType.LOGIN_FAILURE).length,
        successfulLogins: eventsInRange.filter(e => e.type === SecurityEventType.LOGIN_SUCCESS).length,
        failedLogins: eventsInRange.filter(e => e.type === SecurityEventType.LOGIN_FAILURE).length,
        accessDenials: eventsInRange.filter(e => e.type === SecurityEventType.ACCESS_DENIED).length,
        dataAccesses: eventsInRange.filter(e => e.type === SecurityEventType.DATA_ACCESS).length,
        suspiciousActivities: eventsInRange.filter(e => e.type === SecurityEventType.SUSPICIOUS_ACTIVITY).length
      },
      eventsByType: this.groupEventsByType(eventsInRange),
      eventsByUser: this.groupEventsByUser(eventsInRange),
      activeSessions: this.getActiveSessionsCount(),
      lockedAccounts: this.lockedAccounts.size,
      recommendations: this.generateSecurityRecommendations(eventsInRange)
    };

    return report;
  }

  /**
   * Group events by type for reporting
   * @param {Object[]} events - Security events
   * @returns {Object} Events grouped by type
   */
  groupEventsByType(events) {
    const grouped = {};
    
    events.forEach(event => {
      if (!grouped[event.type]) {
        grouped[event.type] = [];
      }
      grouped[event.type].push(event);
    });

    return grouped;
  }

  /**
   * Group events by user for reporting
   * @param {Object[]} events - Security events
   * @returns {Object} Events grouped by user
   */
  groupEventsByUser(events) {
    const grouped = {};
    
    events.forEach(event => {
      const user = event.userEmail || 'unknown';
      if (!grouped[user]) {
        grouped[user] = [];
      }
      grouped[user].push(event);
    });

    return grouped;
  }

  /**
   * Generate security recommendations based on event analysis
   * @param {Object[]} events - Security events to analyze
   * @returns {string[]} Array of recommendations
   */
  generateSecurityRecommendations(events) {
    const recommendations = [];
    
    const failedLogins = events.filter(e => e.type === SecurityEventType.LOGIN_FAILURE).length;
    const totalLogins = events.filter(e => e.type === SecurityEventType.LOGIN_SUCCESS || e.type === SecurityEventType.LOGIN_FAILURE).length;
    
    if (totalLogins > 0 && (failedLogins / totalLogins) > 0.1) {
      recommendations.push('High rate of failed login attempts detected. Consider implementing additional authentication measures.');
    }
    
    const accessDenials = events.filter(e => e.type === SecurityEventType.ACCESS_DENIED).length;
    if (accessDenials > 10) {
      recommendations.push('Multiple access denials detected. Review user permissions and training needs.');
    }
    
    const suspiciousActivities = events.filter(e => e.type === SecurityEventType.SUSPICIOUS_ACTIVITY).length;
    if (suspiciousActivities > 0) {
      recommendations.push('Suspicious activities detected. Investigate and consider additional security measures.');
    }
    
    if (this.lockedAccounts.size > 0) {
      recommendations.push(`${this.lockedAccounts.size} accounts are currently locked. Review and assist users with account recovery.`);
    }
    
    return recommendations;
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = new Date();
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt || !session.isActive) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get count of active sessions
   * @returns {number} Number of active sessions
   */
  getActiveSessionsCount() {
    this.cleanupExpiredSessions();
    return this.sessions.size;
  }

  /**
   * Generate unique session ID
   * @returns {string} Unique session ID
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `SES_${timestamp}_${random}`;
  }

  /**
   * Generate unique event ID
   * @returns {string} Unique event ID
   */
  generateEventId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `SEC_${timestamp}_${random}`;
  }

  /**
   * Generate unique report ID
   * @returns {string} Unique report ID
   */
  generateReportId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `SECRPT_${timestamp}_${random}`;
  }

  /**
   * Get current IP address (simplified for Google Apps Script environment)
   * @returns {string} IP address or placeholder
   */
  getCurrentIPAddress() {
    // In Google Apps Script, getting the actual IP address is limited
    // This would need to be implemented based on the specific deployment context
    return 'GAS_ENVIRONMENT';
  }

  /**
   * Get current user agent (simplified for Google Apps Script environment)
   * @returns {string} User agent or placeholder
   */
  getCurrentUserAgent() {
    // In Google Apps Script, getting the actual user agent is limited
    // This would need to be implemented based on the specific deployment context
    return 'Google_Apps_Script';
  }

  /**
   * Export security log to CSV format
   * @returns {string} CSV formatted security log
   */
  exportSecurityLogToCSV() {
    if (this.securityLog.length === 0) {
      return 'No security events to export';
    }

    const headers = ['ID', 'Timestamp', 'Event Type', 'User Email', 'IP Address', 'Details'];
    const csvRows = [headers.join(',')];

    this.securityLog.forEach(event => {
      const row = [
        event.id,
        event.timestamp.toISOString(),
        event.type,
        event.userEmail || '',
        event.ipAddress || '',
        `"${JSON.stringify(event.details).replace(/"/g, '""')}"` // Escape quotes
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Clear security log (admin only operation)
   * @param {string} sessionId - Admin session ID
   * @returns {boolean} Success status
   */
  clearSecurityLog(sessionId) {
    const accessCheck = this.checkDataAccess(sessionId, 'system_admin');
    
    if (!accessCheck.allowed) {
      return false;
    }

    this.logSecurityEvent(SecurityEventType.SYSTEM_ADMIN, accessCheck.user.email, {
      action: 'security_log_cleared',
      previousLogSize: this.securityLog.length
    });

    this.securityLog = [];
    return true;
  }
}