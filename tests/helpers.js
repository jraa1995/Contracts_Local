/**
 * Extracted pure functions from scripts.html for testing.
 * These mirror the logic in the dashboard client code.
 */

// --- Currency Parser ---
// Handles both raw numbers and currency-formatted strings like "$3,714,230.41"
function parseCurrency(val) {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  var cleaned = String(val).replace(/[$,\s]/g, '');
  var n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

// --- Table column rendering logic ---
function renderAwardValueCell(contract) {
  // Award Value column should show "N/A" — never duplicate CEILING
  return 'N/A';
}

function renderCeilingCell(contract) {
  return formatMoney(parseCurrency(contract.CEILING));
}

function formatMoney(n) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(0);
}

// --- Chart aggregation functions ---
function aggregateStatusCounts(data) {
  var counts = {};
  for (var i = 0; i < data.length; i++) {
    var status = String(data[i].AWARD_STATUS || '');
    if (!counts[status]) counts[status] = 0;
    counts[status]++;
  }
  return Object.keys(counts).map(function(s) { return { status: s, count: counts[s] }; });
}

function aggregateOrgCeiling(data) {
  var sums = {};
  for (var i = 0; i < data.length; i++) {
    var org = String(data[i].Client_Bureau || '');
    var ceil = parseCurrency(data[i].CEILING);
    if (!sums[org]) sums[org] = 0;
    sums[org] += ceil;
  }
  var result = Object.keys(sums).map(function(o) { return { organization: o, totalCeiling: sums[o] }; });
  result.sort(function(a, b) { return b.totalCeiling - a.totalCeiling; });
  return result.slice(0, 10);
}

function aggregateTimelineCounts(data) {
  var counts = {};
  for (var i = 0; i < data.length; i++) {
    var d = data[i].PROJECT_START;
    if (!d) continue;
    var year = new Date(d).getFullYear();
    if (isNaN(year)) continue;
    if (!counts[year]) counts[year] = 0;
    counts[year]++;
  }
  var years = Object.keys(counts).map(Number).sort(function(a,b){return a-b;});
  return years.map(function(y) { return { year: y, count: counts[y] }; });
}

function aggregateTrendsCeiling(data) {
  var sums = {};
  for (var i = 0; i < data.length; i++) {
    var d = data[i].PROJECT_START;
    if (!d) continue;
    var year = new Date(d).getFullYear();
    if (isNaN(year)) continue;
    var ceil = parseCurrency(data[i].CEILING);
    if (!sums[year]) sums[year] = 0;
    sums[year] += ceil;
  }
  var years = Object.keys(sums).map(Number).sort(function(a,b){return a-b;});
  return years.map(function(y) { return { year: y, totalCeiling: sums[y] }; });
}

// --- Filter functions ---
function filterByStatuses(data, selectedStatuses) {
  if (!selectedStatuses || selectedStatuses.length === 0) return data;
  return data.filter(function(c) {
    return selectedStatuses.indexOf(c.AWARD_STATUS) >= 0;
  });
}

function filterByOrganizations(data, selectedOrgs) {
  if (!selectedOrgs || selectedOrgs.length === 0) return data;
  return data.filter(function(c) {
    return selectedOrgs.indexOf(c.Client_Bureau) >= 0 || selectedOrgs.indexOf(c.client_organization) >= 0;
  });
}

function filterByDateRange(data, dateField, startDate, endDate) {
  if (!startDate && !endDate) return data;
  return data.filter(function(c) {
    var field = dateField === 'projectEnd' ? c.PROJECT_END : c.PROJECT_START;
    if (!field) return false;
    var d = new Date(field);
    if (isNaN(d.getTime())) return false;
    if (startDate && d < new Date(startDate)) return false;
    if (endDate && d > new Date(endDate)) return false;
    return true;
  });
}

function filterByFinancialRange(data, min, max) {
  if (min === null && max === null) return data;
  return data.filter(function(c) {
    var ceil = parseCurrency(c.CEILING);
    if (min !== null && ceil < min) return false;
    if (max !== null && ceil > max) return false;
    return true;
  });
}

function clearAllFilters(originalData) {
  return originalData.slice();
}

// --- Summary card computation ---
function computeSummaryTotals(filteredData) {
  var active = 0, completed = 0, totalCeiling = 0;
  for (var i = 0; i < filteredData.length; i++) {
    var c = filteredData[i];
    var status = String(c.AWARD_STATUS || '').toLowerCase();
    if (status === 'active') active++;
    if (status === 'completed' || status === 'closed') completed++;
    totalCeiling += parseCurrency(c.CEILING);
  }
  return { totalCeiling: totalCeiling, active: active, completed: completed, total: filteredData.length };
}

// --- Sorting ---
function sortData(data, column, direction) {
  var sorted = data.slice();
  sorted.sort(function(a, b) {
    var valA = getColumnValue(a, column);
    var valB = getColumnValue(b, column);
    var cmp = compareValues(valA, valB, column);
    return direction === 'desc' ? -cmp : cmp;
  });
  return sorted;
}

function getColumnValue(contract, column) {
  switch (column) {
    case 'award': return contract.AWARD || '';
    case 'project': return contract.PROJECT_TITLE || contract.PROJECT || '';
    case 'ceiling': return parseCurrency(contract.CEILING);
    case 'status': return contract.AWARD_STATUS || '';
    case 'projectStart': return contract.PROJECT_START || '';
    case 'projectEnd': return contract.PROJECT_END || '';
    case 'clientBureau': return contract.Client_Bureau || contract.client_organization || '';
    default: return '';
  }
}

function compareValues(a, b, column) {
  // Numeric columns
  if (column === 'ceiling') {
    return (a || 0) - (b || 0);
  }
  // Date columns
  if (column === 'projectStart' || column === 'projectEnd') {
    var da = a ? new Date(a).getTime() : 0;
    var db = b ? new Date(b).getTime() : 0;
    if (isNaN(da)) da = 0;
    if (isNaN(db)) db = 0;
    return da - db;
  }
  // String columns
  return String(a).localeCompare(String(b));
}

module.exports = {
  parseCurrency,
  renderAwardValueCell,
  renderCeilingCell,
  formatMoney,
  aggregateStatusCounts,
  aggregateOrgCeiling,
  aggregateTimelineCounts,
  aggregateTrendsCeiling,
  filterByStatuses,
  filterByOrganizations,
  filterByDateRange,
  filterByFinancialRange,
  clearAllFilters,
  computeSummaryTotals,
  sortData,
  getColumnValue,
  compareValues
};
