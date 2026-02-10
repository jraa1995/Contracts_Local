# Contract Management Dashboard

A Google Apps Script-based web application for managing and visualizing government contract data.

## Project Structure

```
src/
├── appsscript.json          # Google Apps Script configuration
├── Code.js                  # Main entry point and API endpoints
├── dashboard.html           # Main dashboard HTML template
├── styles.html              # CSS styles
├── scripts.html             # Client-side JavaScript
├── models/
│   └── DataModels.js        # TypeScript-style interfaces and data models
├── services/
│   ├── DataService.js       # Google Sheets integration and data processing
│   ├── FinancialAnalyzer.js # Financial calculations and analysis
│   ├── PersonnelManager.js  # Personnel data management
│   └── ExportService.js     # Data export functionality
├── controllers/
│   ├── DashboardController.js    # Main application controller
│   ├── FilterController.js       # Filtering and search functionality
│   ├── VisualizationManager.js   # Chart and visualization management
│   └── DataTableManager.js       # Table display and management
└── utils/
    ├── DateUtils.js         # Date processing utilities
    ├── CurrencyUtils.js     # Currency formatting utilities
    └── ValidationUtils.js   # Data validation utilities
```

## Setup Instructions

### Prerequisites

1. **Google Account**: You need a Google account with access to Google Apps Script
2. **clasp CLI**: Install the Google Apps Script command-line tool
   ```bash
   npm install -g @google/clasp
   ```
3. **Google Apps Script API**: Enable the Google Apps Script API in your Google Cloud Console

### Installation

1. **Clone or download this project**

2. **Login to clasp**:
   ```bash
   clasp login
   ```

3. **Create a new Google Apps Script project**:
   ```bash
   clasp create --title "Contract Management Dashboard" --type webapp
   ```
   
   This will create a new `.clasp.json` file with your script ID.

4. **Update the script ID** in `.clasp.json` with the ID from step 3

5. **Push the code to Google Apps Script**:
   ```bash
   clasp push
   ```

6. **Deploy as a web app**:
   ```bash
   clasp deploy
   ```

### Configuration

1. **Set up Google Sheets data source**:
   - Create a Google Sheet with your contract data
   - Update the `DataService.js` file to reference your sheet ID
   - Ensure the sheet has the expected column structure

2. **Configure permissions**:
   - Set appropriate sharing permissions for your Google Apps Script project
   - Configure domain access if deploying for an organization

3. **Test the deployment**:
   - Open the web app URL provided by `clasp deploy`
   - Verify that the dashboard loads correctly

## Data Model

The application expects contract data with the following structure:

- **Identifiers**: Award number, project ID, solicitation number, acquisition ID
- **Financial**: Ceiling value, award value, remaining budget
- **Personnel**: Project manager, contracting officer, contract specialist, program manager
- **Timeline**: Award date, project start/end dates, completion date
- **Organization**: Client bureau, organization code, sector
- **Contract Details**: Type, status, competition type, commerciality
- **Compliance**: Flags, security level, modification status

## Features

- **Interactive Dashboard**: Real-time data visualization and filtering
- **Financial Analysis**: Budget tracking, spending analysis, risk assessment
- **Personnel Management**: Workload distribution and contact management
- **Timeline Tracking**: Milestone monitoring and deadline alerts
- **Data Export**: CSV, Excel, and PDF export capabilities
- **Access Control**: Google Workspace integration with role-based permissions

## Development

### Local Development

1. **Make changes** to the source files in the `src/` directory
2. **Push changes** to Google Apps Script:
   ```bash
   clasp push
   ```
3. **Test changes** in the web app

### Adding New Features

1. **Update data models** in `src/models/DataModels.js` if needed
2. **Add service logic** in the appropriate service file
3. **Update controllers** for new UI interactions
4. **Add utilities** for common operations
5. **Update the HTML template** and styles as needed

### Testing

- Use the Google Apps Script editor for debugging server-side code
- Use browser developer tools for client-side debugging
- Test with sample data before deploying to production

## Deployment

### Production Deployment

1. **Create a production version**:
   ```bash
   clasp deploy --description "Production v1.0"
   ```

2. **Set up proper permissions** for your organization

3. **Configure monitoring** and error logging

### Updates

1. **Make changes** to the code
2. **Test thoroughly** in development
3. **Deploy new version**:
   ```bash
   clasp deploy --description "Version description"
   ```

## Support

For issues and questions:
1. Check the Google Apps Script documentation
2. Review the project requirements and design documents
3. Test with sample data to isolate issues

## License

This project is developed for internal use. Ensure compliance with your organization's policies and Google's terms of service.