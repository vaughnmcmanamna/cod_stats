// Configuration options
const config = {
    defaultGamemode: "all",
    defaultMetric: "Skill",
    dateField: "UTC Timestamp",
    dateFormat: "%Y-%m-%d %H:%M",
    cutoffDate: new Date(2024, 11, 1), // December 1, 2024
    margin: { top: 30, right: 50, bottom: 50, left: 60 },
    width: () => Math.min(window.innerWidth * 0.9, 900),  // Max 900px wide
    height: () => Math.min(window.innerHeight * 0.7, 700), // Max 700px tall
    csvPath: "cod_stats1.csv",
    dotRadius: 4,
    dotRadiusHover: 10,
    transitionDuration: 200,
    colors: {
        line: "#8b8b8b", // Gray line so it's distinct from green wins
        win: "#37c593",  // Notion green for wins
        loss: "#eb5757", // Notion red for losses
        dotHover: "#ffffff", // White on hover
        neutralValue: "#6b7280"  // Gray for draws or unknown
    },
};
const correlationExplanationText = `
    <h2 style="margin-top: 0; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(102, 126, 234, 0.3);">Understanding Correlation</h2>
    <p style="margin-bottom: 15px; line-height: 1.7;">Correlation measures how strongly two variables are related, ranging from -1 to 1. <br>
    A higher value indicates a stronger relationship (values were changed to reflect team-based game):</p>
    <ul style="padding-left: 25px; margin-bottom: 20px;">
        <li style="margin-bottom: 10px; line-height: 1.6;"><strong>0.5 to 1:</strong> Strong correlation</li>
        <li style="margin-bottom: 10px; line-height: 1.6;"><strong>0.3 to 0.5:</strong> Moderate correlation</li>
        <li style="margin-bottom: 10px; line-height: 1.6;"><strong>0 to 0.3:</strong> Weak correlation</li>
    </ul>
    <p style="margin-bottom: 15px; line-height: 1.7;">A negative correlation means that as one variable increases, the other tends to decrease. For example, if the correlation between "K/D" and "Win" is -0.3, it suggests that higher K/D may be associated with slightly lower chances of winning, possibly due to focusing more on kills than objectives.</p>
    <p style="margin-bottom: 20px; line-height: 1.7;">If the correlation between "Damage Done" and "Win" is 0.4, it means that dealing more damage is moderately associated with winning the game.</p>
    <button id="close-correlation-explanation" style="padding: 10px 16px; border: none; border-radius: 6px; background-color: #37c593; color: #000000; cursor: pointer; font-size: 14px; font-weight: 600;">Got it!</button>
`;

function showCorrelationExplanation() {
    // Create modal container
    const modal = document.createElement('div');
    modal.id = 'correlation-explanation-modal';
    modal.style = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style = `
        background-color: white;
        padding: 30px;
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        position: relative;
        line-height: 1.6;
    `;
    modalContent.innerHTML = correlationExplanationText;
    
    // Add modal content to modal
    modal.appendChild(modalContent);
    
    // Add modal to document
    document.body.appendChild(modal);
    
    // Add event listener to close button
    document.getElementById('close-correlation-explanation').addEventListener('click', () => {
        modal.remove();
    });
}
let state = {
    data: null,        // The full dataset
    filteredData: null, // Data after filtering
    currentGamemode: config.defaultGamemode,
    currentMetric: config.defaultMetric,
    currentMap: "all", // Add currentMap to state
    svg: null,
    chartGroup: null,
    xScale: null,
    yScale: null,
    isZooming: false
};

const includedMetrics = [
    "Skill",
    "K/D Ratio",
    "EKIA/D Ratio",
    "Kills",
    "EKIA",
    "Deaths",
    "Headshot %",
    "Accuracy %",
    "Score",
    "Damage Done",
    "Damage Taken",
    "Percentage Of Time Moving"
];
// Initialize the visualization system
function initVisualization() {
    // Create UI controls if they don't exist
    createControls();
    
    // Load the data
    loadData();
    
    // Set up window resize handler
    window.addEventListener("resize", debounce(resizeChart, 250));
}

function createControls() {
    const controlsDiv = document.getElementById('controls') || document.createElement('div');
    if (!document.getElementById('controls')) {
        controlsDiv.id = 'controls';
        controlsDiv.style.margin = '20px';
        controlsDiv.style.display = 'flex';
        controlsDiv.style.flexWrap = 'wrap';
        controlsDiv.style.alignItems = 'center';
        controlsDiv.style.gap = '15px';
        document.body.insertBefore(controlsDiv, document.body.firstChild);
    }
    
    // Clear existing controls
    controlsDiv.innerHTML = '';
    
    // Style for all control groups
    const controlGroupStyle = 'display: flex; flex-direction: column; gap: 8px;';
    
    // Style for all controls
    const controlStyle = 'padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;';
    
    // Style for all labels
    const labelStyle = 'font-weight: bold; font-size: 14px;';
    
    // Create control group for gamemode
    const gamemodeGroup = document.createElement('div');
    gamemodeGroup.className = 'control-group';
    gamemodeGroup.style = controlGroupStyle;
    
    // Add gamemode selector
    const gamemodeSelector = document.createElement('select');
    gamemodeSelector.id = 'gamemodeSelector';
    gamemodeSelector.style = controlStyle;
    
    // Will be populated with options once data is loaded
    const gamemodeLabel = document.createElement('label');
    gamemodeLabel.textContent = 'Game Mode:';
    gamemodeLabel.setAttribute('for', 'gamemodeSelector');
    gamemodeLabel.style = labelStyle;
    
    // Add elements to gamemode group
    gamemodeGroup.appendChild(gamemodeLabel);
    gamemodeGroup.appendChild(gamemodeSelector);
    
    // Create control group for map
    const mapGroup = document.createElement('div');
    mapGroup.className = 'control-group';
    mapGroup.style = controlGroupStyle;
    
    // Add map selector
    const mapSelector = document.createElement('select');
    mapSelector.id = 'mapSelector';
    mapSelector.style = controlStyle;
    
    // Will be populated with options once data is loaded
    const mapLabel = document.createElement('label');
    mapLabel.textContent = 'Map:';
    mapLabel.setAttribute('for', 'mapSelector');
    mapLabel.style = labelStyle;
    
    // Add elements to map group
    mapGroup.appendChild(mapLabel);
    mapGroup.appendChild(mapSelector);
    
    // Create control group for metric
    const metricGroup = document.createElement('div');
    metricGroup.className = 'control-group';
    metricGroup.style = controlGroupStyle;
    
    // Add metric selector
    const metricSelector = document.createElement('select');
    metricSelector.id = 'metricSelector';
    metricSelector.style = controlStyle;
    
    // Will be populated with options once data is loaded
    const metricLabel = document.createElement('label');
    metricLabel.textContent = 'Metric:';
    metricLabel.setAttribute('for', 'metricSelector');
    metricLabel.style = labelStyle;
    
    // Add elements to metric group
    metricGroup.appendChild(metricLabel);
    metricGroup.appendChild(metricSelector);
    
    // Add help button
    const helpButton = document.createElement('button');
    helpButton.textContent = 'Help';
    helpButton.style = controlStyle + 'background-color: #f3f4f6; cursor: pointer;';
    helpButton.addEventListener('click', showHelp);
    
    // Add groups to controls div
    controlsDiv.appendChild(gamemodeGroup);
    controlsDiv.appendChild(mapGroup); // Add map group to controls
    controlsDiv.appendChild(metricGroup);
    controlsDiv.appendChild(helpButton);
    
    // Add event listeners
    gamemodeSelector.addEventListener('change', function() {
        state.currentGamemode = this.value;
        updateVisualization();
    });
    
    mapSelector.addEventListener('change', function() {
        state.currentMap = this.value;
        updateVisualization();
    });
    
    metricSelector.addEventListener('change', function() {
        state.currentMetric = this.value;
        updateVisualization();
    });

    addCorrelationButton();
}

