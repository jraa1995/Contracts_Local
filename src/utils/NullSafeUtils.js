/**
 * NullSafeUtils - Utility functions for robust null and empty value handling
 * GAS-safe version: fixed corrupted safeCurrencyFormat dollar sign
 */
class NullSafeUtils {
  static safeGet(value, fallback) {
    if (fallback === undefined) fallback = '';
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' && value.trim() === '') return fallback;
    return value;
  }

  static safeString(value, fallback) {
    if (fallback === undefined) fallback = '';
    if (value === null || value === undefined) return fallback;
    var s = value.toString().trim();
    return s === '' ? fallback : s;
  }

  static safeNumber(value, fallback) {
    if (fallback === undefined) fallback = 0;
    if (value === null || value === undefined || value === '') return fallback;
    var n = Number(value);
    return isNaN(n) ? fallback : n;
  }

  static safeBoolean(value, fallback) {
    if (fallback === undefined) fallback = false;
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'string') {
      var lv = value.toLowerCase().trim();
      if (lv === 'true' || lv === 'yes' || lv === '1') return true;
      if (lv === 'false' || lv === 'no' || lv === '0') return false;
      return fallback;
    }
    return Boolean(value);
  }

  static safeDate(value, fallback) {
    if (fallback === undefined) fallback = null;
    if (value === null || value === undefined || value === '') return fallback;
    try {
      var d = new Date(value);
      return isNaN(d.getTime()) ? fallback : d;
    } catch (e) { return fallback; }
  }

  static safeArray(value, fallback) {
    if (fallback === undefined) fallback = [];
    if (value === null || value === undefined) return fallback;
    if (Array.isArray(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
      return value.split(',').map(function(i) { return i.trim(); }).filter(function(i) { return i !== ''; });
    }
    return fallback;
  }

  static safeObject(value, fallback) {
    if (fallback === undefined) fallback = {};
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'object' && !Array.isArray(value)) return value;
    return fallback;
  }

  static isEmpty(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
  }

  static hasContent(value) { return !NullSafeUtils.isEmpty(value); }

  static safePersonnelInfo(data) {
    var d = NullSafeUtils.safeObject(data, {});
    return {
      name: NullSafeUtils.safeString(d.name, 'Unknown'),
      email: NullSafeUtils.safeString(d.email, ''),
      role: NullSafeUtils.safeString(d.role, 'Unspecified'),
      organization: NullSafeUtils.safeString(d.organization, 'Unknown'),
      phone: NullSafeUtils.safeString(d.phone, '')
    };
  }

  static safeContractData(data) {
    var d = NullSafeUtils.safeObject(data, {});
    return {
      award: NullSafeUtils.safeString(d.award, 'UNKNOWN'),
      project: NullSafeUtils.safeString(d.project, 'UNKNOWN'),
      solicitation: NullSafeUtils.safeString(d.solicitation, ''),
      acquisition: NullSafeUtils.safeString(d.acquisition, ''),
      ceiling: NullSafeUtils.safeNumber(d.ceiling, 0),
      awardValue: NullSafeUtils.safeNumber(d.awardValue, 0),
      remainingBudget: NullSafeUtils.safeNumber(d.remainingBudget, 0),
      projectManager: NullSafeUtils.safePersonnelInfo(d.projectManager),
      contractingOfficer: NullSafeUtils.safePersonnelInfo(d.contractingOfficer),
      contractSpecialist: NullSafeUtils.safePersonnelInfo(d.contractSpecialist),
      programManager: NullSafeUtils.safePersonnelInfo(d.programManager),
      awardDate: NullSafeUtils.safeDate(d.awardDate, null),
      projectStart: NullSafeUtils.safeDate(d.projectStart, null),
      projectEnd: NullSafeUtils.safeDate(d.projectEnd, null),
      completionDate: NullSafeUtils.safeDate(d.completionDate, null),
      clientBureau: NullSafeUtils.safeString(d.clientBureau, ''),
      orgCode: NullSafeUtils.safeString(d.orgCode, ''),
      sector: NullSafeUtils.safeString(d.sector, ''),
      contractType: NullSafeUtils.safeString(d.contractType, ''),
      status: NullSafeUtils.safeString(d.status, ''),
      flags: NullSafeUtils.safeArray(d.flags, []),
      lastModified: NullSafeUtils.safeDate(d.lastModified, new Date()),
      modificationStatus: NullSafeUtils.safeString(d.modificationStatus, '')
    };
  }

  static safeCurrencyFormat(value, currency, fallback) {
    if (currency === undefined) currency = '$';
    if (fallback === undefined) fallback = '$0.00';
    var numValue = NullSafeUtils.safeNumber(value, 0);
    try {
      return currency + numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (e) { return fallback; }
  }

  static safeDateFormat(value, format, fallback) {
    if (format === undefined) format = 'short';
    if (fallback === undefined) fallback = 'Unknown Date';
    var d = NullSafeUtils.safeDate(value);
    if (!d) return fallback;
    try {
      if (format === 'iso') return d.toISOString().split('T')[0];
      return d.toLocaleDateString('en-US');
    } catch (e) { return fallback; }
  }

  static safeValidationResult(validation) {
    var v = NullSafeUtils.safeObject(validation, {});
    return {
      isValid: NullSafeUtils.safeBoolean(v.isValid, false),
      errors: NullSafeUtils.safeArray(v.errors, []),
      warnings: NullSafeUtils.safeArray(v.warnings, []),
      processedRows: NullSafeUtils.safeNumber(v.processedRows, 0),
      validRows: NullSafeUtils.safeNumber(v.validRows, 0),
      fieldErrors: NullSafeUtils.safeArray(v.fieldErrors, []),
      summary: NullSafeUtils.safeObject(v.summary, { totalFields: 0, validFields: 0, errorFields: 0, warningFields: 0 }),
      validatedAt: NullSafeUtils.safeDate(v.validatedAt, new Date())
    };
  }
}
