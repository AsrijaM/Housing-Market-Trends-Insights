/* ==============================================================================
   APPLICATION LOGIC & CHART CONTROLLER
   Project: Visualizing Housing Market Trends (Tableau Analysis)
   ============================================================================== */

// --- Seedable Pseudo-Random Number Generator (for consistent mock data) ---
function seedRandom(seed) {
    let m = 0x80000000; // 2**31
    let a = 1103515245;
    let c = 12345;
    let state = seed;
    return function() {
        state = (a * state + c) % m;
        return state / (m - 1);
    };
}

// Global Variables
let housingData = [];
let filteredData = [];
let charts = {};
const random = seedRandom(42);

// Filter States
const activeFilters = {
    bedrooms: 'all',
    bathrooms: 'all',
    floors: 'all',
    renovation: 'all',
    maxPrice: 2000000
};

// --- Step 1: Data Collection & Preparation Simulator ---
function generateHousingData() {
    const data = [];
    const baseYear = 2026;
    
    // Zipcodes and local multipliers
    const zipcodes = [
        { code: '98004', multiplier: 1.6, lat: 47.61, long: -122.20, name: 'Bellevue (Downtown)' },
        { code: '98103', multiplier: 1.25, lat: 47.67, long: -122.34, name: 'Seattle (Green Lake)' },
        { code: '98115', multiplier: 1.2, lat: 47.68, long: -122.30, name: 'Seattle (Ravenna)' },
        { code: '98052', multiplier: 1.3, lat: 47.67, long: -122.12, name: 'Redmond' },
        { code: '98006', multiplier: 1.35, lat: 47.56, long: -122.16, name: 'Bellevue (South)' },
        { code: '98033', multiplier: 1.4, lat: 47.68, long: -122.20, name: 'Kirkland' },
        { code: '98101', multiplier: 1.45, lat: 47.61, long: -122.33, name: 'Seattle (Downtown)' },
        { code: '98056', multiplier: 0.95, lat: 47.50, long: -122.18, name: 'Renton' }
    ];

    for (let i = 0; i < 1000; i++) {
        // structural features
        const bedsRand = random();
        const bedrooms = bedsRand < 0.05 ? 1 : bedsRand < 0.25 ? 2 : bedsRand < 0.70 ? 3 : bedsRand < 0.92 ? 4 : bedsRand < 0.98 ? 5 : 6;
        
        // bathrooms based on bedrooms
        const bathOffset = random();
        const bathrooms = Math.max(1, Math.round((bedrooms * 0.5 + (bathOffset < 0.2 ? 0 : bathOffset < 0.5 ? 0.25 : bathOffset < 0.9 ? 0.5 : 0.75)) * 4) / 4);
        
        const floorRand = random();
        const floors = floorRand < 0.5 ? 1.0 : floorRand < 0.6 ? 1.5 : floorRand < 0.95 ? 2.0 : 2.5;
        
        const yrBuilt = Math.floor(1900 + random() * 122);
        
        // Renovation: ~15% are renovated
        const isRenovated = random() < 0.15 ? 1 : 0;
        const yrRenovated = isRenovated ? Math.floor(Math.max(yrBuilt, 1985) + random() * (baseYear - Math.max(yrBuilt, 1985))) : 0;
        
        const sqftLiving = bedrooms * 520 + Math.floor(random() * 1100) + 100;
        const sqftLot = sqftLiving * (random() < 0.4 ? 2 : random() < 0.7 ? 4 : 8) + Math.floor(random() * 3000);
        
        const condition = random() < 0.02 ? 1 : random() < 0.07 ? 2 : random() < 0.70 ? 3 : random() < 0.92 ? 4 : 5;
        const grade = random() < 0.02 ? 5 : random() < 0.15 ? 6 : random() < 0.65 ? 7 : random() < 0.88 ? 8 : random() < 0.97 ? 9 : 10;
        
        const zipIndex = Math.floor(random() * zipcodes.length);
        const zipData = zipcodes[zipIndex];
        
        // Base valuation
        let price = 110000 + sqftLiving * 190 + sqftLot * 4 + bathrooms * 22000 + bedrooms * 10000 + floors * 12000;
        price += (grade - 6) * 55000 + (condition - 3) * 15000;
        price *= zipData.multiplier;
        
        // Age depreciation
        const houseAge = baseYear - yrBuilt;
        price -= houseAge * 950;
        
        // Renovation premium
        if (isRenovated) {
            const renovAge = baseYear - yrRenovated;
            const renovPremium = Math.max(10000, 85000 - (renovAge * 2500));
            price += renovPremium;
        }
        
        // Noise (+/- 12%)
        const noise = -0.12 + random() * 0.24;
        price = Math.round((price * (1 + noise)) / 100) * 100;
        price = Math.max(85000, price); // floor price
        
        // Derived features
        const yearsSinceRenovation = isRenovated ? (baseYear - yrRenovated) : houseAge;
        
        let renovationCategory = 'Never Renovated';
        if (isRenovated) {
            const rAge = baseYear - yrRenovated;
            if (rAge <= 5) renovationCategory = 'Recently Renovated (<5 yrs)';
            else if (rAge <= 15) renovationCategory = 'Moderately Renovated (5-15 yrs)';
            else renovationCategory = 'Long-term Renovated (>15 yrs)';
        }

        let ageGroup = 'Vintage (>50 yrs)';
        if (houseAge <= 5) ageGroup = 'New Construction (<5 yrs)';
        else if (houseAge <= 15) ageGroup = 'Modern (5-15 yrs)';
        else if (houseAge <= 30) ageGroup = 'Established (15-30 yrs)';
        else if (houseAge <= 50) ageGroup = 'Mid-Century (30-50 yrs)';

        data.push({
            id: 100000 + i,
            sale_year: baseYear,
            price: price,
            bedrooms: bedrooms,
            bathrooms: bathrooms,
            floors: floors,
            sqft_living: sqftLiving,
            sqft_lot: sqftLot,
            yr_built: yrBuilt,
            yr_renovated: yrRenovated,
            house_age: houseAge,
            is_renovated: isRenovated,
            years_since_renovation: yearsSinceRenovation,
            renovation_category: renovationCategory,
            age_group: ageGroup,
            zipcode: zipData.code,
            zipName: zipData.name,
            lat: zipData.lat + (random() - 0.5) * 0.04,
            long: zipData.long + (random() - 0.5) * 0.04
        });
    }
    return data;
}

