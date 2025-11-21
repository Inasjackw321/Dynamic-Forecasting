/**
 * Dynamic Forecasting - Forecast Module
 * Handles weather data fetching and processing from Open-Meteo API
 */

class ForecastGenerator {
    constructor() {
        this.baseUrl = 'https://api.open-meteo.com/v1/forecast';
        this.geocodeUrl = 'https://geocoding-api.open-meteo.com/v1/search';
    }

    /**
     * Fetch weather forecast for a location
     */
    async fetchForecast(latitude, longitude, options = {}) {
        const {
            forecastHours = 48,
            temperatureUnit = 'fahrenheit',
            timezone = 'auto'
        } = options;

        const forecastDays = Math.ceil(forecastHours / 24);

        const hourlyVars = [
            'temperature_2m',
            'relative_humidity_2m',
            'dew_point_2m',
            'apparent_temperature',
            'precipitation',
            'rain',
            'snowfall',
            'weather_code',
            'pressure_msl',
            'surface_pressure',
            'cloud_cover',
            'visibility',
            'wind_speed_10m',
            'wind_direction_10m',
            'wind_gusts_10m',
            'is_day'
        ];

        const dailyVars = [
            'temperature_2m_max',
            'temperature_2m_min',
            'apparent_temperature_max',
            'apparent_temperature_min',
            'precipitation_sum',
            'rain_sum',
            'snowfall_sum',
            'precipitation_hours',
            'weather_code',
            'sunrise',
            'sunset',
            'wind_speed_10m_max',
            'wind_gusts_10m_max',
            'wind_direction_10m_dominant',
            'uv_index_max'
        ];

        const params = new URLSearchParams({
            latitude: latitude,
            longitude: longitude,
            hourly: hourlyVars.join(','),
            daily: dailyVars.join(','),
            temperature_unit: temperatureUnit,
            wind_speed_unit: 'mph',
            precipitation_unit: 'inch',
            timezone: timezone,
            forecast_days: Math.min(forecastDays, 16)
        });

        const response = await fetch(`${this.baseUrl}?${params}`);

        if (!response.ok) {
            throw new Error(`Weather API error: ${response.statusText}`);
        }

        const data = await response.json();
        return this.processWeatherData(data, forecastHours);
    }

    /**
     * Process and structure weather data
     */
    processWeatherData(data, forecastHours) {
        const hourly = this.processHourlyData(data.hourly, forecastHours);
        const daily = this.processDailyData(data.daily);
        const periods = this.generateForecastPeriods(hourly, data.timezone);
        const current = this.getCurrentConditions(hourly[0]);

        return {
            location: {
                latitude: data.latitude,
                longitude: data.longitude,
                elevation: data.elevation,
                timezone: data.timezone
            },
            current: current,
            hourly: hourly,
            daily: daily,
            periods: periods,
            issueTime: new Date().toISOString()
        };
    }

    /**
     * Process hourly forecast data
     */
    processHourlyData(hourlyData, maxHours) {
        const hours = [];
        const length = Math.min(hourlyData.time.length, maxHours);

        for (let i = 0; i < length; i++) {
            hours.push({
                time: new Date(hourlyData.time[i]),
                temperature: hourlyData.temperature_2m[i],
                apparentTemperature: hourlyData.apparent_temperature[i],
                humidity: hourlyData.relative_humidity_2m[i],
                dewPoint: hourlyData.dew_point_2m[i],
                precipitation: hourlyData.precipitation[i],
                rain: hourlyData.rain[i],
                snowfall: hourlyData.snowfall[i],
                weatherCode: hourlyData.weather_code[i],
                pressure: hourlyData.pressure_msl[i],
                cloudCover: hourlyData.cloud_cover[i],
                visibility: hourlyData.visibility[i],
                windSpeed: hourlyData.wind_speed_10m[i],
                windDirection: hourlyData.wind_direction_10m[i],
                windGusts: hourlyData.wind_gusts_10m[i],
                isDay: hourlyData.is_day[i] === 1
            });
        }

        return hours;
    }

    /**
     * Process daily forecast data
     */
    processDailyData(dailyData) {
        const days = [];

        for (let i = 0; i < dailyData.time.length; i++) {
            days.push({
                date: new Date(dailyData.time[i]),
                temperatureMax: dailyData.temperature_2m_max[i],
                temperatureMin: dailyData.temperature_2m_min[i],
                apparentTemperatureMax: dailyData.apparent_temperature_max[i],
                apparentTemperatureMin: dailyData.apparent_temperature_min[i],
                precipitationSum: dailyData.precipitation_sum[i],
                rainSum: dailyData.rain_sum[i],
                snowfallSum: dailyData.snowfall_sum[i],
                precipitationHours: dailyData.precipitation_hours[i],
                weatherCode: dailyData.weather_code[i],
                sunrise: new Date(dailyData.sunrise[i]),
                sunset: new Date(dailyData.sunset[i]),
                windSpeedMax: dailyData.wind_speed_10m_max[i],
                windGustsMax: dailyData.wind_gusts_10m_max[i],
                windDirection: dailyData.wind_direction_10m_dominant[i],
                uvIndexMax: dailyData.uv_index_max[i]
            });
        }

        return days;
    }

    /**
     * Get current conditions from first hourly data point
     */
    getCurrentConditions(firstHour) {
        if (!firstHour) return null;

        return {
            temperature: firstHour.temperature,
            apparentTemperature: firstHour.apparentTemperature,
            humidity: firstHour.humidity,
            windSpeed: firstHour.windSpeed,
            windDirection: firstHour.windDirection,
            weatherCode: firstHour.weatherCode,
            condition: this.getWeatherDescription(firstHour.weatherCode),
            icon: this.getWeatherIcon(firstHour.weatherCode, firstHour.isDay)
        };
    }

