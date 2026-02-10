/**
 * DashboardController - Main application controller
 * Manages overall application state and coordination between components
 * Integrates all services and controllers for complete dashboard functionality
 */

/**
 * DashboardController class for application coordination
 */
class DashboardController {
  constructor() {
    // Core services
    this.dataService = new DataService();
    this.financialAnalyzer = new FinancialAnalyzer();
    this.personnelManager = new PersonnelManager();
    this.timelineTracker = new Timeline_Tracker();
    this.exportService = new ExportService();
    this.accessController = new AccessController();
    this.securityAuditor = new SecurityAuditor();
    
    // UI controllers
    this.filterController = new FilterController();
    this.visualizationManager = new VisualizationManager();
    this.dataTableManager = new DataTableManager();
    
    // Application state
    this.isInitialized = false;
    this.currentUser = null;
    this.contractData = [];
    this.filteredData = [];
    this.isLoading = false;
    this.errorState = null;
    
    // Event listeners and UI elements
    this.uiElements = {};
    this.eventListeners = [];
    
    // Performance monitoring
    this.performanceMetrics = {
      initializationTime: 0,
      dataLoadTime: 0,
      filterTime: 0,
      visualizationTime: 0,
      lastRefresh: null
    };
    
    // Health monitoring
    this.healthStatus = {
      dataService: 'unknown',
      authentication: 'unknown',
      visualizations: 'unknown',
      filters: 'unknown',
      exports: 'unknown'
    };
  }

  /**
   * Get current time in milliseconds (browser-safe)
   */
  now() {
    return typeof performance !== 'undefined' && performance.now 
      ? performance.now() 
      : Date.now();
  }

  /**
   * Initialize the dashboard application with complete component integration
   */
  async initialize() {
    const startTime = this.now();
    
    try {
      this.showLoading('Initializing dashboard...');
      
      // Step 1: Initialize security and authentication
      await this.initializeSecurity();
      
      // Step 2: Load and process data
      await this.loadAndProcessData();
      
      // Step 3: Initialize UI components
      await this.initializeUIComponents();
      
      // Step 4: Wire component interactions
      this.wireComponentInteractions();
      
      // Step 5: Set up event listeners
      this.setupEventListeners();
      
      // Step 6: Perform initial render
      await this.performInitialRender();
      
      // Step 7: Start health monitoring
      this.startHealthMonitoring();
      
      this.isInitialized = true;
      this.performanceMetrics.initializationTime = this.now() - startTime;
      
      this.hideLoading();
      this.showSuccessMessage('Dashboard initialized successfully');
      
      // Log successful initialization
      this.securityAuditor.logEvent('dashboard_initialized', {
        user: this.currentUser?.email,
        initTime: this.performanceMetrics.initializationTime,
        dataCount: this.contractData.length
      });
      
    } catch (error) {
      this.handleError(error, 'Failed to initialize dashboard');
      throw error;
    }
  }