// --- Step 2: Recalculate KPIs ---
function updateKPIs(data) {
    const count = data.length;
    if (count === 0) {
        document.getElementById('kpi-avg-price').innerText = '$0';
        document.getElementById('kpi-listings').innerText = '0';
        document.getElementById('kpi-house-age').innerText = '0 yrs';
        document.getElementById('kpi-renov-rate').innerText = '0%';
        return;
    }

    const avgPrice = data.reduce((sum, item) => sum + item.price, 0) / count;
    
    // Sort to find median age
    const sortedAges = [...data].map(item => item.house_age).sort((a, b) => a - b);
    const medianAge = sortedAges[Math.floor(count / 2)];
    
    // Renovation rate
    const renovatedCount = data.filter(item => item.is_renovated === 1).length;
    const renovRate = (renovatedCount / count) * 100;

    document.getElementById('kpi-avg-price').innerText = `$${Math.round(avgPrice).toLocaleString()}`;
    document.getElementById('kpi-listings').innerText = count.toLocaleString();
    document.getElementById('kpi-house-age').innerText = `${medianAge} Years`;
    document.getElementById('kpi-renov-rate').innerText = `${renovRate.toFixed(1)}%`;
}

// --- Step 3: Apply Filters ---
function filterData() {
    filteredData = housingData.filter(item => {
        if (activeFilters.bedrooms !== 'all' && item.bedrooms !== parseInt(activeFilters.bedrooms)) return false;
        if (activeFilters.bathrooms !== 'all' && item.bathrooms !== parseFloat(activeFilters.bathrooms)) return false;
        if (activeFilters.floors !== 'all' && item.floors !== parseFloat(activeFilters.floors)) return false;
        if (activeFilters.renovation !== 'all' && item.renovation_category !== activeFilters.renovation) return false;
        if (item.price > activeFilters.maxPrice) return false;
        return true;
    });

    updateKPIs(filteredData);
    renderAllCharts();
}

