/**
 * SecurityAuditor - Comprehensive security logging and audit trail system
 * Provides detailed audit logging, unauthorized access detection, and security event monitoring
 */

/**
 * Audit event categories
 * @readonly
 * @enum {string}
 */
const AuditCategory = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATA_ACCESS: 'data_access',
  DATA_MODIFICATION: 'data_modification',
  SYSTEM_ADMINISTRATION: 'system_administration',
  SECURITY_VIOLATION: 'security_violation',
  USER_ACTIVITY: 'user_activity',
  EXPORT_ACTIVITY: 'export_activity'
};

/**
 * Risk levels for security events
 * @readonly
 * @enum {string}
 */
const RiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * SecurityAuditor class for comprehensive security logging and monitoring
 */
class SecurityAuditor {
  constructor() {
    this.auditLog = []; // Comprehensive audit trail
    this.alertLog = []; // Security alerts and violations
    this.userActivityLog = []; // Detailed user activity tracking
    this.maxAuditLogSize = 10000; // Maximum audit log entries
    this.maxAlertLogSize = 1000; // Maximum alert log entries
    this.maxActivityLogSize = 5000; // Maximum activity log entries
    
    // Monitoring thresholds
    this.thresholds = {
      failedLoginAttempts: 5,
      accessDenialsPerHour: 10,
      dataExportsPerDay: 20,
      suspiciousActivityScore: 75
    };
    
    // Pattern detection for suspicious activity
    this.suspiciousPatterns = [
      'multiple_failed_logins',
      'unusual_access_times',
      'bulk_data_access',
      'privilege_escalation_attempts',
      'data_export_anomalies'
    ];
  }

  /**
   * Log comprehensive audit event
   * @param {string} category - Audit category
   * @param {string} action - Specific action performed
   * @param {string} userEmail - User performing the action
   * @param {Object} details - Detailed event information
   * @param {string} riskLevel - Risk level of the event
   * @returns {string} Audit event ID
   */
  logAuditEvent(category, action, userEmail, details = {}, riskLevel = RiskLevel.LOW) {
    const auditId = this.generateAuditId();
    const timestamp = new Date();
    
    const auditEvent = {
      id: auditId,
      timestamp: timestamp,
      category: category,
      action: action,
      userEmail: userEmail,
      riskLevel: riskLevel,
      details: {
        ...details,
        ipAddress: this.getCurrentIPAddress(),
        userAgent: this.getCurrentUserAgent(),
        sessionId: details.sessionId || null,
        requestId: this.generateRequestId()
      },
      metadata: {
        source: 'SecurityAuditor',
        version: '1.0',
        environment: 'Google_Apps_Script'
      }
    };

    this.auditLog.push(auditEvent);
    
    // Maintain log size limit
    if (this.auditLog.length > this.maxAuditLogSize) {
      this.auditLog.shift(); // Remove oldest entry
    }

    // Check for suspicious patterns
    this.analyzeForSuspiciousActivity(auditEvent);
    
    // Log to ErrorLogger for integration
    this.logToErrorLogger(auditEvent);
    
    // Generate alerts if high risk
    if (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) {
      this.generateSecurityAlert(auditEvent);
    }

    return auditId;
  }

  /**
   * Convenience method to log simple events
   * @param {string} eventName - Event name/action
   * @param {Object} details - Event details
   * @returns {string} Audit event ID
   */
  logEvent(eventName, details = {}) {
    const userEmail = details.user || details.userEmail || 'system';
    const category = this.determineCategory(eventName);
    const riskLevel = this.determineRiskLevel(eventName, details);
    
    return this.logAuditEvent(category, eventName, userEmail, details, riskLevel);
  }