    /**
     * Generate forecast periods (6-hour blocks)
     */
    generateForecastPeriods(hourlyData, timezone) {
        const periods = [];
        const now = new Date();

        for (let i = 0; i < hourlyData.length; i += 6) {
            const periodHours = hourlyData.slice(i, i + 6);
            if (periodHours.length === 0) break;

            const startTime = periodHours[0].time;
            const hour = startTime.getHours();

            // Determine period name
            let periodName;
            if (hour < 6) periodName = 'Overnight';
            else if (hour < 12) periodName = 'Morning';
            else if (hour < 18) periodName = 'Afternoon';
            else periodName = 'Evening';

            // Add day name if not today
            const dayName = startTime.toLocaleDateString('en-US', { weekday: 'long' });
            if (startTime.toDateString() !== now.toDateString()) {
                periodName = `${dayName} ${periodName}`;
            }

            // Calculate period statistics
            const temps = periodHours.map(h => h.temperature);
            const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
            const maxTemp = Math.max(...temps);

            const windSpeeds = periodHours.map(h => h.windSpeed);
            const avgWind = windSpeeds.reduce((a, b) => a + b, 0) / windSpeeds.length;

            const windDirs = periodHours.map(h => h.windDirection);
            const avgWindDir = windDirs.reduce((a, b) => a + b, 0) / windDirs.length;

            const precip = periodHours.reduce((sum, h) => sum + (h.precipitation || 0), 0);

            const humidity = periodHours.map(h => h.humidity);
            const avgHumidity = humidity.reduce((a, b) => a + b, 0) / humidity.length;

            // Most common weather code in the period
            const weatherCodes = periodHours.map(h => h.weatherCode);
            const weatherCode = this.mode(weatherCodes);

            periods.push({
                name: periodName,
                startTime: startTime,
                temperature: Math.round(maxTemp),
                avgTemperature: Math.round(avgTemp),
                windSpeed: Math.round(avgWind),
                windDirection: Math.round(avgWindDir),
                precipitation: precip,
                humidity: Math.round(avgHumidity),
                weatherCode: weatherCode,
                condition: this.getWeatherDescription(weatherCode),
                icon: this.getWeatherIcon(weatherCode, true)
            });

            if (periods.length >= 8) break; // Limit to 8 periods
        }

        return periods;
    }

    /**
     * Search for locations by name
     */
    async searchLocation(query) {
        const params = new URLSearchParams({
            name: query,
            count: 10,
            language: 'en',
            format: 'json'
        });

        const response = await fetch(`${this.geocodeUrl}?${params}`);

        if (!response.ok) {
            throw new Error(`Geocoding API error: ${response.statusText}`);
        }

        const data = await response.json();
        return data.results || [];
    }

    /**
     * Get weather description from WMO code
     */
    getWeatherDescription(code) {
        const descriptions = {
            0: 'Clear sky',
            1: 'Mainly clear',
            2: 'Partly cloudy',
            3: 'Overcast',
            45: 'Foggy',
            48: 'Depositing rime fog',
            51: 'Light drizzle',
            53: 'Moderate drizzle',
            55: 'Dense drizzle',
            56: 'Light freezing drizzle',
            57: 'Dense freezing drizzle',
            61: 'Slight rain',
            63: 'Moderate rain',
            65: 'Heavy rain',
            66: 'Light freezing rain',
            67: 'Heavy freezing rain',
            71: 'Slight snow',
            73: 'Moderate snow',
            75: 'Heavy snow',
            77: 'Snow grains',
            80: 'Slight rain showers',
            81: 'Moderate rain showers',
            82: 'Violent rain showers',
            85: 'Slight snow showers',
            86: 'Heavy snow showers',
            95: 'Thunderstorm',
            96: 'Thunderstorm with slight hail',
            99: 'Thunderstorm with heavy hail'
        };

        return descriptions[code] || `Unknown (${code})`;
    }

    /**
     * Get weather icon emoji
     */
    getWeatherIcon(code, isDay = true) {
        if (code === 0 || code === 1) return isDay ? '☀️' : '🌙';
        if (code === 2) return isDay ? '⛅' : '☁️';
        if (code === 3) return '☁️';
        if (code >= 45 && code <= 48) return '🌫️';
        if (code >= 51 && code <= 57) return '🌦️';
        if (code >= 61 && code <= 67) return '🌧️';
        if (code >= 71 && code <= 77) return '❄️';
        if (code >= 80 && code <= 82) return '🌧️';
        if (code >= 85 && code <= 86) return '🌨️';
        if (code >= 95) return '⛈️';
        return '🌤️';
    }

    /**
     * Convert wind direction degrees to cardinal direction
     */
    degreesToCardinal(degrees) {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(degrees / 45) % 8;
        return directions[index];
    }

    /**
     * Get mode (most common value) from array
     */
    mode(arr) {
        const frequency = {};
        let maxFreq = 0;
        let mode = arr[0];

        arr.forEach(val => {
            frequency[val] = (frequency[val] || 0) + 1;
            if (frequency[val] > maxFreq) {
                maxFreq = frequency[val];
                mode = val;
            }
        });

        return mode;
    }

    /**
     * Format temperature
     */
    formatTemperature(temp, unit = 'F') {
        return `${Math.round(temp)}°${unit}`;
    }

    /**
     * Format wind
     */
    formatWind(speed, direction) {
        const cardinal = this.degreesToCardinal(direction);
        return `${cardinal} ${Math.round(speed)} mph`;
    }

    /**
     * Format precipitation
     */
    formatPrecipitation(precip) {
        if (precip < 0.01) return 'No precipitation';
        if (precip < 0.1) return 'Trace';
        return `${precip.toFixed(2)} in`;
    }
}