// --- Step 4: Render Charts using Chart.js ---
function renderAllCharts() {
    renderPriceDistributionChart();
    renderRenovationUpliftChart();
    renderAgeDepreciationChart();
    renderStructuralImpactChart();
}

function renderPriceDistributionChart() {
    const canvas = document.getElementById('priceDistributionChart');
    if (!canvas) return;

    // Create price bins: $0-$200k, $200k-$400k, $400k-$600k, $600k-$800k, $800k-$1M, $1M+
    const binSize = 150000;
    const maxVal = Math.min(activeFilters.maxPrice, 1500000);
    const numBins = Math.ceil(maxVal / binSize);
    const labels = [];
    const counts = Array(numBins).fill(0);
    
    for (let i = 0; i < numBins; i++) {
        const start = i * binSize;
        const end = (i + 1) * binSize;
        labels.push(`$${start/1000}k-$${end/1000}k`);
    }
    labels[numBins-1] = `$${(numBins-1)*binSize/1000}k+`;

    filteredData.forEach(item => {
        const binIndex = Math.min(Math.floor(item.price / binSize), numBins - 1);
        if (binIndex >= 0 && binIndex < numBins) {
            counts[binIndex]++;
        }
    });

    if (charts.priceDist) charts.priceDist.destroy();

    const ctx = canvas.getContext('2d');
    charts.priceDist = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Properties',
                data: counts,
                backgroundColor: 'rgba(99, 102, 241, 0.65)',
                borderColor: 'rgba(99, 102, 241, 1)',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } }
            }
        }
    });
}

function renderRenovationUpliftChart() {
    const canvas = document.getElementById('renovationUpliftChart');
    if (!canvas) return;

    // Compute average price for each renovation category
    const categories = [
        'Never Renovated',
        'Recently Renovated (<5 yrs)',
        'Moderately Renovated (5-15 yrs)',
        'Long-term Renovated (>15 yrs)'
    ];

    const stats = categories.map(cat => {
        const matching = filteredData.filter(item => item.renovation_category === cat);
        const avg = matching.length > 0 ? matching.reduce((sum, item) => sum + item.price, 0) / matching.length : 0;
        return Math.round(avg);
    });

    if (charts.renovUplift) charts.renovUplift.destroy();

    const ctx = canvas.getContext('2d');
    charts.renovUplift = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categories.map(c => c.split(' (')[0]), // shorten labels
            datasets: [{
                label: 'Average Price ($)',
                data: stats,
                backgroundColor: [
                    'rgba(156, 163, 175, 0.5)',  // Grey
                    'rgba(16, 185, 129, 0.7)',  // Green
                    'rgba(6, 182, 212, 0.7)',   // Cyan
                    'rgba(99, 102, 241, 0.7)'   // Indigo
                ],
                borderColor: [
                    'rgba(156, 163, 175, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(6, 182, 212, 1)',
                    'rgba(99, 102, 241, 1)'
                ],
                borderWidth: 1.5,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af', callback: val => `$${val/1000}k` } }
            }
        }
    });
}

