"""
Utility functions for attendance app
"""
import logging
from datetime import datetime, timedelta

import pytz
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# Fast device clock after ADMS TZ bug: local wall time treated as UTC (+ device TZ).
AHEAD_CLOCK_SKEW_MIN_HOURS = 4.0
AHEAD_CLOCK_SKEW_MAX_HOURS = 6.0
COMMON_AHEAD_OFFSET_HOURS = (5, 4, 3)
NEAR_NOW_TOLERANCE = timedelta(minutes=30)


def get_device_timezone():
    """
    Get the device timezone from Django settings.
    
    This should match the timezone where the fingerprint devices are located.
    Defaults to Django's TIME_ZONE setting, or 'Asia/Riyadh' (KSA) if not set.
    
    Returns:
        pytz.timezone: The timezone object for the device location
    """
    # Get timezone from Django settings (configured via TIME_ZONE env var)
    timezone_str = getattr(settings, 'TIME_ZONE', None)
    
    if not timezone_str:
        # Default to KSA timezone if not configured
        timezone_str = 'Asia/Riyadh'
    
    try:
        return pytz.timezone(timezone_str)
    except pytz.exceptions.UnknownTimeZoneError:
        # Fallback to KSA timezone if invalid timezone is configured
        return pytz.timezone('Asia/Riyadh')


def correct_ahead_device_clock_timestamp(device_naive):
    """
    Correct ADMS punch times when the device clock is hours ahead of school local time.

    Only adjusts when the device timestamp is clearly skewed (about 4-6 hours ahead of
    server local time, or a fixed +3/+4/+5h offset brings it in line with "now").
    Returns the input unchanged when it already matches actual local time.

    Best for punches synced soon after check-in; batch uploads of very old logs are
    not shifted unless they still fall in the ahead-skew window vs server now.
    """
    if not isinstance(device_naive, datetime) or timezone.is_aware(device_naive):
        return device_naive

    device_tz = get_device_timezone()
    server_local = timezone.now().astimezone(device_tz).replace(tzinfo=None)
    diff = device_naive - server_local
    diff_hours = diff.total_seconds() / 3600

    if AHEAD_CLOCK_SKEW_MIN_HOURS <= diff_hours <= AHEAD_CLOCK_SKEW_MAX_HOURS:
        corrected = device_naive - diff
        logger.info(
            "ADMS timestamp corrected (ahead by %.2fh): %s -> %s",
            diff_hours,
            device_naive,
            corrected,
        )
        return corrected

    for hours in COMMON_AHEAD_OFFSET_HOURS:
        candidate = device_naive - timedelta(hours=hours)
        if abs(candidate - server_local) <= NEAR_NOW_TOLERANCE:
            logger.info(
                "ADMS timestamp corrected (-%sh offset): %s -> %s",
                hours,
                device_naive,
                candidate,
            )
            return candidate

    return device_naive
