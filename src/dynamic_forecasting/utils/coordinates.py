"""
Coordinate validation and conversion utilities.
"""

from typing import Tuple


def validate_coordinates(latitude: float, longitude: float) -> Tuple[float, float]:
    """
    Validate and normalize latitude/longitude coordinates.

    Args:
        latitude: Latitude in degrees (-90 to 90)
        longitude: Longitude in degrees (-180 to 180)

    Returns:
        Tuple of (latitude, longitude)

    Raises:
        ValueError: If coordinates are invalid
    """
    if not isinstance(latitude, (int, float)):
        raise ValueError(f"Latitude must be a number, got {type(latitude)}")

    if not isinstance(longitude, (int, float)):
        raise ValueError(f"Longitude must be a number, got {type(longitude)}")

    if not -90 <= latitude <= 90:
        raise ValueError(
            f"Latitude must be between -90 and 90, got {latitude}"
        )

    if not -180 <= longitude <= 180:
        raise ValueError(
            f"Longitude must be between -180 and 180, got {longitude}"
        )

    return float(latitude), float(longitude)


def normalize_longitude(longitude: float) -> float:
    """
    Normalize longitude to -180 to 180 range.

    Args:
        longitude: Longitude in degrees

    Returns:
        Normalized longitude
    """
    while longitude > 180:
        longitude -= 360
    while longitude < -180:
        longitude += 360
    return longitude