  /**
   * Initialize security and authentication
   */
  async initializeSecurity() {
    try {
      // Authenticate user
      this.currentUser = await this.accessController.getCurrentUser();
      
      if (!this.currentUser) {
        throw new Error('Authentication required');
      }
      
      // Verify permissions
      const hasAccess = await this.accessController.checkDataAccess(this.currentUser);
      if (!hasAccess) {
        throw new Error('Insufficient permissions to access contract data');
      }
      
      this.healthStatus.authentication = 'healthy';
      
    } catch (error) {
      this.healthStatus.authentication = 'error';
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Load and process contract data
   */
  async loadAndProcessData() {
    const startTime = this.now();
    
    try {
      this.updateLoadingProgress('Loading contract data...', 20);
      
      // Load raw data
      this.contractData = await this.dataService.loadContractData();
      
      this.updateLoadingProgress('Processing financial data...', 40);
      
      // Initialize analyzers with data
      this.financialAnalyzer.setContractData(this.contractData);
      this.personnelManager.setContractData(this.contractData);
      this.timelineTracker.setContractData(this.contractData);
      
      this.updateLoadingProgress('Validating data integrity...', 60);
      
      // Validate data integrity
      const validationResult = this.dataService.validateDataIntegrity(this.contractData);
      if (!validationResult.isValid) {
        console.warn('Data validation issues found:', validationResult.errors);
      }
      
      this.performanceMetrics.dataLoadTime = this.now() - startTime;
      this.healthStatus.dataService = 'healthy';
      
    } catch (error) {
      this.healthStatus.dataService = 'error';
      throw new Error(`Data loading failed: ${error.message}`);
    }
  }

  /**
   * Initialize UI components
   */
  async initializeUIComponents() {
    try {
      this.updateLoadingProgress('Initializing filters...', 70);
      
      // Initialize filter controller
      this.filterController.initializeFilters(this.contractData);
      this.filteredData = [...this.contractData];
      
      this.updateLoadingProgress('Setting up visualizations...', 80);
      
      // Initialize visualization manager
      this.visualizationManager.initializeCharts(this.contractData);
      
      this.updateLoadingProgress('Preparing data table...', 90);
      
      // Initialize data table
      this.dataTableManager.initialize(this.contractData);
      
      // Cache UI elements
      this.cacheUIElements();
      
      this.healthStatus.filters = 'healthy';
      this.healthStatus.visualizations = 'healthy';
      
    } catch (error) {
      this.healthStatus.filters = 'error';
      this.healthStatus.visualizations = 'error';
      throw new Error(`UI initialization failed: ${error.message}`);
    }
  }

  /**
   * Wire interactions between components
   */
  wireComponentInteractions() {
    // Filter controller updates trigger visualization and table updates
    this.filterController.onFilterChange = (filteredData) => {
      this.filteredData = filteredData;
      this.updateVisualizationsWithFilteredData(filteredData);
      this.updateDataTableWithFilteredData(filteredData);
      this.updateExportData(filteredData);
    };
    
    // Visualization interactions trigger data table updates
    this.visualizationManager.onChartClick = (dataPoint) => {
      this.handleChartInteraction(dataPoint);
    };
    
    // Data table interactions trigger detail views
    this.dataTableManager.onRowClick = (contractData) => {
      this.showContractDetails(contractData);
    };
    
    // Export service uses current filtered data
    this.exportService.getFilteredData = () => this.filteredData;
    this.exportService.getFilterCriteria = () => this.filterController.getActiveFilters();
  }

  /**
   * Set up event listeners for UI interactions
   */
  setupEventListeners() {
    // Refresh button
    this.addEventListener('refreshBtn', 'click', () => this.refreshDashboard());
    
    // Export button
    this.addEventListener('exportBtn', 'click', () => this.showExportDialog());
    
    // Clear filters button
    this.addEventListener('clearFiltersBtn', 'click', () => this.clearAllFilters());
    
    // Search input with debouncing
    this.addEventListener('searchInput', 'input', this.debounce((e) => {
      this.applyTextFilter(e.target.value);
    }, 300));
    
    // Filter dropdowns
    this.addEventListener('statusFilter', 'change', (e) => this.applyStatusFilter(e));
    this.addEventListener('organizationFilter', 'change', (e) => this.applyOrganizationFilter(e));
    this.addEventListener('contractTypeFilter', 'change', (e) => this.applyContractTypeFilter(e));
    
    // Date range filters
    this.addEventListener('startDateFilter', 'change', () => this.applyDateRangeFilter());
    this.addEventListener('endDateFilter', 'change', () => this.applyDateRangeFilter());
    
    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      this.addEventListener(btn, 'click', (e) => this.switchSection(e.target.dataset.section));
    });
    
    // Window resize for responsive charts
    window.addEventListener('resize', this.debounce(() => {
      this.visualizationManager.handleResize();
    }, 250));
  }

  /**
   * Perform initial render of all components
   */
  async performInitialRender() {
    const startTime = this.now();
    
    try {
      // Render initial visualizations
      await this.visualizationManager.updateCharts(this.contractData);
      
      // Render initial data table
      this.dataTableManager.renderTable(this.contractData);
      
      // Update summary statistics
      this.updateSummaryStatistics(this.contractData);
      
      // Update filter options
      this.updateFilterOptions(this.contractData);
      
      this.performanceMetrics.visualizationTime = this.now() - startTime;
      
    } catch (error) {
      throw new Error(`Initial render failed: ${error.message}`);
    }
  }

