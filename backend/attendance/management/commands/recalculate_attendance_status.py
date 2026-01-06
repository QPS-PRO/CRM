from django.core.management.base import BaseCommand
from attendance.models import Attendance, AttendanceSettings


class Command(BaseCommand):
    help = 'Recalculate attendance status for existing records'

    def handle(self, *args, **options):
        self.stdout.write('Recalculating attendance status for existing records...')
        
        # Get all CHECK_IN records (recalculate all of them)
        check_ins = Attendance.objects.filter(attendance_type='CHECK_IN')
        
        total = check_ins.count()
        updated = 0
        
        for attendance in check_ins:
            try:
                old_status = attendance.status
                status = AttendanceSettings.calculate_attendance_status(attendance.timestamp)
                attendance.status = status
                attendance.save(update_fields=['status'])
                updated += 1
                if old_status != status:
                    self.stdout.write(
                        f'Updated attendance {attendance.id}: {old_status} -> {status} (timestamp: {attendance.timestamp})'
                    )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error updating attendance {attendance.id}: {str(e)}')
                )
        
        self.stdout.write(
            self.style.SUCCESS(f'Successfully updated {updated} out of {total} records')
        )

