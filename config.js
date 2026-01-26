/**
 * Configuration file for CoD Stats Analysis
 * Contains all global settings and constants
 */

// Global state
let rawData = null;
let modelData = null;

// Check if libraries loaded
function checkLibraries() {
    if (typeof d3 === 'undefined') {
        console.error('D3.js failed to load');
        alert('Error: D3.js library failed to load. Please check your internet connection and refresh.');
        return false;
    }
    if (typeof Plotly === 'undefined') {
        console.error('Plotly failed to load');
        alert('Error: Plotly library failed to load. Please check your internet connection and refresh.');
        return false;
    }
    return true;
}

// Configuration
const config = {
    cutoffDate: new Date(2024, 0, 1), // January 1, 2024 - include all recent data
    colors: {
        win: '#10b981',
        loss: '#ef4444',
        neutral: '#6b7280',
        primary: '#3b82f6',
        secondary: '#ec4899',
        accent: '#22d3ee'
    }
};
