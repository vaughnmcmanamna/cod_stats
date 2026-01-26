/**
 * Chart Rendering Module
 * Creates and updates all Plotly visualizations
 */

// Update overview tab
function updateOverview() {
    console.log('updateOverview called');
    
    if (!rawData || rawData.length === 0) {
        console.error('No raw data available');
        document.getElementById('overview-stats').innerHTML = '<div class="loading" style="color: #ef4444;">No data loaded yet</div>';
        return;
    }
    
    console.log('Raw data available:', rawData.length, 'rows');
    
    const gamemode = document.getElementById('overview-gamemode').value;
    const map = document.getElementById('overview-map').value;
    const data = filterData(gamemode, map);
    
    console.log('Filtered data:', data.length, 'rows');
    
    if (data.length === 0) {
        document.getElementById('overview-stats').innerHTML = `
            <div class="stat-card" style="grid-column: 1/-1;">
                <div class="stat-label">No Data</div>
                <div class="stat-value" style="color: #ef4444;">0</div>
                <p style="color: #a0a0a0; margin-top: 10px;">No matches found for selected filters</p>
            </div>
        `;
        return;
    }
    
    // Calculate stats
    const wins = data.filter(r => r.isWin).length;
    const losses = data.filter(r => !r.isWin).length;
    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : 0;
    
    const validKD = data.filter(r => !isNaN(r['K/D Ratio']));
    const avgKD = validKD.length > 0 ? 
        (validKD.reduce((sum, r) => sum + r['K/D Ratio'], 0) / validKD.length).toFixed(2) : 0;
    
    const validSkill = data.filter(r => !isNaN(r.Skill) && r.Skill > 0);
    const avgSkill = validSkill.length > 0 ?
        Math.round(validSkill.reduce((sum, r) => sum + r.Skill, 0) / validSkill.length) : 0;
    
    console.log('Stats calculated:', { wins, losses, totalGames, winRate, avgKD, avgSkill });
    
    // Update stats cards
    document.getElementById('overview-stats').innerHTML = `
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
            <div class="stat-label">Avg K/D</div>
            <div class="stat-value">${avgKD}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Skill</div>
            <div class="stat-value">${avgSkill}</div>
        </div>
    `;
    
    // Create overview timeline chart
    createOverviewTimeline(data);
    
    // Win rate by map chart
    createWinRateMapChart(data);
}