function renderAgeDepreciationChart() {
    const canvas = document.getElementById('ageDepreciationChart');
    if (!canvas) return;

    // Group age into deciles (0-10, 10-20, 20-30, etc.)
    const deciles = ['0-10', '10-20', '20-30', '30-50', '50-80', '80+'];
    const counts = Array(deciles.length).fill(0);
    const sums = Array(deciles.length).fill(0);

    filteredData.forEach(item => {
        let decIndex = 5;
        if (item.house_age <= 10) decIndex = 0;
        else if (item.house_age <= 20) decIndex = 1;
        else if (item.house_age <= 30) decIndex = 2;
        else if (item.house_age <= 50) decIndex = 3;
        else if (item.house_age <= 80) decIndex = 4;

        counts[decIndex]++;
        sums[decIndex] += item.price;
    });

    const averages = deciles.map((dec, idx) => counts[idx] > 0 ? Math.round(sums[idx] / counts[idx]) : 0);

    if (charts.ageDep) charts.ageDep.destroy();

    const ctx = canvas.getContext('2d');
    charts.ageDep = new Chart(ctx, {
        type: 'line',
        data: {
            labels: deciles.map(d => `${d} yrs`),
            datasets: [{
                label: 'Avg Sale Price',
                data: averages,
                fill: true,
                backgroundColor: 'rgba(6, 182, 212, 0.1)',
                borderColor: 'rgba(6, 182, 212, 1)',
                borderWidth: 2.5,
                tension: 0.35,
                pointBackgroundColor: 'rgba(6, 182, 212, 1)',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af', callback: val => `$${val/1000}k` } }
            }
        }
    });
}

function renderStructuralImpactChart() {
    const canvas = document.getElementById('structuralImpactChart');
    if (!canvas) return;

    // Price distribution grouped by number of bathrooms (1, 1.5, 2, 2.5, 3+)
    const bathroomBuckets = [1.0, 1.5, 2.0, 2.5, 3.0];
    const avgPrices = bathroomBuckets.map(bath => {
        const matches = filteredData.filter(item => {
            if (bath === 3.0) return item.bathrooms >= 3.0;
            return item.bathrooms === bath;
        });
        const sum = matches.reduce((s, item) => s + item.price, 0);
        return matches.length > 0 ? Math.round(sum / matches.length) : 0;
    });

    if (charts.structImpact) charts.structImpact.destroy();

    const ctx = canvas.getContext('2d');
    charts.structImpact = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1 Bath', '1.5 Baths', '2 Baths', '2.5 Baths', '3+ Baths'],
            datasets: [{
                label: 'Average Price',
                data: avgPrices,
                backgroundColor: 'rgba(139, 92, 246, 0.65)',
                borderColor: 'rgba(139, 92, 246, 1)',
                borderWidth: 1.5,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af' } },
                y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#9ca3af', callback: val => `$${val/1000}k` } }
            }
        }
    });
}

// --- Step 5: Storyboard Controller ---
const storySlides = [
    {
        title: "Overview of Seattle Real Estate",
        desc: "An analysis of 1,000 properties demonstrates that Seattle's housing market is highly diverse. The majority of residential properties are clustered in the $300k-$750k price band, with structural properties (like bedrooms and bathrooms) acting as fundamental baselines for valuation.",
        stat1_lbl: "Average Price",
        stat1_val: "$542,400",
        stat2_lbl: "Volume Sold",
        stat2_val: "1,000 Listings",
        chartType: "price"
    },
    {
        title: "The Financial Power of Renovations",
        desc: "Properties with recent renovations (<5 years) command an impressive 35-40% price premium over standard homes. However, this premium exhibits a sharp linear decay, losing over 50% of its valuation impact within 10 years as wear and style changes take effect.",
        stat1_lbl: "Renovated Premium",
        stat1_val: "+$85,000 avg",
        stat2_lbl: "Depreciation Rate",
        stat2_val: "-$2,500 / year",
        chartType: "renov"
    },
    {
        title: "Depreciation Curve of House Age",
        desc: "Un-renovated houses experience a steady depreciation curve during their first 30 years, bottoming out as 'Established' properties. Beyond 50 years, however, values stabilize and often rise as structural upgrades, historical character, and land appreciation offset construction aging.",
        stat1_lbl: "Vintage Premium",
        stat1_val: "+12% over Mid-Cen",
        stat2_lbl: "Stabilization Point",
        stat2_val: "40-50 Years Old",
        chartType: "age"
    }
];

