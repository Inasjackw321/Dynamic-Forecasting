/**
 * Dynamic Forecasting - Main Application
 * Handles UI interactions and forecast display
 */

// Initialize forecast generator
const forecastGen = new ForecastGenerator();
let currentForecastData = null;

// DOM Elements
const elements = {
    // Tabs
    tabBtns: document.querySelectorAll('.tab-btn'),
    tabContents: document.querySelectorAll('.tab-content'),

    // Input fields
    latitude: document.getElementById('latitude'),
    longitude: document.getElementById('longitude'),
    locationName: document.getElementById('location-name'),
    forecastHours: document.getElementById('forecast-hours'),
    temperatureUnit: document.getElementById('temperature-unit'),

    // Search
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    searchResults: document.getElementById('search-results'),

    // City buttons
    cityBtns: document.querySelectorAll('.city-btn'),

    // Generate button
    generateBtn: document.getElementById('generate-forecast-btn'),

    // Display elements
    loading: document.getElementById('loading'),
    errorMessage: document.getElementById('error-message'),
    resultsSection: document.getElementById('results-section'),
    forecastLocation: document.getElementById('forecast-location'),
    forecastIssued: document.getElementById('forecast-issued'),
    currentConditions: document.getElementById('current-conditions'),
    forecastPeriods: document.getElementById('forecast-periods'),
    hourlyForecast: document.getElementById('hourly-forecast'),
    dailySummary: document.getElementById('daily-summary'),

    // Download buttons
    downloadTextBtn: document.getElementById('download-text-btn'),
    downloadJsonBtn: document.getElementById('download-json-btn'),
    shareBtn: document.getElementById('share-btn')
};

// Tab switching
elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // Update active tab button
        elements.tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update active tab content
        elements.tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            }
        });
    });
});

// City preset buttons
elements.cityBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        elements.latitude.value = btn.dataset.lat;
        elements.longitude.value = btn.dataset.lon;
        elements.locationName.value = btn.dataset.name;

        // Switch to coordinates tab
        document.querySelector('[data-tab="coordinates"]').click();
    });
});

// Search functionality
elements.searchBtn.addEventListener('click', async () => {
    const query = elements.searchInput.value.trim();
    if (!query) return;

    try {
        showLoading('Searching locations...');
        const results = await forecastGen.searchLocation(query);
        hideLoading();
        displaySearchResults(results);
    } catch (error) {
        hideLoading();
        showError(`Search failed: ${error.message}`);
    }
});

// Search on Enter key
elements.searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        elements.searchBtn.click();
    }
});

// Display search results
function displaySearchResults(results) {
    elements.searchResults.innerHTML = '';

    if (results.length === 0) {
        elements.searchResults.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--text-secondary);">No locations found</p>';
        return;
    }

    results.forEach(result => {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const locationText = [
            result.name,
            result.admin1,
            result.country
        ].filter(Boolean).join(', ');

        item.textContent = locationText;

        item.addEventListener('click', () => {
            elements.latitude.value = result.latitude;
            elements.longitude.value = result.longitude;
            elements.locationName.value = result.name;
            elements.searchResults.innerHTML = '';

            // Switch to coordinates tab
            document.querySelector('[data-tab="coordinates"]').click();
        });

        elements.searchResults.appendChild(item);
    });
}

// Generate forecast button
elements.generateBtn.addEventListener('click', async () => {
    const lat = parseFloat(elements.latitude.value);
    const lon = parseFloat(elements.longitude.value);
    const name = elements.locationName.value || `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°W`;
    const hours = parseInt(elements.forecastHours.value);
    const tempUnit = elements.temperatureUnit.value;

    // Validate inputs
    if (isNaN(lat) || isNaN(lon)) {
        showError('Please enter valid coordinates');
        return;
    }

    if (lat < -90 || lat > 90) {
        showError('Latitude must be between -90 and 90');
        return;
    }

    if (lon < -180 || lon > 180) {
        showError('Longitude must be between -180 and 180');
        return;
    }

    try {
        showLoading('Fetching weather data...');
        hideError();

        const forecast = await forecastGen.fetchForecast(lat, lon, {
            forecastHours: hours,
            temperatureUnit: tempUnit
        });

        currentForecastData = {
            ...forecast,
            locationName: name
        };

        hideLoading();
        displayForecast(currentForecastData);

        // Scroll to results
        elements.resultsSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        hideLoading();
        showError(`Failed to fetch forecast: ${error.message}`);
    }
});