  /**
   * Determine category from event name
   * @param {string} eventName - Event name
   * @returns {string} Audit category
   */
  determineCategory(eventName) {
    const eventLower = eventName.toLowerCase();
    
    if (eventLower.includes('auth') || eventLower.includes('login')) {
      return AuditCategory.AUTHENTICATION;
    } else if (eventLower.includes('permission') || eventLower.includes('access')) {
      return AuditCategory.AUTHORIZATION;
    } else if (eventLower.includes('export') || eventLower.includes('data')) {
      return AuditCategory.DATA_ACCESS;
    } else if (eventLower.includes('admin') || eventLower.includes('maintenance')) {
      return AuditCategory.SYSTEM_ADMINISTRATION;
    } else if (eventLower.includes('violation') || eventLower.includes('suspicious')) {
      return AuditCategory.SECURITY_VIOLATION;
    } else {
      return AuditCategory.USER_ACTIVITY;
    }
  }

  /**
   * Determine risk level from event name and details
   * @param {string} eventName - Event name
   * @param {Object} details - Event details
   * @returns {string} Risk level
   */
  determineRiskLevel(eventName, details) {
    const eventLower = eventName.toLowerCase();
    
    if (eventLower.includes('failed') || eventLower.includes('error') || eventLower.includes('violation')) {
      return RiskLevel.MEDIUM;
    } else if (eventLower.includes('unauthorized') || eventLower.includes('suspicious')) {
      return RiskLevel.HIGH;
    } else if (eventLower.includes('critical') || eventLower.includes('emergency')) {
      return RiskLevel.CRITICAL;
    } else {
      return RiskLevel.LOW;
    }
  }

  /**
   * Log user activity with detailed context
   * @param {string} userEmail - User email
   * @param {string} activity - Activity description
   * @param {Object} context - Activity context
   * @returns {string} Activity log ID
   */
  logUserActivity(userEmail, activity, context = {}) {
    const activityId = this.generateActivityId();
    const timestamp = new Date();
    
    const activityEvent = {
      id: activityId,
      timestamp: timestamp,
      userEmail: userEmail,
      activity: activity,
      context: {
        ...context,
        duration: context.duration || null,
        resourcesAccessed: context.resourcesAccessed || [],
        dataVolume: context.dataVolume || null,
        filters: context.filters || null
      },
      sessionInfo: {
        sessionId: context.sessionId || null,
        ipAddress: this.getCurrentIPAddress(),
        userAgent: this.getCurrentUserAgent()
      }
    };

    this.userActivityLog.push(activityEvent);
    
    // Maintain log size limit
    if (this.userActivityLog.length > this.maxActivityLogSize) {
      this.userActivityLog.shift(); // Remove oldest entry
    }

    // Analyze activity patterns
    this.analyzeUserActivityPatterns(userEmail, activityEvent);
    
    return activityId;
  }

  /**
   * Log data access with comprehensive details
   * @param {string} userEmail - User accessing data
   * @param {string} operation - Type of operation (read, write, delete, export)
   * @param {Object} dataContext - Data access context
   * @returns {string} Data access log ID
   */
  logDataAccess(userEmail, operation, dataContext = {}) {
    const details = {
      operation: operation,
      contractIds: dataContext.contractIds || [],
      filters: dataContext.filters || null,
      recordCount: dataContext.recordCount || 0,
      dataSize: dataContext.dataSize || 0,
      exportFormat: dataContext.exportFormat || null,
      queryParameters: dataContext.queryParameters || null,
      sessionId: dataContext.sessionId || null
    };

    // Determine risk level based on operation and context
    let riskLevel = RiskLevel.LOW;
    
    if (operation === 'delete') {
      riskLevel = RiskLevel.HIGH;
    } else if (operation === 'export' && details.recordCount > 100) {
      riskLevel = RiskLevel.MEDIUM;
    } else if (operation === 'bulk_read' && details.recordCount > 1000) {
      riskLevel = RiskLevel.MEDIUM;
    }

    return this.logAuditEvent(
      AuditCategory.DATA_ACCESS,
      `data_${operation}`,
      userEmail,
      details,
      riskLevel
    );
  }

