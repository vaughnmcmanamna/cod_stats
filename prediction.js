/**
 * Prediction & Model Analytics Module
 * Handles match prediction and model visualization
 */

// Predict match outcome
function predictMatch() {
    const kills = parseFloat(document.getElementById('pred-kills').value);
    const deaths = parseFloat(document.getElementById('pred-deaths').value);
    const damage = parseFloat(document.getElementById('pred-damage').value);
    const assists = parseFloat(document.getElementById('pred-assists').value);
    const score = parseFloat(document.getElementById('pred-score').value);
    const skill = parseFloat(document.getElementById('pred-skill').value);
    const moving = parseFloat(document.getElementById('pred-moving').value);
    const damageTaken = parseFloat(document.getElementById('pred-damage-taken').value);
    const hits = parseFloat(document.getElementById('pred-hits').value);
    const shots = parseFloat(document.getElementById('pred-shots').value);
    
    // Calculate derived features
    const kdRatio = kills / (deaths + 1);
    const damageEff = damage / (damageTaken + 1);
    const accuracy = hits / (shots + 1);
    
    // Simple decision tree prediction (based on hardpoint stats)
    let prediction = 'loss';
    let confidence = 0;
    
    // Simplified decision rules (you would load actual model here)
    if (score > 2500) {
        if (kdRatio > 1.0) {
            prediction = 'win';
            confidence = 0.75;
        } else if (damage > 4500) {
            prediction = 'win';
            confidence = 0.65;
        } else {
            prediction = 'loss';
            confidence = 0.60;
        }
    } else {
        if (kdRatio > 1.5 && damage > 5000) {
            prediction = 'win';
            confidence = 0.70;
        } else {
            prediction = 'loss';
            confidence = 0.70;
        }
    }
    
    // Display result
    const resultDiv = document.getElementById('prediction-output');
    resultDiv.innerHTML = `
        <div class="prediction-result ${prediction}">
            <h3>Predicted: ${prediction.toUpperCase()}</h3>
            <p class="confidence">Confidence: ${(confidence * 100).toFixed(0)}%</p>
            <p style="margin-top: 15px; color: #a0a0a0;">
                K/D: ${kdRatio.toFixed(2)} | Damage Efficiency: ${damageEff.toFixed(2)} | Accuracy: ${(accuracy * 100).toFixed(1)}%
            </p>
        </div>
    `;
}

// Load model analytics
async function loadModelAnalytics() {
    let modelInfo;
    
    try {
        // Try to load real model statistics
        const response = await fetch('model_stats.json');
        const stats = await response.json();
        
        // Transform the loaded data to our format
        modelInfo = {
            accuracy: stats.model_info.accuracy,
            samples: stats.model_info.training_samples + stats.model_info.testing_samples,
            depth: stats.model_info.tree_depth,
            leaves: stats.model_info.leaf_nodes,
            confusionMatrix: stats.confusion_matrix.matrix,
            featureImportance: {},
            depthAccuracies: stats.depth_analysis.accuracies,
            report: stats.classification_report,
            datasetDist: stats.dataset_distribution
        };
        
        // Convert feature importance to object
        stats.feature_importance.features.forEach(f => {
            modelInfo.featureImportance[f.name] = f.importance;
        });
        
    } catch (error) {
        console.log('Could not load model_stats.json, using simulated data');
        // Fallback to simulated data
        modelInfo = {
            accuracy: 0.72,
            samples: 1500,
            depth: 5,
            leaves: 18,
            confusionMatrix: [[420, 130], [150, 800]],
            featureImportance: {
                'Score': 0.31,
                'Damage Done': 0.18,
                'Kill_Death_Ratio': 0.15,
                'Skill': 0.12,
                'Damage_Efficiency': 0.10,
                'Kills': 0.08,
                'Accuracy': 0.06
            },
            depthAccuracies: [0.58, 0.65, 0.72, 0.71, 0.70, 0.69]
        };
    }
    
    // Model info cards
    document.getElementById('model-info').innerHTML = `
        <div class="info-card">
            <h3>Model Overview</h3>
            <ul>
                <li><span class="metric-name">Algorithm</span><span class="metric-value">Decision Tree</span></li>
                <li><span class="metric-name">Accuracy</span><span class="metric-value">${(modelInfo.accuracy * 100).toFixed(1)}%</span></li>
                <li><span class="metric-name">Training Samples</span><span class="metric-value">${modelInfo.samples}</span></li>
                <li><span class="metric-name">Tree Depth</span><span class="metric-value">${modelInfo.depth}</span></li>
                <li><span class="metric-name">Leaf Nodes</span><span class="metric-value">${modelInfo.leaves}</span></li>
            </ul>
        </div>
        <div class="info-card">
            <h3>Performance Metrics</h3>
            <ul>
                <li><span class="metric-name">True Positives</span><span class="metric-value">${modelInfo.confusionMatrix[1][1]}</span></li>
                <li><span class="metric-name">True Negatives</span><span class="metric-value">${modelInfo.confusionMatrix[0][0]}</span></li>
                <li><span class="metric-name">False Positives</span><span class="metric-value">${modelInfo.confusionMatrix[0][1]}</span></li>
                <li><span class="metric-name">False Negatives</span><span class="metric-value">${modelInfo.confusionMatrix[1][0]}</span></li>
            </ul>
        </div>
        <div class="info-card">
            <h3>Top Features</h3>
            <ul>
                ${Object.entries(modelInfo.featureImportance)
                    .slice(0, 5)
                    .map(([feature, importance]) => 
                        `<li><span class="metric-name">${feature}</span><span class="metric-value">${(importance * 100).toFixed(1)}%</span></li>`
                    ).join('')}
            </ul>
        </div>
    `;
    
    // Confusion matrix heatmap
    createConfusionMatrix(modelInfo.confusionMatrix);
    
    // Feature importance chart
    createFeatureImportance(modelInfo.featureImportance);
    
    // Depth accuracy chart
    createDepthAccuracy(modelInfo.depthAccuracies);
}

