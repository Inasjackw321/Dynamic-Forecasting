"""
Open-Meteo API client for weather forecast data.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
import logging

import pandas as pd

try:
    import openmeteo_requests
    import requests_cache
    from retry_requests import retry
except ImportError:
    raise ImportError(
        "Required packages not installed. Install with: "
        "pip install openmeteo-requests requests-cache retry-requests"
    )

logger = logging.getLogger(__name__)


class OpenMeteoClient:
    """
    Client for fetching weather forecast data from Open-Meteo API.

    Open-Meteo provides free weather forecast data from various
    meteorological models including GFS, ICON, and regional models.
    """

    BASE_URL = "https://api.open-meteo.com/v1/forecast"
    GFS_BASE_URL = "https://api.open-meteo.com/v1/gfs"

    # Available weather variables
    HOURLY_VARIABLES = [
        "temperature_2m",
        "relative_humidity_2m",
        "dew_point_2m",
        "apparent_temperature",
        "precipitation",
        "rain",
        "snowfall",
        "snow_depth",
        "weather_code",
        "pressure_msl",
        "surface_pressure",
        "cloud_cover",
        "cloud_cover_low",
        "cloud_cover_mid",
        "cloud_cover_high",
        "visibility",
        "wind_speed_10m",
        "wind_speed_80m",
        "wind_direction_10m",
        "wind_gusts_10m",
        "temperature_80m",
        "uv_index",
        "is_day",
    ]

    DAILY_VARIABLES = [
        "temperature_2m_max",
        "temperature_2m_min",
        "apparent_temperature_max",
        "apparent_temperature_min",
        "precipitation_sum",
        "rain_sum",
        "snowfall_sum",
        "precipitation_hours",
        "weather_code",
        "sunrise",
        "sunset",
        "wind_speed_10m_max",
        "wind_gusts_10m_max",
        "wind_direction_10m_dominant",
        "uv_index_max",
    ]

    def __init__(
        self,
        use_cache: bool = True,
        cache_expire_hours: int = 1,
        use_gfs: bool = False
    ):
        """
        Initialize the Open-Meteo client.

        Args:
            use_cache: Whether to cache API responses
            cache_expire_hours: Hours before cache expires
            use_gfs: Whether to use GFS model endpoint (vs. best model selection)
        """
        self.use_gfs = use_gfs
        self.base_url = self.GFS_BASE_URL if use_gfs else self.BASE_URL

        # Setup caching and retry logic
        if use_cache:
            cache_session = requests_cache.CachedSession(
                ".cache",
                expire_after=cache_expire_hours * 3600
            )
            retry_session = retry(cache_session, retries=5, backoff_factor=0.2)
            self.client = openmeteo_requests.Client(session=retry_session)
        else:
            retry_session = retry(retries=5, backoff_factor=0.2)
            self.client = openmeteo_requests.Client(session=retry_session)

        logger.info(
            f"Initialized OpenMeteoClient "
            f"(cache={use_cache}, gfs={use_gfs})"
        )

    def fetch_forecast(
        self,
        latitude: float,
        longitude: float,
        hourly_vars: Optional[List[str]] = None,
        daily_vars: Optional[List[str]] = None,
        forecast_days: int = 7,
        past_days: int = 0,
        temperature_unit: str = "fahrenheit",
        wind_speed_unit: str = "mph",
        precipitation_unit: str = "inch",
        timezone: str = "America/New_York"
    ) -> Dict:
        """
        Fetch weather forecast for a specific location.

        Args:
            latitude: Latitude of the location
            longitude: Longitude of the location
            hourly_vars: List of hourly variables to fetch
            daily_vars: List of daily variables to fetch
            forecast_days: Number of days to forecast (max 16)
            past_days: Number of past days to include (max 92)
            temperature_unit: celsius or fahrenheit
            wind_speed_unit: kmh, mph, ms, or kn
            precipitation_unit: mm or inch
            timezone: Timezone for time values

        Returns:
            Dictionary containing forecast data
        """
        if hourly_vars is None:
            hourly_vars = [
                "temperature_2m",
                "relative_humidity_2m",
                "precipitation",
                "weather_code",
                "wind_speed_10m",
                "wind_direction_10m",
                "wind_gusts_10m",
            ]

        if daily_vars is None:
            daily_vars = [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "weather_code",
            ]

        logger.info(
            f"Fetching forecast for lat={latitude}, lon={longitude}, "
            f"days={forecast_days}"
        )

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": hourly_vars,
            "daily": daily_vars,
            "temperature_unit": temperature_unit,
            "wind_speed_unit": wind_speed_unit,
            "precipitation_unit": precipitation_unit,
            "timezone": timezone,
            "forecast_days": forecast_days,
            "past_days": past_days,
        }

        try:
            responses = self.client.weather_api(self.base_url, params=params)
            response = responses[0]

            result = {
                "location": {
                    "latitude": response.Latitude(),
                    "longitude": response.Longitude(),
                    "elevation": response.Elevation(),
                    "timezone": response.Timezone(),
                    "timezone_abbr": response.TimezoneAbbreviation(),
                },
                "units": {
                    "temperature": temperature_unit,
                    "wind_speed": wind_speed_unit,
                    "precipitation": precipitation_unit,
                },
            }

            # Process hourly data
            if hourly_vars:
                hourly = response.Hourly()
                hourly_data = {
                    "time": pd.date_range(
                        start=pd.to_datetime(hourly.Time(), unit="s"),
                        end=pd.to_datetime(hourly.TimeEnd(), unit="s"),
                        freq=pd.Timedelta(seconds=hourly.Interval()),
                        inclusive="left"
                    )
                }

                for i, var in enumerate(hourly_vars):
                    hourly_data[var] = hourly.Variables(i).ValuesAsNumpy()

                result["hourly"] = pd.DataFrame(hourly_data)

            # Process daily data
            if daily_vars:
                daily = response.Daily()
                daily_data = {
                    "date": pd.date_range(
                        start=pd.to_datetime(daily.Time(), unit="s"),
                        end=pd.to_datetime(daily.TimeEnd(), unit="s"),
                        freq=pd.Timedelta(seconds=daily.Interval()),
                        inclusive="left"
                    )
                }

                for i, var in enumerate(daily_vars):
                    daily_data[var] = daily.Variables(i).ValuesAsNumpy()

                result["daily"] = pd.DataFrame(daily_data)

            logger.info(
                f"Successfully fetched forecast with "
                f"{len(result.get('hourly', []))} hourly and "
                f"{len(result.get('daily', []))} daily records"
            )

            return result

        except Exception as e:
            logger.error(f"Error fetching forecast from Open-Meteo: {e}")
            raise

    def fetch_multi_location(
        self,
        locations: List[Dict[str, float]],
        **kwargs
    ) -> List[Dict]:
        """
        Fetch forecasts for multiple locations.

        Args:
            locations: List of dicts with 'latitude' and 'longitude' keys
            **kwargs: Additional arguments passed to fetch_forecast

        Returns:
            List of forecast dictionaries
        """
        logger.info(f"Fetching forecasts for {len(locations)} locations")

        results = []
        for loc in locations:
            try:
                forecast = self.fetch_forecast(
                    latitude=loc["latitude"],
                    longitude=loc["longitude"],
                    **kwargs
                )
                forecast["location"]["name"] = loc.get("name", "Unknown")
                results.append(forecast)
            except Exception as e:
                logger.error(
                    f"Error fetching forecast for "
                    f"{loc.get('name', loc)}: {e}"
                )
                continue

        return results

    def get_weather_description(self, weather_code: int) -> str:
        """
        Convert WMO weather code to human-readable description.

        Args:
            weather_code: WMO weather code (0-99)

        Returns:
            Human-readable weather description
        """
        weather_codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Foggy",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            56: "Light freezing drizzle",
            57: "Dense freezing drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            66: "Light freezing rain",
            67: "Heavy freezing rain",
            71: "Slight snow fall",
            73: "Moderate snow fall",
            75: "Heavy snow fall",
            77: "Snow grains",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            85: "Slight snow showers",
            86: "Heavy snow showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail",
        }

        return weather_codes.get(weather_code, f"Unknown (code: {weather_code})")
