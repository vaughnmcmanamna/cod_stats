/**
 * Data Loading Module
 * Handles CSV loading, parsing, and sample data generation
 */

// Load sample data for testing
function loadSampleData() {
    console.log('Loading sample data...');
    
    // Generate sample data
    rawData = [];
    const gameModes = ['Hardpoint', 'Control', 'Search and Destroy'];
    const maps = ['Skyline', 'Hacienda', 'Vault', 'Protocol', 'Red Card', 'Rewind'];
    
    const startDate = new Date(2024, 11, 1); // Dec 1, 2024
    
    for (let i = 0; i < 200; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + Math.floor(i / 5)); // ~5 games per day
        date.setHours(12 + Math.floor(Math.random() * 8)); // Random time
        
        const kills = Math.floor(15 + Math.random() * 25);
        const deaths = Math.floor(10 + Math.random() * 20);
        const assists = Math.floor(5 + Math.random() * 15);
        const damage = Math.floor(3000 + Math.random() * 5000);
        const damageTaken = Math.floor(2500 + Math.random() * 4500);
        const shots = Math.floor(300 + Math.random() * 400);
        const hits = Math.floor(shots * (0.15 + Math.random() * 0.25));
        const headshots = Math.floor(kills * (0.1 + Math.random() * 0.2));
        const isWin = Math.random() > 0.45; // ~55% win rate
        
        rawData.push({
            'UTC Timestamp': date.toISOString(),
            date: date,
            'Game Type': gameModes[Math.floor(Math.random() * gameModes.length)],
            'Map': maps[Math.floor(Math.random() * maps.length)],
            'Match Outcome': isWin ? 'win' : 'loss',
            'Kills': kills,
            'Deaths': deaths,
            'Assists': assists,
            'Score': Math.floor(2000 + Math.random() * 3000),
            'Damage Done': damage,
            'Damage Taken': damageTaken,
            'Skill': Math.floor(800 + Math.random() * 400),
            'Hits': hits,
            'Shots': shots,
            'Headshots': headshots,
            'Total XP': Math.floor(5000 + Math.random() * 5000),
            'Percentage Of Time Moving': Math.floor(60 + Math.random() * 30),
            'K/D Ratio': kills / deaths,
            'EKIA/D Ratio': (kills + assists) / deaths,
            'Headshot %': (headshots / kills) * 100,
            'Accuracy %': (hits / shots) * 100,
            'isWin': isWin
        });
    }
    
    console.log('Sample data generated:', rawData.length, 'rows');
    
    // Populate map selectors
    ['overview-map'].forEach(id => {
        const select = document.getElementById(id);
        select.innerHTML = '<option value="all">All Maps</option>';
        maps.forEach(map => {
            const option = document.createElement('option');
            option.value = map;
            option.textContent = map;
            select.appendChild(option);
        });
    });
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 20px 30px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
        z-index: 10000;
        animation: slideIn 0.5s ease;
    `;
    successMsg.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">✓ Sample Data Loaded</div>
        <div style="font-size: 0.9em;">${rawData.length} matches generated</div>
    `;
    document.body.appendChild(successMsg);
    setTimeout(() => successMsg.remove(), 3000);
    
    // Load overview
    updateOverview();
}

