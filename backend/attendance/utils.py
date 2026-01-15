"""
Utility functions for attendance app
"""
import pytz
from django.conf import settings


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