// Show help modal
function showHelp() {
    // Remove any existing help modal
    document.querySelectorAll('.help-modal').forEach(el => el.remove());
    
    // Create modal container
    const modal = document.createElement('div');
    modal.className = 'help-modal';
    modal.style = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.style = `
        background-color: white;
        padding: 30px;
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        position: relative;
        line-height: 1.6;
    `;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style = `
        position: absolute;
        top: 15px;
        right: 20px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: rgba(255, 255, 255, 0.7);
    `;
    closeButton.addEventListener('click', () => modal.remove());
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Game Statistics Visualization Help';
    title.style = 'margin-top: 0; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); color: white;';
    
    // Add content
    const content = document.createElement('div');
    content.style = 'line-height: 1.7;';
    content.innerHTML = `
        <h3 style="margin-top: 25px; margin-bottom: 15px; color: rgba(255, 255, 255, 0.95);">Available Metrics</h3>
        <ul style="padding-left: 25px; margin-bottom: 20px;">
            <li style="margin-bottom: 10px;"><strong>Skill</strong>: Your skill rating (how you well perform regardless of opponent strength)</li>
            <li style="margin-bottom: 10px;"><strong>K/D Ratio</strong>: Kills divided by deaths</li>
            <li style="margin-bottom: 10px;"><strong>EKIA/D Ratio</strong>: (Kills + Assists) divided by deaths</li>
            <li style="margin-bottom: 10px;"><strong>Score Per Minute</strong>: Average score earned per minute of gameplay</li>
            <li style="margin-bottom: 10px;"><strong>Headshot %</strong>: Percentage of kills that were headshots</li>
            <li style="margin-bottom: 10px;"><strong>Accuracy %</strong>: Percentage of shots that hit targets</li>
        </ul>
        
        <h3 style="margin-top: 25px; margin-bottom: 15px; color: rgba(255, 255, 255, 0.95);">Game Modes</h3>
        <ul style="padding-left: 25px; margin-bottom: 20px;">
            <li style="margin-bottom: 10px;"><strong>All Game Modes</strong>: Shows data from all game types</li>
            <li style="margin-bottom: 10px;"><strong>Ranked Only</strong>: Shows only Hardpoint, Search and Destroy, and Control matches</li>
            <li style="margin-bottom: 10px;"><strong>Specific Mode</strong>: Select a specific game type from the dropdown</li>
        </ul>
        
        <h3 style="margin-top: 25px; margin-bottom: 15px; color: rgba(255, 255, 255, 0.95);">Chart Controls</h3>
        <ul style="padding-left: 25px; margin-bottom: 20px;">
            <li style="margin-bottom: 10px;"><strong>Zoom</strong>: Use the mouse wheel to zoom in and out</li>
            <li style="margin-bottom: 10px;"><strong>Pan</strong>: Click and drag to move around</li>
            <li style="margin-bottom: 10px;"><strong>Hover</strong>: Mouse over data points to see detailed information</li>
        </ul>
        
        <h3 style="margin-top: 25px; margin-bottom: 15px; color: rgba(255, 255, 255, 0.95);">Data Filtering</h3>
        <p style="margin-bottom: 15px; line-height: 1.7;">Games with a score of 0 (bot games) are automatically filtered out.</p>
        
        <h3 style="margin-top: 25px; margin-bottom: 15px; color: rgba(255, 255, 255, 0.95);">Color Coding</h3>
        <p style="margin-bottom: 10px; line-height: 1.7;">Data points are color-coded based on match outcome:</p>
        <ul style="padding-left: 25px; margin-bottom: 20px;">
            <li style="margin-bottom: 10px;"><span style="color: #10b981; font-weight: bold;">Green</span>: Win</li>
            <li style="margin-bottom: 10px;"><span style="color: #ef4444; font-weight: bold;">Red</span>: Loss</li>
            <li style="margin-bottom: 10px;"><span style="color: #6b7280; font-weight: bold;">Gray</span>: Draw or unknown outcome</li>
        </ul>
    `;
    
    // Add all elements to the modal
    modalContent.appendChild(closeButton);
    modalContent.appendChild(title);
    modalContent.appendChild(content);
    modal.appendChild(modalContent);
    
    // Add modal to document
    document.body.appendChild(modal);
    
    // Add click handler to close when clicking outside the modal
    modal.addEventListener('click', event => {
        if (event.target === modal) {
            modal.remove();
        }
    });
}
function calculateMetricCorrelations(data, primaryMetric) {
    const metrics = Object.keys(data[0]).filter(key => {
        // Filter for numeric fields, exclude date and categorical fields
        return key !== config.dateField && 
               key !== "Game Type" && 
               typeof data[0][key] === 'number';
    });

    // Calculate correlations between the primary metric and all other metrics
    const correlations = [];
    
    metrics.forEach(metric => {
        if (metric !== primaryMetric && includedMetrics.includes(metric)) {
            // Get valid data points (both metrics have values)
            const validData = data.filter(d => 
                d[primaryMetric] !== undefined && 
                !isNaN(d[primaryMetric]) && 
                d[metric] !== undefined && 
                !isNaN(d[metric])
            );
            
            if (validData.length > 5) { // Need enough data points for correlation
                const correlation = calculatePearsonCorrelation(
                    validData.map(d => d[primaryMetric]),
                    validData.map(d => d[metric])
                );
                
                correlations.push({
                    metric: metric,
                    correlation: correlation,
                    strength: getCorrelationStrength(correlation),
                    direction: correlation > 0 ? 'positive' : 'negative'
                });
            }
        }
    });
    
    // Sort by absolute correlation value (strongest first)
    correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    
    return correlations;
}

