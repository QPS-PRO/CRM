"""
Celery tasks for attendance syncing
"""
from celery import shared_task
from django.core.management import call_command
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


# @shared_task(name='attendance.sync_students')
# def sync_students_task(device_id=None):
#     """
#     Task to sync students to fingerprint devices
#     Can sync to all devices or a specific device
#     """
#     logger.info(f"Starting Celery task: sync_students at {timezone.now()}")
#     try:
#         if device_id:
#             call_command('sync_students', '--device-id', str(device_id), verbosity=0)
#         else:
#             call_command('sync_students', verbosity=0)
#         logger.info("Celery task sync_students completed successfully")
#         return {'status': 'success', 'message': 'Students synced successfully'}
#     except Exception as e:
#         logger.error(f"Error in Celery task sync_students: {str(e)}", exc_info=True)
#         return {'status': 'error', 'message': str(e)}


@shared_task(name='attendance.sync_attendance')
def sync_attendance_task(device_id=None):
    """
    Task to sync attendance records from fingerprint devices
    Can sync from all devices or a specific device
    """
    logger.info(f"Starting Celery task: sync_attendance at {timezone.now()}")
    try:
        if device_id:
            call_command('sync_attendance', '--device-id', str(device_id), verbosity=0)
        else:
            call_command('sync_attendance', verbosity=0)
        logger.info("Celery task sync_attendance completed successfully")
        return {'status': 'success', 'message': 'Attendance synced successfully'}
    except Exception as e:
        logger.error(f"Error in Celery task sync_attendance: {str(e)}", exc_info=True)
        return {'status': 'error', 'message': str(e)}