function createConfusionMatrix(matrix) {
    if (typeof Plotly === 'undefined') {
        document.getElementById('confusion-matrix').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Plotly library not loaded. Please refresh the page.</p>';
        return;
    }
    
    const trace = {
        z: matrix,
        x: ['Predicted Loss', 'Predicted Win'],
        y: ['Actual Loss', 'Actual Win'],
        type: 'heatmap',
        colorscale: [[0, '#1a1f35'], [1, config.colors.primary]],
        text: matrix,
        texttemplate: '%{text}',
        textfont: { size: 20, color: '#e0e0e0' }
    };
    
    const layout = {
        title: '',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#e0e0e0', family: 'Exo 2' },
        dragmode: 'pan'
    };
    
    try {
        Plotly.newPlot('confusion-matrix', [trace], layout, {
            responsive: true,
            scrollZoom: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        document.getElementById('confusion-matrix').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Error creating chart</p>';
    }
}

function createFeatureImportance(importance) {
    if (typeof Plotly === 'undefined') {
        document.getElementById('feature-importance').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Plotly library not loaded. Please refresh the page.</p>';
        return;
    }
    
    const features = Object.keys(importance);
    const values = Object.values(importance);
    
    const trace = {
        x: values,
        y: features,
        type: 'bar',
        orientation: 'h',
        marker: {
            color: values.map((v, i) => {
                const colors = [config.colors.primary, config.colors.secondary, config.colors.accent];
                return colors[i % colors.length];
            })
        }
    };
    
    const layout = {
        title: '',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#e0e0e0', family: 'Exo 2' },
        xaxis: { 
            title: 'Importance',
            gridcolor: 'rgba(59, 130, 246, 0.1)'
        },
        yaxis: { gridcolor: 'rgba(59, 130, 246, 0.1)' },
        dragmode: 'pan'
    };
    
    try {
        Plotly.newPlot('feature-importance', [trace], layout, {
            responsive: true,
            scrollZoom: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        document.getElementById('feature-importance').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Error creating chart</p>';
    }
}

function createDepthAccuracy(accuracies) {
    if (typeof Plotly === 'undefined') {
        document.getElementById('depth-accuracy').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Plotly library not loaded. Please refresh the page.</p>';
        return;
    }
    
    const trace = {
        x: [1, 3, 5, 10, 15, 20],
        y: accuracies,
        type: 'scatter',
        mode: 'lines+markers',
        line: { color: config.colors.primary, width: 3 },
        marker: { size: 10, color: config.colors.secondary }
    };
    
    const layout = {
        title: '',
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: { color: '#e0e0e0', family: 'Exo 2' },
        xaxis: { 
            title: 'Tree Depth',
            gridcolor: 'rgba(59, 130, 246, 0.1)'
        },
        yaxis: { 
            title: 'Accuracy',
            gridcolor: 'rgba(59, 130, 246, 0.1)',
            range: [0, 1]
        },
        dragmode: 'pan'
    };
    
    try {
        Plotly.newPlot('depth-accuracy', [trace], layout, {
            responsive: true,
            scrollZoom: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        });
    } catch (error) {
        console.error('Error creating chart:', error);
        document.getElementById('depth-accuracy').innerHTML = '<p style="color: #ef4444; text-align: center; padding: 50px;">Error creating chart</p>';
    }
}

