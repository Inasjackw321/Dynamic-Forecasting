"""
Dynamic Forecasting - Automated NWS forecast generation using Herbie and Open-Meteo.
"""

__version__ = "0.1.0"
__author__ = "Dynamic Forecasting Team"

from .forecast.generator import ForecastGenerator

__all__ = ["ForecastGenerator"]