// Calculate Pearson correlation coefficient
function calculatePearsonCorrelation(x, y) {
    const n = x.length;
    
    // Calculate means
    const xMean = x.reduce((sum, val) => sum + val, 0) / n;
    const yMean = y.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate covariance and standard deviations
    let covariance = 0;
    let xStdDev = 0;
    let yStdDev = 0;
    
    for (let i = 0; i < n; i++) {
        const xDiff = x[i] - xMean;
        const yDiff = y[i] - yMean;
        covariance += xDiff * yDiff;
        xStdDev += xDiff * xDiff;
        yStdDev += yDiff * yDiff;
    }
    
    // Avoid division by zero
    if (xStdDev === 0 || yStdDev === 0) return 0;
    
    // Calculate correlation coefficient
    return covariance / (Math.sqrt(xStdDev) * Math.sqrt(yStdDev));
}

// Get textual description of correlation strength
function getCorrelationStrength(correlation) {
    const absCorrelation = Math.abs(correlation);
    
    if (absCorrelation >= 0.8) return 'Very strong';
    if (absCorrelation >= 0.6) return 'Strong';
    if (absCorrelation >= 0.4) return 'Moderate';
    if (absCorrelation >= 0.2) return 'Weak';
    return 'Very weak';
}

function createCorrelationPanel() {
    // Check if we have data and a selected metric
    if (!state.filteredData || state.filteredData.length === 0 || !state.currentMetric) {
        return;
    }
    
    // Calculate correlations for current metric
    const correlations = calculateMetricCorrelations(state.filteredData, state.currentMetric);
    
    // Remove existing panel if present
    d3.select('#correlation-panel').remove();
    
    // Create panel container
    const panel = d3.select('body').append('div')
        .attr('id', 'correlation-panel')
        .style('position', 'absolute')
        .style('top', '80px')
        .style('right', '20px')
        .style('width', '350px')
        .style('background', '#1f1f1f')
        .style('border', '1px solid #2f2f2f')
        .style('border-radius', '8px')
        .style('padding', '20px')
        .style('box-shadow', '0 4px 16px rgba(0, 0, 0, 0.3)')
        .style('font-family', 'sans-serif')
        .style('z-index', '1000');
    
    // Add header with close button
    const headerDiv = panel.append('div')
        .style('display', 'flex')
        .style('justify-content', 'space-between')
        .style('align-items', 'center')
        .style('margin-bottom', '20px');
    
    headerDiv.append('h3')
        .style('margin', '0')
        .style('font-size', '18px')
        .text(`Correlations with ${state.currentMetric}`);
    
    headerDiv.append('button')
        .style('background', 'none')
        .style('border', 'none')
        .style('font-size', '20px')
        .style('cursor', 'pointer')
        .style('color', '#fff')
        .text('×')
        .on('click', function() {
            d3.select('#correlation-panel').remove();
            
            // Reset correlation button text
            const correlationButton = document.getElementById('correlation-button');
            if (correlationButton) {
                correlationButton.textContent = 'View Correlations';
            }
        });
    
    panel.append('p')
        .style('font-size', '14px')
        .style('margin-bottom', '20px')
        .style('line-height', '1.6')
        .text('Correlation measures how strongly two variables are related:');

    
    // Add correlations list
    const list = panel.append('div')
        .style('max-height', '350px')
        .style('overflow-y', 'auto');
    
    // Show message if no correlations found
    if (correlations.length === 0) {
        list.append('p')
            .style('font-style', 'italic')
            .style('padding', '15px 0')
            .text('Not enough data to calculate correlations.');
        return;
    }
    
    // Create a correlation item for each metric
    correlations.forEach(corr => {
        const item = list.append('div')
            .style('padding', '12px 0')
            .style('border-bottom', '1px solid #2f2f2f')
            .style('display', 'flex')
            .style('justify-content', 'space-between')
            .style('align-items', 'center')
            .style('gap', '15px');
        
        // Metric name
        item.append('div')
            .style('font-weight', 'bold')
            .style('font-size', '14px')
            .style('flex', '1')
            .text(corr.metric);
        
        // Correlation info
        const infoDiv = item.append('div')
            .style('text-align', 'right')
            .style('white-space', 'nowrap');
        
        // Direction icon
        infoDiv.append('span')
            .style('color', corr.direction === 'positive' ? '#37c593' : '#eb5757')
            .style('margin-right', '8px')
            .style('font-size', '16px')
            .text(corr.direction === 'positive' ? '↑' : '↓');
        
        // Correlation strength
        infoDiv.append('span')
            .style('font-size', '13px')
            .text(`${corr.strength} (${corr.correlation.toFixed(2)})`);
    });
    
    // Add toggle button to switch to scatter plot view
    panel.append('button')
        .style('margin-top', '20px')
        .style('padding', '10px 16px')
        .style('width', '100%')
        .style('background', '#37c593')
        .style('color', '#000000')
        .style('border', 'none')
        .style('border-radius', '6px')
        .style('cursor', 'pointer')
        .style('font-size', '14px')
        .style('font-weight', '600')
        .text('View Scatter Plot')
        .on('click', showCorrelationScatterPlot);
}
// Function to switch to scatter plot view
function showCorrelationScatterPlot() {
    // Open a modal with the scatter plot options
    const modal = d3.select('body').append('div')
        .attr('class', 'correlation-modal')
        .style('position', 'fixed')
        .style('top', '0')
        .style('left', '0')
        .style('width', '100%')
        .style('height', '100%')
        .style('background-color', 'rgba(0, 0, 0, 0.5)')
        .style('display', 'flex')
        .style('justify-content', 'center')
        .style('align-items', 'center')
        .style('z-index', '1001');
    
    // Create modal content
    const modalContent = modal.append('div')
        .style('background-color', 'white')
        .style('padding', '30px')
        .style('border-radius', '8px')
        .style('width', '90%')
        .style('max-width', '800px')
        .style('max-height', '90vh')
        .style('overflow-y', 'auto')
        .style('position', 'relative');
    
    // Add close button
    modalContent.append('button')
        .style('position', 'absolute')
        .style('right', '15px')
        .style('top', '15px')
        .style('background', 'none')
        .style('border', 'none')
        .style('font-size', '28px')
        .style('cursor', 'pointer')
        .style('color', 'rgba(255, 255, 255, 0.7)')
        .text('×')
        .on('click', () => modal.remove());
    
    // Add title
    modalContent.append('h2')
        .style('margin-top', '0')
        .style('margin-bottom', '25px')
        .style('padding-bottom', '15px')
        .style('border-bottom', '1px solid rgba(255, 255, 255, 0.2)')
        .text('Metrics Correlation Scatter Plot');
    
    // Add metrics selector section
    const selectorSection = modalContent.append('div')
        .style('display', 'flex')
        .style('gap', '20px')
        .style('margin-bottom', '25px')
        .style('flex-wrap', 'wrap');
    
    // Get metrics for dropdown options
    const metrics = Object.keys(state.filteredData[0]).filter(key => {
        return key !== config.dateField && 
               key !== "Game Type" && 
               typeof state.filteredData[0][key] === 'number';
    });
    
    // X-axis metric selector
    const xAxisDiv = selectorSection.append('div')
        .style('flex', '1')
        .style('min-width', '200px');
    xAxisDiv.append('label')
        .attr('for', 'x-metric')
        .style('display', 'block')
        .style('margin-bottom', '8px')
        .style('font-weight', '600')
        .style('font-size', '14px')
        .text('X-Axis Metric:');
    
    const xSelect = xAxisDiv.append('select')
        .attr('id', 'x-metric')
        .style('padding', '10px 12px')
        .style('border-radius', '6px')
        .style('width', '100%')
        .style('border', '1px solid rgba(255, 255, 255, 0.2)')
        .style('background', 'rgba(255, 255, 255, 0.08)')
        .style('color', '#fff');
    
    // Y-axis metric selector
    const yAxisDiv = selectorSection.append('div')
        .style('flex', '1')
        .style('min-width', '200px');
    yAxisDiv.append('label')
        .attr('for', 'y-metric')
        .style('display', 'block')
        .style('margin-bottom', '8px')
        .style('font-weight', '600')
        .style('font-size', '14px')
        .text('Y-Axis Metric:');
    
    const ySelect = yAxisDiv.append('select')
        .attr('id', 'y-metric')
        .style('padding', '10px 12px')
        .style('border-radius', '6px')
        .style('width', '100%')
        .style('border', '1px solid rgba(255, 255, 255, 0.2)')
        .style('background', 'rgba(255, 255, 255, 0.08)')
        .style('color', '#fff');
    
    // Add options to both selectors
    metrics.forEach(metric => {
        xSelect.append('option')
            .attr('value', metric)
            .text(metric)
            .property('selected', metric === state.currentMetric);
        
        // For y-axis, select the most correlated metric by default
        const correlations = calculateMetricCorrelations(state.filteredData, state.currentMetric);
        const defaultYMetric = correlations.length > 0 ? correlations[0].metric : metrics[0];
        
        ySelect.append('option')
            .attr('value', metric)
            .text(metric)
            .property('selected', metric === defaultYMetric);
    });
    
    // Create container for the scatter plot
    const plotContainer = modalContent.append('div')
        .attr('id', 'scatter-plot-container')
        .style('width', '100%')
        .style('height', '500px')
        .style('margin-top', '20px');
    
    // Initial plot creation
    createScatterPlot(
        xSelect.property('value'),
        ySelect.property('value'),
        plotContainer
    );
    
    // Add event listeners to update the plot when selections change
    xSelect.on('change', () => {
        createScatterPlot(
            xSelect.property('value'),
            ySelect.property('value'),
            plotContainer
        );
    });
    
    ySelect.on('change', () => {
        createScatterPlot(
            xSelect.property('value'),
            ySelect.property('value'),
            plotContainer
        );
    });
}