  /**
   * Log authentication events
   * @param {string} userEmail - User email
   * @param {string} result - Authentication result (success, failure, locked)
   * @param {Object} context - Authentication context
   * @returns {string} Authentication log ID
   */
  logAuthentication(userEmail, result, context = {}) {
    const riskLevel = result === 'failure' ? RiskLevel.MEDIUM : RiskLevel.LOW;
    
    const details = {
      result: result,
      method: context.method || 'google_workspace',
      failureReason: context.failureReason || null,
      attemptNumber: context.attemptNumber || 1,
      lockoutTriggered: context.lockoutTriggered || false,
      sessionId: context.sessionId || null
    };

    return this.logAuditEvent(
      AuditCategory.AUTHENTICATION,
      `auth_${result}`,
      userEmail,
      details,
      riskLevel
    );
  }

  /**
   * Log authorization events
   * @param {string} userEmail - User email
   * @param {string} resource - Resource being accessed
   * @param {string} permission - Permission being checked
   * @param {boolean} granted - Whether access was granted
   * @param {Object} context - Authorization context
   * @returns {string} Authorization log ID
   */
  logAuthorization(userEmail, resource, permission, granted, context = {}) {
    const riskLevel = !granted ? RiskLevel.MEDIUM : RiskLevel.LOW;
    
    const details = {
      resource: resource,
      permission: permission,
      granted: granted,
      userRole: context.userRole || null,
      requiredRole: context.requiredRole || null,
      sessionId: context.sessionId || null
    };

    return this.logAuditEvent(
      AuditCategory.AUTHORIZATION,
      granted ? 'access_granted' : 'access_denied',
      userEmail,
      details,
      riskLevel
    );
  }

  /**
   * Detect and log unauthorized access attempts
   * @param {string} userEmail - User attempting access
   * @param {string} resource - Resource being accessed
   * @param {Object} context - Attempt context
   * @returns {string} Violation log ID
   */
  logUnauthorizedAccess(userEmail, resource, context = {}) {
    const violationId = this.generateViolationId();
    
    const details = {
      resource: resource,
      attemptedAction: context.attemptedAction || 'unknown',
      userRole: context.userRole || null,
      requiredPermission: context.requiredPermission || null,
      violationType: 'unauthorized_access',
      sessionId: context.sessionId || null,
      violationId: violationId
    };

    // Log as high-risk audit event
    const auditId = this.logAuditEvent(
      AuditCategory.SECURITY_VIOLATION,
      'unauthorized_access_attempt',
      userEmail,
      details,
      RiskLevel.HIGH
    );

    // Generate immediate security alert
    this.generateSecurityAlert({
      id: auditId,
      category: AuditCategory.SECURITY_VIOLATION,
      action: 'unauthorized_access_attempt',
      userEmail: userEmail,
      riskLevel: RiskLevel.HIGH,
      details: details,
      timestamp: new Date()
    });

    return violationId;
  }

  /**
   * Analyze user activity for suspicious patterns
   * @param {string} userEmail - User email
   * @param {Object} activityEvent - Current activity event
   */
  analyzeUserActivityPatterns(userEmail, activityEvent) {
    const recentActivities = this.getUserRecentActivities(userEmail, 24); // Last 24 hours
    
    // Check for unusual access times
    this.checkUnusualAccessTimes(userEmail, activityEvent, recentActivities);
    
    // Check for bulk data access patterns
    this.checkBulkDataAccess(userEmail, activityEvent, recentActivities);
    
    // Check for rapid successive actions
    this.checkRapidActions(userEmail, activityEvent, recentActivities);
  }

  /**
   * Analyze audit event for suspicious activity
   * @param {Object} auditEvent - Audit event to analyze
   */
  analyzeForSuspiciousActivity(auditEvent) {
    // Check for repeated failed authentication attempts
    if (auditEvent.action === 'auth_failure') {
      const recentFailures = this.auditLog.filter(e => 
        e.userEmail === auditEvent.userEmail &&
        e.action === 'auth_failure' &&
        (auditEvent.timestamp.getTime() - e.timestamp.getTime()) < (60 * 60 * 1000) // Last hour
      );
      
      if (recentFailures.length >= this.thresholds.failedLoginAttempts) {
        this.logSuspiciousActivity(
          auditEvent.userEmail,
          'multiple_failed_logins',
          {
            failureCount: recentFailures.length,
            timeWindow: '1 hour'
          }
        );
      }
    }
    
    // Check for unauthorized access patterns
    if (auditEvent.action === 'access_denied') {
      const recentDenials = this.auditLog.filter(e => 
        e.userEmail === auditEvent.userEmail &&
        e.action === 'access_denied' &&
        (auditEvent.timestamp.getTime() - e.timestamp.getTime()) < (60 * 60 * 1000) // Last hour
      );
      
      if (recentDenials.length >= this.thresholds.accessDenialsPerHour) {
        this.logSuspiciousActivity(
          auditEvent.userEmail,
          'privilege_escalation_attempts',
          {
            denialCount: recentDenials.length,
            timeWindow: '1 hour'
          }
        );
      }
    }
  }

