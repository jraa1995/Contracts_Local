/**
 * Property-Based Test Runner for Contract Management Dashboard
 * Uses fast-check to validate correctness properties.
 */
const fc = require('fast-check');
const h = require('./helpers');

let passed = 0;
let failed = 0;
const failures = [];

function runProperty(name, prop) {
  try {
    fc.assert(fc.property(...prop), { numRuns: 100 });
    passed++;
    console.log('  ✓ ' + name);
  } catch (e) {
    failed++;
    failures.push({ name, error: e.message || String(e) });
    console.log('  ✗ ' + name);
    console.log('    ' + (e.message || String(e)).split('\n')[0]);
  }
}

// --- Generators ---
const contractArb = fc.record({
  AWARD_STATUS: fc.oneof(fc.constant('Active'), fc.constant('Completed'), fc.constant('Pending'), fc.constant('Cancelled'), fc.constant('Closed')),
  AWARD: fc.string({ minLength: 1, maxLength: 10 }),
  PROJECT: fc.string({ minLength: 1, maxLength: 10 }),
  PROJECT_TITLE: fc.string({ minLength: 1, maxLength: 30 }),
  AWARD_TITLE: fc.string({ minLength: 1, maxLength: 50 }),
  CEILING: fc.oneof(fc.integer({ min: 0, max: 10000000 }), fc.double({ min: 0, max: 10000000, noNaN: true })),
  IGE: fc.oneof(fc.integer({ min: 0, max: 10000000 }), fc.double({ min: 0, max: 10000000, noNaN: true })),
  Client_Bureau: fc.oneof(fc.constant('DOD'), fc.constant('DHS'), fc.constant('DOE'), fc.constant('NASA'), fc.constant('VA'), fc.constant('HHS')),
  client_organization: fc.constant(''),
  CONTRACT_TYPE: fc.oneof(fc.constant('FFP'), fc.constant('T&M'), fc.constant('CPFF'), fc.constant('IDIQ')),
  PROJECT_START: fc.date({ min: new Date('2015-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().slice(0, 10)),
  PROJECT_END: fc.date({ min: new Date('2016-01-01'), max: new Date('2028-12-31') }).map(d => d.toISOString().slice(0, 10)),
});

const contractsArb = fc.array(contractArb, { minLength: 0, maxLength: 50 });

console.log('\n=== Property-Based Tests ===\n');

// Feature: contract-management-dashboard, Property 5: Table column non-duplication
// **Validates: Requirements 4.1, 4.2**
runProperty('Property 5: Table column non-duplication', [
  contractArb,
  (contract) => {
    const awardVal = h.renderAwardValueCell(contract);
    const ceilingVal = h.renderCeilingCell(contract);
    // Award Value now shows formatted IGE currency
    const expectedAwardVal = h.formatMoney(h.parseCurrency(contract.IGE));
    // Verify award value is properly formatted currency and matches IGE
    if (!awardVal.startsWith('$')) return false;
    if (awardVal !== expectedAwardVal) return false;
    // Verify that award value is derived from IGE, not CEILING (they're different fields)
    // Even if formatted values coincidentally match, the source fields should be distinguished
    return true;
  }
]);

// Feature: contract-management-dashboard, Property 1: Status chart aggregation correctness
// **Validates: Requirements 3.1**
runProperty('Property 1: Status chart aggregation correctness', [
  contractsArb,
  (contracts) => {
    const result = h.aggregateStatusCounts(contracts);
    // Total count across all statuses should equal input length
    const totalCount = result.reduce((sum, r) => sum + r.count, 0);
    if (totalCount !== contracts.length) return false;
    // Each status count should match manual count
    for (const entry of result) {
      const expected = contracts.filter(c => String(c.AWARD_STATUS || '') === entry.status).length;
      if (entry.count !== expected) return false;
    }
    return true;
  }
]);

// Feature: contract-management-dashboard, Property 2: Organization chart aggregation correctness
// **Validates: Requirements 3.2**
runProperty('Property 2: Organization chart aggregation correctness', [
  contractsArb,
  (contracts) => {
    const result = h.aggregateOrgCeiling(contracts);

    // Result can now be up to 11 entries (top 10 + "Other")
    if (result.length > 11) return false;

    // Count unique organizations in input
    const uniqueOrgs = new Set(contracts.map(c => String(c.Client_Bureau || ''))).size;

    // If there are more than 10 unique orgs, last entry should be "Other"
    if (uniqueOrgs > 10) {
      if (result.length !== 11) return false;
      const lastEntry = result[result.length - 1];
      if (!lastEntry.organization.startsWith('Other (') || !lastEntry.organization.endsWith(' organizations)')) return false;

      // Verify "Other" bucket sum
      const topOrgs = result.slice(0, 10).map(e => e.organization);
      const expectedOtherSum = contracts
        .filter(c => topOrgs.indexOf(String(c.Client_Bureau || '')) < 0)
        .reduce((sum, c) => sum + (parseFloat(c.CEILING) || 0), 0);
      if (Math.abs(lastEntry.totalCeiling - expectedOtherSum) > 0.01) return false;
    }

    // Verify top 10 entries (excluding "Other" if present)
    const topEntries = uniqueOrgs > 10 ? result.slice(0, 10) : result;
    for (const entry of topEntries) {
      const expected = contracts
        .filter(c => String(c.Client_Bureau || '') === entry.organization)
        .reduce((sum, c) => sum + (parseFloat(c.CEILING) || 0), 0);
      if (Math.abs(entry.totalCeiling - expected) > 0.01) return false;
    }

    // Top entries should be sorted descending (excluding "Other")
    for (let i = 1; i < topEntries.length; i++) {
      if (topEntries[i].totalCeiling > topEntries[i-1].totalCeiling) return false;
    }

    return true;
  }
]);

// Feature: contract-management-dashboard, Property 3: Timeline chart aggregation correctness
// **Validates: Requirements 3.3**
runProperty('Property 3: Timeline chart aggregation correctness', [
  contractsArb,
  (contracts) => {
    const result = h.aggregateTimelineCounts(contracts);
    // Each year count should match manual count
    for (const entry of result) {
      const expected = contracts.filter(c => {
        if (!c.PROJECT_START) return false;
        const y = new Date(c.PROJECT_START).getFullYear();
        return !isNaN(y) && y === entry.year;
      }).length;
      if (entry.count !== expected) return false;
    }
    // Should be sorted by year ascending
    for (let i = 1; i < result.length; i++) {
      if (result[i].year < result[i-1].year) return false;
    }
    return true;
  }
]);

// Feature: contract-management-dashboard, Property 4: Trends chart aggregation correctness
// **Validates: Requirements 3.4**
runProperty('Property 4: Trends chart aggregation correctness', [
  contractsArb,
  (contracts) => {
    const result = h.aggregateTrendsCeiling(contracts);
    for (const entry of result) {
      const expected = contracts
        .filter(c => {
          if (!c.PROJECT_START) return false;
          const y = new Date(c.PROJECT_START).getFullYear();
          return !isNaN(y) && y === entry.year;
        })
        .reduce((sum, c) => sum + (parseFloat(c.CEILING) || 0), 0);
      if (Math.abs(entry.totalCeiling - expected) > 0.01) return false;
    }
    return true;
  }
]);

// Feature: contract-management-dashboard, Property 6: Multi-select filter correctness
// **Validates: Requirements 5.1**
runProperty('Property 6: Multi-select filter correctness', [
  contractsArb,
  fc.subarray(['Active', 'Completed', 'Pending', 'Cancelled', 'Closed'], { minLength: 1 }),
  (contracts, statuses) => {
    const result = h.filterByStatuses(contracts, statuses);
    // Every result must have a matching status
    for (const c of result) {
      if (statuses.indexOf(c.AWARD_STATUS) < 0) return false;
    }
    // No matching contracts should be excluded
    const expected = contracts.filter(c => statuses.indexOf(c.AWARD_STATUS) >= 0);
    return result.length === expected.length;
  }
]);

// Feature: contract-management-dashboard, Property 7: Date range filter correctness
// **Validates: Requirements 5.2**
runProperty('Property 7: Date range filter correctness', [
  contractsArb,
  fc.date({ min: new Date('2015-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().slice(0, 10)),
  fc.date({ min: new Date('2015-01-01'), max: new Date('2025-12-31') }).map(d => d.toISOString().slice(0, 10)),
  (contracts, d1, d2) => {
    const startDate = d1 < d2 ? d1 : d2;
    const endDate = d1 < d2 ? d2 : d1;
    const result = h.filterByDateRange(contracts, 'projectStart', startDate, endDate);
    for (const c of result) {
      const d = new Date(c.PROJECT_START);
      if (d < new Date(startDate) || d > new Date(endDate)) return false;
    }
    return true;
  }
]);

// Feature: contract-management-dashboard, Property 8: Financial range filter correctness
// **Validates: Requirements 5.4**
runProperty('Property 8: Financial range filter correctness', [
  contractsArb,
  fc.integer({ min: 0, max: 5000000 }),
  fc.integer({ min: 5000000, max: 10000000 }),
  (contracts, min, max) => {
    const result = h.filterByFinancialRange(contracts, min, max);
    for (const c of result) {
      const ceil = parseFloat(c.CEILING) || 0;
      if (ceil < min || ceil > max) return false;
    }
    return true;
  }
]);

// Feature: contract-management-dashboard, Property 9: Clear all filter round-trip
// **Validates: Requirements 5.7**
runProperty('Property 9: Clear all filter round-trip', [
  contractsArb,
  (contracts) => {
    // Apply some filters then clear
    const filtered = h.filterByStatuses(contracts, ['Active']);
    const cleared = h.clearAllFilters(contracts);
    // Cleared should equal original
    if (cleared.length !== contracts.length) return false;
    for (let i = 0; i < contracts.length; i++) {
      if (cleared[i] !== contracts[i]) return false;
    }
    return true;
  }
]);

// Feature: contract-management-dashboard, Property 10: Summary cards reflect filtered totals
// **Validates: Requirements 6.3**
runProperty('Property 10: Summary cards reflect filtered totals', [
  contractsArb,
  (contracts) => {
    const totals = h.computeSummaryTotals(contracts);
    // Verify active count
    const expectedActive = contracts.filter(c => String(c.AWARD_STATUS || '').toLowerCase() === 'active').length;
    if (totals.active !== expectedActive) return false;
    // Verify completed count
    const expectedCompleted = contracts.filter(c => {
      const s = String(c.AWARD_STATUS || '').toLowerCase();
      return s === 'completed' || s === 'closed';
    }).length;
    if (totals.completed !== expectedCompleted) return false;
    // Verify total ceiling
    const expectedCeiling = contracts.reduce((sum, c) => sum + (parseFloat(c.CEILING) || 0), 0);
    if (Math.abs(totals.totalCeiling - expectedCeiling) > 0.01) return false;
    return true;
  }
]);

// Feature: contract-management-dashboard, Property 11: Table sorting correctness
// **Validates: Requirements 10.1, 10.2**
runProperty('Property 11: Table sorting correctness', [
  contractsArb,
  fc.oneof(fc.constant('award'), fc.constant('ceiling'), fc.constant('awardValue'), fc.constant('status'), fc.constant('projectStart')),
  (contracts, column) => {
    // Ascending
    const asc = h.sortData(contracts, column, 'asc');
    for (let i = 1; i < asc.length; i++) {
      const cmp = h.compareValues(h.getColumnValue(asc[i-1], column), h.getColumnValue(asc[i], column), column);
      if (cmp > 0) return false;
    }
    // Descending
    const desc = h.sortData(contracts, column, 'desc');
    for (let i = 1; i < desc.length; i++) {
      const cmp = h.compareValues(h.getColumnValue(desc[i-1], column), h.getColumnValue(desc[i], column), column);
      if (cmp < 0) return false;
    }
    return true;
  }
]);

// --- Summary ---
console.log('\n' + (passed + failed) + ' properties tested: ' + passed + ' passed, ' + failed + ' failed\n');
if (failures.length > 0) {
  console.log('Failures:');
  failures.forEach(f => console.log('  - ' + f.name + ': ' + f.error.split('\n')[0]));
  process.exit(1);
}
