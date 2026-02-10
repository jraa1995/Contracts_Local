# Requirements Document

## Introduction

This document specifies the requirements for redesigning the Contract Management Dashboard — a Google Apps Script web application that displays government contract data from a Google Sheet (~9,159 rows, 82 columns). The redesign focuses on an Apple-inspired UI/UX overhaul: a strictly grayscale color palette, premium typography, working Chart.js visualizations, polished filter controls, correct data column mapping, and removal of the debug log panel from end-user view. The existing server-side data pipeline (getContractInfo, getContractPage, getContractDataTest) must remain untouched.

## Glossary

- **Dashboard**: The client-side web application rendered within a Google Apps Script iframe that displays contract data, summary metrics, charts, and a data table.
- **Data_Pipeline**: The server-side GAS functions (getContractInfo, getContractPage, getContractDataTest) that fetch contract data from the AL_Extract Google Sheet in paginated batches.
- **Filter_Panel**: The UI section containing search, multi-select dropdowns, date range, and financial range controls used to narrow displayed contract data.
- **Summary_Cards**: The four metric cards at the top of the main content area showing total contract value, active contracts, completed contracts, and a fourth aggregate metric.
- **Chart_Section**: The area containing four Chart.js canvas elements for status distribution, ceiling value by organization, timeline overview, and financial trends.
- **Data_Table**: The paginated HTML table displaying individual contract rows with sortable columns.
- **Debug_Log**: The fixed-position panel at the bottom of the screen that displays runtime log messages in green monospace text on a dark background.
- **Grayscale_Palette**: The restricted color set: #000, #111, #1d1d1f, #333, #555, #666, #86868b, #999, #a1a1a6, #d2d2d7, #e8e8ed, #f5f5f7, #fafafa, #fff.
- **Apple_Typography**: The font stack: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif.

## Requirements

### Requirement 1: Grayscale Visual Theme

**User Story:** As a dashboard user, I want the interface to use an Apple-inspired grayscale design language, so that the application feels premium, clean, and professional for government contract management.

#### Acceptance Criteria

