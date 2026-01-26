/**
 * Main Application Logic
 * Handles tab switching and initialization
 */

// Tab switching
function switchTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Activate button
    event.target.classList.add('active');
    
    // Load tab-specific data
    switch(tabName) {
        case 'overview':
            updateOverview();
            break;
        case 'correlations':
            updateCorrelations();
            break;
        case 'model':
            loadModelAnalytics();
            break;
    }
}

// Initialize on load
window.addEventListener('load', () => {
    // Wait a bit for CDN libraries to load
    setTimeout(() => {
        if (checkLibraries()) {
            loadData();
        }
    }, 500);
});
