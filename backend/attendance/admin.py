from django import forms
from django.contrib import admin

from .models import FingerprintDevice, Attendance, SMSLog, AttendanceSettings


@admin.register(FingerprintDevice)
class FingerprintDeviceAdmin(admin.ModelAdmin):
    list_display = ['name', 'model', 'serial_number', 'ip_address', 'port', 'grade_category', 'status', 'is_connected', 'last_sync', 'created_at']
    search_fields = ['name', 'ip_address', 'serial_number', 'grade_category']
    list_filter = ['model', 'status', 'grade_category', 'is_connected', 'created_at']
    readonly_fields = ['created_at', 'updated_at', 'last_sync']


class AttendanceSettingsAdminForm(forms.ModelForm):
    """Pick devices by SN; stored as one serial number per line."""

    ahead_devices = forms.ModelMultipleChoiceField(
        queryset=FingerprintDevice.objects.exclude(serial_number__isnull=True)
        .exclude(serial_number='')
        .order_by('name'),
        required=False,
        label='Devices with ADMS time ahead of actual',
        help_text=(
            'Select every fingerprint device whose punch timestamps are ahead of real time '
            '(e.g. 5 hours). ADMS records from these SNs will have the offset below subtracted '
            'before saving. Other devices are unchanged.'
        ),
        widget=admin.widgets.FilteredSelectMultiple('Devices', is_stacked=False),
    )

    class Meta:
        model = AttendanceSettings
        fields = '__all__'

    class Media:
        css = {'all': ['admin/css/widgets.css']}
        js = ['admin/js/core.js', 'admin/js/SelectBox.js', 'admin/js/SelectFilter2.js']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance and self.instance.pk:
            sns = self.instance.get_adms_ahead_serial_number_set()
            self.fields['ahead_devices'].initial = FingerprintDevice.objects.filter(
                serial_number__in=sns
            )
        self.fields['adms_ahead_serial_numbers'].widget = forms.HiddenInput()

    def save(self, commit=True):
        instance = super().save(commit=False)
        selected = self.cleaned_data.get('ahead_devices') or []
        instance.adms_ahead_serial_numbers = '\n'.join(
            sorted(
                {
                    device.serial_number.strip()
                    for device in selected
                    if device.serial_number and device.serial_number.strip()
                }
            )
        )
        if commit:
            instance.save()
            self.save_m2m()
        return instance


@admin.register(AttendanceSettings)
class AttendanceSettingsAdmin(admin.ModelAdmin):
    form = AttendanceSettingsAdminForm
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Attendance windows', {
            'fields': (
                'attendance_start_time',
                'attendance_end_time',
                'lateness_start_time',
                'lateness_end_time',
            ),
        }),
        ('ADMS device clock correction', {
            'fields': (
                'ahead_devices',
                'adms_ahead_offset_hours',
                'adms_ahead_serial_numbers',
            ),
            'description': (
                'Select devices whose clocks are ahead of actual time. '
                'Punch times from those serial numbers (SN) are reduced by the offset hours '
                'when received via POST /iclock/cdata.'
            ),
        }),
        ('SMS & sync', {
            'fields': (
                'sms_template',
                'sync_frequency_hours',
                'sync_frequency_minutes',
                'sync_frequency_seconds',
            ),
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
        }),
    )


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['student', 'attendance_type', 'timestamp_display', 'device', 'is_synced', 'created_at']
    search_fields = ['student__first_name', 'student__last_name', 'student__student_id', 'device__name']
    list_filter = ['attendance_type', 'is_synced', 'device', 'timestamp', 'created_at']
    readonly_fields = ['created_at', 'updated_at', 'timestamp_display']
    date_hierarchy = 'timestamp'

    def timestamp_display(self, obj):
        """Display timestamp converted from UTC to device timezone"""
        if obj.timestamp:
            from django.utils import timezone
            from .utils import get_device_timezone
            import pytz

            timestamp = obj.timestamp
            if timezone.is_naive(timestamp):
                timestamp = timezone.make_aware(timestamp, pytz.UTC)

            device_tz = get_device_timezone()
            if timestamp.tzinfo == pytz.UTC:
                timestamp = timestamp.astimezone(device_tz)

            return timestamp.isoformat()
        return '-'
    timestamp_display.short_description = 'Timestamp'
    timestamp_display.admin_order_field = 'timestamp'


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
        qs = super().get_queryset(request)
        return qs.select_related('student', 'parent', 'attendance')
