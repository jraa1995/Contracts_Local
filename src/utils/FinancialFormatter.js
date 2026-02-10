/**
 * FinancialFormatter - Financial data formatting utilities
 * GAS-safe version: removed navigator, module.exports, window references
 */
class FinancialFormatter {
  static formatCurrency(amount, options) {
    options = options || {};
    var showSymbol = options.showSymbol !== false;
    var compact = options.compact || false;
    if (typeof amount !== 'number' || isNaN(amount)) {
      return showSymbol ? '$0' : '0';
    }
    if (compact && Math.abs(amount) >= 1000) {
      return FinancialFormatter.formatCompactCurrency(amount, showSymbol);
    }
    try {
      var formatter = new Intl.NumberFormat('en-US', {
        style: showSymbol ? 'currency' : 'decimal',
        currency: 'USD',
        minimumFractionDigits: options.minimumFractionDigits || 0,
        maximumFractionDigits: options.maximumFractionDigits || 0
      });
      return formatter.format(amount);
    } catch (e) {
      return showSymbol ? '$' + amount.toLocaleString() : amount.toLocaleString();
    }
  }

  static formatCompactCurrency(amount, showSymbol) {
    var abs = Math.abs(amount);
    var sign = amount < 0 ? '-' : '';
    var sym = showSymbol !== false ? '$' : '';
    if (abs >= 1e9) return sign + sym + (abs / 1e9).toFixed(1) + 'B';
    if (abs >= 1e6) return sign + sym + (abs / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return sign + sym + (abs / 1e3).toFixed(1) + 'K';
    return FinancialFormatter.formatCurrency(amount, { showSymbol: showSymbol, compact: false });
  }

  static formatPercentage(value) {
    if (typeof value !== 'number' || isNaN(value)) return '0%';
    return value.toFixed(1) + '%';
  }

  static parseCurrency(currencyString) {
    if (typeof currencyString === 'number') return currencyString;
    if (!currencyString || typeof currencyString !== 'string') return 0;
    var clean = currencyString.replace(/[$,\s]/g, '').replace(/[^\d.\-]/g, '');
    var parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }

  static get Formatters() {
    return {
      summary: function(amount) { return FinancialFormatter.formatCurrency(amount, { compact: true }); },
      table: function(amount) { return FinancialFormatter.formatCurrency(amount, { compact: false }); },
      chart: function(amount) { return FinancialFormatter.formatCurrency(amount, { compact: true }); },
      export: function(amount) { return FinancialFormatter.formatCurrency(amount, { showSymbol: false, compact: false }); }
    };
  }
}