  /**
   * Check for unusual access times
   * @param {string} userEmail - User email
   * @param {Object} currentActivity - Current activity
   * @param {Object[]} recentActivities - Recent activities
   */
  checkUnusualAccessTimes(userEmail, currentActivity, recentActivities) {
    const hour = currentActivity.timestamp.getHours();
    
    // Flag access outside normal business hours (9 AM - 6 PM)
    if (hour < 9 || hour > 18) {
      const offHoursCount = recentActivities.filter(a => {
        const activityHour = a.timestamp.getHours();
        return activityHour < 9 || activityHour > 18;
      }).length;
      
      if (offHoursCount > 5) { // More than 5 off-hours activities in 24 hours
        this.logSuspiciousActivity(
          userEmail,
          'unusual_access_times',
          {
            currentHour: hour,
            offHoursActivitiesCount: offHoursCount,
            pattern: 'frequent_off_hours_access'
          }
        );
      }
    }
  }

  /**
   * Check for bulk data access patterns
   * @param {string} userEmail - User email
   * @param {Object} currentActivity - Current activity
   * @param {Object[]} recentActivities - Recent activities
   */
  checkBulkDataAccess(userEmail, currentActivity, recentActivities) {
    if (currentActivity.context.dataVolume && currentActivity.context.dataVolume > 1000) {
      const bulkAccessCount = recentActivities.filter(a => 
        a.context.dataVolume && a.context.dataVolume > 1000
      ).length;
      
      if (bulkAccessCount > 3) { // More than 3 bulk accesses in 24 hours
        this.logSuspiciousActivity(
          userEmail,
          'bulk_data_access',
          {
            currentDataVolume: currentActivity.context.dataVolume,
            bulkAccessCount: bulkAccessCount,
            pattern: 'excessive_bulk_access'
          }
        );
      }
    }
  }

  /**
   * Check for rapid successive actions
   * @param {string} userEmail - User email
   * @param {Object} currentActivity - Current activity
   * @param {Object[]} recentActivities - Recent activities
   */
  checkRapidActions(userEmail, currentActivity, recentActivities) {
    const lastFiveMinutes = recentActivities.filter(a => 
      (currentActivity.timestamp.getTime() - a.timestamp.getTime()) < (5 * 60 * 1000)
    );
    
    if (lastFiveMinutes.length > 20) { // More than 20 actions in 5 minutes
      this.logSuspiciousActivity(
        userEmail,
        'rapid_actions',
        {
          actionsInFiveMinutes: lastFiveMinutes.length,
          pattern: 'automated_or_scripted_behavior'
        }
      );
    }
  }

  /**
   * Log suspicious activity
   * @param {string} userEmail - User email
   * @param {string} pattern - Suspicious pattern detected
   * @param {Object} details - Pattern details
   * @returns {string} Suspicious activity log ID
   */
  logSuspiciousActivity(userEmail, pattern, details = {}) {
    const suspiciousActivityDetails = {
      pattern: pattern,
      suspiciousScore: this.calculateSuspiciousScore(pattern, details),
      patternDetails: details,
      detectionTime: new Date(),
      recommendedAction: this.getRecommendedAction(pattern)
    };

    return this.logAuditEvent(
      AuditCategory.SECURITY_VIOLATION,
      'suspicious_activity_detected',
      userEmail,
      suspiciousActivityDetails,
      RiskLevel.HIGH
    );
  }