// Function to create the actual scatter plot
function createScatterPlot(xMetric, yMetric, container) {
    // Clear existing plot
    container.html('');
    
    // Set up dimensions
    const margin = { top: 40, right: 30, bottom: 60, left: 60 };
    const width = container.node().getBoundingClientRect().width - margin.left - margin.right;
    const height = container.node().getBoundingClientRect().height - margin.top - margin.bottom;
    
    // Filter data for valid points
    const validData = state.filteredData.filter(d => 
        d[xMetric] !== undefined && !isNaN(d[xMetric]) &&
        d[yMetric] !== undefined && !isNaN(d[yMetric])
    );
    
    // Create SVG
    const svg = container.append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Create scales
    const xScale = d3.scaleLinear()
        .domain([
            d3.min(validData, d => d[xMetric]) * 0.9, 
            d3.max(validData, d => d[xMetric]) * 1.1
        ])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([
            d3.min(validData, d => d[yMetric]) * 0.9, 
            d3.max(validData, d => d[yMetric]) * 1.1
        ])
        .range([height, 0]);
    
    // Add axes
    svg.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale));
    
    svg.append('g')
        .call(d3.axisLeft(yScale));
    
    // Add axis labels
    svg.append('text')
        .attr('x', width / 2)
        .attr('y', height + 40)
        .style('text-anchor', 'middle')
        .text(xMetric);
    
    svg.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -height / 2)
        .attr('y', -40)
        .style('text-anchor', 'middle')
        .text(yMetric);
    
    // Calculate correlation
    const correlation = calculatePearsonCorrelation(
        validData.map(d => d[xMetric]),
        validData.map(d => d[yMetric])
    );
    
    // Add correlation info
    svg.append('text')
        .attr('x', width - 20)
        .attr('y', 10)
        .style('text-anchor', 'end')
        .style('font-weight', 'bold')
        .text(`Correlation: ${correlation.toFixed(2)}`);
    
    // Add regression line if correlation is significant
    if (Math.abs(correlation) > 0.2) {
        // Simple linear regression
        const xMean = d3.mean(validData, d => d[xMetric]);
        const yMean = d3.mean(validData, d => d[yMetric]);
        
        let numerator = 0;
        let denominator = 0;
        
        validData.forEach(d => {
            const xDiff = d[xMetric] - xMean;
            numerator += xDiff * (d[yMetric] - yMean);
            denominator += xDiff * xDiff;
        });
        
        const slope = numerator / denominator;
        const intercept = yMean - (slope * xMean);
        
        // Create the line
        const line = d3.line()
            .x(d => xScale(d))
            .y(d => yScale(intercept + slope * d));
        
        // Add the line to the plot
        const xDomain = xScale.domain();
        svg.append('path')
            .datum(xDomain)
            .attr('fill', 'none')
            .attr('stroke', '#37c593')
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', '5,5')
            .attr('d', line);
    }
    
    // Add scatter points
    svg.selectAll('circle')
        .data(validData)
        .enter()
        .append('circle')
        .attr('cx', d => xScale(d[xMetric]))
        .attr('cy', d => yScale(d[yMetric]))
        .attr('r', 5)
        .style('fill', d => {
            if (d.isWin === true) {
                return config.colors.win;
            } else if (d.isWin === false) {
                return config.colors.loss;
            } else {
                return config.colors.neutralValue;
            }
        })
        .style('opacity', 0.7)
        .style('stroke', '#fff')
        .style('stroke-width', 1);
}