1. THE Dashboard SHALL use only colors from the Grayscale_Palette for all UI elements including backgrounds, text, borders, shadows, buttons, badges, and chart colors.
2. THE Dashboard SHALL use the Apple_Typography font stack for all text rendering.
3. THE Dashboard SHALL apply a dark header with a gradient using only black and dark gray values (#000 to #1d1d1f).
4. WHEN a user hovers over interactive elements (buttons, table rows, filter controls), THE Dashboard SHALL provide visual feedback using only grayscale color transitions.
5. THE Dashboard SHALL use subtle box shadows with black-alpha values and no colored shadows.
6. THE Dashboard SHALL render status badges (Active, Completed, Pending, Cancelled) using distinct grayscale shades rather than colored backgrounds.

### Requirement 2: Debug Log Removal

**User Story:** As a dashboard user, I want the debug log panel hidden from view, so that the interface appears clean and professional without developer diagnostics.

#### Acceptance Criteria

1. WHEN the Dashboard loads, THE Debug_Log panel SHALL remain hidden and not visible to end users.
2. THE Dashboard SHALL retain the debugLog function internally for console.log output only, without rendering to the DOM.
3. WHEN the debugLog function is called, THE Dashboard SHALL write messages to the browser console only.

### Requirement 3: Chart Rendering

**User Story:** As a dashboard user, I want to see working data visualizations, so that I can understand contract distribution, financial trends, and timelines at a glance.

#### Acceptance Criteria

1. WHEN contract data finishes loading, THE Chart_Section SHALL render a donut chart on the statusChart canvas showing contract count per AWARD_STATUS value.
2. WHEN contract data finishes loading, THE Chart_Section SHALL render a horizontal bar chart on the organizationChart canvas showing total CEILING value grouped by Client_Bureau.
3. WHEN contract data finishes loading, THE Chart_Section SHALL render a bar chart on the timelineChart canvas showing contract count grouped by PROJECT_START year.
4. WHEN contract data finishes loading, THE Chart_Section SHALL render a line chart on the trendsChart canvas showing total CEILING value grouped by PROJECT_START year.
5. THE Chart_Section SHALL use only Grayscale_Palette colors for all chart fills, borders, and labels.
6. WHEN filters are applied, THE Chart_Section SHALL re-render all four charts using the filtered dataset.
7. IF a chart canvas receives an empty dataset, THEN THE Chart_Section SHALL display a "No data available" message within the chart area.

### Requirement 4: Data Table Column Correction

**User Story:** As a dashboard user, I want the Award Value and Ceiling columns to display correct data, so that I can distinguish between different financial figures.

#### Acceptance Criteria

1. THE Data_Table SHALL display the CEILING field in the Ceiling column.
2. THE Data_Table SHALL display a computed or placeholder label in the Award Value column that does not duplicate the CEILING value.
3. IF no distinct award value field is available in the contract data, THEN THE Data_Table SHALL display "N/A" in the Award Value column.

### Requirement 5: Filter Panel Polish

**User Story:** As a dashboard user, I want all filter controls to be fully functional and visually consistent, so that I can efficiently narrow down contract data.

#### Acceptance Criteria

1. WHEN a user selects options in the Status, Organization, or Contract Type multi-select dropdowns, THE Filter_Panel SHALL apply the selections to filter the displayed data.
2. WHEN a user sets a date range using the start and end date inputs, THE Filter_Panel SHALL filter contracts by the selected date field (PROJECT_START or PROJECT_END).
3. WHEN a user clicks a date preset button (Last 30 days, Last 90 days, This Year), THE Filter_Panel SHALL populate the date range inputs and apply the filter.
4. WHEN a user sets financial range min/max values, THE Filter_Panel SHALL filter contracts by CEILING value within the specified range.
5. WHEN a user clicks a financial preset button (Under $100K, $100K-$1M, Over $1M), THE Filter_Panel SHALL populate the financial range inputs and apply the filter.
6. WHEN filters are active, THE Filter_Panel SHALL display active filter tags showing each applied filter with a remove button.
7. WHEN a user clicks "Clear All", THE Filter_Panel SHALL reset all filter controls and display the full unfiltered dataset.
8. THE Filter_Panel SHALL style all controls using the Grayscale_Palette with consistent border radii, padding, and typography.

### Requirement 6: Summary Cards Styling

**User Story:** As a dashboard user, I want the summary metric cards to match the Apple-inspired design, so that key metrics are presented in a visually cohesive manner.

#### Acceptance Criteria

1. THE Summary_Cards SHALL display metric values using the Grayscale_Palette for text and icon backgrounds, with no colored gradients.
2. THE Summary_Cards SHALL use subtle grayscale icon containers instead of colored emoji backgrounds.
3. WHEN contract data is loaded or filters change, THE Summary_Cards SHALL update to reflect the current filtered dataset totals.

### Requirement 7: Loading Overlay Styling

**User Story:** As a dashboard user, I want the loading screen to match the premium grayscale aesthetic, so that the experience feels consistent from first load.

#### Acceptance Criteria

1. WHEN data is loading, THE Dashboard SHALL display a loading overlay with a grayscale spinner and progress bar.
2. THE loading overlay SHALL use the Grayscale_Palette for the spinner, progress bar fill, background, and text.
3. WHEN loading completes, THE Dashboard SHALL smoothly hide the loading overlay.

### Requirement 8: Responsive Layout

**User Story:** As a dashboard user, I want the dashboard to adapt to different screen sizes, so that I can use it on various devices.

#### Acceptance Criteria

1. WHEN the viewport width is below 768px, THE Dashboard SHALL stack the filter grid, summary cards, and chart grid into single-column layouts.
2. WHEN the viewport width is below 480px, THE Dashboard SHALL reduce font sizes and padding to maintain readability.
3. THE Data_Table container SHALL provide horizontal scrolling when the table exceeds the viewport width.

### Requirement 9: Modal and Export Styling

**User Story:** As a dashboard user, I want modals and export dialogs to match the grayscale design, so that the entire experience is visually unified.

#### Acceptance Criteria

1. THE Dashboard SHALL style all modal overlays, headers, bodies, and footers using the Grayscale_Palette.
2. THE Dashboard SHALL style export option radio buttons and configuration selects using grayscale borders and backgrounds.
3. WHEN a user clicks the Export button, THE Dashboard SHALL open the export modal with filter summary information populated.

### Requirement 10: Table Sorting

**User Story:** As a dashboard user, I want to sort the data table by clicking column headers, so that I can organize contracts by different criteria.

#### Acceptance Criteria

1. WHEN a user clicks a sortable column header, THE Data_Table SHALL sort the filtered dataset by that column in ascending order.
2. WHEN a user clicks the same column header again, THE Data_Table SHALL reverse the sort to descending order.
3. THE Data_Table SHALL display a sort direction indicator on the active sort column using grayscale styling.
