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
            'precipitation_probability',
            'rain',
            'showers',
            'snowfall',
            'snow_depth',
            'weather_code',
            'pressure_msl',
            'surface_pressure',
            'cloud_cover',
            'cloud_cover_low',
            'cloud_cover_mid',
            'cloud_cover_high',
            'visibility',
            'wind_speed_10m',
            'wind_speed_80m',
            'wind_direction_10m',
            'wind_direction_80m',
            'wind_gusts_10m',
            'temperature_80m',
            'soil_temperature_0cm',
            'is_day',
            'cape',
            'lightning_potential',
            'shortwave_radiation',
            'direct_radiation',
            'diffuse_radiation'
        ];

        const dailyVars = [
            'temperature_2m_max',
            'temperature_2m_min',
            'apparent_temperature_max',
            'apparent_temperature_min',
            'precipitation_sum',
            'precipitation_hours',
            'precipitation_probability_max',
            'rain_sum',
            'showers_sum',
            'snowfall_sum',
            'weather_code',
            'sunrise',
            'sunset',
            'daylight_duration',
            'sunshine_duration',
            'wind_speed_10m_max',
            'wind_gusts_10m_max',
            'wind_direction_10m_dominant',
            'uv_index_max',
            'uv_index_clear_sky_max'
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
        const severeWeather = this.analyzeSevereWeather(hourly, daily);

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
            severeWeather: severeWeather,
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
                precipitationProbability: hourlyData.precipitation_probability?.[i],
                rain: hourlyData.rain[i],
                showers: hourlyData.showers?.[i],
                snowfall: hourlyData.snowfall[i],
                snowDepth: hourlyData.snow_depth?.[i],
                weatherCode: hourlyData.weather_code[i],
                pressure: hourlyData.pressure_msl[i],
                surfacePressure: hourlyData.surface_pressure?.[i],
                cloudCover: hourlyData.cloud_cover[i],
                cloudCoverLow: hourlyData.cloud_cover_low?.[i],
                cloudCoverMid: hourlyData.cloud_cover_mid?.[i],
                cloudCoverHigh: hourlyData.cloud_cover_high?.[i],
                visibility: hourlyData.visibility[i],
                windSpeed: hourlyData.wind_speed_10m[i],
                windSpeed80m: hourlyData.wind_speed_80m?.[i],
                windDirection: hourlyData.wind_direction_10m[i],
                windDirection80m: hourlyData.wind_direction_80m?.[i],
                windGusts: hourlyData.wind_gusts_10m[i],
                temperature80m: hourlyData.temperature_80m?.[i],
                cape: hourlyData.cape?.[i],
                lightningPotential: hourlyData.lightning_potential?.[i],
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
                precipitationHours: dailyData.precipitation_hours[i],
                precipitationProbabilityMax: dailyData.precipitation_probability_max?.[i],
                rainSum: dailyData.rain_sum[i],
                showersSum: dailyData.showers_sum?.[i],
                snowfallSum: dailyData.snowfall_sum[i],
                weatherCode: dailyData.weather_code[i],
                sunrise: new Date(dailyData.sunrise[i]),
                sunset: new Date(dailyData.sunset[i]),
                daylightDuration: dailyData.daylight_duration?.[i],
                sunshineDuration: dailyData.sunshine_duration?.[i],
                windSpeedMax: dailyData.wind_speed_10m_max[i],
                windGustsMax: dailyData.wind_gusts_10m_max[i],
                windDirection: dailyData.wind_direction_10m_dominant[i],
                uvIndexMax: dailyData.uv_index_max[i],
                uvIndexClearSkyMax: dailyData.uv_index_clear_sky_max?.[i]
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

    /**
     * Analyze severe weather threats from forecast data
     */
    analyzeSevereWeather(hourly, daily) {
        const alerts = [];
        const risks = {
            thunderstorm: 0,
            tornado: 0,
            flash_flood: 0,
            winter_storm: 0,
            heat: 0,
            wind: 0,
            freeze: 0
        };

        // Analyze next 24 hours for immediate threats
        const next24Hours = hourly.slice(0, 24);

        // Thunderstorm/Lightning Risk
        const lightningRisk = this.assessLightningRisk(next24Hours);
        if (lightningRisk.level > 0) {
            risks.thunderstorm = lightningRisk.level;
            alerts.push({
                type: 'thunderstorm',
                severity: lightningRisk.severity,
                title: lightningRisk.title,
                description: lightningRisk.description,
                timeframe: lightningRisk.timeframe,
                icon: '⛈️'
            });
        }

        // Tornado Risk (based on CAPE and wind shear indicators)
        const tornadoRisk = this.assessTornadoRisk(next24Hours);
        if (tornadoRisk.level > 0) {
            risks.tornado = tornadoRisk.level;
            alerts.push({
                type: 'tornado',
                severity: tornadoRisk.severity,
                title: tornadoRisk.title,
                description: tornadoRisk.description,
                timeframe: tornadoRisk.timeframe,
                icon: '🌪️'
            });
        }

        // Flash Flood Risk
        const floodRisk = this.assessFloodRisk(next24Hours);
        if (floodRisk.level > 0) {
            risks.flash_flood = floodRisk.level;
            alerts.push({
                type: 'flood',
                severity: floodRisk.severity,
                title: floodRisk.title,
                description: floodRisk.description,
                timeframe: floodRisk.timeframe,
                icon: '🌊'
            });
        }

        // Winter Storm Risk
        const winterRisk = this.assessWinterStormRisk(next24Hours);
        if (winterRisk.level > 0) {
            risks.winter_storm = winterRisk.level;
            alerts.push({
                type: 'winter',
                severity: winterRisk.severity,
                title: winterRisk.title,
                description: winterRisk.description,
                timeframe: winterRisk.timeframe,
                icon: '❄️'
            });
        }

        // Extreme Heat Risk
        const heatRisk = this.assessHeatRisk(next24Hours);
        if (heatRisk.level > 0) {
            risks.heat = heatRisk.level;
            alerts.push({
                type: 'heat',
                severity: heatRisk.severity,
                title: heatRisk.title,
                description: heatRisk.description,
                timeframe: heatRisk.timeframe,
                icon: '🌡️'
            });
        }

        // High Wind Risk
        const windRisk = this.assessWindRisk(next24Hours);
        if (windRisk.level > 0) {
            risks.wind = windRisk.level;
            alerts.push({
                type: 'wind',
                severity: windRisk.severity,
                title: windRisk.title,
                description: windRisk.description,
                timeframe: windRisk.timeframe,
                icon: '💨'
            });
        }

        // Freeze Risk
        const freezeRisk = this.assessFreezeRisk(next24Hours);
        if (freezeRisk.level > 0) {
            risks.freeze = freezeRisk.level;
            alerts.push({
                type: 'freeze',
                severity: freezeRisk.severity,
                title: freezeRisk.title,
                description: freezeRisk.description,
                timeframe: freezeRisk.timeframe,
                icon: '🥶'
            });
        }

        // Sort alerts by severity (highest first)
        alerts.sort((a, b) => {
            const severityOrder = { 'extreme': 4, 'severe': 3, 'moderate': 2, 'minor': 1 };
            return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
        });

        return {
            hasAlerts: alerts.length > 0,
            alertCount: alerts.length,
            alerts: alerts,
            risks: risks,
            maxRiskLevel: Math.max(...Object.values(risks))
        };
    }

    /**
     * Assess lightning/thunderstorm risk
     */
    assessLightningRisk(hours) {
        let maxPotential = 0;
        let maxCAPE = 0;
        let timeframe = null;

        hours.forEach(hour => {
            if (hour.lightningPotential && hour.lightningPotential > maxPotential) {
                maxPotential = hour.lightningPotential;
                timeframe = hour.time;
            }
            if (hour.cape && hour.cape > maxCAPE) {
                maxCAPE = hour.cape;
            }
        });

        // CAPE > 1000 J/kg indicates thunderstorm potential
        if (maxCAPE > 2500 || maxPotential > 0.7) {
            return {
                level: 3,
                severity: 'severe',
                title: 'Severe Thunderstorm Risk',
                description: `High atmospheric instability (CAPE: ${Math.round(maxCAPE)} J/kg) indicates potential for severe thunderstorms with large hail, damaging winds, and frequent lightning.`,
                timeframe: timeframe ? timeframe.toLocaleString() : 'Next 24 hours'
            };
        } else if (maxCAPE > 1000 || maxPotential > 0.4) {
            return {
                level: 2,
                severity: 'moderate',
                title: 'Thunderstorm Possible',
                description: `Moderate atmospheric instability may produce thunderstorms. Monitor conditions for changing weather.`,
                timeframe: timeframe ? timeframe.toLocaleString() : 'Next 24 hours'
            };
        } else if (maxCAPE > 500 || maxPotential > 0.2) {
            return {
                level: 1,
                severity: 'minor',
                title: 'Isolated Thunderstorms Possible',
                description: `Weak instability may support isolated thunderstorms.`,
                timeframe: timeframe ? timeframe.toLocaleString() : 'Next 24 hours'
            };
        }

        return { level: 0 };
    }

    /**
     * Assess tornado risk
     */
    assessTornadoRisk(hours) {
        let maxCAPE = 0;
        let maxWindShear = 0;
        let timeframe = null;

        hours.forEach(hour => {
            if (hour.cape && hour.cape > maxCAPE) {
                maxCAPE = hour.cape;
                timeframe = hour.time;
            }
            // Estimate wind shear from 10m to 80m wind difference
            if (hour.windSpeed80m && hour.windSpeed) {
                const shear = Math.abs(hour.windSpeed80m - hour.windSpeed);
                if (shear > maxWindShear) {
                    maxWindShear = shear;
                }
            }
        });

        // High CAPE + significant wind shear = tornado risk
        if (maxCAPE > 3000 && maxWindShear > 20) {
            return {
                level: 3,
                severity: 'severe',
                title: 'Tornado Risk',
                description: `Strong atmospheric instability combined with significant wind shear creates conditions favorable for tornadoes. Seek shelter if warnings are issued.`,
                timeframe: timeframe ? timeframe.toLocaleString() : 'Next 24 hours'
            };
        } else if (maxCAPE > 2000 && maxWindShear > 15) {
            return {
                level: 2,
                severity: 'moderate',
                title: 'Tornado Possible',
                description: `Conditions may support tornado development. Stay alert for watches and warnings.`,
                timeframe: timeframe ? timeframe.toLocaleString() : 'Next 24 hours'
            };
        }

        return { level: 0 };
    }

    /**
     * Assess flash flood risk
     */
    assessFloodRisk(hours) {
        let totalPrecip = 0;
        let maxHourlyRate = 0;
        let heavyRainHours = 0;

        hours.forEach(hour => {
            const precip = hour.precipitation || 0;
            totalPrecip += precip;
            if (precip > maxHourlyRate) maxHourlyRate = precip;
            if (precip > 0.5) heavyRainHours++; // > 0.5 inches/hour is heavy
        });

        if (totalPrecip > 3 || maxHourlyRate > 1 || heavyRainHours >= 3) {
            return {
                level: 3,
                severity: 'severe',
                title: 'Flash Flood Risk',
                description: `Heavy rainfall (${totalPrecip.toFixed(2)} inches expected) may cause flash flooding. Avoid low-lying areas and do not drive through flooded roads.`,
                timeframe: 'Next 24 hours'
            };
        } else if (totalPrecip > 2 || maxHourlyRate > 0.75) {
            return {
                level: 2,
                severity: 'moderate',
                title: 'Flooding Possible',
                description: `Moderate to heavy rainfall may cause localized flooding in poor drainage areas.`,
                timeframe: 'Next 24 hours'
            };
        } else if (totalPrecip > 1) {
            return {
                level: 1,
                severity: 'minor',
                title: 'Minor Flooding Possible',
                description: `Rainfall may cause ponding in low areas.`,
                timeframe: 'Next 24 hours'
            };
        }

        return { level: 0 };
    }

    /**
     * Assess winter storm risk
     */
    assessWinterStormRisk(hours) {
        let totalSnow = 0;
        let maxTemp = -999;
        let hasFreezingRain = false;

        hours.forEach(hour => {
            totalSnow += hour.snowfall || 0;
            if (hour.temperature > maxTemp) maxTemp = hour.temperature;
            // Check for freezing rain conditions
            if (hour.rain > 0 && hour.temperature < 32) {
                hasFreezingRain = true;
            }
        });

        if (totalSnow > 6 || hasFreezingRain) {
            return {
                level: 3,
                severity: 'severe',
                title: hasFreezingRain ? 'Ice Storm Warning' : 'Winter Storm Warning',
                description: hasFreezingRain ?
                    `Freezing rain expected. Significant ice accumulation will create extremely dangerous travel conditions.` :
                    `Heavy snowfall (${totalSnow.toFixed(1)} inches) expected. Travel will be very difficult to impossible.`,
                timeframe: 'Next 24 hours'
            };
        } else if (totalSnow > 3) {
            return {
                level: 2,
                severity: 'moderate',
                title: 'Winter Weather Advisory',
                description: `Moderate snowfall (${totalSnow.toFixed(1)} inches) expected. Plan for slippery roads and reduced visibility.`,
                timeframe: 'Next 24 hours'
            };
        } else if (totalSnow > 1) {
            return {
                level: 1,
                severity: 'minor',
                title: 'Light Snow Expected',
                description: `Light snow accumulation possible. Use caution on roadways.`,
                timeframe: 'Next 24 hours'
            };
        }

        return { level: 0 };
    }

    /**
     * Assess extreme heat risk
     */
    assessHeatRisk(hours) {
        let maxTemp = -999;
        let maxFeelsLike = -999;
        let extremeHours = 0;

        hours.forEach(hour => {
            if (hour.temperature > maxTemp) maxTemp = hour.temperature;
            if (hour.apparentTemperature > maxFeelsLike) maxFeelsLike = hour.apparentTemperature;
            if (hour.apparentTemperature > 105) extremeHours++;
        });

        if (maxFeelsLike > 110 || extremeHours >= 4) {
            return {
                level: 3,
                severity: 'extreme',
                title: 'Excessive Heat Warning',
                description: `Dangerously hot conditions with heat index up to ${Math.round(maxFeelsLike)}°F. Risk of heat stroke and heat exhaustion is high. Stay indoors in air conditioning.`,
                timeframe: 'Next 24 hours'
            };
        } else if (maxFeelsLike > 100 || extremeHours >= 2) {
            return {
                level: 2,
                severity: 'moderate',
                title: 'Heat Advisory',
                description: `Hot conditions with heat index up to ${Math.round(maxFeelsLike)}°F. Limit outdoor activity and stay hydrated.`,
                timeframe: 'Next 24 hours'
            };
        } else if (maxFeelsLike > 95) {
            return {
                level: 1,
                severity: 'minor',
                title: 'Hot Weather Expected',
                description: `Warm conditions expected. Stay hydrated if working outdoors.`,
                timeframe: 'Next 24 hours'
            };
        }

        return { level: 0 };
    }

    /**
     * Assess high wind risk
     */
    assessWindRisk(hours) {
        let maxGusts = 0;
        let maxSustained = 0;
        let highWindHours = 0;

        hours.forEach(hour => {
            if (hour.windGusts > maxGusts) maxGusts = hour.windGusts;
            if (hour.windSpeed > maxSustained) maxSustained = hour.windSpeed;
            if (hour.windGusts > 40) highWindHours++;
        });

        if (maxGusts > 60 || (maxGusts > 50 && highWindHours >= 4)) {
            return {
                level: 3,
                severity: 'severe',
                title: 'High Wind Warning',
                description: `Damaging winds with gusts up to ${Math.round(maxGusts)} mph expected. Secure loose objects and avoid travel if possible.`,
                timeframe: 'Next 24 hours'
            };
        } else if (maxGusts > 45 || maxSustained > 30) {
            return {
                level: 2,
                severity: 'moderate',
                title: 'Wind Advisory',
                description: `Strong winds with gusts up to ${Math.round(maxGusts)} mph. Use caution driving high-profile vehicles.`,
                timeframe: 'Next 24 hours'
            };
        } else if (maxGusts > 35) {
            return {
                level: 1,
                severity: 'minor',
                title: 'Breezy Conditions',
                description: `Gusty winds up to ${Math.round(maxGusts)} mph expected.`,
                timeframe: 'Next 24 hours'
            };
        }

        return { level: 0 };
    }

    /**
     * Assess freeze risk
     */
    assessFreezeRisk(hours) {
        let minTemp = 999;
        let freezeHours = 0;
        let hardFreezeHours = 0;

        hours.forEach(hour => {
            if (hour.temperature < minTemp) minTemp = hour.temperature;
            if (hour.temperature <= 32) freezeHours++;
            if (hour.temperature <= 28) hardFreezeHours++;
        });

        const now = new Date();
        const month = now.getMonth();
        // Only alert for freeze during growing season (Apr-Oct in northern hemisphere)
        const isGrowingSeason = month >= 3 && month <= 9;

        if (hardFreezeHours >= 4 && isGrowingSeason) {
            return {
                level: 3,
                severity: 'severe',
                title: 'Hard Freeze Warning',
                description: `Hard freeze with temperatures down to ${Math.round(minTemp)}°F. Protect sensitive plants and exposed pipes.`,
                timeframe: 'Next 24 hours'
            };
        } else if (freezeHours >= 2 && isGrowingSeason) {
            return {
                level: 2,
                severity: 'moderate',
                title: 'Freeze Warning',
                description: `Temperatures will drop to freezing (${Math.round(minTemp)}°F). Protect sensitive vegetation.`,
                timeframe: 'Next 24 hours'
            };
        } else if (minTemp <= 36 && isGrowingSeason) {
            return {
                level: 1,
                severity: 'minor',
                title: 'Frost Advisory',
                description: `Temperatures near freezing may harm sensitive plants.`,
                timeframe: 'Next 24 hours'
            };
        }

        return { level: 0 };
    }
}