// Add a button to the controls to show correlations
function addCorrelationButton() {
    const controlsDiv = document.getElementById('controls');
    
    // Create the button
    const correlationButton = document.createElement('button');
    correlationButton.id = 'correlation-button';
    correlationButton.textContent = 'View Correlations';
    
    // Variable to track if the explanation has been shown
    let explanationShown = false;
    
    correlationButton.addEventListener('click', function() {
        // Check if correlation panel is already visible
        const existingPanel = document.getElementById('correlation-panel');
        if (existingPanel) {
            // If already showing, remove it
            existingPanel.remove();
            correlationButton.textContent = 'View Correlations';
        } else {
            // Otherwise show it
            createCorrelationPanel();
            correlationButton.textContent = 'Hide Correlations';
            
            // Show explanation modal if not shown yet
            if (!explanationShown) {
                showCorrelationExplanation();
                explanationShown = true;
            }
        }
    });
    
    // Add the button to controls
    controlsDiv.appendChild(correlationButton);
}
function calculateWinLossCounts(data) {
    let wins = 0;
    let losses = 0;

    data.forEach(d => {
        if (d.isWin === true) {
            wins++;
        } else if (d.isWin === false) {
            losses++;
        }
    });

    return { wins, losses };
}

function calculateAverage(data, metric) {
    const validData = data.filter(d => d[metric] !== undefined && !isNaN(d[metric]));
    const sum = validData.reduce((acc, d) => acc + d[metric], 0);
    return sum / validData.length;
}

// Load data from CSV (continuing the loadData function)
function loadData() {
    d3.csv(config.csvPath).then(function(data) {
        // Parse dates and numeric values
        const parseDate = d3.timeParse(config.dateFormat);
        
        data.forEach(d => {
            // Parse date
            d[config.dateField] = parseDate(d[config.dateField]);
            
            // Convert numeric fields
            for (let key in d) {
                 if (typeof d[key] === "string") {
                    let value = d[key].trim();

                    if (key == "Percentage Of Time Moving") {
                        d[key] = parseFloat(value.replace("%", ""));
                    }
                    // Convert other numeric fields
                    if (key !== config.dateField && !isNaN(value) && value !== "") {
                        d[key] = +value;
                    }
                }
            }
            
            // K/D (Kill/Death Ratio)
            if (d.Deaths > 0) {
                d["K/D Ratio"] = parseFloat((d.Kills / d.Deaths).toFixed(2));
            } else {
                d["K/D Ratio"] = d.Kills > 0 ? 99 : 0; // If no deaths but has kills, set to 99 (cap)
            }
            
            // EKIA/D (Kills + Assists) / Deaths
            if (d.Deaths > 0) {
                d["EKIA/D Ratio"] = parseFloat(((d.Kills + (d.Assists || 0)) / d.Deaths).toFixed(2));
                d["EKIA"] = parseFloat(d.Kills + (d.Assists || 0));
            } else {
                d["EKIA/D Ratio"] = (d.Kills + (d.Assists || 0)) > 0 ? 99 : 0; // Cap at 99
                d["EKIA"] = parseFloat(d.Kills + (d.Assists || 0));
            }
            
            // Headshot Percentage
            if (d.Kills > 0 && d.Headshots !== undefined) {
                d["Headshot %"] = parseFloat(((d.Headshots / d.Kills) * 100).toFixed(1));
            }
            
            // Tag ranked modes (Hardpoint, Search and Destroy, Control)
            d.isRanked = ["Hardpoint", "Search and Destroy", "Control"].includes(d["Game Type"]);
            
            // Determine win/loss status using the "Match Outcome" column
            if (d.hasOwnProperty("Match Outcome")) {
                // Check if the value is "win" (case insensitive)
                d.isWin = d["Match Outcome"].toLowerCase() === "win";
            } 
            d["Match Outcome"] = d.isWin === true ? 1 : d.isWin === false ? 0 : null;

        });
        
        // Filter for dates after cutoff and remove bot games (score = 0)
        data = data.filter(d => 
            d[config.dateField] >= config.cutoffDate && d["Total XP"] > 0
        );
        
        // Sort by date
        data.sort((a, b) => a[config.dateField] - b[config.dateField]);
        
        // Store in state
        state.data = data;
        
        // Populate UI controls with available options
        populateControls(data);
        
        // Update the visualization with initial data
        updateVisualization();
        
    }).catch(error => {
        console.error("Error loading data:", error);
    });
}