  /**
   * Load contract data with error handling and caching
   * @returns {Promise<ContractData[]>} Promise resolving to contract data
   */
  async loadData() {
    if (this.isLoading) {
      return this.contractData;
    }
    
    this.isLoading = true;
    const startTime = this.now();
    
    try {
      this.showLoading('Loading contract data...');
      
      // Load data through data service
      this.contractData = await this.dataService.loadContractData();
      
      // Update all components with new data
      if (this.isInitialized) {
        await this.updateAllComponentsWithNewData();
      }
      
      this.performanceMetrics.dataLoadTime = this.now() - startTime;
      this.performanceMetrics.lastRefresh = new Date();
      
      this.hideLoading();
      return this.contractData;
      
    } catch (error) {
      this.handleError(error, 'Failed to load contract data');
      return [];
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Handle application errors with comprehensive error management
   * @param {Error} error - Error to handle
   * @param {string} context - Context where error occurred
   */
  handleError(error, context = 'Unknown') {
    console.error(`Dashboard Error [${context}]:`, error);
    
    // Log error for security audit
    this.securityAuditor.logEvent('dashboard_error', {
      error: error.message,
      context: context,
      user: this.currentUser?.email,
      timestamp: new Date().toISOString(),
      stack: error.stack
    });
    
    // Update error state
    this.errorState = {
      message: error.message,
      context: context,
      timestamp: new Date(),
      recovered: false
    };
    
    // Show user-friendly error message
    this.showErrorMessage(`${context}: ${error.message}`);
    
    // Attempt recovery based on error type
    this.attemptErrorRecovery(error, context);
    
    // Update health status
    this.updateHealthStatusForError(context);
  }

  /**
   * Refresh the entire dashboard
   */
  async refreshDashboard() {
    try {
      this.showLoading('Refreshing dashboard...');
      
      // Clear caches
      this.dataService.clearCache();
      
      // Reload data
      await this.loadData();
      
      // Reset filters
      this.filterController.initializeFilters(this.contractData);
      this.filteredData = [...this.contractData];
      
      // Update all visualizations
      await this.visualizationManager.updateCharts(this.contractData);
      
      // Update data table
      this.dataTableManager.renderTable(this.contractData);
      
      // Update summary statistics
      this.updateSummaryStatistics(this.contractData);
      
      this.hideLoading();
      this.showSuccessMessage('Dashboard refreshed successfully');
      
      // Log refresh event
      this.securityAuditor.logEvent('dashboard_refreshed', {
        user: this.currentUser?.email,
        dataCount: this.contractData.length
      });
      
    } catch (error) {
      this.handleError(error, 'Dashboard refresh failed');
    }
  }

  // Additional helper methods for component integration...
  
  /**
   * Update visualizations with filtered data
   */
  updateVisualizationsWithFilteredData(filteredData) {
    const startTime = this.now();
    
    try {
      this.visualizationManager.updateCharts(filteredData);
      this.updateSummaryStatistics(filteredData);
      
      this.performanceMetrics.filterTime = this.now() - startTime;
      
    } catch (error) {
      console.error('Failed to update visualizations:', error);
    }
  }

  /**
   * Update data table with filtered data
   */
  updateDataTableWithFilteredData(filteredData) {
    try {
      this.dataTableManager.renderTable(filteredData);
      this.updateTableSummary(filteredData);
      
    } catch (error) {
      console.error('Failed to update data table:', error);
    }
  }

  /**
   * Update export data reference
   */
  updateExportData(filteredData) {
    this.exportService.setCurrentData(filteredData);
  }

  /**
   * Cache UI elements for performance
   */
  cacheUIElements() {
    this.uiElements = {
      loadingOverlay: document.getElementById('loadingOverlay'),
      loadingProgress: document.getElementById('loadingProgress'),
      loadingProgressText: document.getElementById('loadingProgressText'),
      connectionStatus: document.getElementById('connectionStatus'),
      refreshBtn: document.getElementById('refreshBtn'),
      exportBtn: document.getElementById('exportBtn'),
      clearFiltersBtn: document.getElementById('clearFiltersBtn'),
      searchInput: document.getElementById('searchInput'),
      statusFilter: document.getElementById('statusFilter'),
      organizationFilter: document.getElementById('organizationFilter'),
      contractTypeFilter: document.getElementById('contractTypeFilter'),
      startDateFilter: document.getElementById('startDateFilter'),
      endDateFilter: document.getElementById('endDateFilter')
    };
  }

  /**
   * Add event listener with cleanup tracking
   */
  addEventListener(elementOrId, event, handler) {
    const element = typeof elementOrId === 'string' 
      ? document.getElementById(elementOrId) 
      : elementOrId;
      
    if (element) {
      element.addEventListener(event, handler);
      this.eventListeners.push({ element, event, handler });
    }
  }

  /**
   * Debounce utility for performance optimization
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  /**
   * Show loading overlay with progress
   */
  showLoading(message = 'Loading...') {
    if (this.uiElements.loadingOverlay) {
      this.uiElements.loadingOverlay.style.display = 'flex';
      const loadingText = this.uiElements.loadingOverlay.querySelector('.loading-text');
      if (loadingText) {
        loadingText.textContent = message;
      }
    }
  }

  /**
   * Update loading progress
   */
  updateLoadingProgress(message, percentage) {
    if (this.uiElements.loadingProgress) {
      this.uiElements.loadingProgress.style.width = `${percentage}%`;
    }
    if (this.uiElements.loadingProgressText) {
      this.uiElements.loadingProgressText.textContent = `${percentage}%`;
    }
    
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) {
      loadingText.textContent = message;
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoading() {
    if (this.uiElements.loadingOverlay) {
      this.uiElements.loadingOverlay.style.display = 'none';
    }
  }

  /**
   * Show success message
   */
  showSuccessMessage(message) {
    // Implementation for success notifications
    console.log('Success:', message);
  }

  /**
   * Show error message
   */
  showErrorMessage(message) {
    // Implementation for error notifications
    console.error('Error:', message);
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    // Only run in browser environment
    if (typeof setInterval !== 'undefined') {
      this.healthMonitorInterval = setInterval(() => {
        this.checkSystemHealth();
      }, 30000); // Check every 30 seconds
    }
  }

  /**
   * Check system health
   */
  checkSystemHealth() {
    // Implementation for health monitoring
    const healthReport = {
      timestamp: new Date(),
      status: this.healthStatus,
      performance: this.performanceMetrics,
      dataCount: this.contractData.length,
      filteredCount: this.filteredData.length
    };
    
    console.log('Health Report:', healthReport);
  }

  // Filter application methods
  applyTextFilter(searchText) {
    this.filterController.applyTextSearch(searchText);
  }

  applyStatusFilter(event) {
    const selectedValues = Array.from(event.target.selectedOptions).map(option => option.value);
    this.filterController.applyMultiSelectFilter('status', selectedValues);
  }

  applyOrganizationFilter(event) {
    const selectedValues = Array.from(event.target.selectedOptions).map(option => option.value);
    this.filterController.applyMultiSelectFilter('clientBureau', selectedValues);
  }

  applyContractTypeFilter(event) {
    const selectedValues = Array.from(event.target.selectedOptions).map(option => option.value);
    this.filterController.applyMultiSelectFilter('contractType', selectedValues);
  }

  applyDateRangeFilter() {
    const startDate = this.uiElements.startDateFilter?.value;
    const endDate = this.uiElements.endDateFilter?.value;
    
    if (startDate && endDate) {
      this.filterController.applyDateRangeFilter(new Date(startDate), new Date(endDate));
    }
  }

  clearAllFilters() {
    this.filterController.clearAllFilters();
    
    // Reset UI elements
    if (this.uiElements.searchInput) this.uiElements.searchInput.value = '';
    if (this.uiElements.statusFilter) this.uiElements.statusFilter.selectedIndex = -1;
    if (this.uiElements.organizationFilter) this.uiElements.organizationFilter.selectedIndex = -1;
    if (this.uiElements.contractTypeFilter) this.uiElements.contractTypeFilter.selectedIndex = -1;
    if (this.uiElements.startDateFilter) this.uiElements.startDateFilter.value = '';
    if (this.uiElements.endDateFilter) this.uiElements.endDateFilter.value = '';
  }

  /**
   * Update summary statistics display
   */
  updateSummaryStatistics(data) {
    const summary = this.financialAnalyzer.calculateTotalValues(data);
    
    // Update KPI displays
    const elements = {
      totalContracts: document.getElementById('totalContracts'),
      totalValue: document.getElementById('totalValue'),
      activeContracts: document.getElementById('activeContracts'),
      completedContracts: document.getElementById('completedContracts')
    };
    
    if (elements.totalContracts) elements.totalContracts.textContent = data.length;
    if (elements.totalValue) elements.totalValue.textContent = this.formatCurrency(summary.totalContractValue);
    if (elements.activeContracts) elements.activeContracts.textContent = summary.activeContractsCount || 0;
    if (elements.completedContracts) elements.completedContracts.textContent = summary.completedContractsCount || 0;
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Remove event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });
    this.eventListeners = [];
    
    // Clear intervals
    if (this.healthMonitorInterval && typeof clearInterval !== 'undefined') {
      clearInterval(this.healthMonitorInterval);
    }
    
    // Cleanup components
    if (this.visualizationManager) {
      this.visualizationManager.cleanup();
    }
  }

  /**
   * Update all components with new data
   */
  async updateAllComponentsWithNewData() {
    try {
      // Update analyzers
      this.financialAnalyzer.setContractData(this.contractData);
      this.personnelManager.setContractData(this.contractData);
      this.timelineTracker.setContractData(this.contractData);
      
      // Reinitialize filters
      this.filterController.initializeFilters(this.contractData);
      this.filteredData = [...this.contractData];
      
      // Update visualizations
      await this.visualizationManager.updateCharts(this.contractData);
      
      // Update data table
      this.dataTableManager.renderTable(this.contractData);
      
      // Update summary
      this.updateSummaryStatistics(this.contractData);
      
      // Update filter options
      this.updateFilterOptions(this.contractData);
      
    } catch (error) {
      console.error('Failed to update components with new data:', error);
    }
  }

  /**
   * Update filter options based on current data
   */
  updateFilterOptions(data) {
    try {
      // Update status options
      const statuses = [...new Set(data.map(item => item.status).filter(Boolean))];
      this.updateSelectOptions('statusFilter', statuses);
      
      // Update organization options
      const organizations = [...new Set(data.map(item => item.clientBureau).filter(Boolean))];
      this.updateSelectOptions('organizationFilter', organizations);
      
      // Update contract type options
      const contractTypes = [...new Set(data.map(item => item.contractType).filter(Boolean))];
      this.updateSelectOptions('contractTypeFilter', contractTypes);
      
    } catch (error) {
      console.error('Failed to update filter options:', error);
    }
  }

  /**
   * Update select element options
   */
  updateSelectOptions(selectId, options) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) return;
    