// Load CSV data
async function loadData() {
    try {
        console.log('Attempting to load cod_stats.csv...');
        const response = await fetch('cod_stats.csv');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('CSV loaded, length:', csvText.length);
        
        rawData = parseCSV(csvText);
        console.log('Parsed rows:', rawData.length);
        
        if (rawData.length === 0) {
            throw new Error('No data found in CSV file');
        }
        
        // Log first row to check structure
        console.log('First row sample:', rawData[0]);
        
        // Process data
        let processedCount = 0;
        rawData = rawData.map(row => {
            try {
                // Parse date - handle multiple formats
                const timestamp = row['UTC Timestamp'] || row['Timestamp'] || row['Date'];
                
                // Handle the format "2025-03-15 1:35"
                if (timestamp && timestamp.includes(' ')) {
                    const parts = timestamp.split(' ');
                    const datePart = parts[0];
                    const timePart = parts[1] || '0:00';
                    
                    // Parse date and time separately
                    const [year, month, day] = datePart.split('-').map(Number);
                    const [hour, minute] = timePart.split(':').map(Number);
                    
                    row.date = new Date(year, month - 1, day, hour || 0, minute || 0);
                } else {
                    row.date = new Date(timestamp);
                }
                
                if (isNaN(row.date.getTime())) {
                    console.warn('Invalid date:', timestamp);
                    return null;
                }
                
                // Convert numeric fields safely
                const numericFields = ['Kills', 'Deaths', 'Assists', 'Score', 'Damage Done', 
                                      'Damage Taken', 'Skill', 'Hits', 'Shots', 'Headshots', 'Total XP'];
                
                numericFields.forEach(field => {
                    if (row[field] !== undefined && row[field] !== '') {
                        const val = parseFloat(String(row[field]).replace(/,/g, ''));
                        row[field] = isNaN(val) ? 0 : val;
                    } else {
                        row[field] = 0;
                    }
                });
                
                // Calculate ratios with safe division
                row['K/D Ratio'] = row.Deaths > 0 ? row.Kills / row.Deaths : row.Kills;
                row['EKIA/D Ratio'] = row.Deaths > 0 ? (row.Kills + (row.Assists || 0)) / row.Deaths : (row.Kills + (row.Assists || 0));
                row['Headshot %'] = row.Kills > 0 ? (row.Headshots / row.Kills) * 100 : 0;
                row['Accuracy %'] = row.Shots > 0 ? (row.Hits / row.Shots) * 100 : 0;
                
                // Parse percentage fields
                if (row['Percentage Of Time Moving']) {
                    const pct = String(row['Percentage Of Time Moving']).replace('%', '').trim();
                    row['Percentage Of Time Moving'] = parseFloat(pct) || 0;
                } else {
                    row['Percentage Of Time Moving'] = 0;
                }
                
                // Match outcome
                const outcome = String(row['Match Outcome'] || '').toLowerCase().trim();
                row.isWin = outcome === 'win';
                row['Match Outcome'] = row.isWin ? 1 : 0;
                
                // Game Type and Map
                row['Game Type'] = row['Game Type'] || row['Mode'] || 'Unknown';
                row.Map = row.Map || 'Unknown';
                
                processedCount++;
                return row;
            } catch (e) {
                console.warn('Error processing row:', e, row);
                return null;
            }
        }).filter(row => row !== null);
        
        console.log('Successfully processed rows:', processedCount);
        
        // Filter data
        const beforeFilter = rawData.length;
        rawData = rawData.filter(row => {
            const dateValid = row.date >= config.cutoffDate;
            const xpValid = row['Total XP'] > 0;
            return dateValid && xpValid;
        });
        
        console.log(`Filtered from ${beforeFilter} to ${rawData.length} rows`);
        
        if (rawData.length === 0) {
            throw new Error('No data available after filtering. Check your date cutoff and Total XP values.');
        }
        
        // Populate map selectors
        const uniqueMaps = [...new Set(rawData.map(r => r.Map).filter(m => m && m !== 'Unknown'))].sort();
        console.log('Unique maps found:', uniqueMaps);
        
        ['overview-map'].forEach(id => {
            const select = document.getElementById(id);
            // Clear existing options except "All Maps"
            select.innerHTML = '<option value="all">All Maps</option>';
            uniqueMaps.forEach(map => {
                const option = document.createElement('option');
                option.value = map;
                option.textContent = map;
                select.appendChild(option);
            });
        });
        
        console.log('Data loaded successfully, calling updateOverview...');
        
        // Initial load
        updateOverview();
        
    } catch (error) {
        console.error('Error loading data:', error);
        
        // Show user-friendly error
        const errorMessage = document.createElement('div');
        errorMessage.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(239, 68, 68, 0.95);
            color: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            z-index: 10000;
            max-width: 500px;
            text-align: center;
        `;
        errorMessage.innerHTML = `
            <h2 style="margin-top: 0;">⚠️ Data Loading Error</h2>
            <p><strong>Error:</strong> ${error.message}</p>
            <p style="margin-top: 20px;">Please ensure:</p>
            <ul style="text-align: left; margin: 15px 0;">
                <li>The file <code>cod_stats.csv</code> is in the same folder as this HTML file</li>
                <li>You're running this from a web server (not just file://)</li>
                <li>Your CSV has the required columns (UTC Timestamp, Kills, Deaths, etc.)</li>
            </ul>
            <button onclick="this.parentElement.remove()" style="
                margin-top: 20px;
                padding: 10px 20px;
                background: white;
                color: #ef4444;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-weight: bold;
            ">Close</button>
        `;
        document.body.appendChild(errorMessage);
    }
}

// Improved CSV parser that handles quoted fields
function parseCSV(text) {
    const lines = text.split('\n');
    if (lines.length < 2) {
        throw new Error('CSV file is empty or has no data rows');
    }
    
    // Parse header
    const headers = parseCSVLine(lines[0]);
    console.log('CSV Headers:', headers);
    
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        try {
            const values = parseCSVLine(line);
            
            if (values.length !== headers.length) {
                console.warn(`Row ${i} has ${values.length} values but expected ${headers.length}`);
            }
            
            const row = {};
            headers.forEach((header, index) => {
                row[header] = values[index] !== undefined ? values[index] : '';
            });
            
            data.push(row);
        } catch (e) {
            console.warn(`Error parsing line ${i}:`, e);
        }
    }
    
    return data;
}

// Parse a single CSV line, handling quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    // Add last field
    result.push(current.trim());
    
    return result;
}

// Filter data based on controls
function filterData(gamemode, map) {
    if (!rawData) return [];
    
    return rawData.filter(row => {
        let gamemodeMatch = true;
        
        if (gamemode === 'ranked') {
            gamemodeMatch = ['Hardpoint', 'Control', 'Search and Destroy'].includes(row['Game Type']);
        } else if (gamemode !== 'all') {
            gamemodeMatch = row['Game Type'] === gamemode;
        }
        
        const mapMatch = map === 'all' || row.Map === map;
        
        return gamemodeMatch && mapMatch;
    });
}

// Update overview tab
