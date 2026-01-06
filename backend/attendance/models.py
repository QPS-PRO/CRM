from django.db import models
from django.core.validators import RegexValidator
from django.core.exceptions import ValidationError
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.models import Grade, Student, Branch, Parent


class FingerprintDevice(models.Model):
    """ZKteco fingerprint device model"""
    DEVICE_MODEL_CHOICES = [
        ('ZK702', 'ZKteco Model 702'),
    ]

    DEVICE_STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('MAINTENANCE', 'Maintenance'),
    ]

    name = models.CharField(max_length=100, help_text="Device name/identifier")
    model = models.CharField(max_length=50, choices=DEVICE_MODEL_CHOICES, default='ZK702')
    ip_address = models.GenericIPAddressField(help_text="Device IP address")
    port = models.IntegerField(default=4370, help_text="Device port (default: 4370)")
    serial_number = models.CharField(max_length=100, unique=True, blank=True, null=True)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='devices', help_text="Branch this device belongs to")
    grade_category = models.CharField(
        max_length=20,
        choices=Grade.choices,
        help_text="Grade category this device is assigned to (one device per grade per branch)"
    )
    status = models.CharField(max_length=20, choices=DEVICE_STATUS_CHOICES, default='ACTIVE')
    last_sync = models.DateTimeField(null=True, blank=True, help_text="Last synchronization time")
    is_connected = models.BooleanField(default=False, help_text="Current connection status")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [['branch', 'grade_category']]
        ordering = ['-created_at']
        verbose_name = 'Fingerprint Device'
        verbose_name_plural = 'Fingerprint Devices'

    def __str__(self):
        return f"{self.name} ({self.grade_category}) - {self.ip_address}"

    @staticmethod
    def get_device_for_grade(grade, branch=None):
        """Get the fingerprint device assigned to a specific grade and branch"""
        try:
            query = {'grade_category': grade, 'status': 'ACTIVE'}
            if branch:
                query['branch'] = branch
            return FingerprintDevice.objects.get(**query)
        except FingerprintDevice.DoesNotExist:
            return None


