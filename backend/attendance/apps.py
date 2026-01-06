from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)


class AttendanceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'attendance'
    
    def ready(self):
        """Set up periodic tasks when Django is ready"""
        # Only set up periodic tasks in the main process (not in migrations, tests, etc.)
        import sys
        
        # Check if we're in a management command context
        is_management_command = any(arg in sys.argv for arg in ['migrate', 'makemigrations', 'test', 'shell', 'shell_plus', 'collectstatic'])
        
        # Only set up periodic tasks if we're running the server
        if not is_management_command:
            try:
                self.setup_periodic_tasks()
            except Exception as e:
                logger.error(f"Failed to set up periodic tasks: {e}", exc_info=True)
    
    def setup_periodic_tasks(self):
        """Set up periodic tasks using django-celery-beat"""
        try:
            from django_celery_beat.models import PeriodicTask, IntervalSchedule, CrontabSchedule
            from django.utils import timezone
            from django.db import OperationalError
            from .models import AttendanceSettings
            
            # Check if database tables exist
            try:
                # Try to query to see if tables exist
                IntervalSchedule.objects.first()
            except OperationalError:
                logger.warning("Celery Beat tables not found. Run migrations: python manage.py migrate")
                return
            
            # Get sync frequency from settings
            try:
                settings = AttendanceSettings.get_settings()
                total_seconds = settings.get_sync_frequency_seconds()
                
                # Determine the best period (seconds, minutes, or hours)
                if total_seconds < 60:
                    period = IntervalSchedule.SECONDS
                    every = total_seconds
                elif total_seconds < 3600:
                    period = IntervalSchedule.MINUTES
                    every = total_seconds // 60
                else:
                    period = IntervalSchedule.HOURS
                    every = total_seconds // 3600
            except Exception as e:
                logger.warning(f"Could not load attendance settings, using default (30 seconds): {e}")
                period = IntervalSchedule.SECONDS
                every = 30
            
            # Create or get interval schedule for attendance sync
            interval_schedule, created = IntervalSchedule.objects.get_or_create(
                every=every,
                period=period,
            )
            if created:
                logger.info(f"Created interval schedule (every {every} {period.lower()})")
            
            # Create or update attendance sync periodic task
            attendance_task, created = PeriodicTask.objects.get_or_create(
                name='Sync Attendance',
                defaults={
                    'task': 'attendance.sync_attendance',
                    'interval': interval_schedule,
                    'enabled': True,
                }
            )
            if not created:
                # Update existing task to use new interval
                attendance_task.interval = interval_schedule
                attendance_task.enabled = True
                attendance_task.save()
                logger.info(f"Updated attendance sync periodic task (every {every} {period.lower()})")
            else:
                logger.info(f"Created attendance sync periodic task (every {every} {period.lower()})")
            
            # DISABLED: Student sync task is disabled
            # Disable any existing sync_students periodic tasks
            student_tasks = PeriodicTask.objects.filter(task='attendance.sync_students')
            if student_tasks.exists():
                for task in student_tasks:
                    task.enabled = False
                    task.save()
                    logger.info(f"Disabled periodic task: {task.name}")
                
        except Exception as e:
            logger.error(f"Error setting up periodic tasks: {e}", exc_info=True)

