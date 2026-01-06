"""
Management command to sync students to all active devices
This command syncs all active students to their respective devices based on grade and branch
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from attendance.models import FingerprintDevice
from attendance.services import ZKtecoDeviceService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync students to all active fingerprint devices'

    def add_arguments(self, parser):
        parser.add_argument(
            '--device-id',
            type=int,
            help='Sync students to a specific device ID only',
        )

    def handle(self, *args, **options):
        device_id = options.get('device_id')
        
        if device_id:
            # Sync to specific device
            try:
                device = FingerprintDevice.objects.get(id=device_id, status='ACTIVE')
                self.sync_device(device)
            except FingerprintDevice.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Device with ID {device_id} not found or not active')
                )
        else:
            # Sync to all active devices
            devices = FingerprintDevice.objects.filter(status='ACTIVE')
            total_devices = devices.count()
            
            if total_devices == 0:
                self.stdout.write(
                    self.style.WARNING('No active devices found')
                )
                return
            
            self.stdout.write(
                self.style.SUCCESS(f'Starting student sync for {total_devices} device(s)...')
            )
            
            success_count = 0
            error_count = 0
            
            for device in devices:
                try:
                    result = self.sync_device(device)
                    if result.get('success'):
                        success_count += 1
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Device "{device.name}": Synced {result.get("synced_count", 0)} students, '
                                f'Updated {result.get("updated_count", 0)} students'
                            )
                        )
                    else:
                        error_count += 1
                        self.stdout.write(
                            self.style.ERROR(
                                f'✗ Device "{device.name}": {result.get("error", "Unknown error")}'
                            )
                        )
                except Exception as e:
                    error_count += 1
                    logger.error(f'Error syncing device {device.name}: {str(e)}', exc_info=True)
                    self.stdout.write(
                        self.style.ERROR(f'✗ Device "{device.name}": {str(e)}')
                    )
            
            self.stdout.write(
                self.style.SUCCESS(
                    f'\nCompleted: {success_count} successful, {error_count} failed out of {total_devices} device(s)'
                )
            )

    def sync_device(self, device):
        """Sync students to a specific device"""
        try:
            service = ZKtecoDeviceService(device)
            result = service.sync_students_to_device()
            return result
        except Exception as e:
            logger.error(f'Error in sync_device for {device.name}: {str(e)}', exc_info=True)
            return {'success': False, 'error': str(e)}

