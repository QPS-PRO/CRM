"""
Utility functions for attendance app
"""
import logging
from datetime import datetime, timedelta

import pytz
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def get_device_timezone():
    """
    Get the device timezone from Django settings.

    This should match the timezone where the fingerprint devices are located.
    Defaults to Django's TIME_ZONE setting, or 'Asia/Riyadh' (KSA) if not set.

    Returns:
        pytz.timezone: The timezone object for the device location
    """
    timezone_str = getattr(settings, 'TIME_ZONE', None)

    if not timezone_str:
        timezone_str = 'Asia/Riyadh'

    try:
        return pytz.timezone(timezone_str)
    except pytz.exceptions.UnknownTimeZoneError:
        return pytz.timezone('Asia/Riyadh')


def normalize_adms_timestamp_for_device(device_naive, serial_number):
    """
    Subtract configured hours from punch time when device SN is listed in
    Attendance Settings as having an ahead-of-actual ADMS clock.

    Returns the input unchanged for devices not in that list or when offset is 0.
    """
    if not isinstance(device_naive, datetime) or timezone.is_aware(device_naive):
        return device_naive

    from .models import AttendanceSettings

    attendance_settings = AttendanceSettings.get_settings()
    if not attendance_settings.should_normalize_adms_timestamp(serial_number):
        return device_naive

    offset_hours = attendance_settings.adms_ahead_offset_hours or 0
    if offset_hours <= 0:
        return device_naive

    corrected = device_naive - timedelta(hours=offset_hours)
    logger.info(
        "ADMS timestamp normalized for SN=%s (-%sh): %s -> %s",
        serial_number,
        offset_hours,
        device_naive,
        corrected,
    )
    return corrected
