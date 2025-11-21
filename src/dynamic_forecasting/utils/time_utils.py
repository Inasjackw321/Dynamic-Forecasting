"""
Time and date utilities for forecast processing.
"""

from datetime import datetime, timedelta
from typing import Optional, Union
import pytz


def parse_forecast_time(
    time_str: Optional[str] = None,
    timezone: str = "UTC"
) -> datetime:
    """
    Parse a time string into a datetime object.

    Args:
        time_str: Time string in ISO format (or None for current time)
        timezone: Timezone name (default: UTC)

    Returns:
        Datetime object with timezone
    """
    tz = pytz.timezone(timezone)

    if time_str is None:
        return datetime.now(tz)

    try:
        dt = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = tz.localize(dt)
        else:
            dt = dt.astimezone(tz)
        return dt
    except ValueError as e:
        raise ValueError(f"Invalid time string '{time_str}': {e}")


def get_forecast_period(hours: int = 48) -> tuple[datetime, datetime]:
    """
    Get the start and end times for a forecast period.

    Args:
        hours: Number of hours to forecast

    Returns:
        Tuple of (start_time, end_time) in UTC
    """
    now = datetime.now(pytz.UTC)
    end = now + timedelta(hours=hours)
    return now, end


def format_time_nws(dt: datetime) -> str:
    """
    Format datetime in NWS-style format.

    Args:
        dt: Datetime object

    Returns:
        Formatted string (e.g., "Monday 3:00 PM EST")
    """
    return dt.strftime("%A %I:%M %p %Z")


def round_to_hour(dt: datetime) -> datetime:
    """
    Round datetime to the nearest hour.

    Args:
        dt: Datetime object

    Returns:
        Rounded datetime
    """
    if dt.minute >= 30:
        dt = dt.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    else:
        dt = dt.replace(minute=0, second=0, microsecond=0)
    return dt
