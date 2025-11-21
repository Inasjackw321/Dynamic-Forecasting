"""
Forecast generator that combines Herbie and Open-Meteo data.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import logging

import pandas as pd
import pytz

from ..integrations.herbie_client import HerbieClient
from ..integrations.openmeteo_client import OpenMeteoClient
from ..utils.coordinates import validate_coordinates
from .formatter import NWSFormatter

logger = logging.getLogger(__name__)


class ForecastGenerator:
    """
    Generate NWS-style forecasts by combining Herbie and Open-Meteo data sources.
    """

    def __init__(
        self,
        use_herbie: bool = True,
        use_openmeteo: bool = True,
        herbie_model: str = "hrrr",
        timezone: str = "America/New_York"
    ):
        """
        Initialize the forecast generator.

        Args:
            use_herbie: Whether to use Herbie for NWS model data
            use_openmeteo: Whether to use Open-Meteo API
            herbie_model: Which model to use for Herbie (hrrr, gfs, etc.)
            timezone: Timezone for forecast times
        """
        self.use_herbie = use_herbie
        self.use_openmeteo = use_openmeteo
        self.timezone = timezone
        self.formatter = NWSFormatter()

        if not use_herbie and not use_openmeteo:
            raise ValueError("At least one data source must be enabled")

        # Initialize clients
        self.herbie_client = None
        self.openmeteo_client = None

        if use_herbie:
            try:
                self.herbie_client = HerbieClient(model=herbie_model)
                logger.info(f"Initialized Herbie client with model {herbie_model}")
            except Exception as e:
                logger.warning(f"Could not initialize Herbie client: {e}")
                self.use_herbie = False

        if use_openmeteo:
            try:
                self.openmeteo_client = OpenMeteoClient(use_cache=True)
                logger.info("Initialized Open-Meteo client")
            except Exception as e:
                logger.warning(f"Could not initialize Open-Meteo client: {e}")
                self.use_openmeteo = False

    def generate_forecast(
        self,
        latitude: float,
        longitude: float,
        location_name: Optional[str] = None,
        forecast_hours: int = 48
    ) -> Dict:
        """
        Generate a complete forecast for a location.

        Args:
            latitude: Latitude of location
            longitude: Longitude of location
            location_name: Optional name for the location
            forecast_hours: Number of hours to forecast

        Returns:
            Dictionary containing forecast data and formatted output
        """
        lat, lon = validate_coordinates(latitude, longitude)

        if location_name is None:
            location_name = f"{lat:.2f}°N, {lon:.2f}°W"

        logger.info(
            f"Generating {forecast_hours}-hour forecast for {location_name}"
        )

        # Fetch data from available sources
        forecast_data = {
            "location": {
                "name": location_name,
                "latitude": lat,
                "longitude": lon,
            },
            "issue_time": datetime.now(pytz.timezone(self.timezone)),
            "forecast_hours": forecast_hours,
        }

        # Try Open-Meteo first (faster and more reliable)
        if self.use_openmeteo and self.openmeteo_client:
            try:
                logger.info("Fetching data from Open-Meteo...")
                openmeteo_data = self._fetch_openmeteo_data(
                    lat, lon, forecast_hours
                )
                forecast_data["openmeteo"] = openmeteo_data
            except Exception as e:
                logger.error(f"Error fetching Open-Meteo data: {e}")

        # Try Herbie if enabled
        if self.use_herbie and self.herbie_client:
            try:
                logger.info("Fetching data from Herbie (NWS models)...")
                herbie_data = self._fetch_herbie_data(lat, lon, forecast_hours)
                forecast_data["herbie"] = herbie_data
            except Exception as e:
                logger.error(f"Error fetching Herbie data: {e}")

        # Generate forecast periods
        periods = self._generate_forecast_periods(forecast_data)
        forecast_data["periods"] = periods

        # Format as NWS-style text
        formatted_text = self.formatter.format_full_forecast(
            location_name,
            periods,
            forecast_data["issue_time"]
        )
        forecast_data["formatted_forecast"] = formatted_text

        # Generate hourly table if available
        if "openmeteo" in forecast_data and "hourly" in forecast_data["openmeteo"]:
            hourly_table = self.formatter.format_hourly_table(
                forecast_data["openmeteo"]["hourly"],
                max_hours=min(24, forecast_hours)
            )
            forecast_data["hourly_table"] = hourly_table

        return forecast_data

    def _fetch_openmeteo_data(
        self,
        lat: float,
        lon: float,
        hours: int
    ) -> Dict:
        """Fetch data from Open-Meteo API."""
        days = (hours // 24) + 1

        data = self.openmeteo_client.fetch_forecast(
            latitude=lat,
            longitude=lon,
            forecast_days=min(days, 16),
            timezone=self.timezone
        )

        return data

    def _fetch_herbie_data(
        self,
        lat: float,
        lon: float,
        hours: int
    ) -> pd.DataFrame:
        """Fetch data from Herbie (NWS models)."""
        forecast_hours_list = list(range(0, min(hours + 1, 49)))

        try:
            df = self.herbie_client.fetch_point_forecast(
                latitude=lat,
                longitude=lon,
                forecast_hours=forecast_hours_list
            )
            return df
        except Exception as e:
            logger.error(f"Herbie fetch failed: {e}")
            return pd.DataFrame()

    def _generate_forecast_periods(self, forecast_data: Dict) -> List[Dict]:
        """
        Generate forecast periods from available data sources.

        Args:
            forecast_data: Combined forecast data

        Returns:
            List of forecast period dictionaries
        """
        periods = []

        # Use Open-Meteo data if available (primary source)
        if "openmeteo" in forecast_data and "hourly" in forecast_data["openmeteo"]:
            hourly_df = forecast_data["openmeteo"]["hourly"]

            # Create periods for different times of day
            now = datetime.now(pytz.timezone(self.timezone))
            current_date = now.date()

            # Group by 6-hour periods
            for i in range(0, len(hourly_df), 6):
                period_df = hourly_df.iloc[i:i+6]

                if len(period_df) == 0:
                    continue

                period_time = pd.to_datetime(period_df["time"].iloc[0])

                # Determine period name
                hour = period_time.hour
                if hour < 6:
                    period_name = "Overnight"
                elif hour < 12:
                    period_name = "Morning"
                elif hour < 18:
                    period_name = "Afternoon"
                else:
                    period_name = "Evening"

                # Add day name if not today
                if period_time.date() != current_date:
                    day_name = period_time.strftime("%A")
                    period_name = f"{day_name} {period_name}"

                # Extract average/max values for the period
                period = {
                    "name": period_name,
                    "time": period_time,
                }

                if "temperature_2m" in period_df.columns:
                    period["temperature"] = period_df["temperature_2m"].max()

                if "wind_speed_10m" in period_df.columns:
                    period["wind_speed"] = period_df["wind_speed_10m"].mean()

                if "wind_direction_10m" in period_df.columns:
                    period["wind_direction"] = period_df["wind_direction_10m"].mean()

                if "precipitation" in period_df.columns:
                    period["precipitation"] = period_df["precipitation"].sum()

                if "relative_humidity_2m" in period_df.columns:
                    period["humidity"] = period_df["relative_humidity_2m"].mean()

                if "weather_code" in period_df.columns:
                    # Use most common weather code
                    weather_code = period_df["weather_code"].mode()
                    if len(weather_code) > 0:
                        wc = int(weather_code.iloc[0])
                        period["weather_code"] = wc
                        period["condition"] = self.formatter.get_weather_condition(
                            wc,
                            period.get("temperature", 50),
                            period.get("precipitation", 0)
                        )

                periods.append(period)

                # Limit to reasonable number of periods
                if len(periods) >= 8:
                    break

        # If no Open-Meteo data, try to use Herbie data
        elif "herbie" in forecast_data and not forecast_data["herbie"].empty:
            herbie_df = forecast_data["herbie"]

            for i in range(0, min(len(herbie_df), 48), 6):
                period_df = herbie_df.iloc[i:i+6]

                if len(period_df) == 0:
                    continue

                period_time = period_df["valid_time"].iloc[0]

                period = {
                    "name": f"Forecast Hour {i}-{i+6}",
                    "time": period_time,
                }

                # Extract available Herbie variables
                if "tmp" in period_df.columns:
                    # Convert from Kelvin to Fahrenheit if needed
                    temp_k = period_df["tmp"].max()
                    period["temperature"] = (temp_k - 273.15) * 9/5 + 32

                if "wind" in period_df.columns:
                    # Convert m/s to mph if needed
                    wind_ms = period_df["wind"].mean()
                    period["wind_speed"] = wind_ms * 2.237

                periods.append(period)

                if len(periods) >= 8:
                    break

        return periods

    def generate_multi_location(
        self,
        locations: List[Dict],
        forecast_hours: int = 48
    ) -> List[Dict]:
        """
        Generate forecasts for multiple locations.

        Args:
            locations: List of location dicts with lat, lon, and optional name
            forecast_hours: Hours to forecast

        Returns:
            List of forecast dictionaries
        """
        forecasts = []

        for loc in locations:
            try:
                forecast = self.generate_forecast(
                    latitude=loc["latitude"],
                    longitude=loc["longitude"],
                    location_name=loc.get("name"),
                    forecast_hours=forecast_hours
                )
                forecasts.append(forecast)
            except Exception as e:
                logger.error(
                    f"Error generating forecast for {loc.get('name', loc)}: {e}"
                )
                continue

        return forecasts
