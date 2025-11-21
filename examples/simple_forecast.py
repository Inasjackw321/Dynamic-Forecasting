#!/usr/bin/env python3
"""
Simple example of generating a weather forecast.
"""

from dynamic_forecasting import ForecastGenerator


def main():
    # Initialize the forecast generator
    generator = ForecastGenerator(
        use_herbie=True,
        use_openmeteo=True,
        herbie_model="hrrr"
    )

    # Generate a 48-hour forecast for New York City
    forecast = generator.generate_forecast(
        latitude=40.7128,
        longitude=-74.0060,
        location_name="New York City",
        forecast_hours=48
    )

    # Print the formatted forecast
    print(forecast["formatted_forecast"])

    # Print hourly table if available
    if "hourly_table" in forecast:
        print("\n24-Hour Hourly Forecast:")
        print(forecast["hourly_table"])


if __name__ == "__main__":
    main()