class Attendance(models.Model):
    """Student attendance record model"""
    ATTENDANCE_TYPE_CHOICES = [
        ('CHECK_IN', 'Check In'),
        ('CHECK_OUT', 'Check Out'),
    ]
    
    STATUS_CHOICES = [
        ('ATTENDED', 'Attended'),
        ('LATE', 'Late'),
        ('ABSENT', 'Absent'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendances')
    device = models.ForeignKey(
        FingerprintDevice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendances',
        help_text="Device that recorded this attendance"
    )
    attendance_type = models.CharField(max_length=10, choices=ATTENDANCE_TYPE_CHOICES)
    timestamp = models.DateTimeField(help_text="Attendance timestamp from device")
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, null=True, blank=True, help_text="Attendance status: Attended, Late, or Absent")
    is_synced = models.BooleanField(default=False, help_text="Whether this record was synced from device")
    notes = models.TextField(blank=True, help_text="Additional notes")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = 'Attendances'
        indexes = [
            models.Index(fields=['student', 'timestamp']),
            models.Index(fields=['timestamp']),
            models.Index(fields=['attendance_type', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.student.full_name} - {self.attendance_type} - {self.timestamp}"

    @classmethod
    def create_attendance(cls, student, attendance_type, timestamp, device=None):
        """Create attendance record with automatic device assignment"""
        if not device:
            # Automatically assign device based on student's grade and branch
            device = FingerprintDevice.get_device_for_grade(student.grade, student.branch)
        
        # Calculate attendance status for CHECK_IN records
        status = None
        if attendance_type == 'CHECK_IN':
            from .models import AttendanceSettings
            status = AttendanceSettings.calculate_attendance_status(timestamp)
        
        attendance = cls.objects.create(
            student=student,
            device=device,
            attendance_type=attendance_type,
            timestamp=timestamp,
            status=status,
            is_synced=True
        )
        return attendance
    
    def calculate_and_update_status(self):
        """Calculate and update attendance status based on timestamp"""
        if self.attendance_type == 'CHECK_IN':
            from .models import AttendanceSettings
            self.status = AttendanceSettings.calculate_attendance_status(self.timestamp)
            self.save(update_fields=['status'])


class SMSLog(models.Model):
    """SMS log model to track SMS messages sent to parents"""
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('FAILED', 'Failed'),
    ]

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='sms_logs')
    parent = models.ForeignKey(Parent, on_delete=models.CASCADE, related_name='sms_logs')
    attendance = models.ForeignKey(Attendance, on_delete=models.CASCADE, related_name='sms_logs')
    phone_number = models.CharField(max_length=20, help_text="Phone number SMS was sent to")
    message = models.TextField(help_text="SMS message content")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    api_response = models.JSONField(null=True, blank=True, help_text="Raw API response from SMS provider")
    error_message = models.TextField(blank=True, help_text="Error message if SMS failed")
    message_id = models.CharField(max_length=255, blank=True, help_text="Message ID from SMS provider")
    sent_at = models.DateTimeField(null=True, blank=True, help_text="When SMS was sent")
    delivered_at = models.DateTimeField(null=True, blank=True, help_text="When SMS was delivered")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'SMS Log'
        verbose_name_plural = 'SMS Logs'
        indexes = [
            models.Index(fields=['student', 'created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['attendance']),
        ]

    def __str__(self):
        return f"SMS to {self.parent.full_name} for {self.student.full_name} - {self.status}"

    @property
    def display_status(self):
        """Human-readable status"""
        status_map = {
            'PENDING': 'Pending',
            'SENT': 'Sent',
            'FAILED': 'Failed',
        }
        return status_map.get(self.status, self.status)


class AttendanceSettings(models.Model):
    """Settings for attendance app configuration"""
    attendance_start_time = models.TimeField(help_text="Start time for attendance window (e.g., 08:00)")
    attendance_end_time = models.TimeField(help_text="End time for attendance window (e.g., 08:30)")
    lateness_start_time = models.TimeField(help_text="Start time for lateness window (e.g., 08:30)")
    lateness_end_time = models.TimeField(help_text="End time for lateness window (e.g., 08:40)")
    sms_template = models.TextField(
        default="Qurtubah School\n\nHello {parent_name}, Your child {student_name} has checked in at {time_attended}.\n\nThank you for your attention.",
        help_text="SMS message template. Available variables: {parent_name}, {student_name}, {time_attended}"
    )
    sync_frequency_hours = models.IntegerField(default=0, help_text="Hours component of sync frequency")
    sync_frequency_minutes = models.IntegerField(default=0, help_text="Minutes component of sync frequency")
    sync_frequency_seconds = models.IntegerField(default=30, help_text="Seconds component of sync frequency")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Attendance Settings'
        verbose_name_plural = 'Attendance Settings'

    def __str__(self):
        return "Attendance Settings"

    def clean(self):
        """Validate time intervals"""
        if self.attendance_start_time >= self.attendance_end_time:
            raise ValidationError("Attendance start time must be before end time")
        if self.attendance_end_time > self.lateness_start_time:
            raise ValidationError("Lateness start time must be after attendance end time")
        if self.lateness_start_time >= self.lateness_end_time:
            raise ValidationError("Lateness start time must be before end time")

    def get_sync_frequency_seconds(self):
        """Get total sync frequency in seconds"""
        return (self.sync_frequency_hours * 3600) + (self.sync_frequency_minutes * 60) + self.sync_frequency_seconds

    @classmethod
    def get_settings(cls):
        """Get the single settings instance, create if doesn't exist"""
        settings, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                'attendance_start_time': '08:00',
                'attendance_end_time': '08:30',
                'lateness_start_time': '08:30',
                'lateness_end_time': '08:40',
                'sms_template': 'Qurtubah School\n\nHello {parent_name}, Your child {student_name} has checked in at {time_attended}.\n\nThank you for your attention.',
                'sync_frequency_hours': 0,
                'sync_frequency_minutes': 0,
                'sync_frequency_seconds': 30,
            }
        )
        return settings

    @staticmethod
    def calculate_attendance_status(check_in_datetime):
        """
        Calculate attendance status based on check-in datetime
        Returns: 'ATTENDED', 'LATE', or 'ABSENT'
        
        Note: The timestamp is stored in UTC, but we compare it in the device's local timezone
        (same timezone used in services.py when syncing from device)
        """
        from django.utils import timezone
        from datetime import datetime, time
        import logging
        import pytz
        
        logger = logging.getLogger(__name__)
        
        settings = AttendanceSettings.get_settings()
        
        # Ensure timezone-aware datetime
        if timezone.is_naive(check_in_datetime):
            check_in_datetime = timezone.make_aware(check_in_datetime)
        
        # Convert check_in_datetime from UTC to device's local timezone
        # The device timezone is hardcoded in services.py as 'Africa/Cairo' (UTC+2)
        # We use the same timezone here for consistency
        device_tz = pytz.timezone('Africa/Cairo')  # Same as in services.py
        
        # Convert UTC datetime to device's local timezone for comparison
        if timezone.is_aware(check_in_datetime):
            # Convert from UTC (or whatever timezone) to device timezone
            check_in_local = check_in_datetime.astimezone(device_tz)
        else:
            check_in_local = check_in_datetime
        
        # Get the time component from check-in datetime (in device's local timezone)
        check_in_time = check_in_local.time()
        
        # Get time window settings
        attendance_start_time = settings.attendance_start_time
        attendance_end_time = settings.attendance_end_time
        lateness_start_time = settings.lateness_start_time
        lateness_end_time = settings.lateness_end_time
        
        # Compare times directly (more reliable than datetime comparison)
        # Determine status by comparing time components
        if attendance_start_time <= check_in_time <= attendance_end_time:
            logger.debug(f"ATTENDED: {check_in_time} is between {attendance_start_time} and {attendance_end_time}")
            return 'ATTENDED'
        elif lateness_start_time < check_in_time <= lateness_end_time:
            logger.debug(f"LATE: {check_in_time} is between {lateness_start_time} and {lateness_end_time}")
            return 'LATE'
        else:
            logger.debug(f"ABSENT: {check_in_time} is not in any window")
            logger.debug(f"  Attendance window: {attendance_start_time} - {attendance_end_time}")
            logger.debug(f"  Lateness window: {lateness_start_time} - {lateness_end_time}")
            return 'ABSENT'


@receiver(post_save, sender=AttendanceSettings)
def update_periodic_task(sender, instance, **kwargs):
    """Update Celery Beat periodic task when sync frequency changes"""
    try:
        from django_celery_beat.models import PeriodicTask, IntervalSchedule
        
        # Get sync frequency
        total_seconds = instance.get_sync_frequency_seconds()
        
        # Determine the best period
        if total_seconds < 60:
            period = IntervalSchedule.SECONDS
            every = total_seconds
        elif total_seconds < 3600:
            period = IntervalSchedule.MINUTES
            every = total_seconds // 60
        else:
            period = IntervalSchedule.HOURS
            every = total_seconds // 3600
        
        # Get or create interval schedule
        interval_schedule, _ = IntervalSchedule.objects.get_or_create(
            every=every,
            period=period,
        )
        
        # Update attendance sync task
        try:
            attendance_task = PeriodicTask.objects.get(name='Sync Attendance')
            attendance_task.interval = interval_schedule
            attendance_task.save()
        except PeriodicTask.DoesNotExist:
            # Task doesn't exist yet, will be created on next app startup
            pass
    except Exception as e:
        # Don't fail if Celery Beat tables don't exist
        import logging
        logger = logging.getLogger(__name__)
        logger.warning(f"Could not update periodic task: {e}")

