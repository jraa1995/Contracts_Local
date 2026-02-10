/**
 * VisualizationManager - Manages chart visualizations
 * Creates and updates all dashboard visualizations using Chart.js
 */

/**
 * VisualizationManager class for chart management
 */
class VisualizationManager {
  constructor() {
    this.charts = {};
    this.chartConfigs = {};
    this.animateUpdates = true; // Default to animated updates
    this.autoRefreshInterval = null;
    this.defaultColors = [
      '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#34495e', '#e67e22', '#95a5a6', '#f1c40f'
    ];
  }

  /**
   * Initialize all charts with data
   * @param {ContractData[]} data - Contract data
   */
  initializeCharts(data) {
    this.createFinancialCharts(data);
    this.createOrganizationalCharts(data);
    this.createTimelineCharts(data);
    this.createTrendsChart(data);
    this.createGanttChart(data);
    this.setupGanttControls();
  }

  /**
   * Create financial charts
   * @param {ContractData[]} data - Contract data
   */
  createFinancialCharts(data) {
    // Contract Status Distribution (Pie Chart)
    this.createStatusChart(data);
    
    // Financial Trends (Line Chart)
    this.createFinancialTrendsChart(data);
  }

  /**
   * Create status distribution pie chart
   * @param {ContractData[]} data - Contract data
   */
  createStatusChart(data) {
    const ctx = document.getElementById('statusChart');
    if (!ctx) return;

    // Aggregate data by status
    const statusCounts = {};
    data.forEach(contract => {
      const status = contract.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const labels = Object.keys(statusCounts);
    const values = Object.values(statusCounts);
    const colors = this.defaultColors.slice(0, labels.length);

    // Destroy existing chart if it exists
    if (this.charts.statusChart) {
      this.charts.statusChart.destroy();
    }

    this.charts.statusChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderColor: colors.map(color => this.darkenColor(color, 0.2)),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed} (${percentage}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create financial trends line chart
   * @param {ContractData[]} data - Contract data
   */
  createFinancialTrendsChart(data) {
    const ctx = document.getElementById('trendsChart');
    if (!ctx) return;

    // Group contracts by month and calculate cumulative values
    const monthlyData = this.aggregateByMonth(data);
    
    // Destroy existing chart if it exists
    if (this.charts.trendsChart) {
      this.charts.trendsChart.destroy();
    }

    this.charts.trendsChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthlyData.labels,
        datasets: [{
          label: 'Contract Awards',
          data: monthlyData.values,
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4
        }, {
          label: 'Cumulative Value',
          data: monthlyData.cumulative,
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: 'Month'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: 'Award Value ($)'
            },
            ticks: {
              callback: function(value) {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact'
                }).format(value);
              }
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: 'Cumulative Value ($)'
            },
            grid: {
              drawOnChartArea: false,
            },
            ticks: {
              callback: function(value) {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact'
                }).format(value);
              }
            }
          }
        },
        plugins: {
          legend: {
            position: 'top',
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(context.parsed.y);
                return `${context.dataset.label}: ${value}`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create organizational charts
   * @param {ContractData[]} data - Contract data
   */
  createOrganizationalCharts(data) {
    const ctx = document.getElementById('organizationChart');
    if (!ctx) return;

    // Aggregate contract values by organization
    const orgData = {};
    data.forEach(contract => {
      const org = contract.clientBureau || 'Unknown';
      const value = contract.awardValue || 0;
      orgData[org] = (orgData[org] || 0) + value;
    });

    // Sort organizations by total value and take top 10
    const sortedOrgs = Object.entries(orgData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const labels = sortedOrgs.map(([org]) => org);
    const values = sortedOrgs.map(([,value]) => value);

    // Destroy existing chart if it exists
    if (this.charts.organizationChart) {
      this.charts.organizationChart.destroy();
    }

    this.charts.organizationChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Total Contract Value',
          data: values,
          backgroundColor: '#3498db',
          borderColor: '#2980b9',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y', // Horizontal bar chart
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(context.parsed.x);
                return `Total Value: ${value}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Contract Value ($)'
            },
            ticks: {
              callback: function(value) {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact'
                }).format(value);
              }
            }
          },
          y: {
            title: {
              display: true,
              text: 'Organization'
            }
          }
        }
      }
    });
  }

  /**
   * Create timeline charts
   * @param {ContractData[]} data - Contract data
   */
  createTimelineCharts(data) {
    const ctx = document.getElementById('timelineChart');
    if (!ctx) return;

    // Create timeline visualization showing contract durations
    const timelineData = this.prepareTimelineData(data);

    // Destroy existing chart if it exists
    if (this.charts.timelineChart) {
      this.charts.timelineChart.destroy();
    }

    this.charts.timelineChart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Active Contracts',
          data: timelineData.active,
          backgroundColor: '#2ecc71',
          borderColor: '#27ae60',
          pointRadius: 6,
          pointHoverRadius: 8
        }, {
          label: 'Completed Contracts',
          data: timelineData.completed,
          backgroundColor: '#3498db',
          borderColor: '#2980b9',
          pointRadius: 6,
          pointHoverRadius: 8
        }, {
          label: 'Overdue Contracts',
          data: timelineData.overdue,
          backgroundColor: '#e74c3c',
          borderColor: '#c0392b',
          pointRadius: 6,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const point = context[0];
                return point.raw.project || 'Unknown Project';
              },
              label: function(context) {
                const point = context.raw;
                const startDate = new Date(point.x).toLocaleDateString();
                const endDate = new Date(point.endDate).toLocaleDateString();
                const value = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(point.y);
                return [
                  `Start: ${startDate}`,
                  `End: ${endDate}`,
                  `Value: ${value}`,
                  `Status: ${point.status}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'month',
              displayFormats: {
                month: 'MMM yyyy'
              }
            },
            title: {
              display: true,
              text: 'Project Start Date'
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Contract Value ($)'
            },
            ticks: {
              callback: function(value) {
                return new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                  notation: 'compact'
                }).format(value);
              }
            }
          }
        }
      }
    });
  }

  /**
   * Create trends chart (placeholder for additional financial trends)
   * @param {ContractData[]} data - Contract data
   */
  createTrendsChart(data) {
    // This is handled by createFinancialTrendsChart for now
    // Can be expanded for additional trend visualizations
  }

  /**
   * Update all charts with filtered data
   * @param {ContractData[]} filteredData - Filtered contract data
   * @param {boolean} animate - Whether to animate the updates
   */
  updateCharts(filteredData, animate = true) {
    // Store animation mode for individual update methods
    this.animateUpdates = animate;
    
    // Update each chart with new data
    this.updateStatusChart(filteredData);
    this.updateOrganizationChart(filteredData);
    this.updateTimelineChart(filteredData);
    this.updateTrendsChart(filteredData);
    this.updateGanttChart(filteredData);
    
    // Trigger custom event for other components
    this.dispatchChartsUpdatedEvent(filteredData);
  }

  /**
   * Dispatch custom event when charts are updated
   * @param {ContractData[]} data - Updated data
   */
  dispatchChartsUpdatedEvent(data) {
    const event = new CustomEvent('chartsUpdated', {
      detail: {
        dataCount: data.length,
        timestamp: new Date()
      }
    });
    document.dispatchEvent(event);
  }

  /**
   * Enable automatic chart refresh when data changes
   * @param {Function} dataProvider - Function that returns current data
   * @param {number} interval - Refresh interval in milliseconds (default: 30 seconds)
   */
  enableAutoRefresh(dataProvider, interval = 30000) {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
    }

    this.autoRefreshInterval = setInterval(() => {
      try {
        const currentData = dataProvider();
        if (currentData && Array.isArray(currentData)) {
          this.updateCharts(currentData, false); // No animation for auto-refresh
        }
      } catch (error) {
        console.error('Auto-refresh error:', error);
      }
    }, interval);
  }

  /**
   * Disable automatic chart refresh
   */
  disableAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  /**
   * Batch update multiple charts efficiently
   * @param {Object} updates - Object with chart names as keys and data as values
   */
  batchUpdateCharts(updates) {
    // Disable animations for batch updates
    const originalAnimateUpdates = this.animateUpdates;
    this.animateUpdates = false;

    Object.keys(updates).forEach(chartName => {
      const updateMethod = `update${chartName.charAt(0).toUpperCase() + chartName.slice(1)}Chart`;
      if (typeof this[updateMethod] === 'function') {
        this[updateMethod](updates[chartName]);
      }
    });

    // Restore animation setting
    this.animateUpdates = originalAnimateUpdates;
  }

  /**
   * Update Gantt chart with new data
   * @param {ContractData[]} data - Contract data
   */
  updateGanttChart(data) {
    if (!this.charts.ganttChart) return;

    const ganttData = this.prepareGanttData(data);
    
    this.charts.ganttChart.data.labels = ganttData.labels;
    this.charts.ganttChart.data.datasets[0].data = ganttData.durations;
    this.charts.ganttChart.data.datasets[0].backgroundColor = ganttData.colors;
    this.charts.ganttChart.data.datasets[0].borderColor = ganttData.borderColors;
    
    // Update the internal data reference for tooltips
    this.charts.ganttChart.ganttData = ganttData;
    
    this.charts.ganttChart.update('none');
  }

  /**
   * Export chart images
   * @returns {string[]} Array of chart image URLs
   */
  exportChartImages() {
    const images = [];
    
    Object.keys(this.charts).forEach(chartKey => {
      const chart = this.charts[chartKey];
      if (chart && chart.canvas) {
        try {
          const imageUrl = chart.toBase64Image('image/png', 1.0);
          images.push({
            name: chartKey,
            url: imageUrl
          });
        } catch (error) {
          console.error(`Error exporting chart ${chartKey}:`, error);
        }
      }
    });
    
    return images;
  }

  /**
   * Update status chart with new data
   * @param {ContractData[]} data - Contract data
   */
  updateStatusChart(data) {
    if (!this.charts.statusChart) return;

    const statusCounts = {};
    data.forEach(contract => {
      const status = contract.status || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    const labels = Object.keys(statusCounts);
    const values = Object.values(statusCounts);

    this.charts.statusChart.data.labels = labels;
    this.charts.statusChart.data.datasets[0].data = values;
    
    // Use smooth animation or no animation based on context
    const animationMode = this.animateUpdates ? 'active' : 'none';
    this.charts.statusChart.update(animationMode);
  }

  /**
   * Update organization chart with new data
   * @param {ContractData[]} data - Contract data
   */
  updateOrganizationChart(data) {
    if (!this.charts.organizationChart) return;

    const orgData = {};
    data.forEach(contract => {
      const org = contract.clientBureau || 'Unknown';
      const value = contract.awardValue || 0;
      orgData[org] = (orgData[org] || 0) + value;
    });

    const sortedOrgs = Object.entries(orgData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    const labels = sortedOrgs.map(([org]) => org);
    const values = sortedOrgs.map(([,value]) => value);

    this.charts.organizationChart.data.labels = labels;
    this.charts.organizationChart.data.datasets[0].data = values;
    
    const animationMode = this.animateUpdates ? 'active' : 'none';
    this.charts.organizationChart.update(animationMode);
  }

  /**
   * Update timeline chart with new data
   * @param {ContractData[]} data - Contract data
   */
  updateTimelineChart(data) {
    if (!this.charts.timelineChart) return;

    const timelineData = this.prepareTimelineData(data);
    
    this.charts.timelineChart.data.datasets[0].data = timelineData.active;
    this.charts.timelineChart.data.datasets[1].data = timelineData.completed;
    this.charts.timelineChart.data.datasets[2].data = timelineData.overdue;
    
    const animationMode = this.animateUpdates ? 'active' : 'none';
    this.charts.timelineChart.update(animationMode);
  }

  /**
   * Update trends chart with new data
   * @param {ContractData[]} data - Contract data
   */
  updateTrendsChart(data) {
    if (!this.charts.trendsChart) return;

    const monthlyData = this.aggregateByMonth(data);
    
    this.charts.trendsChart.data.labels = monthlyData.labels;
    this.charts.trendsChart.data.datasets[0].data = monthlyData.values;
    this.charts.trendsChart.data.datasets[1].data = monthlyData.cumulative;
    
    const animationMode = this.animateUpdates ? 'active' : 'none';
    this.charts.trendsChart.update(animationMode);
  }

  /**
   * Create Gantt-style timeline chart
   * @param {ContractData[]} data - Contract data
   */
  createGanttChart(data) {
    const ctx = document.getElementById('ganttChart');
    if (!ctx) return;

    const ganttData = this.prepareGanttData(data);

    // Destroy existing chart if it exists
    if (this.charts.ganttChart) {
      this.charts.ganttChart.destroy();
    }

    this.charts.ganttChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ganttData.labels,
        datasets: [{
          label: 'Contract Duration',
          data: ganttData.durations,
          backgroundColor: ganttData.colors,
          borderColor: ganttData.borderColors,
          borderWidth: 1,
          barThickness: 20,
          categoryPercentage: 0.8,
          barPercentage: 0.9
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                return ganttData.projects[context[0].dataIndex];
              },
              label: function(context) {
                const item = ganttData.items[context.dataIndex];
                const startDate = new Date(item.start).toLocaleDateString();
                const endDate = new Date(item.end).toLocaleDateString();
                const duration = Math.ceil((item.end - item.start) / (1000 * 60 * 60 * 24));
                const value = new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD'
                }).format(item.value);
                
                return [
                  `Start: ${startDate}`,
                  `End: ${endDate}`,
                  `Duration: ${duration} days`,
                  `Value: ${value}`,
                  `Status: ${item.status}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'month',
              displayFormats: {
                month: 'MMM yyyy'
              }
            },
            title: {
              display: true,
              text: 'Timeline'
            },
            min: ganttData.minDate,
            max: ganttData.maxDate
          },
          y: {
            title: {
              display: true,
              text: 'Contracts'
            },
            ticks: {
              maxTicksLimit: 20
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const contract = ganttData.items[index];
            this.showContractDetails(contract);
          }
        }
      }
    });
  }

  /**
   * Setup Gantt chart interactive controls
   */
  setupGanttControls() {
    const zoomInBtn = document.getElementById('ganttZoomIn');
    const zoomOutBtn = document.getElementById('ganttZoomOut');
    const todayBtn = document.getElementById('ganttToday');
    const timeRangeSelect = document.getElementById('ganttTimeRange');

    if (zoomInBtn) {
      zoomInBtn.addEventListener('click', () => this.zoomGanttChart(0.5));
    }

    if (zoomOutBtn) {
      zoomOutBtn.addEventListener('click', () => this.zoomGanttChart(2));
    }

    if (todayBtn) {
      todayBtn.addEventListener('click', () => this.centerGanttOnToday());
    }

    if (timeRangeSelect) {
      timeRangeSelect.addEventListener('change', (e) => this.updateGanttTimeRange(e.target.value));
    }
  }

  /**
   * Zoom Gantt chart by factor
   * @param {number} factor - Zoom factor (< 1 = zoom in, > 1 = zoom out)
   */
  zoomGanttChart(factor) {
    if (!this.charts.ganttChart) return;

    const chart = this.charts.ganttChart;
    const xScale = chart.scales.x;
    const currentRange = xScale.max - xScale.min;
    const newRange = currentRange * factor;
    const center = (xScale.max + xScale.min) / 2;

    chart.options.scales.x.min = center - newRange / 2;
    chart.options.scales.x.max = center + newRange / 2;
    chart.update('none');
  }

  /**
   * Center Gantt chart on today's date
   */
  centerGanttOnToday() {
    if (!this.charts.ganttChart) return;

    const chart = this.charts.ganttChart;
    const today = new Date();
    const range = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

    chart.options.scales.x.min = today.getTime() - range;
    chart.options.scales.x.max = today.getTime() + range;
    chart.update('none');
  }

  /**
   * Update Gantt chart time range
   * @param {string} range - Time range ('6months', '1year', '2years', 'all')
   */
  updateGanttTimeRange(range) {
    if (!this.charts.ganttChart) return;

    const chart = this.charts.ganttChart;
    const today = new Date();
    let minDate, maxDate;

    switch (range) {
      case '6months':
        minDate = new Date(today.getFullYear(), today.getMonth() - 6, 1);
        maxDate = new Date(today.getFullYear(), today.getMonth() + 6, 0);
        break;
      case '1year':
        minDate = new Date(today.getFullYear() - 1, 0, 1);
        maxDate = new Date(today.getFullYear() + 1, 11, 31);
        break;
      case '2years':
        minDate = new Date(today.getFullYear() - 2, 0, 1);
        maxDate = new Date(today.getFullYear() + 2, 11, 31);
        break;
      case 'all':
      default:
        // Use original data range
        const ganttData = this.prepareGanttData(contractData || []);
        minDate = ganttData.minDate;
        maxDate = ganttData.maxDate;
        break;
    }

    chart.options.scales.x.min = minDate.getTime();
    chart.options.scales.x.max = maxDate.getTime();
    chart.update('none');
  }

  /**
   * Show contract details in a modal or sidebar
   * @param {Object} contract - Contract data
   */
  showContractDetails(contract) {
    // This could be enhanced to show a detailed modal
    const details = [
      `Project: ${contract.project}`,
      `Award: ${contract.award}`,
      `Value: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(contract.value)}`,
      `Status: ${contract.status}`,
      `Start: ${new Date(contract.start).toLocaleDateString()}`,
      `End: ${new Date(contract.end).toLocaleDateString()}`
    ].join('\n');
    
    alert(details); // Simple implementation - could be enhanced with a proper modal
  }

  /**
   * Prepare data for Gantt chart
   * @param {ContractData[]} data - Contract data
   * @returns {Object} Gantt chart data
   */
  prepareGanttData(data) {
    const items = [];
    const labels = [];
    const durations = [];
    const colors = [];
    const borderColors = [];
    const projects = [];

    // Filter contracts with valid date ranges
    const validContracts = data.filter(contract => 
      contract.projectStart && 
      contract.projectEnd && 
      contract.project
    );

    // Sort by start date
    validContracts.sort((a, b) => new Date(a.projectStart) - new Date(b.projectStart));

    // Take top 20 contracts to avoid overcrowding
    const displayContracts = validContracts.slice(0, 20);

    let minDate = new Date();
    let maxDate = new Date();

    displayContracts.forEach((contract, index) => {
      const startDate = new Date(contract.projectStart);
      const endDate = new Date(contract.projectEnd);
      const value = contract.awardValue || 0;
      const status = contract.status || 'Unknown';

      // Update date range
      if (index === 0 || startDate < minDate) minDate = startDate;
      if (index === 0 || endDate > maxDate) maxDate = endDate;

      // Determine color based on status
      let color, borderColor;
      switch (status.toLowerCase()) {
        case 'completed':
          color = 'rgba(46, 204, 113, 0.8)';
          borderColor = 'rgba(39, 174, 96, 1)';
          break;
        case 'active':
          color = 'rgba(52, 152, 219, 0.8)';
          borderColor = 'rgba(41, 128, 185, 1)';
          break;
        case 'pending':
          color = 'rgba(241, 196, 15, 0.8)';
          borderColor = 'rgba(243, 156, 18, 1)';
          break;
        case 'cancelled':
        case 'on hold':
          color = 'rgba(231, 76, 60, 0.8)';
          borderColor = 'rgba(192, 57, 43, 1)';
          break;
        default:
          color = 'rgba(149, 165, 166, 0.8)';
          borderColor = 'rgba(127, 140, 141, 1)';
      }

      const item = {
        start: startDate.getTime(),
        end: endDate.getTime(),
        value: value,
        status: status,
        project: contract.project,
        award: contract.award
      };

      items.push(item);
      labels.push(contract.project.length > 30 ? contract.project.substring(0, 30) + '...' : contract.project);
      durations.push([startDate.getTime(), endDate.getTime()]);
      colors.push(color);
      borderColors.push(borderColor);
      projects.push(contract.project);
    });

    // Add some padding to the date range
    const padding = (maxDate - minDate) * 0.1;
    minDate = new Date(minDate.getTime() - padding);
    maxDate = new Date(maxDate.getTime() + padding);

    return {
      items,
      labels,
      durations,
      colors,
      borderColors,
      projects,
      minDate,
      maxDate
    };
  }

  /**
   * Prepare timeline data for scatter plot
   * @param {ContractData[]} data - Contract data
   * @returns {Object} Timeline data grouped by status
   */
  prepareTimelineData(data) {
    const active = [];
    const completed = [];
    const overdue = [];
    const currentDate = new Date();

    data.forEach(contract => {
      if (!contract.projectStart || !contract.awardValue) return;

      const startDate = new Date(contract.projectStart);
      const endDate = contract.projectEnd ? new Date(contract.projectEnd) : null;
      const value = contract.awardValue;

      const point = {
        x: startDate.getTime(),
        y: value,
        project: contract.project,
        status: contract.status,
        endDate: endDate ? endDate.getTime() : null
      };

      if (contract.status === 'Completed') {
        completed.push(point);
      } else if (endDate && endDate < currentDate && contract.status !== 'Completed') {
        overdue.push(point);
      } else {
        active.push(point);
      }
    });

    return { active, completed, overdue };
  }

  /**
   * Aggregate contract data by month
   * @param {ContractData[]} data - Contract data
   * @returns {Object} Monthly aggregated data
   */
  aggregateByMonth(data) {
    const monthlyTotals = {};
    
    data.forEach(contract => {
      if (!contract.awardDate || !contract.awardValue) return;
      
      const date = new Date(contract.awardDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + contract.awardValue;
    });

    // Sort by month and create cumulative values
    const sortedMonths = Object.keys(monthlyTotals).sort();
    const labels = sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      return new Date(year, monthNum - 1).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
    });
    
    const values = sortedMonths.map(month => monthlyTotals[month]);
    const cumulative = [];
    let sum = 0;
    values.forEach(value => {
      sum += value;
      cumulative.push(sum);
    });

    return { labels, values, cumulative };
  }

  /**
   * Darken a color by a given factor
   * @param {string} color - Hex color string
   * @param {number} factor - Darkening factor (0-1)
   * @returns {string} Darkened hex color
   */
  darkenColor(color, factor) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const darkenedR = Math.floor(r * (1 - factor));
    const darkenedG = Math.floor(g * (1 - factor));
    const darkenedB = Math.floor(b * (1 - factor));
    
    return `#${darkenedR.toString(16).padStart(2, '0')}${darkenedG.toString(16).padStart(2, '0')}${darkenedB.toString(16).padStart(2, '0')}`;
  }

  /**
   * Destroy all charts (cleanup)
   */
  destroyAllCharts() {
    Object.values(this.charts).forEach(chart => {
      if (chart && typeof chart.destroy === 'function') {
        chart.destroy();
      }
    });
    this.charts = {};
  }
}