// Display forecast
function displayForecast(data) {
    // Update location and issued time
    elements.forecastLocation.textContent = `Weather Forecast for ${data.locationName}`;

    const issuedDate = new Date(data.issueTime);
    elements.forecastIssued.textContent = `Issued: ${issuedDate.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })}`;

    // Display current conditions
    displayCurrentConditions(data.current);

    // Display forecast periods
    displayForecastPeriods(data.periods);

    // Display hourly forecast
    displayHourlyForecast(data.hourly.slice(0, 24));

    // Display daily summary
    displayDailySummary(data.daily);

    // Show results section
    elements.resultsSection.style.display = 'block';
}

// Display current conditions
function displayCurrentConditions(current) {
    if (!current) {
        elements.currentConditions.innerHTML = '<p>Current conditions unavailable</p>';
        return;
    }

    const tempUnit = elements.temperatureUnit.value === 'fahrenheit' ? 'F' : 'C';

    elements.currentConditions.innerHTML = `
        <div class="current-stat">
            <span class="weather-icon">${current.icon}</span>
        </div>
        <div class="current-stat">
            <span class="current-stat-value">${forecastGen.formatTemperature(current.temperature, tempUnit)}</span>
            <span class="current-stat-label">Temperature</span>
        </div>
        <div class="current-stat">
            <span class="current-stat-value">${current.condition}</span>
            <span class="current-stat-label">Conditions</span>
        </div>
        <div class="current-stat">
            <span class="current-stat-value">${Math.round(current.humidity)}%</span>
            <span class="current-stat-label">Humidity</span>
        </div>
        <div class="current-stat">
            <span class="current-stat-value">${forecastGen.formatWind(current.windSpeed, current.windDirection)}</span>
            <span class="current-stat-label">Wind</span>
        </div>
    `;
}