    // Clear existing options except the first (placeholder)
    const firstOption = selectElement.firstElementChild;
    selectElement.innerHTML = '';
    if (firstOption && firstOption.value === '') {
      selectElement.appendChild(firstOption);
    }
    
    // Add new options
    options.sort().forEach(option => {
      const optionElement = document.createElement('option');
      optionElement.value = option;
      optionElement.textContent = option;
      selectElement.appendChild(optionElement);
    });
  }

  /**
   * Handle chart interaction (drill-down functionality)
   */
  handleChartInteraction(dataPoint) {
    try {
      // Apply filter based on chart interaction
      if (dataPoint.type === 'status') {
        this.filterController.applyMultiSelectFilter('status', [dataPoint.value]);
      } else if (dataPoint.type === 'organization') {
        this.filterController.applyMultiSelectFilter('clientBureau', [dataPoint.value]);
      } else if (dataPoint.type === 'contractType') {
        this.filterController.applyMultiSelectFilter('contractType', [dataPoint.value]);
      }
      
      // Update UI to reflect the filter
      this.updateUIForChartFilter(dataPoint);
      
    } catch (error) {
      console.error('Failed to handle chart interaction:', error);
    }
  }

  /**
   * Update UI elements to reflect chart-based filtering
   */
  updateUIForChartFilter(dataPoint) {
    if (dataPoint.type === 'status' && this.uiElements.statusFilter) {
      Array.from(this.uiElements.statusFilter.options).forEach(option => {
        option.selected = option.value === dataPoint.value;
      });
    } else if (dataPoint.type === 'organization' && this.uiElements.organizationFilter) {
      Array.from(this.uiElements.organizationFilter.options).forEach(option => {
        option.selected = option.value === dataPoint.value;
      });
    } else if (dataPoint.type === 'contractType' && this.uiElements.contractTypeFilter) {
      Array.from(this.uiElements.contractTypeFilter.options).forEach(option => {
        option.selected = option.value === dataPoint.value;
      });
    }
  }

  /**
   * Show contract details in modal or side panel
   */
  showContractDetails(contractData) {
    try {
      // Create or update contract details modal
      this.createContractDetailsModal(contractData);
      
      // Log detail view for audit
      this.securityAuditor.logEvent('contract_detail_viewed', {
        user: this.currentUser?.email,
        contractId: contractData.award,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Failed to show contract details:', error);
    }
  }

  /**
   * Create contract details modal
   */
  createContractDetailsModal(contractData) {
    // Remove existing modal if present
    const existingModal = document.getElementById('contractDetailsModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // Create modal HTML
    const modal = document.createElement('div');
    modal.id = 'contractDetailsModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Contract Details</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="contract-details-grid">
            <div class="detail-group">
              <label>Award Number:</label>
              <span>${contractData.award || 'N/A'}</span>
            </div>
            <div class="detail-group">
              <label>Project:</label>
              <span>${contractData.project || 'N/A'}</span>
            </div>
            <div class="detail-group">
              <label>Status:</label>
              <span class="status-badge status-${(contractData.status || '').toLowerCase()}">${contractData.status || 'N/A'}</span>
            </div>
            <div class="detail-group">
              <label>Award Value:</label>
              <span>${this.formatCurrency(contractData.awardValue)}</span>
            </div>
            <div class="detail-group">
              <label>Ceiling:</label>
              <span>${this.formatCurrency(contractData.ceiling)}</span>
            </div>
            <div class="detail-group">
              <label>Organization:</label>
              <span>${contractData.clientBureau || 'N/A'}</span>
            </div>
            <div class="detail-group">
              <label>Project Manager:</label>
              <span>${contractData.projectManager || 'N/A'}</span>
            </div>
            <div class="detail-group">
              <label>Award Date:</label>
              <span>${contractData.awardDate ? new Date(contractData.awardDate).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div class="detail-group">
              <label>Project End:</label>
              <span>${contractData.projectEnd ? new Date(contractData.projectEnd).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Close</button>
          <button class="btn btn-primary" onclick="dashboardController.exportContractDetails('${contractData.award}')">Export Details</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Export individual contract details
   */
  async exportContractDetails(awardNumber) {
    try {
      const contract = this.contractData.find(c => c.award === awardNumber);
      if (!contract) {
        throw new Error('Contract not found');
      }
      
      await this.exportService.exportContractDetails(contract);
      this.showSuccessMessage('Contract details exported successfully');
      
    } catch (error) {
      this.handleError(error, 'Failed to export contract details');
    }
  }

  /**
   * Show export dialog
   */
  showExportDialog() {
    try {
      // Create export options modal
      this.createExportModal();
      
    } catch (error) {
      this.handleError(error, 'Failed to show export dialog');
    }
  }

  /**
   * Create export options modal
   */
  createExportModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('exportModal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'exportModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Export Data</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="export-options">
            <div class="export-format-group">
              <label>Export Format:</label>
              <div class="radio-group">
                <label><input type="radio" name="exportFormat" value="csv" checked> CSV</label>
                <label><input type="radio" name="exportFormat" value="excel"> Excel</label>
                <label><input type="radio" name="exportFormat" value="pdf"> PDF Report</label>
              </div>
            </div>
            <div class="export-scope-group">
              <label>Data Scope:</label>
              <div class="radio-group">
                <label><input type="radio" name="exportScope" value="filtered" checked> Filtered Data (${this.filteredData.length} records)</label>
                <label><input type="radio" name="exportScope" value="all"> All Data (${this.contractData.length} records)</label>
              </div>
            </div>
            <div class="export-options-group">
              <label><input type="checkbox" id="includeCharts" checked> Include Charts</label>
              <label><input type="checkbox" id="includeMetadata" checked> Include Metadata</label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="dashboardController.performExport()">Export</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  /**
   * Perform export based on selected options
   */
  async performExport() {
    try {
      const modal = document.getElementById('exportModal');
      const format = modal.querySelector('input[name="exportFormat"]:checked').value;
      const scope = modal.querySelector('input[name="exportScope"]:checked').value;
      const includeCharts = modal.querySelector('#includeCharts').checked;
      const includeMetadata = modal.querySelector('#includeMetadata').checked;
      
      const dataToExport = scope === 'filtered' ? this.filteredData : this.contractData;
      const filterCriteria = scope === 'filtered' ? this.filterController.getActiveFilters() : null;
      
      this.showLoading('Preparing export...');
      
      let result;
      if (format === 'csv') {
        result = await this.exportService.exportToCSV(dataToExport, filterCriteria);
      } else if (format === 'excel') {
        result = await this.exportService.createExcelWorkbook(dataToExport);
      } else if (format === 'pdf') {
        const charts = includeCharts ? await this.visualizationManager.exportChartImages() : [];
        result = await this.exportService.generatePDFReport(dataToExport, charts);
      }
      
      // Trigger download
      this.downloadFile(result, `contract-data-${new Date().toISOString().split('T')[0]}.${format}`);
      
      this.hideLoading();
      modal.remove();
      this.showSuccessMessage('Export completed successfully');
      
      // Log export event
      this.securityAuditor.logEvent('data_exported', {
        user: this.currentUser?.email,
        format: format,
        scope: scope,
        recordCount: dataToExport.length,
        includeCharts: includeCharts,
        includeMetadata: includeMetadata
      });
      
    } catch (error) {
      this.hideLoading();
      this.handleError(error, 'Export failed');
    }
  }

  /**
   * Download file blob
   */
  downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Switch between dashboard sections
   */
  switchSection(sectionName) {
    try {
      // Update navigation
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
      
      // Show/hide sections
      document.querySelectorAll('.dashboard-section').forEach(section => {
        section.style.display = 'none';
      });
      
      const targetSection = document.getElementById(`${sectionName}Section`);
      if (targetSection) {
        targetSection.style.display = 'block';
      }
      
      // Trigger section-specific updates
      if (sectionName === 'analytics') {
        this.visualizationManager.handleResize();
      }
      
    } catch (error) {
      console.error('Failed to switch section:', error);
    }
  }

  /**
   * Update table summary information
   */
  updateTableSummary(data) {
    const summaryElement = document.getElementById('tableSummary');
    if (summaryElement) {
      summaryElement.textContent = `Showing ${data.length} of ${this.contractData.length} contracts`;
    }
  }

  /**
   * Attempt error recovery based on error type
   */
  attemptErrorRecovery(error, context) {
    // Only attempt recovery in browser environment
    if (typeof setTimeout === 'undefined') return;
    
    if (context.includes('data') || context.includes('load')) {
      // Try to reload data
      setTimeout(() => {
        this.loadData().catch(() => {
          console.log('Recovery attempt failed');
        });
      }, 5000);
    } else if (context.includes('visualization')) {
      // Try to reinitialize visualizations
      setTimeout(() => {
        this.visualizationManager.initializeCharts(this.contractData);
      }, 2000);
    }
  }

  /**
   * Update health status for error
   */
  updateHealthStatusForError(context) {
    if (context.includes('data')) {
      this.healthStatus.dataService = 'error';
    } else if (context.includes('auth')) {
      this.healthStatus.authentication = 'error';
    } else if (context.includes('visualization')) {
      this.healthStatus.visualizations = 'error';
    } else if (context.includes('filter')) {
      this.healthStatus.filters = 'error';
    } else if (context.includes('export')) {
      this.healthStatus.exports = 'error';
    }
  }

  /**
   * Get current dashboard status for monitoring
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      loading: this.isLoading,
      dataCount: this.contractData.length,
      filteredCount: this.filteredData.length,
      currentUser: this.currentUser?.email,
      health: this.healthStatus,
      performance: this.performanceMetrics,
      error: this.errorState
    };
  }
}

// Global dashboard controller instance
let dashboardController;

/**
 * Initialize dashboard when DOM is ready
 * This code only runs in the browser (client-side)
 */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      dashboardController = new DashboardController();
      await dashboardController.initialize();
    } catch (error) {
      console.error('Failed to initialize dashboard:', error);
      // Show fallback error UI
      document.body.innerHTML = `
        <div class="error-container">
          <h1>Dashboard Initialization Failed</h1>
          <p>Unable to load the contract management dashboard.</p>
          <p>Error: ${error.message}</p>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  });

  /**
   * Handle page unload cleanup
   */
  window.addEventListener('beforeunload', () => {
    if (dashboardController) {
      dashboardController.cleanup();
    }
  });
}