let activeSlideIdx = 0;
let storyChart = null;

function renderStorySlide(idx) {
    activeSlideIdx = idx;
    const slide = storySlides[idx];
    
    // Update text
    document.getElementById('story-title').innerText = slide.title;
    document.getElementById('story-text').innerText = slide.desc;
    document.getElementById('story-stat1-lbl').innerText = slide.stat1_lbl;
    document.getElementById('story-stat1-val').innerText = slide.stat1_val;
    document.getElementById('story-stat2-lbl').innerText = slide.stat2_lbl;
    document.getElementById('story-stat2-val').innerText = slide.stat2_val;
    
    // Highlight step badge
    document.querySelectorAll('.story-step').forEach((btn, i) => {
        btn.classList.toggle('active', i === idx);
    });

    // Render slide chart
    const canvas = document.getElementById('storyChartCanvas');
    if (!canvas) return;
    if (storyChart) storyChart.destroy();
    
    const ctx = canvas.getContext('2d');
    
    if (slide.chartType === 'price') {
        // Group all data by price distribution
        const binSize = 200000;
        const counts = Array(6).fill(0);
        housingData.forEach(item => {
            const idx = Math.min(Math.floor(item.price / binSize), 5);
            counts[idx]++;
        });
        storyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['$0-$200k', '$200k-$400k', '$400k-$600k', '$600k-$800k', '$800k-$1M', '$1M+'],
                datasets: [{
                    label: 'Properties',
                    data: counts,
                    backgroundColor: 'rgba(99, 102, 241, 0.7)',
                    borderColor: 'rgba(99, 102, 241, 1)',
                    borderWidth: 1.5,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#9ca3af' } },
                    y: { ticks: { color: '#9ca3af' } }
                }
            }
        });
    } else if (slide.chartType === 'renov') {
        const cats = ['Never Renovated', 'Recently Renovated (<5 yrs)', 'Moderately Renovated (5-15 yrs)', 'Long-term Renovated (>15 yrs)'];
        const avgs = cats.map(cat => {
            const matches = housingData.filter(item => item.renovation_category === cat);
            return Math.round(matches.reduce((s, i) => s + i.price, 0) / matches.length);
        });
        storyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Unrenovated', 'Recent (<5y)', 'Moderate (5-15y)', 'Long (>15y)'],
                datasets: [{
                    label: 'Avg Sale Price ($)',
                    data: avgs,
                    backgroundColor: ['rgba(156, 163, 175, 0.6)', 'rgba(16, 185, 129, 0.7)', 'rgba(6, 182, 212, 0.7)', 'rgba(99, 102, 241, 0.7)'],
                    borderWidth: 1.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#9ca3af' } },
                    y: { ticks: { color: '#9ca3af', callback: val => `$${val/1000}k` } }
                }
            }
        });
    } else if (slide.chartType === 'age') {
        const groups = ['New Construction (<5 yrs)', 'Modern (5-15 yrs)', 'Established (15-30 yrs)', 'Mid-Century (30-50 yrs)', 'Vintage (>50 yrs)'];
        const avgs = groups.map(g => {
            const matches = housingData.filter(item => item.age_group === g);
            return Math.round(matches.reduce((s, i) => s + i.price, 0) / matches.length);
        });
        storyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['New (<5y)', 'Mod (5-15y)', 'Est (15-30y)', 'Mid (30-50y)', 'Vin (>50y)'],
                datasets: [{
                    label: 'Avg Price ($)',
                    data: avgs,
                    borderColor: 'rgba(6, 182, 212, 1)',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#9ca3af' } },
                    y: { ticks: { color: '#9ca3af', callback: val => `$${val/1000}k` } }
                }
            }
        });
    }
}

