from django.contrib import admin
from .models import FingerprintDevice, Attendance, SMSLog


@admin.register(FingerprintDevice)
class FingerprintDeviceAdmin(admin.ModelAdmin):
    list_display = ['name', 'model', 'ip_address', 'port', 'grade_category', 'status', 'is_connected', 'last_sync', 'created_at']
    search_fields = ['name', 'ip_address', 'serial_number', 'grade_category']
    list_filter = ['model', 'status', 'grade_category', 'is_connected', 'created_at']
    readonly_fields = ['created_at', 'updated_at', 'last_sync']


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['student', 'attendance_type', 'timestamp', 'device', 'is_synced', 'created_at']
    search_fields = ['student__first_name', 'student__last_name', 'student__student_id', 'device__name']
    list_filter = ['attendance_type', 'is_synced', 'device', 'timestamp', 'created_at']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'timestamp'


@admin.register(SMSLog)
class SMSLogAdmin(admin.ModelAdmin):
    list_display = ['student', 'parent', 'phone_number', 'status', 'attendance', 'sent_at', 'delivered_at', 'created_at']
    list_filter = ['status', 'created_at', 'sent_at', 'delivered_at']
    search_fields = ['student__first_name', 'student__last_name', 'student__student_id', 'parent__first_name', 'parent__last_name', 'parent__email', 'phone_number', 'message_id']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Recipient Information', {
            'fields': ('student', 'parent', 'phone_number')
        }),
        ('SMS Details', {
            'fields': ('attendance', 'message', 'status')
        }),
        ('API Information', {
            'fields': ('message_id', 'api_response', 'error_message'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('sent_at', 'delivered_at', 'created_at', 'updated_at')
        }),
    )
    
    def get_queryset(self, request):
        """Optimize queries by selecting related objects"""
        qs = super().get_queryset(request)
        return qs.select_related('student', 'parent', 'attendance')