// Create timeline for overview tab
function createOverviewTimeline(data) {
    if (typeof Plotly === 'undefined') {
        document.getElementById('overview-timeline-chart').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Plotly library not loaded. Please refresh the page.</p>';
        return;
    }
    
    const metric = document.getElementById('overview-metric').value;
    
    // Sort by date
    const sortedData = [...data].sort((a, b) => a.date - b.date);
    
    const trace = {
        x: sortedData.map(r => r.date),
        y: sortedData.map(r => r[metric]),
        mode: 'lines+markers',
        type: 'scatter',
        line: { color: config.colors.primary, width: 2 },
        marker: {
            color: sortedData.map(r => r.isWin ? config.colors.win : config.colors.loss),
            size: 6,
            line: {
                color: '#fff',
                width: 1
            }
        },
        name: metric
    };
    
    const layout = {
        title: '',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#e0e0e0', family: 'Exo 2' },
        xaxis: { 
            title: 'Date',
            gridcolor: 'rgba(59, 130, 246, 0.1)'
        },
        yaxis: { 
            title: metric,
            gridcolor: 'rgba(59, 130, 246, 0.1)'
        },
        dragmode: 'pan',
        showlegend: false
    };
    
    try {
        Plotly.newPlot('overview-timeline-chart', [trace], layout, {
            responsive: true,
            scrollZoom: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        document.getElementById('overview-timeline-chart').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Error creating chart</p>';
    }
}

// Create win rate by map chart
function createWinRateMapChart(data) {
    if (typeof Plotly === 'undefined') {
        document.getElementById('winrate-map-chart').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Plotly library not loaded. Please refresh the page.</p>';
        return;
    }
    
    const mapStats = {};
    
    data.forEach(row => {
        if (!mapStats[row.Map]) {
            mapStats[row.Map] = { wins: 0, total: 0 };
        }
        mapStats[row.Map].total++;
        if (row.isWin) mapStats[row.Map].wins++;
    });
    
    const maps = Object.keys(mapStats);
    const winRates = maps.map(map => 
        (mapStats[map].wins / mapStats[map].total * 100).toFixed(1)
    );
    
    const trace = {
        x: maps,
        y: winRates,
        type: 'bar',
        marker: {
            color: winRates.map(rate => rate >= 50 ? config.colors.win : config.colors.loss)
        }
    };
    
    const layout = {
        title: '',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#e0e0e0', family: 'Exo 2' },
        xaxis: { gridcolor: 'rgba(59, 130, 246, 0.1)' },
        yaxis: { 
            title: 'Win Rate (%)',
            gridcolor: 'rgba(59, 130, 246, 0.1)',
            range: [0, 100]
        },
        dragmode: 'pan'
    };
    
    try {
        Plotly.newPlot('winrate-map-chart', [trace], layout, {
            responsive: true,
            scrollZoom: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        document.getElementById('winrate-map-chart').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Error creating chart</p>';
    }
}

// Update timeline

// Update correlations
function updateCorrelations() {
    if (!rawData) return;
    
    if (typeof Plotly === 'undefined') {
        document.getElementById('correlation-bars').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Plotly library not loaded. Please refresh the page.</p>';
        document.getElementById('correlation-matrix').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Plotly library not loaded. Please refresh the page.</p>';
        return;
    }
    
    const gamemode = document.getElementById('corr-gamemode').value;
    const primaryMetric = document.getElementById('corr-metric').value;
    const data = filterData(gamemode, 'all');
    
    const metrics = ['Kills', 'Deaths', 'Damage Done', 'Score', 'Skill', 
                   'K/D Ratio', 'EKIA/D Ratio', 'Accuracy %', 'Headshot %'];
    
    // Calculate correlations
    const correlations = metrics.map(metric => {
        const corr = calculateCorrelation(
            data.map(r => r[primaryMetric]),
            data.map(r => r[metric])
        );
        return { metric, correlation: corr };
    });
    
    correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
    
    // Correlation bars
    const trace = {
        x: correlations.map(c => c.correlation),
        y: correlations.map(c => c.metric),
        type: 'bar',
        orientation: 'h',
        marker: {
            color: correlations.map(c => 
                c.correlation > 0 ? config.colors.win : config.colors.loss
            )
        }
    };
    
    const layout = {
        title: '',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#e0e0e0', family: 'Exo 2' },
        xaxis: { 
            title: 'Correlation',
            gridcolor: 'rgba(59, 130, 246, 0.1)',
            range: [-1, 1]
        },
        yaxis: { gridcolor: 'rgba(59, 130, 246, 0.1)' },
        dragmode: 'pan'
    };
    
    try {
        Plotly.newPlot('correlation-bars', [trace], layout, {
            responsive: true,
            scrollZoom: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        document.getElementById('correlation-bars').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Error creating chart</p>';
    }
    
    // Correlation matrix
    createCorrelationMatrix(data, metrics);
}

// Create correlation matrix heatmap
function createCorrelationMatrix(data, metrics) {
    if (typeof Plotly === 'undefined') {
        document.getElementById('correlation-matrix').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Plotly library not loaded. Please refresh the page.</p>';
        return;
    }
    
    const matrix = [];
    
    for (let i = 0; i < metrics.length; i++) {
        const row = [];
        for (let j = 0; j < metrics.length; j++) {
            const corr = calculateCorrelation(
                data.map(r => r[metrics[i]]),
                data.map(r => r[metrics[j]])
            );
            row.push(corr);
        }
        matrix.push(row);
    }
    
    const trace = {
        z: matrix,
        x: metrics,
        y: metrics,
        type: 'heatmap',
        colorscale: [
            [0, config.colors.loss],
            [0.5, '#1a1f35'],
            [1, config.colors.win]
        ],
        zmid: 0
    };
    
    const layout = {
        title: '',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#e0e0e0', family: 'Exo 2', size: 10 },
        xaxis: { tickangle: -45 },
        yaxis: { autosize: true },
        dragmode: 'pan'
    };
    
    try {
        Plotly.newPlot('correlation-matrix', [trace], layout, {
            responsive: true,
            scrollZoom: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        document.getElementById('correlation-matrix').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Error creating chart</p>';
    }
}

// Calculate Pearson correlation
function calculateCorrelation(x, y) {
    const n = x.length;
    const xMean = x.reduce((a, b) => a + b, 0) / n;
    const yMean = y.reduce((a, b) => a + b, 0) / n;
    
    let num = 0, denX = 0, denY = 0;
    
    for (let i = 0; i < n; i++) {
        const xDiff = x[i] - xMean;
        const yDiff = y[i] - yMean;
        num += xDiff * yDiff;
        denX += xDiff * xDiff;
        denY += yDiff * yDiff;
    }
    
    if (denX === 0 || denY === 0) return 0;
    return num / (Math.sqrt(denX) * Math.sqrt(denY));
}