  /**
   * Calculate suspicious activity score
   * @param {string} pattern - Pattern type
   * @param {Object} details - Pattern details
   * @returns {number} Suspicious score (0-100)
   */
  calculateSuspiciousScore(pattern, details) {
    let score = 0;
    
    switch (pattern) {
      case 'unusual_access_times':
        score = Math.min(details.offHoursActivitiesCount * 10, 60);
        break;
      case 'bulk_data_access':
        score = Math.min(details.bulkAccessCount * 15, 70);
        break;
      case 'rapid_actions':
        score = Math.min(details.actionsInFiveMinutes * 2, 80);
        break;
      default:
        score = 50; // Default moderate score
    }
    
    return score;
  }

  /**
   * Get recommended action for suspicious pattern
   * @param {string} pattern - Pattern type
   * @returns {string} Recommended action
   */
  getRecommendedAction(pattern) {
    const actions = {
      'unusual_access_times': 'Monitor user activity and verify legitimate business need for off-hours access',
      'bulk_data_access': 'Review data access permissions and investigate business justification',
      'rapid_actions': 'Check for automated tools or scripts; may indicate compromised account',
      'multiple_failed_logins': 'Temporarily lock account and require password reset',
      'privilege_escalation_attempts': 'Immediately review user permissions and investigate intent'
    };
    
    return actions[pattern] || 'Investigate activity and take appropriate security measures';
  }

  /**
   * Generate security alert
   * @param {Object} auditEvent - Audit event triggering the alert
   * @returns {string} Alert ID
   */
  generateSecurityAlert(auditEvent) {
    const alertId = this.generateAlertId();
    const timestamp = new Date();
    
    const alert = {
      id: alertId,
      timestamp: timestamp,
      severity: this.mapRiskLevelToSeverity(auditEvent.riskLevel),
      category: auditEvent.category,
      title: this.generateAlertTitle(auditEvent),
      description: this.generateAlertDescription(auditEvent),
      userEmail: auditEvent.userEmail,
      relatedAuditEventId: auditEvent.id,
      status: 'open',
      assignedTo: null,
      resolvedAt: null,
      resolution: null
    };

    this.alertLog.push(alert);
    
    // Maintain alert log size limit
    if (this.alertLog.length > this.maxAlertLogSize) {
      this.alertLog.shift(); // Remove oldest entry
    }

    // Log alert to ErrorLogger
    errorLogger.logError(
      'ERROR',
      'SecurityAuditor',
      `Security Alert Generated: ${alert.title}`,
      {
        alertId: alertId,
        severity: alert.severity,
        userEmail: auditEvent.userEmail,
        category: auditEvent.category
      }
    );

    return alertId;
  }

  /**
   * Map risk level to alert severity
   * @param {string} riskLevel - Risk level
   * @returns {string} Alert severity
   */
  mapRiskLevelToSeverity(riskLevel) {
    const mapping = {
      [RiskLevel.LOW]: 'info',
      [RiskLevel.MEDIUM]: 'warning',
      [RiskLevel.HIGH]: 'error',
      [RiskLevel.CRITICAL]: 'critical'
    };
    
    return mapping[riskLevel] || 'info';
  }

  /**
   * Generate alert title
   * @param {Object} auditEvent - Audit event
   * @returns {string} Alert title
   */
  generateAlertTitle(auditEvent) {
    const titles = {
      'unauthorized_access_attempt': 'Unauthorized Access Attempt Detected',
      'suspicious_activity_detected': 'Suspicious User Activity Detected',
      'auth_failure': 'Multiple Authentication Failures',
      'data_delete': 'High-Risk Data Deletion Operation',
      'bulk_data_access': 'Bulk Data Access Detected'
    };
    
    return titles[auditEvent.action] || `Security Event: ${auditEvent.action}`;
  }

