// Configuration options
const config = {
    defaultGamemode: "all",
    defaultMetric: "Skill",
    dateField: "UTC Timestamp",
    dateFormat: "%Y-%m-%d %H:%M",
    cutoffDate: new Date(2024, 11, 1), // December 1, 2024
    margin: { top: 30, right: 50, bottom: 50, left: 60 },
    width: () => window.innerWidth * 0.8,
    height: () => window.innerHeight * 0.6,
    csvPath: "cod_stats1.csv",
    dotRadius: 4,
    dotRadiusHover: 6,
    transitionDuration: 500,
    colors: {
        line: "#2563eb", // Blue line
        dot: "#ef4444",  // Red dots
        dotHover: "#f97316", // Orange on hover
        positiveValue: "#10b981", // Green for good stats
        negativeValue: "#ef4444", // Red for poor stats
        neutralValue: "#6b7280"  // Gray for neutral stats
    },
    // Metrics to colorize based on value (higher is better)
    positiveMetrics: ["K/D Ratio", "EKIA/D Ratio", "Score Per Minute", "Accuracy %", "Skill"],
    // Metrics where lower is better
    negativeMetrics: ["Deaths"]
};

// Chart state
let state = {
    data: null,        // The full dataset
    filteredData: null, // Data after filtering
    currentGamemode: config.defaultGamemode,
    currentMetric: config.defaultMetric,
    svg: null,
    chartGroup: null,
    xScale: null,
    yScale: null,
    isZooming: false
};

// Initialize the visualization system
function initVisualization() {
    // Create UI controls if they don't exist
    createControls();
    
    // Load the data
    loadData();
    
    // Set up window resize handler
    window.addEventListener("resize", debounce(resizeChart, 250));
}