function populateControls(data) {
    // Define the specific game modes to include
    const includedGameModes = ["Hardpoint", "Control", "Search and Destroy"];
    
    // Get unique game modes and filter to include only the specified ones
    const uniqueGameModes = [...new Set(data.map(d => d["Game Type"]))].filter(mode => includedGameModes.includes(mode));
    const gameModes = [
        { value: "all", label: "All Game Modes" },
        { value: "ranked", label: "Ranked Only" },  // Add ranked option
        ...uniqueGameModes.map(mode => ({ value: mode, label: mode }))
    ];
    
    // Get unique maps
    const uniqueMaps = [...new Set(data.map(d => d["Map"]))];
    const maps = [
        { value: "all", label: "All Maps" },
        ...uniqueMaps.map(map => ({ value: map, label: map }))
    ];
    
    // Get potential metrics (numeric columns only)
    const sampleRow = data[0];
    const metrics = Object.keys(sampleRow).filter(key => {
        // Filter for numeric fields, exclude date and categorical fields
        return key !== config.dateField && 
               key !== "Game Type" && 
               key !== "Map" && 
               typeof sampleRow[key] === 'number' || key === "Percentage of Time Moving";
    });
    
    // Populate gamemode selector
    const gamemodeSelector = document.getElementById('gamemodeSelector');
    gamemodeSelector.innerHTML = '';
    
    gameModes.forEach(mode => {
        const option = document.createElement('option');
        option.value = mode.value;
        option.textContent = mode.label;
        if (mode.value === state.currentGamemode) {
            option.selected = true;
        }
        gamemodeSelector.appendChild(option);
    });
    
    // Populate map selector
    const mapSelector = document.getElementById('mapSelector');
    mapSelector.innerHTML = '';
    
    maps.forEach(map => {
        const option = document.createElement('option');
        option.value = map.value;
        option.textContent = map.label;
        if (map.value === state.currentMap) {
            option.selected = true;
        }
        mapSelector.appendChild(option);
    });
    
    // Populate metric selector
    const metricSelector = document.getElementById('metricSelector');
    metricSelector.innerHTML = '';
    
    // Define preferred order for metrics
    const preferredMetrics = [
        "Skill", "Match Outcome", "K/D Ratio", "Kills", "EKIA/D Ratio", "EKIA", "Deaths", "Damage Done", "Damage Taken",
        "Assists", "Score", "Headshot %", "Accuracy %", "Percentage Of Time Moving"
    ];
    
    // Sort metrics with preferred ones first
    const sortedMetrics = [...metrics].sort((a, b) => {
        const indexA = preferredMetrics.indexOf(a);
        const indexB = preferredMetrics.indexOf(b);
        
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
    
    sortedMetrics.forEach(metric => {
        const option = document.createElement('option');
        option.value = metric;
        option.textContent = metric;
        if (metric === state.currentMetric) {
            option.selected = true;
        }
        metricSelector.appendChild(option);
    });
}

function filterData() {
    if (!state.data) return [];
    
    return state.data.filter(d => {
        // Filter by game mode
        let gameModeMatch;
        
        if (state.currentGamemode === "all") {
            // Include all game modes
            gameModeMatch = true;
        } else if (state.currentGamemode === "ranked") {
            // For ranked, include only Hardpoint, Search and Destroy, and Control
            gameModeMatch = ["Hardpoint", "Control", "Search and Destroy"].includes(d["Game Type"]);
        } else {
            // For specific game mode selection
            gameModeMatch = d["Game Type"] === state.currentGamemode;
        }
        
        // Filter by map
        let mapMatch = state.currentMap === "all" || d["Map"] === state.currentMap;
        
        // Filter for rows with valid metric values (check if the field exists and has a numeric value)
        const validMetric = d[state.currentMetric] !== undefined && !isNaN(d[state.currentMetric]);
        
        // Special filtering - for K/D and EKIA/D, exclude extremely high values (could be edge cases)
        if ((state.currentMetric === "K/D Ratio" || state.currentMetric === "EKIA/D Ratio") && d[state.currentMetric] > 30) {
            return false; 
        }
        
        return gameModeMatch && mapMatch && validMetric;
    });
}

// Main function to update the visualization
function updateVisualization() {
    // Remove correlation panel when changing visualization
    d3.select('#correlation-panel').remove();
    
    // Reset correlation button text if it exists
    const correlationButton = document.getElementById('correlation-button');
    if (correlationButton) {
        correlationButton.textContent = 'View Correlations';
    }
    
    // Filter data
    const oldDataLength = state.filteredData ? state.filteredData.length : 0;
    state.filteredData = filterData();
    
    // Only update stats summary if data actually changed
    if (state.filteredData.length !== oldDataLength) {
        updateStatsSummary();
    }
    
    // Create or update chart
    createOrUpdateChart();
}

// Function to update stats summary cards
function updateStatsSummary() {
    const data = state.filteredData;
    if (!data || data.length === 0) return;
    
    const { wins, losses } = calculateWinLossCounts(data);
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? (wins / totalGames * 100).toFixed(1) : 0;
    const avgMetric = calculateAverage(data, state.currentMetric);
    
    const summaryContainer = document.getElementById('statsSummary');
    if (!summaryContainer) return;
    
    // Remove loading state
    const loadingDiv = document.querySelector('.loading');
    if (loadingDiv) loadingDiv.remove();
    
    summaryContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Games</div>
            <div class="stat-value">${totalGames}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Wins</div>
            <div class="stat-value positive">${wins}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Losses</div>
            <div class="stat-value negative">${losses}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Win Rate</div>
            <div class="stat-value ${winRate >= 50 ? 'positive' : 'negative'}">${winRate}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg ${state.currentMetric}</div>
            <div class="stat-value">${avgMetric.toFixed(2)}</div>
        </div>
    `;
}

function createOrUpdateChart() {
    const data = state.filteredData;
    if (!data || data.length === 0) {
        console.warn("No data available to display");
        return;
    }
    
    // Set up dimensions
    const width = config.width() - config.margin.left - config.margin.right;
    const height = config.height() - config.margin.top - config.margin.bottom;
    
    // Get time domain with padding
    const minDate = d3.min(data, d => d[config.dateField]);
    const maxDate = d3.max(data, d => d[config.dateField]);
    const timeRange = [
        d3.timeDay.offset(minDate, -2),
        d3.timeDay.offset(maxDate, 2)
    ];
    
    // Get metric domain with padding
    const minValue = d3.min(data, d => d[state.currentMetric]);
    const maxValue = d3.max(data, d => d[state.currentMetric]);
    
    // Special handling for ratio metrics - use reasonable ranges
    let valueRange;
    
    if (state.currentMetric.includes("Ratio") || state.currentMetric.includes("K/D") || state.currentMetric.includes("EKIA/D")) {
        // For ratio metrics, use a more sensible range
        valueRange = [
            0, // Always start at 0
            Math.min(10, maxValue * 1.3) // Cap at 10 or actual max + 30%
        ];
    } else if (state.currentMetric.includes("%")) {
        // For percentage metrics
        valueRange = [
            0, // Start at 0
            Math.min(100, maxValue * 1.2) // Cap at 100 or actual max + 20%
        ];
    } else {
        // For other metrics
        valueRange = [
            Math.max(0, minValue * 0.9), // Lower bound, minimum of 0
            maxValue * 1.3 // Upper bound with 30% padding (increased from 10%)
        ];
    }
    
    // Create scales
    const xScale = d3.scaleTime()
        .domain(timeRange)
        .range([0, width]);
        
    const yScale = d3.scaleLinear()
        .domain(valueRange)
        .range([height, 0]);
    
    // Store in state for zoom handler
    state.xScale = xScale;
    state.yScale = yScale;
    
    // Create or select SVG - now target chart-container
    const chartContainer = d3.select('.chart-container');
    
    if (!state.svg) {
        state.svg = chartContainer.append("svg")
            .attr("width", width + config.margin.left + config.margin.right)
            .attr("height", height + config.margin.top + config.margin.bottom)
            .style("display", "block")
            .style("margin", "0 auto");
            
        // Add title
        state.svg.append("text")
            .attr("class", "chart-title")
            .attr("x", config.margin.left + width / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold");
            
        // Add win/loss counter
        state.svg.append("text")
            .attr("class", "win-loss-counter")
            .attr("x", config.margin.left + width / 2)
            .attr("y", 50) // Adjust this value to move the counter down
            .attr("text-anchor", "middle")
            .style("font-size", "14px")
            .style("font-weight", "bold");
            
        // Create main group for chart elements
        state.chartGroup = state.svg.append("g")
            .attr("class", "chart-group")
            .attr("transform", `translate(${config.margin.left},${config.margin.top})`);
            
        // Add clip path
        state.chartGroup.append("clipPath")
            .attr("id", "chart-area-clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);
            
        // Create group for clipped elements
        state.chartGroup.append("g")
            .attr("class", "clipped-elements")
            .attr("clip-path", "url(#chart-area-clip)");
            
        // Add axes
        state.chartGroup.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0,${height})`);
            
        state.chartGroup.append("g")
            .attr("class", "y-axis");
            
        // Add axis labels
        state.chartGroup.append("text")
            .attr("class", "x-axis-label")
            .attr("x", width / 2)
            .attr("y", height + 35)
            .attr("text-anchor", "middle")
            .text("Date");
            
        state.chartGroup.append("text")
            .attr("class", "y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle");
            
        // Add legend for win/loss colors
        const legend = state.svg.append("g")
            .attr("class", "legend")
            .attr("transform", `translate(${width - 150}, 50)`);
            
        // Win indicator
        legend.append("circle")
            .attr("cx", 0)
            .attr("cy", 0)
            .attr("r", 6)
            .style("fill", config.colors.win);
            
        legend.append("text")
            .attr("x", 15)
            .attr("y", 4)
            .style("font-size", "12px")
            .text("Win");
            
        // Loss indicator
        legend.append("circle")
            .attr("cx", 0)
            .attr("cy", 20)
            .attr("r", 6)
            .style("fill", config.colors.loss);
            
        legend.append("text")
            .attr("x", 15)
            .attr("y", 24)
            .style("font-size", "12px")
            .text("Loss");
            
        // Add average value indicator with dashed line
        legend.append("line")
            .attr("x1", -10)
            .attr("y1", 40)
            .attr("x2", 10)
            .attr("y2", 40)
            .style("stroke", "grey")
            .style("stroke-dasharray", "4,4")
            .style("stroke-width", 2);
            
        legend.append("text")
            .attr("class", "average-legend")
            .attr("x", 14)
            .attr("y", 43)
            .style("font-size", "12px")
            .style("font-weight", "normal");
            
        // Setup zoom behavior
        setupZoom(width, height);
    } else {
        // Update SVG dimensions
        state.svg
            .attr("width", width + config.margin.left + config.margin.right)
            .attr("height", height + config.margin.top + config.margin.bottom);
            
        // Update clip path
        state.chartGroup.select("#chart-area-clip rect")
            .attr("width", width)
            .attr("height", height);
    }
    // Update chart title
    state.svg.select(".chart-title")
        .text(`${state.currentMetric} Over Time${state.currentGamemode !== "all" ? ` (${state.currentGamemode})` : ''}`);
    
    // Update win/loss counter
    const { wins, losses } = calculateWinLossCounts(state.filteredData);
    state.svg.select(".win-loss-counter")
        .text(`Wins: ${wins}`)  // Set text for wins
        .append("tspan")
        .attr("x", config.margin.left + width / 2)
        .attr("dy", "1.3em")
        .text(`Losses: ${losses}`)  // Set text for losses
        .append("tspan")
        .attr("x", config.margin.left + width / 2)
        .attr("dy", "1.2em")
        .text(`Ratio: ${(wins / (wins + losses) * 100).toFixed(1)}%`);  // Set text for ratio

    // Update y-axis label
    state.chartGroup.select(".y-axis-label")
        .text(state.currentMetric);
        
    // Update axes
    state.chartGroup.select(".x-axis")
        .call(d3.axisBottom(xScale));
        
    state.chartGroup.select(".y-axis")
        .call(d3.axisLeft(yScale));
        
    // Line generator
    const line = d3.line()
        .x(d => xScale(d[config.dateField]))
        .y(d => yScale(d[state.currentMetric]))
        .curve(d3.curveMonotoneX);
        
    // Get clipped elements group
    const clippedGroup = state.chartGroup.select(".clipped-elements");
    
    // Update line
    let path = clippedGroup.select(".line-path");
    if (path.empty()) {
        path = clippedGroup.append("path")
            .attr("class", "line-path")
            .style("fill", "none")
            .style("stroke", config.colors.line)
            .style("stroke-width", 2);
    }
    
    path.datum(data)
        .transition()
        .duration(config.transitionDuration)
        .attr("d", line);
        
    // Update dots with data join
    const dots = clippedGroup.selectAll(".data-point")
        .data(data, d => d[config.dateField].getTime());
        
    // Enter selection
    dots.enter()
        .append("circle")
        .attr("class", "data-point")
        .attr("cx", d => xScale(d[config.dateField]))
        .attr("cy", d => yScale(d[state.currentMetric]))
        .attr("r", 0)
        .style("fill", d => {
            // Color dots based on win/loss status
            if (d.isWin === true) {
                return config.colors.win; // Green for wins
            } else if (d.isWin === false) {
                return config.colors.loss; // Red for losses
            } else {
                return config.colors.neutralValue; // Gray for unknown
            }
        })
        .style("opacity", 0.7)
        .on("mouseover", handlePointMouseOver)
        .on("mouseout", handlePointMouseOut)
        .transition()
        .duration(config.transitionDuration)
        .attr("r", config.dotRadius);
        
    // Update selection
    dots.transition()
        .duration(config.transitionDuration)
        .attr("cx", d => xScale(d[config.dateField]))
        .attr("cy", d => yScale(d[state.currentMetric]))
        .style("fill", d => {
            // Color dots based on win/loss status
            if (d.isWin === true) {
                return config.colors.win; // Green for wins
            } else if (d.isWin === false) {
                return config.colors.loss; // Red for losses
            } else {
                return config.colors.neutralValue; // Gray for unknown
            }
        });
        
    // Exit selection
    dots.exit()
        .transition()
        .duration(config.transitionDuration)
        .attr("r", 0)
        .remove();
    
    // Calculate and add average line
    const averageValue = calculateAverage(data, state.currentMetric);
    state.chartGroup.selectAll(".average-line").remove(); // Remove existing average line if any
    
    // Add visible average line
    state.chartGroup.append("line")
        .attr("class", "average-line")
        .attr("x1", 0)
        .attr("y1", yScale(averageValue))
        .attr("x2", width)
        .attr("y2", yScale(averageValue))
        .style("stroke", "grey")
        .style("stroke-dasharray", "4,4")
        .style("stroke-width", 2);
    
    // Update average value in legend
    state.svg.select(".average-legend")
        .text(`Average: ${averageValue.toFixed(2)}`);
}