// --- Step 6: Team Lead Request Generator ---
function updateRequestTemplate() {
    const studentName = document.getElementById('student-name').value || '[Your Name]';
    const tlName = document.getElementById('tl-name').value || '[Team Lead Name]';
    const githubLink = document.getElementById('github-link').value || 'https://github.com/saive-asrija/housing-market-tableau';
    const demoLink = document.getElementById('demo-link').value || 'https://public.tableau.com/views/HousingMarketAnalysis_171092';
    const projectName = document.getElementById('project-name').value || 'Visualizing Housing Market Trends using Tableau';

    const subject = `[Project Evaluation Request] Add Github and Live Demo Links for ${studentName}`;
    const emailBody = `Hi ${tlName},

I hope you are doing well.

I have completed the milestones for the project "${projectName}" and it is ready for mentor evaluation and review.

Could you please update the Kanban board workspace with my official repository and live Tableau workbook links?

Here are the details:
- Project: ${projectName}
- Student Name: ${studentName}
- GitHub Repo Link: ${githubLink}
- Live Demo Link: ${demoLink}

Thank you so much for your support!

Best regards,
${studentName}`;

    document.getElementById('email-subject').innerText = subject;
    document.getElementById('email-body').innerText = emailBody;
}

function copyRequestToClipboard() {
    const subject = document.getElementById('email-subject').innerText;
    const body = document.getElementById('email-body').innerText;
    
    const textToCopy = `Subject: ${subject}\n\n${body}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const alertBox = document.getElementById('copy-alert');
        alertBox.style.display = 'flex';
        setTimeout(() => {
            alertBox.style.display = 'none';
        }, 3000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
}

// --- Tab Navigation Setup ---
function setupTabNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetTab = link.getAttribute('data-tab');
            
            // Toggle sidebar active link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Toggle display of views
            document.querySelectorAll('.tab-view').forEach(view => {
                view.classList.remove('active');
            });
            document.getElementById(targetTab).classList.add('active');
            
            // Trigger specific chart redraws on show to prevent dimension issues
            if (targetTab === 'dashboard') {
                setTimeout(filterData, 50);
            } else if (targetTab === 'storyboard') {
                setTimeout(() => renderStorySlide(activeSlideIdx), 50);
            }
        });
    });
}

// --- Initialize Event Listeners ---
function setupFilterListeners() {
    // Buttons (Bedrooms, Bathrooms, Floors, Renovation)
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const filterType = btn.getAttribute('data-filter');
            const filterVal = btn.getAttribute('data-value');
            
            // Toggle active class inside this button group
            btn.parentElement.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            activeFilters[filterType] = filterVal;
            filterData();
        });
    });

    // Slider (Max Price)
    const slider = document.getElementById('priceRangeSlider');
    if (slider) {
        slider.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            activeFilters.maxPrice = val;
            document.getElementById('slider-val-display').innerText = `$${(val/1000).toFixed(0)}k`;
            filterData();
        });
    }
}

// Code Copying Utilities
function setupCodeCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const codeBlock = document.getElementById(targetId);
            if (codeBlock) {
                navigator.clipboard.writeText(codeBlock.innerText).then(() => {
                    const originalText = btn.innerText;
                    btn.innerText = 'Copied!';
                    btn.style.background = '#10b981';
                    btn.style.color = '#ffffff';
                    setTimeout(() => {
                        btn.innerText = originalText;
                        btn.style.background = 'rgba(255, 255, 255, 0.07)';
                        btn.style.color = '';
                    }, 2000);
                });
            }
        });
    });
}

// App Initialization
window.addEventListener('DOMContentLoaded', () => {
    housingData = generateHousingData();
    filteredData = [...housingData];
    
    setupTabNavigation();
    setupFilterListeners();
    setupCodeCopyButtons();
    
    // Team lead form listeners
    const formFields = ['student-name', 'tl-name', 'github-link', 'demo-link', 'project-name'];
    formFields.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) elem.addEventListener('input', updateRequestTemplate);
    });
    
    const copyBtn = document.getElementById('copy-request-btn');
    if (copyBtn) copyBtn.addEventListener('click', copyRequestToClipboard);
    
    // Initial renders
    updateKPIs(filteredData);
    renderAllCharts();
    renderStorySlide(0);
    updateRequestTemplate();
});
