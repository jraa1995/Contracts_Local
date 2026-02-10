# Implementation Plan: Contract Management Dashboard Redesign

## Overview

Rewrite the client-side CSS, add Chart.js rendering, fix debug log, wire up all filters, fix table column duplication, and add sorting — all within the existing GAS `.html` file structure. Server-side `Code.js` is not modified.

## Tasks

- [x] 1. Rewrite styles.html with Apple-inspired grayscale design system
  - [x] 1.1 Define CSS custom properties (grayscale palette, typography, shadows, radii, transitions) on `:root` and rewrite reset/base styles, body, and header with dark gradient (#000 → #1d1d1f)
    - Replace the entire `<style>` block in `styles.html`
    - Define all `--color-*`, `--font-family`, `--shadow-*`, `--radius-*`, `--transition` variables
    - Style `.dashboard-header` with grayscale gradient, `.nav-btn` with grayscale hover/active states
    - Style `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-link` in grayscale
    - Style `.connection-status` indicator in grayscale (no green/red/yellow)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 1.2 Style loading overlay, filter panel, and summary cards in grayscale
    - `.loading-overlay`, `.spinner`, `.progress-fill` — all grayscale
    - `.filters-section`, `.form-input`, `.form-select` — grayscale borders and focus states
    - `.date-preset-btn`, `.financial-preset-btn` — grayscale active states (no blue/green)
    - `.active-filter-tag` — gray background/border instead of blue
    - `.summary-card`, `.card-icon` — grayscale backgrounds, no colored gradients
    - `.card-value` — all grayscale text (no green/blue/purple)
    - _Requirements: 1.1, 1.6, 5.8, 6.1, 6.2, 7.1, 7.2_

  - [x] 1.3 Style charts section, data table, status badges, pagination, and modals in grayscale
    - `.chart-container`, `.charts-grid` — white cards with subtle shadows
    - `.data-table th` — grayscale header background
    - `.status-badge` variants (`.status-active`, `.status-completed`, `.status-pending`, `.status-cancelled`) — distinct grayscale shades only
    - `.currency-value` — grayscale text (no green/red)
    - `.page-number.active` — dark gray instead of blue
    - `.modal`, `.modal-content`, `.export-options` — all grayscale
    - Responsive breakpoints at 768px and 480px
    - _Requirements: 1.1, 1.6, 8.1, 8.2, 8.3, 9.1, 9.2_

- [x] 2. Fix debug log and table column duplication in scripts.html
  - [x] 2.1 Modify `debugLog()` to console-only output and fix Award Value column in `renderTable()`
    - Change `debugLog` to only call `console.log(msg)` — remove all DOM element references and `el.style.display = 'block'`
    - In `renderTable()`, change the Award Value `<td>` from `formatMoney(parseFloat(c.CEILING) || 0)` to the string `'N/A'`
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_

  - [x] 2.2 Write property test for table column non-duplication
    - **Property 5: Table column non-duplication**
    - **Validates: Requirements 4.1, 4.2**

- [x] 3. Implement Chart.js rendering in scripts.html
  - [x] 3.1 Create ChartManager object with grayscale color palette and chart instance tracking
    - Define `ChartManager` with `chartInstances` object, `grayscaleColors` array, `init(data)`, `updateAll(data)`, and `destroy()` methods
    - Implement `getGrayscaleColor(index)` helper
    - _Requirements: 3.5_

  - [x] 3.2 Implement `createStatusChart(data)` — donut chart of AWARD_STATUS counts
    - Aggregate contract counts by AWARD_STATUS
    - Create Chart.js doughnut chart with grayscale fills
    - Handle empty data case with "No data available" message
    - _Requirements: 3.1, 3.7_

  - [x] 3.3 Implement `createOrganizationChart(data)` — horizontal bar chart of CEILING by Client_Bureau (top 10)
    - Sum CEILING values grouped by Client_Bureau
    - Sort descending, take top 10
    - Create Chart.js horizontal bar chart with grayscale fills
    - _Requirements: 3.2_

  - [x] 3.4 Implement `createTimelineChart(data)` and `createTrendsChart(data)`
    - Timeline: count contracts by PROJECT_START year, render as bar chart
    - Trends: sum CEILING by PROJECT_START year, render as line chart
    - Both use grayscale colors and handle empty data
    - _Requirements: 3.3, 3.4_

  - [x] 3.5 Wire ChartManager into `finishLoading()` and `applyFilters()` so charts render on load and update on filter
    - Call `ChartManager.init(filteredData)` in `finishLoading()`
    - Call `ChartManager.updateAll(filteredData)` at the end of `applyFilters()`
    - _Requirements: 3.6_

  - [x] 3.6 Write property tests for chart aggregation functions
    - **Property 1: Status chart aggregation correctness**
    - **Property 2: Organization chart aggregation correctness**
    - **Property 3: Timeline chart aggregation correctness**
    - **Property 4: Trends chart aggregation correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 4. Checkpoint — Verify styles, charts, debug log fix, and column fix
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Wire up remaining filters (date range, financial range, presets, active tags)
  - [x] 5.1 Extend `applyFilters()` with date range and financial range filtering logic
    - Read `dateFieldSelect`, `dateRangeStart`, `dateRangeEnd` — filter contracts by comparing the selected date field
    - Read `financialMin`, `financialMax` — filter contracts by CEILING within range
    - Add date and financial inputs to the event listener setup in `setupEventListeners()`
    - _Requirements: 5.2, 5.4_

  - [x] 5.2 Implement date preset and financial preset click handlers
    - `.date-preset-btn` click: compute start/end dates (Last 30 days, Last 90 days, This Year), set input values, call `applyFilters()`
    - `.financial-preset-btn` click: set min/max values (Under $100K, $100K-$1M, Over $1M), call `applyFilters()`
    - _Requirements: 5.3, 5.5_

  - [x] 5.3 Implement active filter tag display and individual filter removal
    - After `applyFilters()`, build tag elements in `#activeFiltersList` for each active filter
    - Each tag has a remove button that clears that specific filter and re-applies
    - Show/hide `#activeFilters` container based on whether any filters are active
    - _Requirements: 5.6, 5.7_

  - [x] 5.4 Write property tests for filter correctness
    - **Property 6: Multi-select filter correctness**
    - **Property 7: Date range filter correctness**
    - **Property 8: Financial range filter correctness**
    - **Property 9: Clear all filter round-trip**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.7**

- [x] 6. Implement table column sorting
  - [x] 6.1 Add sort click handlers on `th[data-sort]` elements and implement sort logic
    - Track `currentSortColumn` and `currentSortDirection` in state
    - On header click: toggle direction if same column, else set ascending
    - Sort `filteredData` using type-aware comparator (string, number, date)
    - Re-render table after sort
    - Update `th` classes (`.sort-asc`, `.sort-desc`) for visual indicator
    - _Requirements: 10.1, 10.2, 10.3_

  - [x] 6.2 Write property test for table sorting
    - **Property 11: Table sorting correctness**
    - **Validates: Requirements 10.1, 10.2**

- [x] 7. Wire summary card updates and final integration
  - [x] 7.1 Ensure `updateSummaryCards()` is called after every filter/sort operation and correctly computes totals from `filteredData`
    - Verify it's called in `applyFilters()` (already exists) and after sort
    - _Requirements: 6.3_

  - [x] 7.2 Write property test for summary card totals
    - **Property 10: Summary cards reflect filtered totals**
    - **Validates: Requirements 6.3**

- [x] 8. Minor dashboard.html tweaks
  - [x] 8.1 Update dashboard.html: remove or permanently hide debug log div, replace emoji icons in summary cards with grayscale SVG or text icons
    - Remove `style="display:none; ..."` inline styles on `#debugLog` — either remove the div entirely or set `display:none` without the green-on-dark styling
    - Replace emoji icons (💰📋✅📈🔄📊🔍) with simple text labels or grayscale Unicode symbols
    - _Requirements: 2.1, 6.2_

- [x] 9. Final checkpoint — Full integration verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks are all required — property tests included for comprehensive coverage
- Each task references specific requirements for traceability
- `src/Code.js` and all server-side files are not modified
- All changes are in `src/styles.html`, `src/scripts.html`, and `src/dashboard.html`
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