// Set up zoom behavior
function setupZoom(width, height) {
    const zoom = d3.zoom()
        .scaleExtent([0.5, 500])
        .translateExtent([[-width * 0.2, -height * 0.2], [width * 1.2, height * 1.2]])
        .on("start", () => { state.isZooming = true; })
        .on("zoom", handleZoom)
        .on("end", () => { state.isZooming = false; });
        
    state.svg.call(zoom);
}

// Handle zoom events
function handleZoom(event) {
    // Skip if no data
    if (!state.filteredData || !state.xScale) return;
    
    // Get transformed scales
    const newXScale = event.transform.rescaleX(state.xScale);
    
    // Update x-axis
    state.chartGroup.select(".x-axis")
        .call(d3.axisBottom(newXScale));
        
    // Update clipped elements using the new scale
    const clippedGroup = state.chartGroup.select(".clipped-elements");
    
    // Update line path
    const lineData = d3.line()
        .x(d => newXScale(d[config.dateField]))
        .y(d => state.yScale(d[state.currentMetric]))
        .curve(d3.curveMonotoneX);
    
    clippedGroup.select(".line-path")
        .attr("d", lineData(state.filteredData));
            
    // Update dots positions only (no transitions during zoom for performance)
    clippedGroup.selectAll(".data-point")
        .attr("cx", d => newXScale(d[config.dateField]));
}

