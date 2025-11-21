"""
Herbie client for fetching NWS weather model data.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
import logging

try:
    from herbie import Herbie
except ImportError:
    raise ImportError(
        "herbie-data is not installed. Install it with: pip install herbie-data"
    )

import pandas as pd
import xarray as xr

logger = logging.getLogger(__name__)


class HerbieClient:
    """
    Client for fetching weather data from NWS models using Herbie.

    Supports models like:
    - HRRR (High-Resolution Rapid Refresh)
    - GFS (Global Forecast System)
    - NAM (North American Mesoscale)
    - RAP (Rapid Refresh)
    """

    SUPPORTED_MODELS = ["hrrr", "gfs", "nam", "rap", "nbm"]

    DEFAULT_VARIABLES = [
        "TMP:2 m",           # 2m Temperature
        "DPT:2 m",           # 2m Dewpoint
        "RH:2 m",            # 2m Relative Humidity
        "UGRD:10 m",         # 10m U-component of wind
        "VGRD:10 m",         # 10m V-component of wind
        "WIND:10 m",         # 10m Wind speed
        "GUST:surface",      # Wind gust
        "PRATE:surface",     # Precipitation rate
        "APCP",              # Accumulated precipitation
        "TCDC:entire",       # Total cloud cover
        "VIS:surface",       # Visibility
        "PRES:surface",      # Surface pressure
    ]

    def __init__(
        self,
        model: str = "hrrr",
        product: str = "sfc",
        cache_dir: Optional[str] = None
    ):
        """
        Initialize the Herbie client.

        Args:
            model: Weather model to use (hrrr, gfs, nam, rap, nbm)
            product: Product type (sfc for surface, prs for pressure levels)
            cache_dir: Directory to cache downloaded files
        """
        if model.lower() not in self.SUPPORTED_MODELS:
            raise ValueError(
                f"Model {model} not supported. "
                f"Choose from: {', '.join(self.SUPPORTED_MODELS)}"
            )

        self.model = model.lower()
        self.product = product
        self.cache_dir = cache_dir
        logger.info(f"Initialized HerbieClient with model={model}, product={product}")

    def fetch_latest(
        self,
        variables: Optional[List[str]] = None,
        forecast_hours: Optional[List[int]] = None
    ) -> xr.Dataset:
        """
        Fetch the latest model run data.

        Args:
            variables: List of variables to fetch (uses DEFAULT_VARIABLES if None)
            forecast_hours: List of forecast hours to fetch (e.g., [0, 1, 2, 3])

        Returns:
            xarray.Dataset containing the requested data
        """
        if variables is None:
            variables = self.DEFAULT_VARIABLES

        if forecast_hours is None:
            forecast_hours = list(range(0, 7))  # 0-6 hour forecast

        logger.info(f"Fetching latest {self.model} data for forecast hours {forecast_hours}")

        try:
            # Get the latest model run
            H = Herbie("latest", model=self.model, product=self.product)

            datasets = []
            for fxx in forecast_hours:
                try:
                    H_fxx = Herbie(
                        H.date,
                        model=self.model,
                        product=self.product,
                        fxx=fxx
                    )

                    # Download and load data for each variable
                    ds_list = []
                    for var in variables:
                        try:
                            ds = H_fxx.xarray(var, remove_grib=False)
                            ds_list.append(ds)
                        except Exception as e:
                            logger.warning(f"Could not fetch {var} for fxx={fxx}: {e}")
                            continue

                    if ds_list:
                        combined = xr.merge(ds_list)
                        datasets.append(combined)

                except Exception as e:
                    logger.warning(f"Could not fetch data for fxx={fxx}: {e}")
                    continue

            if not datasets:
                raise ValueError("No data could be fetched from Herbie")

            # Combine all forecast hours
            result = xr.concat(datasets, dim="step")
            logger.info(f"Successfully fetched data with shape: {result.dims}")
            return result

        except Exception as e:
            logger.error(f"Error fetching data from Herbie: {e}")
            raise

    def fetch_point_forecast(
        self,
        latitude: float,
        longitude: float,
        forecast_hours: Optional[List[int]] = None
    ) -> pd.DataFrame:
        """
        Fetch forecast data for a specific point location.

        Args:
            latitude: Latitude of the point
            longitude: Longitude of the point
            forecast_hours: List of forecast hours to fetch

        Returns:
            DataFrame with forecast data for the point
        """
        if forecast_hours is None:
            forecast_hours = list(range(0, 49))  # 48-hour forecast

        logger.info(
            f"Fetching point forecast for lat={latitude}, lon={longitude}"
        )

        try:
            data_records = []

            for fxx in forecast_hours:
                try:
                    H = Herbie(
                        "latest",
                        model=self.model,
                        product=self.product,
                        fxx=fxx
                    )

                    # Get data for this forecast hour
                    record = {
                        "forecast_hour": fxx,
                        "valid_time": H.valid_date,
                        "model_run": H.date,
                    }

                    # Fetch key variables
                    for var in self.DEFAULT_VARIABLES:
                        try:
                            ds = H.xarray(var, remove_grib=False)
                            # Extract nearest point
                            point_data = ds.sel(
                                latitude=latitude,
                                longitude=longitude,
                                method="nearest"
                            )

                            var_name = var.split(":")[0].lower()
                            record[var_name] = float(point_data.to_array().values[0])

                        except Exception as e:
                            logger.debug(f"Could not fetch {var} for point: {e}")
                            continue

                    data_records.append(record)

                except Exception as e:
                    logger.warning(f"Could not fetch fxx={fxx}: {e}")
                    continue

            if not data_records:
                raise ValueError("No data could be fetched for point forecast")

            df = pd.DataFrame(data_records)
            logger.info(f"Successfully fetched {len(df)} forecast hours")
            return df

        except Exception as e:
            logger.error(f"Error fetching point forecast: {e}")
            raise

    def get_model_info(self) -> Dict:
        """
        Get information about the current model configuration.

        Returns:
            Dictionary with model information
        """
        try:
            H = Herbie("latest", model=self.model, product=self.product)

            return {
                "model": self.model,
                "product": self.product,
                "latest_run": H.date,
                "model_name": H.model,
                "cache_dir": self.cache_dir,
            }
        except Exception as e:
            logger.error(f"Error getting model info: {e}")
            return {
                "model": self.model,
                "product": self.product,
                "error": str(e)
            }
