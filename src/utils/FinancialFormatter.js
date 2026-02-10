/**
 * FinancialFormatter - Comprehensive financial data formatting utilities
 * Provides consistent currency and number formatting throughout the application
 */

class FinancialFormatter {
  /**
   * Format currency value with locale support
   * @param {number} amount - Currency amount
   * @param {Object} options - Formatting options
   * @returns {string}
   */
  static formatCurrency(amount, options = {}) {
    const defaults = {
      currency: 'USD',
      locale: 'en-US',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      showSymbol: true,
      compact: false
    };
    
    const config = { ...defaults, ...options };
    
    if (typeof amount !== 'number' || isNaN(amount)) {
      return config.showSymbol ? '$0' : '0';
    }
    
    // Handle compact formatting for large numbers
    if (config.compact && Math.abs(amount) >= 1000) {
      return this.formatCompactCurrency(amount, config);
    }
    
    try {
      const formatter = new Intl.NumberFormat(config.locale, {
        style: config.showSymbol ? 'currency' : 'decimal',
        currency: config.currency,
        minimumFractionDigits: config.minimumFractionDigits,
        maximumFractionDigits: config.maximumFractionDigits
      });
      
      return formatter.format(amount);
    } catch (error) {
      console.warn('Currency formatting error:', error);
      return config.showSymbol ? `$${amount.toLocaleString()}` : amount.toLocaleString();
    }
  }

  /**
   * Format currency in compact notation (e.g., $1.2M, $500K)
   * @param {number} amount - Currency amount
   * @param {Object} config - Configuration object
   * @returns {string}
   */
  static formatCompactCurrency(amount, config) {
    const absAmount = Math.abs(amount);
    const sign = amount < 0 ? '-' : '';
    const symbol = config.showSymbol ? '$' : '';
    
    if (absAmount >= 1000000000) {
      return `${sign}${symbol}${(absAmount / 1000000000).toFixed(1)}B`;
    } else if (absAmount >= 1000000) {
      return `${sign}${symbol}${(absAmount / 1000000).toFixed(1)}M`;
    } else if (absAmount >= 1000) {
      return `${sign}${symbol}${(absAmount / 1000).toFixed(1)}K`;
    } else {
      return this.formatCurrency(amount, { ...config, compact: false });
    }
  }

  /**
   * Format percentage value
   * @param {number} value - Percentage value (0-100)
   * @param {Object} options - Formatting options
   * @returns {string}
   */
  static formatPercentage(value, options = {}) {
    const defaults = {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
      locale: 'en-US'
    };
    
    const config = { ...defaults, ...options };
    
    if (typeof value !== 'number' || isNaN(value)) {
      return '0%';
    }
    
    try {
      const formatter = new Intl.NumberFormat(config.locale, {
        style: 'percent',
        minimumFractionDigits: config.minimumFractionDigits,
        maximumFractionDigits: config.maximumFractionDigits
      });
      
      return formatter.format(value / 100);
    } catch (error) {
      console.warn('Percentage formatting error:', error);
      return `${value.toFixed(config.maximumFractionDigits)}%`;
    }
  }

  /**
   * Parse currency string to number
   * @param {string} currencyString - Currency string (e.g., "$1,234.56")
   * @returns {number}
   */
  static parseCurrency(currencyString) {
    if (typeof currencyString === 'number') {
      return currencyString;
    }
    
    if (!currencyString || typeof currencyString !== 'string') {
      return 0;
    }
    
    // Remove currency symbols, commas, and spaces
    const cleanString = currencyString
      .replace(/[$,\s]/g, '')
      .replace(/[^\d.-]/g, '');
    
    const parsed = parseFloat(cleanString);
    return isNaN(parsed) ? 0 : parsed;
  }

  /**
   * Get appropriate currency formatting based on amount size
   * @param {number} amount - Currency amount
   * @returns {Object} - Formatting configuration
   */
  static getCurrencyFormatConfig(amount) {
    const absAmount = Math.abs(amount);
    
    if (absAmount >= 1000000) {
      return { compact: true, maximumFractionDigits: 1 };
    } else if (absAmount >= 1000) {
      return { compact: true, maximumFractionDigits: 0 };
    } else if (absAmount >= 1) {
      return { compact: false, maximumFractionDigits: 0 };
    } else {
      return { compact: false, maximumFractionDigits: 2 };
    }
  }

  /**
   * Format financial summary for display
   * @param {Object} summary - Financial summary object
   * @returns {Object}
   */
  static formatFinancialSummary(summary) {
    return {
      totalValue: this.formatCurrency(summary.totalValue, { compact: true }),
      totalCeiling: this.formatCurrency(summary.totalCeiling, { compact: true }),
      activeValue: this.formatCurrency(summary.activeValue, { compact: true }),
      completedValue: this.formatCurrency(summary.completedValue, { compact: true }),
      averageValue: this.formatCurrency(summary.averageValue, { compact: true }),
      budgetUtilization: this.formatPercentage(summary.budgetUtilization),
      remainingBudget: this.formatCurrency(summary.remainingBudget, { compact: true })
    };
  }

  /**
   * Context-specific formatters
   */
  static get Formatters() {
    return {
      // For summary cards (compact format)
      summary: (amount) => this.formatCurrency(amount, { compact: true }),
      
      // For data tables (full format with commas)
      table: (amount) => this.formatCurrency(amount, { compact: false }),
      
      // For charts (compact format)
      chart: (amount) => this.formatCurrency(amount, { compact: true, maximumFractionDigits: 1 }),
      
      // For tooltips (full format with cents if needed)
      tooltip: (amount) => {
        const config = this.getCurrencyFormatConfig(amount);
        return this.formatCurrency(amount, { ...config, compact: false });
      },
      
      // For exports (numeric format without symbols)
      export: (amount) => this.formatCurrency(amount, { showSymbol: false, compact: false }),
      
      // For input fields (no formatting, just validation)
      input: (amount) => {
        if (typeof amount === 'number' && !isNaN(amount)) {
          return amount.toString();
        }
        return '';
      }
    };
  }

  /**
   * Locale-aware formatting utilities
   */
  static get Locale() {
    return {
      /**
       * Get user's preferred locale
       */
      getLocale: () => {
        return navigator.language || navigator.userLanguage || 'en-US';
      },
      
      /**
       * Get currency for locale
       */
      getCurrency: (locale = null) => {
        const userLocale = locale || this.Locale.getLocale();
        
        // Simple mapping for common locales
        const currencyMap = {
          'en-US': 'USD',
          'en-GB': 'GBP',
          'en-CA': 'CAD',
          'en-AU': 'AUD',
          'fr-FR': 'EUR',
          'de-DE': 'EUR',
          'es-ES': 'EUR',
          'ja-JP': 'JPY',
          'zh-CN': 'CNY'
        };
        
        return currencyMap[userLocale] || 'USD';
      },
      
      /**
       * Format currency with user's locale
       */
      formatCurrency: (amount, options = {}) => {
        const locale = this.Locale.getLocale();
        const currency = this.Locale.getCurrency(locale);
        
        return FinancialFormatter.formatCurrency(amount, {
          locale,
          currency,
          ...options
        });
      }
    };
  }
}

// Export for use in Google Apps Script environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FinancialFormatter;
}

// Make available globally for HTML templates
if (typeof window !== 'undefined') {
  window.FinancialFormatter = FinancialFormatter;
}