// Modify the handlePointMouseOver function to create a static tooltip
function handlePointMouseOver(event, d) {
    // Skip during active zooming for performance
    if (state.isZooming) return;
    
    const point = d3.select(this);
    
    // Highlight point with no transition for immediate feedback
    point.attr("r", config.dotRadiusHover)
        .style("fill", config.colors.dotHover);
        
    // Format date
    const dateFormatter = d3.timeFormat("%Y-%m-%d %H:%M");
    const formattedDate = dateFormatter(d[config.dateField]);
    
    // Create tooltip content with more details
    let tooltipContent = [
        `${state.currentMetric}: ${d[state.currentMetric].toFixed(1)}`,
        `Date: ${formattedDate}`,
        `Game Type: ${d["Game Type"]}`,
        `Result: ${d.isWin === true ? "Win" : d.isWin === false ? "Loss" : "Unknown"}`
    ];
    
    // Add more stats if they exist
    let additionalContent = [];
    
    // Show Kill stats
    if (d.Kills !== undefined) additionalContent.push(`Kills: ${d.Kills}`);
    if (d.Deaths !== undefined) additionalContent.push(`Deaths: ${d.Deaths}`);
    if (d.Assists !== undefined) additionalContent.push(`Assists: ${d.Assists}`);
    
    // If we're looking at a derived metric, also show the components
    if (state.currentMetric === "K/D Ratio" && d.Kills !== undefined && d.Deaths !== undefined) {
        additionalContent.push(`K: ${d.Kills} / D: ${d.Deaths}`);
    }
    
    if (state.currentMetric === "EKIA/D Ratio" && d.Kills !== undefined && d.Deaths !== undefined) {
        additionalContent.push(`EKIA: ${d.Kills + (d.Assists || 0)} / D: ${d.Deaths}`);
    }
    
    // Show team scores if available
    if (d["Team Score"] !== undefined && d["Enemy Score"] !== undefined) {
        additionalContent.push(`Score: ${d["Team Score"]} - ${d["Enemy Score"]}`);
    }
    
    // Calculate how tall the tooltip needs to be
    const totalLines = tooltipContent.length + additionalContent.length;
    const tooltipHeight = 15 + (totalLines * 18);
    const tooltipWidth = 200;
    
    // Remove any existing tooltip
    state.chartGroup.selectAll(".tooltip").remove();
    
    // Get mouse coordinates
    const [mouseX, mouseY] = d3.pointer(event);
    
    // Add tooltip at mouse position with offset
    const tooltip = state.chartGroup.append("g")
        .attr("class", "tooltip")
        .attr("transform", `translate(${mouseX + 10}, ${mouseY - tooltipHeight - 10})`); // Position with offset
            
    // Background rectangle
    tooltip.append("rect")
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", tooltipWidth)
        .attr("height", tooltipHeight)
        .attr("rx", 5) // Rounded corners
        .attr("ry", 5)
        .style("fill", "white")
        .style("stroke", "#ccc")
        .style("stroke-width", 1)
        .style("opacity", 0.9);
    
    // Add main content
    tooltipContent.forEach((text, i) => {
        tooltip.append("text")
            .attr("x", 10)
            .attr("y", 20 + (i * 18))
            .style("font-size", "12px")
            .text(text);
    });
    
    // Add additional content
    additionalContent.forEach((text, i) => {
        tooltip.append("text")
            .attr("x", 10)
            .attr("y", 20 + ((tooltipContent.length + i) * 18))
            .style("font-size", "12px")
            .text(text);
    });
}

// Update the handlePointMouseOut function
function handlePointMouseOut(event, d) {
    // Skip during active zooming for performance
    if (state.isZooming) return;
    
    // Reset point appearance immediately (no transition)
    d3.select(this)
        .attr("r", config.dotRadius)
        .style("fill", d => {
            if (d.isWin === true) {
                return config.colors.win;
            } else if (d.isWin === false) {
                return config.colors.loss;
            } else {
                return config.colors.neutralValue;
            }
        });
    
    // Remove tooltip
    state.chartGroup.selectAll(".tooltip").remove();
}

function resizeChart() {
    // Update visualization
    updateVisualization();
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// Initialize when page loads
window.addEventListener("load", initVisualization);