// Display forecast periods
function displayForecastPeriods(periods) {
    const tempUnit = elements.temperatureUnit.value === 'fahrenheit' ? 'F' : 'C';

    elements.forecastPeriods.innerHTML = periods.map(period => `
        <div class="forecast-period">
            <div class="period-header">
                <div>
                    <span class="weather-icon">${period.icon}</span>
                    <span class="period-name">${period.name}</span>
                </div>
                <span class="period-temp">${forecastGen.formatTemperature(period.temperature, tempUnit)}</span>
            </div>
            <div class="period-details">
                <div class="period-detail">
                    <span class="period-detail-label">Conditions:</span>
                    <span class="period-detail-value">${period.condition}</span>
                </div>
                <div class="period-detail">
                    <span class="period-detail-label">Wind:</span>
                    <span class="period-detail-value">${forecastGen.formatWind(period.windSpeed, period.windDirection)}</span>
                </div>
                <div class="period-detail">
                    <span class="period-detail-label">Humidity:</span>
                    <span class="period-detail-value">${period.humidity}%</span>
                </div>
                <div class="period-detail">
                    <span class="period-detail-label">Precipitation:</span>
                    <span class="period-detail-value">${forecastGen.formatPrecipitation(period.precipitation)}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Display hourly forecast
function displayHourlyForecast(hourly) {
    const tempUnit = elements.temperatureUnit.value === 'fahrenheit' ? 'F' : 'C';

    const tableHTML = `
        <table class="hourly-table">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Conditions</th>
                    <th>Temp</th>
                    <th>Feels Like</th>
                    <th>Wind</th>
                    <th>Humidity</th>
                    <th>Precip</th>
                </tr>
            </thead>
            <tbody>
                ${hourly.map(hour => `
                    <tr>
                        <td>${hour.time.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' })}</td>
                        <td>${forecastGen.getWeatherIcon(hour.weatherCode, hour.isDay)} ${forecastGen.getWeatherDescription(hour.weatherCode)}</td>
                        <td>${forecastGen.formatTemperature(hour.temperature, tempUnit)}</td>
                        <td>${forecastGen.formatTemperature(hour.apparentTemperature, tempUnit)}</td>
                        <td>${forecastGen.formatWind(hour.windSpeed, hour.windDirection)}</td>
                        <td>${Math.round(hour.humidity)}%</td>
                        <td>${forecastGen.formatPrecipitation(hour.precipitation)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    elements.hourlyForecast.innerHTML = tableHTML;
}

// Display daily summary
function displayDailySummary(daily) {
    const tempUnit = elements.temperatureUnit.value === 'fahrenheit' ? 'F' : 'C';

    elements.dailySummary.innerHTML = daily.map(day => `
        <div class="daily-item">
            <div class="daily-date">
                ${day.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
            <div class="daily-condition">
                <span class="weather-icon">${forecastGen.getWeatherIcon(day.weatherCode, true)}</span>
                <span>${forecastGen.getWeatherDescription(day.weatherCode)}</span>
            </div>
            <div class="daily-temp-high">
                High: ${forecastGen.formatTemperature(day.temperatureMax, tempUnit)}
            </div>
            <div class="daily-temp-low">
                Low: ${forecastGen.formatTemperature(day.temperatureMin, tempUnit)}
            </div>
        </div>
    `).join('');
}

// Download as text
elements.downloadTextBtn.addEventListener('click', () => {
    if (!currentForecastData) return;

    const text = generateTextForecast(currentForecastData);
    downloadFile(text, `forecast_${currentForecastData.locationName.replace(/\s+/g, '_')}.txt`, 'text/plain');
});

// Download as JSON
elements.downloadJsonBtn.addEventListener('click', () => {
    if (!currentForecastData) return;

    const json = JSON.stringify(currentForecastData, null, 2);
    downloadFile(json, `forecast_${currentForecastData.locationName.replace(/\s+/g, '_')}.json`, 'application/json');
});

// Share forecast
elements.shareBtn.addEventListener('click', () => {
    if (!currentForecastData) return;

    const url = new URL(window.location.href);
    url.searchParams.set('lat', currentForecastData.location.latitude);
    url.searchParams.set('lon', currentForecastData.location.longitude);
    url.searchParams.set('name', currentForecastData.locationName);

    navigator.clipboard.writeText(url.toString()).then(() => {
        alert('Forecast link copied to clipboard!');
    }).catch(() => {
        prompt('Copy this link:', url.toString());
    });
});

// Generate text forecast
function generateTextForecast(data) {
    const tempUnit = elements.temperatureUnit.value === 'fahrenheit' ? 'F' : 'C';
    const lines = [];

    lines.push('='.repeat(70));
    lines.push(`WEATHER FORECAST FOR ${data.locationName.toUpperCase()}`);
    lines.push(`Issued: ${new Date(data.issueTime).toLocaleString()}`);
    lines.push('='.repeat(70));
    lines.push('');

    // Current conditions
    if (data.current) {
        lines.push('CURRENT CONDITIONS');
        lines.push('-'.repeat(70));
        lines.push(`Temperature: ${forecastGen.formatTemperature(data.current.temperature, tempUnit)}`);
        lines.push(`Conditions: ${data.current.condition}`);
        lines.push(`Humidity: ${Math.round(data.current.humidity)}%`);
        lines.push(`Wind: ${forecastGen.formatWind(data.current.windSpeed, data.current.windDirection)}`);
        lines.push('');
    }

    // Forecast periods
    lines.push('FORECAST PERIODS');
    lines.push('-'.repeat(70));
    data.periods.forEach(period => {
        lines.push(`\n${period.name}: ${forecastGen.formatTemperature(period.temperature, tempUnit)}`);
        lines.push(`  Conditions: ${period.condition}`);
        lines.push(`  Wind: ${forecastGen.formatWind(period.windSpeed, period.windDirection)}`);
        lines.push(`  Humidity: ${period.humidity}%`);
        lines.push(`  Precipitation: ${forecastGen.formatPrecipitation(period.precipitation)}`);
    });

    lines.push('');
    lines.push('='.repeat(70));
    lines.push('Data provided by Open-Meteo API');
    lines.push('Generated by Dynamic Forecasting');

    return lines.join('\n');
}

// Download file helper
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Show/hide loading
function showLoading(message = 'Loading...') {
    elements.loading.style.display = 'block';
    if (message) {
        elements.loading.querySelector('p').textContent = message;
    }
}

function hideLoading() {
    elements.loading.style.display = 'none';
}

// Show/hide error
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.style.display = 'block';
    elements.errorMessage.scrollIntoView({ behavior: 'smooth' });
}

function hideError() {
    elements.errorMessage.style.display = 'none';
}

// Load forecast from URL parameters on page load
window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lon = params.get('lon');
    const name = params.get('name');

    if (lat && lon) {
        elements.latitude.value = lat;
        elements.longitude.value = lon;
        if (name) elements.locationName.value = name;

        // Auto-generate forecast
        setTimeout(() => {
            elements.generateBtn.click();
        }, 500);
    }
});
