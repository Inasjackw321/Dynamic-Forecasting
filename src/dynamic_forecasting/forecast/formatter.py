"""
NWS-style forecast formatter.
"""

from datetime import datetime
from typing import Dict, List, Optional
import pandas as pd


class NWSFormatter:
    """
    Format weather forecast data in NWS (National Weather Service) style.
    """

    @staticmethod
    def format_temperature(temp_f: float) -> str:
        """Format temperature with degree symbol."""
        return f"{int(round(temp_f))}°F"

    @staticmethod
    def format_wind(speed_mph: float, direction_deg: Optional[float] = None) -> str:
        """
        Format wind speed and direction.

        Args:
            speed_mph: Wind speed in mph
            direction_deg: Wind direction in degrees (0-360)

        Returns:
            Formatted wind string (e.g., "NW 10 mph")
        """
        if direction_deg is not None:
            direction = NWSFormatter.degrees_to_cardinal(direction_deg)
            return f"{direction} {int(round(speed_mph))} mph"
        return f"{int(round(speed_mph))} mph"

    @staticmethod
    def degrees_to_cardinal(degrees: float) -> str:
        """
        Convert wind direction in degrees to cardinal direction.

        Args:
            degrees: Direction in degrees (0-360)

        Returns:
            Cardinal direction (N, NE, E, SE, S, SW, W, NW)
        """
        directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
        index = int((degrees + 22.5) / 45) % 8
        return directions[index]

    @staticmethod
    def format_precipitation(precip_inches: float) -> str:
        """
        Format precipitation amount.

        Args:
            precip_inches: Precipitation in inches

        Returns:
            Formatted string
        """
        if precip_inches < 0.01:
            return "No precipitation"
        elif precip_inches < 0.1:
            return "Trace precipitation"
        else:
            return f"{precip_inches:.2f} inches"

    @staticmethod
    def get_weather_condition(
        weather_code: int,
        temp_f: float,
        precip: float
    ) -> str:
        """
        Get a descriptive weather condition based on weather code and data.

        Args:
            weather_code: WMO weather code
            temp_f: Temperature in Fahrenheit
            precip: Precipitation amount

        Returns:
            Weather condition description
        """
        # Basic weather code interpretation
        if weather_code == 0:
            return "Clear" if temp_f > 32 else "Clear and Cold"
        elif weather_code <= 3:
            cloudiness = ["Clear", "Mostly Clear", "Partly Cloudy", "Cloudy"]
            return cloudiness[weather_code]
        elif 45 <= weather_code <= 48:
            return "Foggy"
        elif 51 <= weather_code <= 55:
            return "Drizzle"
        elif 56 <= weather_code <= 57:
            return "Freezing Drizzle"
        elif 61 <= weather_code <= 65:
            intensity = ["Light", "Moderate", "Heavy"]
            idx = (weather_code - 61) // 2
            return f"{intensity[idx]} Rain"
        elif 66 <= weather_code <= 67:
            return "Freezing Rain"
        elif 71 <= weather_code <= 75:
            intensity = ["Light", "Moderate", "Heavy"]
            idx = (weather_code - 71) // 2
            return f"{intensity[idx]} Snow"
        elif 77:
            return "Snow Grains"
        elif 80 <= weather_code <= 82:
            return "Rain Showers"
        elif 85 <= weather_code <= 86:
            return "Snow Showers"
        elif weather_code >= 95:
            return "Thunderstorms"
        else:
            return "Mixed Conditions"

    @staticmethod
    def format_period_forecast(period_data: Dict) -> str:
        """
        Format a single forecast period in NWS style.

        Args:
            period_data: Dictionary with forecast data for a period

        Returns:
            Formatted forecast string
        """
        lines = []

        # Period name and temperature
        period_name = period_data.get("name", "Forecast Period")
        temp = period_data.get("temperature")
        temp_str = NWSFormatter.format_temperature(temp) if temp else "N/A"

        lines.append(f"{period_name}: {temp_str}")

        # Weather condition
        condition = period_data.get("condition", "")
        if condition:
            lines.append(f"  Conditions: {condition}")

        # Wind
        wind_speed = period_data.get("wind_speed")
        wind_dir = period_data.get("wind_direction")
        if wind_speed is not None:
            wind_str = NWSFormatter.format_wind(wind_speed, wind_dir)
            lines.append(f"  Wind: {wind_str}")

        # Precipitation
        precip = period_data.get("precipitation")
        if precip is not None and precip > 0:
            precip_str = NWSFormatter.format_precipitation(precip)
            lines.append(f"  Precipitation: {precip_str}")

        # Humidity
        humidity = period_data.get("humidity")
        if humidity is not None:
            lines.append(f"  Humidity: {int(humidity)}%")

        return "\n".join(lines)

    @staticmethod
    def format_full_forecast(
        location: str,
        forecast_data: List[Dict],
        issue_time: Optional[datetime] = None
    ) -> str:
        """
        Format a complete forecast in NWS style.

        Args:
            location: Location name
            forecast_data: List of period forecast dictionaries
            issue_time: Time forecast was issued

        Returns:
            Complete formatted forecast
        """
        lines = []

        # Header
        lines.append("=" * 70)
        lines.append(f"FORECAST FOR {location.upper()}")
        if issue_time:
            lines.append(f"Issued: {issue_time.strftime('%A, %B %d, %Y at %I:%M %p %Z')}")
        lines.append("=" * 70)
        lines.append("")

        # Format each period
        for i, period in enumerate(forecast_data):
            if i > 0:
                lines.append("")
                lines.append("-" * 70)
                lines.append("")

            lines.append(NWSFormatter.format_period_forecast(period))

        lines.append("")
        lines.append("=" * 70)

        return "\n".join(lines)

    @staticmethod
    def format_hourly_table(hourly_df: pd.DataFrame, max_hours: int = 24) -> str:
        """
        Format hourly forecast data as a table.

        Args:
            hourly_df: DataFrame with hourly forecast data
            max_hours: Maximum number of hours to display

        Returns:
            Formatted table string
        """
        df = hourly_df.head(max_hours).copy()

        # Format columns for display
        if "time" in df.columns:
            df["Time"] = pd.to_datetime(df["time"]).dt.strftime("%m/%d %H:%M")
        if "temperature_2m" in df.columns:
            df["Temp"] = df["temperature_2m"].apply(
                lambda x: f"{int(round(x))}°F"
            )
        if "wind_speed_10m" in df.columns:
            df["Wind"] = df["wind_speed_10m"].apply(
                lambda x: f"{int(round(x))} mph"
            )
        if "precipitation" in df.columns:
            df["Precip"] = df["precipitation"].apply(
                lambda x: f"{x:.2f}\"" if x > 0 else "-"
            )

        # Select display columns
        display_cols = []
        for col in ["Time", "Temp", "Wind", "Precip"]:
            if col in df.columns:
                display_cols.append(col)

        if not display_cols:
            return "No data available for table format"

        return df[display_cols].to_string(index=False)
