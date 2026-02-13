from rest_framework import serializers
from .models import FingerprintDevice, Attendance, SMSLog, AttendanceSettings
from core.serializers import StudentSerializer, ParentSerializer


class FingerprintDeviceSerializer(serializers.ModelSerializer):
    branch = serializers.SerializerMethodField()
    branch_id = serializers.IntegerField(write_only=True, help_text="Branch ID this device belongs to")
    
    class Meta:
        model = FingerprintDevice
        fields = [
            'id', 'name', 'model', 'ip_address', 'port', 'serial_number',
            'branch', 'branch_id', 'grade_category', 'levels', 'status', 'last_sync', 'is_connected',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_sync']
    
    def get_branch(self, obj):
        from core.serializers import BranchSerializer
        return BranchSerializer(obj.branch).data if obj.branch else None
    
    def create(self, validated_data):
        branch_id = validated_data.pop('branch_id', None)
        if branch_id:
            from core.models import Branch
            validated_data['branch'] = Branch.objects.get(id=branch_id)
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        branch_id = validated_data.pop('branch_id', None)
        if branch_id is not None:
            from core.models import Branch
            validated_data['branch'] = Branch.objects.get(id=branch_id)
        return super().update(instance, validated_data)


class AttendanceSerializer(serializers.ModelSerializer):
    student = StudentSerializer(read_only=True)
    student_id = serializers.IntegerField(write_only=True, required=False)
    device = FingerprintDeviceSerializer(read_only=True)
    device_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Attendance
        fields = [
            'id', 'student', 'student_id', 'device', 'device_id',
            'attendance_type', 'timestamp', 'status', 'is_synced', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'status']
    
    def to_representation(self, instance):
        """Recalculate status when serializing CHECK_IN records to ensure it's up-to-date"""
        from django.utils import timezone
        from .utils import get_device_timezone
        
        representation = super().to_representation(instance)
        
        # Convert timestamp from UTC to device's local timezone for display
        # This ensures the frontend receives the correct local time regardless of browser timezone
        if instance.timestamp:
            # Ensure timestamp is timezone-aware
            if timezone.is_naive(instance.timestamp):
                timestamp = timezone.make_aware(instance.timestamp)
            else:
                timestamp = instance.timestamp
            
            # Convert to device timezone
            device_tz = get_device_timezone()
            local_timestamp = timestamp.astimezone(device_tz)
            
            # Return ISO format string in device timezone (frontend will parse this correctly)
            representation['timestamp'] = local_timestamp.isoformat()
        
        # Always recalculate status for CHECK_IN records to ensure it's correct
        if instance.attendance_type == 'CHECK_IN':
            status = AttendanceSettings.calculate_attendance_status(instance.timestamp)
            representation['status'] = status
            # Update database if status changed
            if instance.status != status:
                instance.status = status
                instance.save(update_fields=['status'])
        return representation

    def create(self, validated_data):
        student_id = validated_data.pop('student_id', None)
        device_id = validated_data.pop('device_id', None)
        
        if student_id:
            from core.models import Student
            student = Student.objects.get(id=student_id)
            validated_data['student'] = student
            
            # Auto-assign device based on student grade, branch, and level if not provided
            if not device_id:
                device = FingerprintDevice.get_device_for_grade(
                    student.grade, 
                    student.branch, 
                    student.level
                )
                if device:
                    validated_data['device'] = device
        
        if device_id:
            validated_data['device'] = FingerprintDevice.objects.get(id=device_id)
        
        # Ensure timestamp is UTC-aware without timezone conversion
        if 'timestamp' in validated_data:
            from django.utils import timezone
            import pytz
            timestamp = validated_data['timestamp']
            if timezone.is_naive(timestamp):
                validated_data['timestamp'] = timezone.make_aware(timestamp, pytz.UTC)
            else:
                validated_data['timestamp'] = timestamp.astimezone(pytz.UTC)
        
        # Calculate status for CHECK_IN records
        if validated_data.get('attendance_type') == 'CHECK_IN' and 'timestamp' in validated_data:
            validated_data['status'] = AttendanceSettings.calculate_attendance_status(validated_data['timestamp'])
        
        attendance = super().create(validated_data)
        
        # Send SMS notification to parents after creating attendance
        try:
            from .notifications import SMSNotificationService
            sms_service = SMSNotificationService()
            sms_service.send_attendance_notification(attendance)
        except Exception as e:
            # Don't fail the request if SMS notification fails
            import traceback
            print(f"✗ Error sending SMS notification: {str(e)}")
            print(f"  Traceback: {traceback.format_exc()}")
        
        return attendance


class AttendanceCreateSerializer(serializers.Serializer):
    """Serializer for creating attendance from device sync"""
    fingerprint_id = serializers.IntegerField(help_text="Student ID (used as fingerprint_id on device)")
    attendance_type = serializers.ChoiceField(choices=['CHECK_IN', 'CHECK_OUT'])
    timestamp = serializers.DateTimeField()
    device_serial = serializers.CharField(required=False, allow_blank=True, help_text="Optional: Device serial number for identification")


class SMSLogSerializer(serializers.ModelSerializer):
    """Serializer for SMS log entries"""
    student = StudentSerializer(read_only=True)
    parent = ParentSerializer(read_only=True)
    attendance = AttendanceSerializer(read_only=True)
    display_status = serializers.ReadOnlyField()

    class Meta:
        model = SMSLog
        fields = [
            'id', 'student', 'parent', 'attendance', 'phone_number', 'message',
            'status', 'display_status', 'api_response', 'error_message', 'message_id',
            'sent_at', 'delivered_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AttendanceSettingsSerializer(serializers.ModelSerializer):
    """Serializer for attendance settings"""
    sync_frequency_total_seconds = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendanceSettings
        fields = [
            'id', 'attendance_start_time', 'attendance_end_time',
            'lateness_start_time', 'lateness_end_time',
            'sms_template', 'sync_frequency_hours', 'sync_frequency_minutes',
            'sync_frequency_seconds', 'sync_frequency_total_seconds',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_sync_frequency_total_seconds(self, obj):
        """Get total sync frequency in seconds"""
        return obj.get_sync_frequency_seconds()
    
    def validate(self, data):
        """Validate time intervals"""
        attendance_start = data.get('attendance_start_time', self.instance.attendance_start_time if self.instance else None)
        attendance_end = data.get('attendance_end_time', self.instance.attendance_end_time if self.instance else None)
        lateness_start = data.get('lateness_start_time', self.instance.lateness_start_time if self.instance else None)
        lateness_end = data.get('lateness_end_time', self.instance.lateness_end_time if self.instance else None)
        
        if attendance_start and attendance_end:
            if attendance_start >= attendance_end:
                raise serializers.ValidationError({"attendance_end_time": "Attendance end time must be after start time"})
        
        if lateness_start and lateness_end:
            if lateness_start >= lateness_end:
                raise serializers.ValidationError({"lateness_end_time": "Lateness end time must be after start time"})
        
        if attendance_end and lateness_start:
            if attendance_end > lateness_start:
                raise serializers.ValidationError({"lateness_start_time": "Lateness start time must be after or equal to attendance end time"})
        
        return data

