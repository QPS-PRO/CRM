"""
Management command to sync attendance from all active devices
This command syncs attendance records from all active fingerprint devices
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from attendance.models import FingerprintDevice
from attendance.services import ZKtecoDeviceService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Sync attendance records from all active fingerprint devices'

    def add_arguments(self, parser):
        parser.add_argument(
            '--device-id',
            type=int,
            help='Sync attendance from a specific device ID only',
        )

    def handle(self, *args, **options):
        device_id = options.get('device_id')
        
        if device_id:
            # Sync from specific device
            try:
                device = FingerprintDevice.objects.get(id=device_id, status='ACTIVE')
                self.sync_device(device)
            except FingerprintDevice.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Device with ID {device_id} not found or not active')
                )
        else:
            # Sync from all active devices
            devices = FingerprintDevice.objects.filter(status='ACTIVE')
            total_devices = devices.count()
            
            if total_devices == 0:
                self.stdout.write(
                    self.style.WARNING('No active devices found')
                )
                return
            
            self.stdout.write(
                self.style.SUCCESS(f'Starting attendance sync from {total_devices} device(s)...')
            )
            
            success_count = 0
            error_count = 0
            total_synced = 0
            total_skipped = 0
            
            for device in devices:
                try:
                    result = self.sync_device(device)
                    if 'error' in result:
                        error_count += 1
                        self.stdout.write(
                            self.style.ERROR(
                                f'✗ Device "{device.name}": {result.get("error", "Unknown error")}'
                            )
                        )
                    else:
                        success_count += 1
                        synced = result.get('total_synced', 0)
                        skipped = result.get('total_skipped', 0)
                        total_synced += synced
                        total_skipped += skipped
                        self.stdout.write(
                            self.style.SUCCESS(
                                f'✓ Device "{device.name}": Synced {synced} records, '
                                f'Skipped {skipped} records'
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
            self.stdout.write(
                self.style.SUCCESS(
                    f'Total: {total_synced} records synced, {total_skipped} records skipped'
                )
            )

    def sync_device(self, device):
        """Sync attendance from a specific device"""
        try:
            service = ZKtecoDeviceService(device)
            result = service.sync_attendance()
            return result
        except Exception as e:
            logger.error(f'Error in sync_device for {device.name}: {str(e)}', exc_info=True)
            return {'error': str(e)}

