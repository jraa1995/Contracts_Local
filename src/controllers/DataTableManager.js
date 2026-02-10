/**
 * DataTableManager - Manages tabular data display
 * Handles table rendering, sorting, pagination, and inline editing
 */

/**
 * DataTableManager class for table operations
 */
class DataTableManager {
  constructor() {
    this.currentData = [];
    this.sortColumn = null;
    this.sortDirection = 'asc';
    this.currentPage = 1;
    this.pageSize = 50;
    this.totalPages = 0;
    this.paginatedData = [];
    
    // Column configuration
    this.columns = [
      { key: 'award', label: 'Award #', sortable: true, width: '120px' },
      { key: 'project', label: 'Project', sortable: true, width: '200px' },
      { key: 'awardValue', label: 'Award Value', sortable: true, width: '120px', type: 'currency' },
      { key: 'ceiling', label: 'Ceiling', sortable: true, width: '120px', type: 'currency' },
      { key: 'status', label: 'Status', sortable: true, width: '100px', type: 'status' },
      { key: 'projectStart', label: 'Start Date', sortable: true, width: '110px', type: 'date' },
      { key: 'projectEnd', label: 'End Date', sortable: true, width: '110px', type: 'date' },
      { key: 'clientBureau', label: 'Organization', sortable: true, width: '150px' }
    ];
    
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for table interactions
   */
  setupEventListeners() {
    // Table header click for sorting
    document.addEventListener('click', (e) => {
      if (e.target.matches('th[data-sort]')) {
        const column = e.target.getAttribute('data-sort');
        this.handleSort(column);
      }
    });
    
    // Pagination controls
    document.addEventListener('click', (e) => {
      if (e.target.id === 'prevPageBtn') {
        this.goToPage(this.currentPage - 1);
      } else if (e.target.id === 'nextPageBtn') {
        this.goToPage(this.currentPage + 1);
      } else if (e.target.matches('.page-number')) {
        const page = parseInt(e.target.textContent);
        this.goToPage(page);
      }
    });
  }

  /**
   * Render data table
   * @param {ContractData[]} data - Contract data to display
   */
  renderTable(data) {
    this.currentData = data;
    this.calculatePagination();
    this.renderTableContent();
    this.renderPaginationControls();
    this.updatePaginationInfo();
  }

  /**
   * Calculate pagination data
   */
  calculatePagination() {
    this.totalPages = Math.ceil(this.currentData.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedData = this.currentData.slice(startIndex, endIndex);
  }

  /**
   * Render table content
   */
  renderTableContent() {
    const tbody = document.querySelector('#contractsTable tbody');
    if (!tbody) return;
    
    // Clear existing content
    tbody.innerHTML = '';
    
    if (this.paginatedData.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${this.columns.length}" class="no-data">
            No contracts found matching the current filters.
          </td>
        </tr>
      `;
      return;
    }
    
    // Render rows
    this.paginatedData.forEach((contract, index) => {
      const row = this.createTableRow(contract, index);
      tbody.appendChild(row);
    });
  }

  /**
   * Create a table row element
   * @param {ContractData} contract - Contract data
   * @param {number} index - Row index
   * @returns {HTMLTableRowElement}
   */
  createTableRow(contract, index) {
    const row = document.createElement('tr');
    row.className = 'table-row';
    row.setAttribute('data-contract-id', contract.award || index);
    
    this.columns.forEach(column => {
      const cell = document.createElement('td');
      cell.className = `cell-${column.key}`;
      
      const value = contract[column.key];
      cell.innerHTML = this.formatCellValue(value, column.type);
      
      row.appendChild(cell);
    });
    
    return row;
  }

  /**
   * Format cell value based on type
   * @param {any} value - Cell value
   * @param {string} type - Cell type
   * @returns {string}
   */
  formatCellValue(value, type) {
    if (value === null || value === undefined || value === '') {
      return '<span class="empty-value">—</span>';
    }
    
    switch (type) {
      case 'currency':
        return this.formatCurrency(value);
      
      case 'date':
        return this.formatDate(value);
      
      case 'status':
        return this.formatStatus(value);
      
      default:
        return this.escapeHtml(String(value));
    }
  }

  /**
   * Format currency value
   * @param {number} amount - Currency amount
   * @returns {string}
   */
  formatCurrency(amount) {
    if (typeof amount !== 'number') return '$0.00';
    
    const formatted = FinancialFormatter.Formatters.table(amount);
    const cssClass = amount < 0 ? 'currency-value negative' : 
                     amount >= 1000000 ? 'currency-value large' : 
                     'currency-value';
    
    return `<span class="${cssClass}">${formatted}</span>`;
  }

  /**
   * Format date value
   * @param {string|Date} date - Date value
   * @returns {string}
   */
  formatDate(date) {
    if (!date) return '<span class="empty-value">—</span>';
    
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return '<span class="invalid-date">Invalid Date</span>';
      
      const formatted = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
      
      return `<span class="date-value">${formatted}</span>`;
    } catch (error) {
      return '<span class="invalid-date">Invalid Date</span>';
    }
  }

  /**
   * Format status value
   * @param {string} status - Status value
   * @returns {string}
   */
  formatStatus(status) {
    if (!status) return '<span class="empty-value">—</span>';
    
    const statusClass = this.getStatusClass(status);
    return `<span class="status-badge ${statusClass}">${this.escapeHtml(status)}</span>`;
  }

  /**
   * Get CSS class for status
   * @param {string} status - Status value
   * @returns {string}
   */
  getStatusClass(status) {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('active')) return 'status-active';
    if (statusLower.includes('completed')) return 'status-completed';
    if (statusLower.includes('pending')) return 'status-pending';
    if (statusLower.includes('cancelled')) return 'status-cancelled';
    if (statusLower.includes('hold')) return 'status-hold';
    
    return 'status-default';
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Handle column sorting
   * @param {string} column - Column to sort by
   */
  handleSort(column) {
    if (this.sortColumn === column) {
      // Toggle direction if same column
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, default to ascending
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    this.sortByColumn(column, this.sortDirection);
    this.updateSortIndicators();
  }

  /**
   * Sort table by column
   * @param {string} column - Column to sort by
   * @param {'asc'|'desc'} direction - Sort direction
   */
  sortByColumn(column, direction) {
    this.currentData.sort((a, b) => {
      let valueA = a[column];
      let valueB = b[column];
      
      // Handle null/undefined values
      if (valueA === null || valueA === undefined) valueA = '';
      if (valueB === null || valueB === undefined) valueB = '';
      
      // Convert to appropriate types for comparison
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        valueA = valueA.toLowerCase();
        valueB = valueB.toLowerCase();
      }
      
      // Handle dates
      if (column.includes('Date') || column.includes('date')) {
        valueA = new Date(valueA).getTime() || 0;
        valueB = new Date(valueB).getTime() || 0;
      }
      
      // Handle numbers
      if (column === 'awardValue' || column === 'ceiling') {
        valueA = parseFloat(valueA) || 0;
        valueB = parseFloat(valueB) || 0;
      }
      
      let comparison = 0;
      if (valueA > valueB) comparison = 1;
      if (valueA < valueB) comparison = -1;
      
      return direction === 'desc' ? -comparison : comparison;
    });
    
    // Reset to first page after sorting
    this.currentPage = 1;
    this.renderTable(this.currentData);
  }

  /**
   * Update sort indicators in table headers
   */
  updateSortIndicators() {
    // Clear all sort indicators
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.classList.remove('sort-asc', 'sort-desc');
    });
    
    // Add indicator to current sort column
    const currentHeader = document.querySelector(`th[data-sort="${this.sortColumn}"]`);
    if (currentHeader) {
      currentHeader.classList.add(`sort-${this.sortDirection}`);
    }
  }

  /**
   * Go to specific page
   * @param {number} page - Page number
   */
  goToPage(page) {
    if (page < 1 || page > this.totalPages) return;
    
    this.currentPage = page;
    this.calculatePagination();
    this.renderTableContent();
    this.renderPaginationControls();
    this.updatePaginationInfo();
  }

  /**
   * Update pagination
   * @param {number} page - Page number
   * @param {number} pageSize - Number of items per page
   */
  updatePagination(page, pageSize) {
    this.currentPage = page;
    this.pageSize = pageSize;
    this.renderTable(this.currentData);
  }

  /**
   * Render pagination controls
   */
  renderPaginationControls() {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const pageNumbers = document.getElementById('pageNumbers');
    
    if (!prevBtn || !nextBtn || !pageNumbers) return;
    
    // Update button states
    prevBtn.disabled = this.currentPage <= 1;
    nextBtn.disabled = this.currentPage >= this.totalPages;
    
    // Generate page numbers
    pageNumbers.innerHTML = '';
    
    if (this.totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= this.totalPages; i++) {
        pageNumbers.appendChild(this.createPageButton(i));
      }
    } else {
      // Show condensed pagination
      pageNumbers.appendChild(this.createPageButton(1));
      
      if (this.currentPage > 3) {
        pageNumbers.appendChild(this.createEllipsis());
      }
      
      const start = Math.max(2, this.currentPage - 1);
      const end = Math.min(this.totalPages - 1, this.currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pageNumbers.appendChild(this.createPageButton(i));
      }
      
      if (this.currentPage < this.totalPages - 2) {
        pageNumbers.appendChild(this.createEllipsis());
      }
      
      if (this.totalPages > 1) {
        pageNumbers.appendChild(this.createPageButton(this.totalPages));
      }
    }
  }

  /**
   * Create page button element
   * @param {number} page - Page number
   * @returns {HTMLElement}
   */
  createPageButton(page) {
    const button = document.createElement('button');
    button.className = `page-number ${page === this.currentPage ? 'active' : ''}`;
    button.textContent = page;
    return button;
  }

  /**
   * Create ellipsis element
   * @returns {HTMLElement}
   */
  createEllipsis() {
    const span = document.createElement('span');
    span.className = 'page-ellipsis';
    span.textContent = '...';
    return span;
  }

  /**
   * Update pagination info text
   */
  updatePaginationInfo() {
    const info = document.getElementById('paginationInfo');
    if (!info) return;
    
    const startIndex = (this.currentPage - 1) * this.pageSize + 1;
    const endIndex = Math.min(this.currentPage * this.pageSize, this.currentData.length);
    const total = this.currentData.length;
    
    if (total === 0) {
      info.textContent = 'No contracts to display';
    } else {
      info.textContent = `Showing ${startIndex}-${endIndex} of ${total} contracts`;
    }
  }

  /**
   * Export table data
   * @param {'csv'|'excel'} format - Export format
   */
  exportTableData(format) {
    try {
      if (format === 'csv') {
        this.exportToCSV();
      } else if (format === 'excel') {
        this.exportToExcel();
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export data: ' + error.message);
    }
  }

  /**
   * Export data to CSV format
   */
  exportToCSV() {
    const headers = this.columns.map(col => col.label);
    const rows = this.currentData.map(contract => {
      return this.columns.map(col => {
        const value = contract[col.key];
        if (value === null || value === undefined) return '';
        
        // Format based on column type
        if (col.type === 'currency' && typeof value === 'number') {
          return value.toString();
        } else if (col.type === 'date' && value) {
          return new Date(value).toISOString().split('T')[0];
        }
        
        return String(value).replace(/"/g, '""'); // Escape quotes
      });
    });
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    this.downloadFile(csvContent, 'contracts.csv', 'text/csv');
  }

  /**
   * Export data to Excel format (simplified CSV with .xlsx extension)
   */
  exportToExcel() {
    // For now, export as CSV with Excel extension
    // In a full implementation, you'd use a library like SheetJS
    this.exportToCSV();
  }

  /**
   * Download file to user's computer
   * @param {string} content - File content
   * @param {string} filename - File name
   * @param {string} mimeType - MIME type
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  /**
   * Get current table configuration
   * @returns {Object}
   */
  getTableConfig() {
    return {
      sortColumn: this.sortColumn,
      sortDirection: this.sortDirection,
      currentPage: this.currentPage,
      pageSize: this.pageSize,
      totalRecords: this.currentData.length
    };
  }

  /**
   * Set table configuration
   * @param {Object} config - Table configuration
   */
  setTableConfig(config) {
    if (config.sortColumn) this.sortColumn = config.sortColumn;
    if (config.sortDirection) this.sortDirection = config.sortDirection;
    if (config.currentPage) this.currentPage = config.currentPage;
    if (config.pageSize) this.pageSize = config.pageSize;
    
    this.renderTable(this.currentData);
  }
}