// Create or update the UI controls
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
    const controlGroupStyle = 'display: flex; align-items: center; gap: 8px;';
    
    // Style for all controls
    const controlStyle = 'padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px;';
    
    // Style for all labels
    const labelStyle = 'font-weight: bold; font-size: 14px;';
    
    // Create control group for gamemode
    const gamemodeGroup = document.createElement('div');
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
    
    // Create control group for metric
    const metricGroup = document.createElement('div');
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
    controlsDiv.appendChild(metricGroup);
    controlsDiv.appendChild(helpButton);
    
    // Add event listeners
    gamemodeSelector.addEventListener('change', function() {
        state.currentGamemode = this.value;
        updateVisualization();
    });
    
    metricSelector.addEventListener('change', function() {
        state.currentMetric = this.value;
        updateVisualization();
    });
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
        padding: 20px;
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '✕';
    closeButton.style = `
        position: absolute;
        top: 10px;
        right: 15px;
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
    `;
    closeButton.addEventListener('click', () => modal.remove());
    
    // Add title
    const title = document.createElement('h2');
    title.textContent = 'Game Statistics Visualization Help';
    title.style = 'margin-top: 0; color: #111;';
    
    // Add content
    const content = document.createElement('div');
    content.innerHTML = `
        <h3>Available Metrics</h3>
        <ul>
            <li><strong>Skill</strong>: Your skill rating</li>
            <li><strong>K/D Ratio</strong>: Kills divided by deaths</li>
            <li><strong>EKIA/D Ratio</strong>: (Kills + Assists) divided by deaths</li>
            <li><strong>Score Per Minute</strong>: Average score earned per minute of gameplay</li>
            <li><strong>Headshot %</strong>: Percentage of kills that were headshots</li>
            <li><strong>Accuracy %</strong>: Percentage of shots that hit targets</li>
        </ul>
        
        <h3>Game Modes</h3>
        <ul>
            <li><strong>All Game Modes</strong>: Shows data from all game types</li>
            <li><strong>Ranked Only</strong>: Shows only Hardpoint, Search and Destroy, and Control matches</li>
            <li><strong>Specific Mode</strong>: Select a specific game type from the dropdown</li>
        </ul>
        
        <h3>Chart Controls</h3>
        <ul>
            <li><strong>Zoom</strong>: Use the mouse wheel to zoom in and out</li>
            <li><strong>Pan</strong>: Click and drag to move around</li>
            <li><strong>Hover</strong>: Mouse over data points to see detailed information</li>
        </ul>
        
        <h3>Data Filtering</h3>
        <p>Games with a score of 0 (bot games) are automatically filtered out.</p>
        
        <h3>Color Coding</h3>
        <p>Some metrics are color-coded based on performance:
        <ul>
            <li><span style="color: #10b981;">Green</span>: Good performance</li>
            <li><span style="color: #6b7280;">Gray</span>: Average performance</li>
            <li><span style="color: #ef4444;">Red</span>: Below average performance</li>
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

// Load data from CSV
function loadData() {
    d3.csv(config.csvPath).then(function(data) {
        // Parse dates and numeric values
        const parseDate = d3.timeParse(config.dateFormat);
        
        data.forEach(d => {
            // Parse date
            d[config.dateField] = parseDate(d[config.dateField]);
            
            // Convert numeric fields
            for (let key in d) {
                if (key !== config.dateField && !isNaN(d[key]) && d[key].trim() !== "") {
                    d[key] = +d[key];
                }
            }
            
            // Calculate derived metrics
            
            // K/D (Kill/Death Ratio)
            if (d.Deaths > 0) {
                d["K/D Ratio"] = parseFloat((d.Kills / d.Deaths).toFixed(2));
            } else {
                d["K/D Ratio"] = d.Kills > 0 ? 99 : 0; // If no deaths but has kills, set to 99 (cap)
            }
            
            // EKIA/D (Kills + Assists) / Deaths
            if (d.Deaths > 0) {
                d["EKIA/D Ratio"] = parseFloat(((d.Kills + (d.Assists || 0)) / d.Deaths).toFixed(2));
            } else {
                d["EKIA/D Ratio"] = (d.Kills + (d.Assists || 0)) > 0 ? 99 : 0; // Cap at 99
            }
            
            // Average Score Per Minute (if Duration is in seconds)
            if (d.Duration > 0 && d.Score) {
                d["Score Per Minute"] = parseFloat(((d.Score / (d.Duration / 60))).toFixed(1));
            }
            
            // Headshot Percentage
            if (d.Kills > 0 && d.Headshots !== undefined) {
                d["Headshot %"] = parseFloat(((d.Headshots / d.Kills) * 100).toFixed(1));
            }
            
            // Accuracy Percentage (if available)
            if (d.Hits > 0 && d.Shots > 0) {
                d["Accuracy %"] = parseFloat(((d.Hits / d.Shots) * 100).toFixed(1));
            }
            
            // Tag ranked modes (Hardpoint, Search and Destroy, Control)
            d.isRanked = ["Hardpoint", "Search and Destroy", "Control"].includes(d["Game Type"]);
        });
        
        // Filter for dates after cutoff and remove bot games (score = 0)
        data = data.filter(d => 
            d[config.dateField] >= config.cutoffDate && 
            (d.Score === undefined || d.Score > 0)  // Keep only if Score is undefined or > 0
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

// Populate UI controls based on data
function populateControls(data) {
    // Get unique game modes and create the game modes array with special options first
    const uniqueGameModes = [...new Set(data.map(d => d["Game Type"]))];
    const gameModes = [
        { value: "all", label: "All Game Modes" },
        { value: "ranked", label: "Ranked Only" },  // Add ranked option
        ...uniqueGameModes.map(mode => ({ value: mode, label: mode }))
    ];
    
    // Get potential metrics (numeric columns only)
    const sampleRow = data[0];
    const metrics = Object.keys(sampleRow).filter(key => {
        // Filter for numeric fields, exclude date and categorical fields
        return key !== config.dateField && 
               key !== "Game Type" && 
               typeof sampleRow[key] === 'number';
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
    
    // Populate metric selector
    const metricSelector = document.getElementById('metricSelector');
    metricSelector.innerHTML = '';
    
    // Define preferred order for metrics
    const preferredMetrics = [
        "Skill", "K/D Ratio", "EKIA/D Ratio", "Score Per Minute", 
        "Kills", "Deaths", "Assists", "Score", "Headshot %", "Accuracy %"
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

// Filter data based on current state
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
            gameModeMatch = d.isRanked;
        } else {
            // For specific game mode selection
            gameModeMatch = d["Game Type"] === state.currentGamemode;
        }
        
        // Filter for rows with valid metric values (check if the field exists and has a numeric value)
        const validMetric = d[state.currentMetric] !== undefined && !isNaN(d[state.currentMetric]);
        
        // Special filtering - for K/D and EKIA/D, exclude extremely high values (could be edge cases)
        if ((state.currentMetric === "K/D Ratio" || state.currentMetric === "EKIA/D Ratio") && d[state.currentMetric] > 30) {
            return false; 
        }
        
        return gameModeMatch && validMetric;
    });
}

// Main function to update the visualization
function updateVisualization() {
    // Filter data
    state.filteredData = filterData();
    
    // Create or update chart
    createOrUpdateChart();
}

// Create or update the chart
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
    
    if (state.currentMetric.includes("Ratio") || state.currentMetric.includes("K/D") || state.currentMetric.includes("EKIA")) {
        // For ratio metrics, use a more sensible range
        valueRange = [
            0, // Always start at 0
            Math.min(5, maxValue * 1.1) // Cap at 5 or actual max + 10%
        ];
    } else if (state.currentMetric.includes("%")) {
        // For percentage metrics
        valueRange = [
            0, // Start at 0
            Math.min(100, maxValue * 1.1) // Cap at 100 or actual max + 10%
        ];
    } else {
        // For other metrics
        valueRange = [
            Math.max(0, minValue * 0.9), // Lower bound, minimum of 0
            maxValue * 1.1 // Upper bound with 10% padding
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
    
    // Create or select SVG
    if (!state.svg) {
        state.svg = d3.select("body").append("svg")
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
            // Color dots based on metric value
            if (config.positiveMetrics.includes(state.currentMetric)) {
                // For positive metrics (higher is better), scale color from neutral to positive
                const normalizedValue = Math.min(1, d[state.currentMetric] / 3); // Cap at 3.0 for normalization
                return normalizedValue > 0.6 ? config.colors.positiveValue : 
                       normalizedValue > 0.3 ? config.colors.neutralValue : 
                       config.colors.negativeValue;
            } else if (config.negativeMetrics.includes(state.currentMetric)) {
                // For negative metrics (lower is better)
                return d[state.currentMetric] > 15 ? config.colors.negativeValue : config.colors.neutralValue;
            } else {
                // Default color for other metrics
                return config.colors.dot;
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
        .attr("cy", d => yScale(d[state.currentMetric]));
        
    // Exit selection
    dots.exit()
        .transition()
        .duration(config.transitionDuration)
        .attr("r", 0)
        .remove();
}

// Set up zoom behavior
function setupZoom(width, height) {
    const zoom = d3.zoom()
        .scaleExtent([0.5, 100])
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
    
    // Update line
    clippedGroup.select(".line-path")
        .attr("d", d3.line()
            .x(d => newXScale(d[config.dateField]))
            .y(d => state.yScale(d[state.currentMetric]))
            .curve(d3.curveMonotoneX)(state.filteredData));
            
    // Update dots directly for better performance
    clippedGroup.selectAll(".data-point")
        .attr("cx", d => newXScale(d[config.dateField]));
}

// Handle point mouseover
function handlePointMouseOver(event, d) {
    // Skip during active zooming for performance
    if (state.isZooming) return;
    
    const point = d3.select(this);
    
    // Highlight point
    point.transition()
        .duration(100)
        .attr("r", config.dotRadiusHover)
        .style("fill", config.colors.dotHover);
        
    // Format date
    const dateFormatter = d3.timeFormat("%Y-%m-%d %H:%M");
    const formattedDate = dateFormatter(d[config.dateField]);
    
    // Create tooltip content with more details
    let tooltipContent = [
        `${state.currentMetric}: ${d[state.currentMetric].toFixed(1)}`,
        `Date: ${formattedDate}`,
        `Game Type: ${d["Game Type"]}`
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
    
    // Calculate how tall the tooltip needs to be
    const totalLines = tooltipContent.length + additionalContent.length;
    const tooltipHeight = 15 + (totalLines * 18);
    const tooltipWidth = 200;
    
    // Add tooltip
    const tooltip = state.chartGroup.append("g")
        .attr("class", "tooltip")
        .attr("transform", `translate(${state.isZooming ? 
            event.transform.applyX(state.xScale(d[config.dateField])) : 
            state.xScale(d[config.dateField])},${state.yScale(d[state.currentMetric]) - 10})`);
            
    // Background rectangle
    tooltip.append("rect")
        .attr("x", 10)
        .attr("y", -45)
        .attr("width", tooltipWidth)
        .attr("height", tooltipHeight)
        .attr("rx", 5)
        .style("fill", "white")
        .style("stroke", "#ccc")
        .style("opacity", 0.9);
    
    // Add primary content
    tooltipContent.forEach((text, i) => {
        tooltip.append("text")
            .attr("x", 20)
            .attr("y", -25 + (i * 18))
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .style("fill", "#333")
            .text(text);
    });
    
    // Add additional stats with a lighter style
    additionalContent.forEach((text, i) => {
        tooltip.append("text")
            .attr("x", 20)
            .attr("y", -25 + ((i + tooltipContent.length) * 18))
            .style("font-size", "12px")
            .style("fill", "#666")
            .text(text);
    });
}

// Handle point mouseout
function handlePointMouseOut() {
    // Skip during active zooming for performance
    if (state.isZooming) return;
    
    // Reset point style
    d3.select(this).transition()
        .duration(100)
        .attr("r", config.dotRadius)
        .style("fill", config.colors.dot);
        
    // Remove tooltip
    state.chartGroup.selectAll(".tooltip").remove();
}

// Handle window resize
function resizeChart() {
    if (state.svg) {
        updateVisualization();
    }
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