  /**
   * Generate alert description
   * @param {Object} auditEvent - Audit event
   * @returns {string} Alert description
   */
  generateAlertDescription(auditEvent) {
    const user = auditEvent.userEmail || 'Unknown user';
    const action = auditEvent.action;
    const timestamp = auditEvent.timestamp.toISOString();
    
    let description = `User ${user} triggered a ${auditEvent.riskLevel} risk security event (${action}) at ${timestamp}.`;
    
    if (auditEvent.details.violationType) {
      description += ` Violation type: ${auditEvent.details.violationType}.`;
    }
    
    if (auditEvent.details.recommendedAction) {
      description += ` Recommended action: ${auditEvent.details.recommendedAction}.`;
    }
    
    return description;
  }

  /**
   * Get user's recent activities
   * @param {string} userEmail - User email
   * @param {number} hours - Number of hours to look back
   * @returns {Object[]} Recent activities
   */
  getUserRecentActivities(userEmail, hours = 24) {
    const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000));
    
    return this.userActivityLog.filter(activity => 
      activity.userEmail === userEmail && activity.timestamp >= cutoffTime
    );
  }

  /**
   * Get audit events by category
   * @param {string} category - Audit category
   * @param {number} limit - Maximum number of events
   * @returns {Object[]} Filtered audit events
   */
  getAuditEventsByCategory(category, limit = 100) {
    return this.auditLog
      .filter(event => event.category === category)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Get audit events by user
   * @param {string} userEmail - User email
   * @param {number} limit - Maximum number of events
   * @returns {Object[]} Filtered audit events
   */
  getAuditEventsByUser(userEmail, limit = 100) {
    return this.auditLog
      .filter(event => event.userEmail === userEmail)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Get security alerts by status
   * @param {string} status - Alert status (open, resolved, investigating)
   * @param {number} limit - Maximum number of alerts
   * @returns {Object[]} Filtered alerts
   */
  getAlertsByStatus(status, limit = 50) {
    return this.alertLog
      .filter(alert => alert.status === status)
      .slice(-limit)
      .reverse(); // Most recent first
  }

  /**
   * Generate comprehensive audit report
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @param {string[]} categories - Categories to include
   * @returns {Object} Comprehensive audit report
   */
  generateAuditReport(startDate = null, endDate = null, categories = null) {
    const now = new Date();
    const start = startDate || new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000)); // Default: last 30 days
    const end = endDate || now;
    
    let eventsInRange = this.auditLog.filter(event => 
      event.timestamp >= start && event.timestamp <= end
    );
    
    if (categories) {
      eventsInRange = eventsInRange.filter(event => 
        categories.includes(event.category)
      );
    }

    const report = {
      reportId: this.generateReportId(),
      generatedAt: now,
      period: { start, end },
      categories: categories || Object.values(AuditCategory),
      summary: {
        totalEvents: eventsInRange.length,
        eventsByCategory: this.groupEventsByCategory(eventsInRange),
        eventsByRiskLevel: this.groupEventsByRiskLevel(eventsInRange),
        uniqueUsers: new Set(eventsInRange.map(e => e.userEmail)).size,
        topUsers: this.getTopUsersByActivity(eventsInRange, 10),
        alertsGenerated: this.alertLog.filter(a => a.timestamp >= start && a.timestamp <= end).length
      },
      trends: {
        dailyEventCounts: this.calculateDailyEventCounts(eventsInRange),
        hourlyDistribution: this.calculateHourlyDistribution(eventsInRange),
        riskTrends: this.calculateRiskTrends(eventsInRange)
      },
      securityMetrics: {
        authenticationFailureRate: this.calculateAuthFailureRate(eventsInRange),
        unauthorizedAccessAttempts: eventsInRange.filter(e => e.action === 'unauthorized_access_attempt').length,
        suspiciousActivities: eventsInRange.filter(e => e.action === 'suspicious_activity_detected').length,
        dataExportVolume: this.calculateDataExportVolume(eventsInRange)
      },
      recommendations: this.generateAuditRecommendations(eventsInRange)
    };

    return report;
  }

  /**
   * Group events by category
   * @param {Object[]} events - Audit events
   * @returns {Object} Events grouped by category
   */
  groupEventsByCategory(events) {
    const grouped = {};
    
    events.forEach(event => {
      if (!grouped[event.category]) {
        grouped[event.category] = 0;
      }
      grouped[event.category]++;
    });

    return grouped;
  }

  /**
   * Group events by risk level
   * @param {Object[]} events - Audit events
   * @returns {Object} Events grouped by risk level
   */
  groupEventsByRiskLevel(events) {
    const grouped = {};
    
    events.forEach(event => {
      if (!grouped[event.riskLevel]) {
        grouped[event.riskLevel] = 0;
      }
      grouped[event.riskLevel]++;
    });

    return grouped;
  }

  /**
   * Get top users by activity
   * @param {Object[]} events - Audit events
   * @param {number} limit - Number of top users to return
   * @returns {Object[]} Top users by activity
   */
  getTopUsersByActivity(events, limit = 10) {
    const userCounts = {};
    
    events.forEach(event => {
      const user = event.userEmail || 'unknown';
      userCounts[user] = (userCounts[user] || 0) + 1;
    });

    return Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([user, count]) => ({ user, eventCount: count }));
  }

  /**
   * Calculate daily event counts
   * @param {Object[]} events - Audit events
   * @returns {Object[]} Daily event counts
   */
  calculateDailyEventCounts(events) {
    const dailyCounts = {};
    
    events.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0];
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    return Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }

  /**
   * Calculate hourly distribution
   * @param {Object[]} events - Audit events
   * @returns {Object[]} Hourly distribution
   */
  calculateHourlyDistribution(events) {
    const hourlyCounts = Array(24).fill(0);
    
    events.forEach(event => {
      const hour = event.timestamp.getHours();
      hourlyCounts[hour]++;
    });

    return hourlyCounts.map((count, hour) => ({ hour, count }));
  }

  /**
   * Calculate risk trends over time
   * @param {Object[]} events - Audit events
   * @returns {Object} Risk trends
   */
  calculateRiskTrends(events) {
    const riskByDay = {};
    
    events.forEach(event => {
      const date = event.timestamp.toISOString().split('T')[0];
      if (!riskByDay[date]) {
        riskByDay[date] = {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        };
      }
      riskByDay[date][event.riskLevel]++;
    });

    return Object.entries(riskByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, risks]) => ({ date, ...risks }));
  }

  /**
   * Calculate authentication failure rate
   * @param {Object[]} events - Audit events
   * @returns {number} Failure rate percentage
   */
  calculateAuthFailureRate(events) {
    const authEvents = events.filter(e => e.category === AuditCategory.AUTHENTICATION);
    const failures = authEvents.filter(e => e.action === 'auth_failure').length;
    
    return authEvents.length > 0 ? (failures / authEvents.length) * 100 : 0;
  }

  /**
   * Calculate data export volume
   * @param {Object[]} events - Audit events
   * @returns {Object} Export volume statistics
   */
  calculateDataExportVolume(events) {
    const exportEvents = events.filter(e => 
      e.category === AuditCategory.DATA_ACCESS && 
      e.action === 'data_export'
    );
    
    const totalRecords = exportEvents.reduce((sum, event) => 
      sum + (event.details.recordCount || 0), 0
    );
    
    const totalSize = exportEvents.reduce((sum, event) => 
      sum + (event.details.dataSize || 0), 0
    );

    return {
      exportCount: exportEvents.length,
      totalRecords: totalRecords,
      totalSize: totalSize,
      averageRecordsPerExport: exportEvents.length > 0 ? totalRecords / exportEvents.length : 0
    };
  }

  /**
   * Generate audit recommendations
   * @param {Object[]} events - Audit events
   * @returns {string[]} Recommendations
   */
  generateAuditRecommendations(events) {
    const recommendations = [];
    
    const highRiskEvents = events.filter(e => e.riskLevel === RiskLevel.HIGH || e.riskLevel === RiskLevel.CRITICAL);
    if (highRiskEvents.length > 0) {
      recommendations.push(`${highRiskEvents.length} high-risk security events detected. Immediate investigation recommended.`);
    }
    
    const authFailures = events.filter(e => e.action === 'auth_failure').length;
    const totalAuth = events.filter(e => e.category === AuditCategory.AUTHENTICATION).length;
    if (totalAuth > 0 && (authFailures / totalAuth) > 0.1) {
      recommendations.push('High authentication failure rate detected. Review user training and password policies.');
    }
    
    const unauthorizedAttempts = events.filter(e => e.action === 'unauthorized_access_attempt').length;
    if (unauthorizedAttempts > 0) {
      recommendations.push(`${unauthorizedAttempts} unauthorized access attempts detected. Review user permissions and access controls.`);
    }
    
    const offHoursEvents = events.filter(e => {
      const hour = e.timestamp.getHours();
      return hour < 9 || hour > 18;
    }).length;
    
    if (offHoursEvents > events.length * 0.2) {
      recommendations.push('Significant off-hours activity detected. Consider implementing additional monitoring for non-business hours.');
    }
    
    return recommendations;
  }

  /**
   * Log to ErrorLogger for integration
   * @param {Object} auditEvent - Audit event to log
   */
  logToErrorLogger(auditEvent) {
    const logLevel = auditEvent.riskLevel === RiskLevel.HIGH || auditEvent.riskLevel === RiskLevel.CRITICAL ? 'ERROR' : 
                    auditEvent.riskLevel === RiskLevel.MEDIUM ? 'WARN' : 'INFO';
    
    errorLogger.logError(
      logLevel,
      'SecurityAuditor',
      `Audit Event: ${auditEvent.category} - ${auditEvent.action}`,
      {
        auditId: auditEvent.id,
        category: auditEvent.category,
        action: auditEvent.action,
        userEmail: auditEvent.userEmail,
        riskLevel: auditEvent.riskLevel,
        details: auditEvent.details
      }
    );
  }

  /**
   * Export audit log to CSV
   * @param {Date} startDate - Start date filter
   * @param {Date} endDate - End date filter
   * @returns {string} CSV formatted audit log
   */
  exportAuditLogToCSV(startDate = null, endDate = null) {
    let events = this.auditLog;
    
    if (startDate || endDate) {
      events = events.filter(event => {
        const eventDate = event.timestamp;
        return (!startDate || eventDate >= startDate) && (!endDate || eventDate <= endDate);
      });
    }
    
    if (events.length === 0) {
      return 'No audit events to export';
    }

    const headers = ['ID', 'Timestamp', 'Category', 'Action', 'User Email', 'Risk Level', 'Details'];
    const csvRows = [headers.join(',')];

    events.forEach(event => {
      const row = [
        event.id,
        event.timestamp.toISOString(),
        event.category,
        event.action,
        event.userEmail || '',
        event.riskLevel,
        `"${JSON.stringify(event.details).replace(/"/g, '""')}"` // Escape quotes
      ];
      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * Generate unique audit ID
   * @returns {string} Unique audit ID
   */
  generateAuditId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `AUD_${timestamp}_${random}`;
  }

  /**
   * Generate unique activity ID
   * @returns {string} Unique activity ID
   */
  generateActivityId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `ACT_${timestamp}_${random}`;
  }

  /**
   * Generate unique alert ID
   * @returns {string} Unique alert ID
   */
  generateAlertId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `ALT_${timestamp}_${random}`;
  }

  /**
   * Generate unique violation ID
   * @returns {string} Unique violation ID
   */
  generateViolationId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `VIO_${timestamp}_${random}`;
  }

  /**
   * Generate unique request ID
   * @returns {string} Unique request ID
   */
  generateRequestId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 4);
    return `REQ_${timestamp}_${random}`;
  }

  /**
   * Generate unique report ID
   * @returns {string} Unique report ID
   */
  generateReportId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `AUDRPT_${timestamp}_${random}`;
  }

  /**
   * Get current IP address (placeholder for Google Apps Script)
   * @returns {string} IP address placeholder
   */
  getCurrentIPAddress() {
    return 'GAS_ENVIRONMENT';
  }

  /**
   * Get current user agent (placeholder for Google Apps Script)
   * @returns {string} User agent placeholder
   */
  getCurrentUserAgent() {
    return 'Google_Apps_Script';
  }
}

// Create global instance for use throughout the application
const securityAuditor = new SecurityAuditor();