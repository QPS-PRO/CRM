"""
Service layer for fingerprint device integration with ZKteco devices
"""
from datetime import datetime
from typing import Optional, List, Dict, Tuple
from django.utils import timezone
from django.utils.timezone import make_aware, make_naive
from django.conf import settings
from .models import FingerprintDevice, Attendance
from core.models import Student


class ZKtecoDeviceService:
    """Service for interacting with ZKteco fingerprint devices"""
    
    def __init__(self, device: FingerprintDevice):
        self.device = device
        self.connection = None
    
    def test_tcp_connection(self) -> Tuple[bool, str]:
        """Test TCP connectivity to device port (without ZK library)"""
        import socket
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((self.device.ip_address, self.device.port))
            sock.close()
            
            if result == 0:
                return True, "TCP port is reachable"
            else:
                return False, f"TCP connection failed (error code: {result})"
        except socket.gaierror as e:
            return False, f"DNS/Hostname resolution failed: {str(e)}"
        except socket.timeout:
            return False, "Connection timeout - device may be unreachable or firewall blocking"
        except Exception as e:
            return False, f"Network error: {str(e)}"
    
    def connect(self) -> bool:
        """Connect to the fingerprint device and retrieve device info"""
        try:
            from zk import ZK, const
            
            # First test basic TCP connectivity
            tcp_ok, tcp_msg = self.test_tcp_connection()
            if not tcp_ok:
                print(f"TCP connectivity test failed: {tcp_msg}")
                # Continue anyway - sometimes ZK library can connect even if basic TCP test fails
            
            zk = ZK(self.device.ip_address, port=self.device.port, timeout=10)  # Increased timeout
            self.connection = zk.connect()
            
            if self.connection:
                self.device.is_connected = True
                
                # Get device serial number if not already set
                if not self.device.serial_number:
                    try:
                        serial = self.connection.get_serialnumber()
                        if serial:
                            self.device.serial_number = serial
                    except Exception:
                        pass
                
                self.device.save(update_fields=['is_connected', 'serial_number'])
                return True
            return False
        except ImportError as e:
            error_msg = f"ZK library import error: {str(e)}. Make sure pyzk is installed."
            print(error_msg)
            self.device.is_connected = False
            self.device.save(update_fields=['is_connected'])
            return False
        except Exception as e:
            error_msg = f"Error connecting to device {self.device.name} at {self.device.ip_address}:{self.device.port}: {str(e)}"
            print(error_msg)
            self.device.is_connected = False
            self.device.save(update_fields=['is_connected'])
            return False
    
    def disconnect(self):
        """Disconnect from the device"""
        if self.connection:
            try:
                self.connection.disconnect()
            except Exception:
                pass
            finally:
                self.connection = None
                # Don't set is_connected to False on disconnect - keep the last known state
                # The connection status should only be updated when we actually test/connect
    
    def get_device_info(self) -> Dict:
        """Get device information"""
        # Test TCP connectivity first
        tcp_ok, tcp_msg = self.test_tcp_connection()
        
        if not self.connection and not self.connect():
            return {
                'error': 'Could not connect to device',
                'tcp_test': {'reachable': tcp_ok, 'message': tcp_msg},
                'suggestions': self._get_connection_suggestions()
            }
        
        try:
            info = {
                'serial_number': self.connection.get_serialnumber(),
                'firmware_version': self.connection.get_firmware_version(),
                'device_name': self.connection.get_device_name(),
                'face_version': self.connection.get_face_version(),
                'fp_version': self.connection.get_fp_version(),
                'extend_fmt': self.connection.get_extend_fmt(),
                'user_count': len(self.connection.get_users()),
                'attendance_count': len(self.connection.get_attendance()),
                'tcp_test': {'reachable': tcp_ok, 'message': tcp_msg}
            }
            return info
        except Exception as e:
            print(f"Error getting device info: {str(e)}")
            return {
                'error': str(e),
                'tcp_test': {'reachable': tcp_ok, 'message': tcp_msg},
                'suggestions': self._get_connection_suggestions()
            }
        finally:
            self.disconnect()
    
    def _get_connection_suggestions(self) -> List[str]:
        """Get troubleshooting suggestions based on connection issues"""
        suggestions = [
            f"Verify device IP address: {self.device.ip_address}",
            f"Verify device port: {self.device.port}",
            "Check if device is powered on and connected to network",
            "Ensure device and server are on the same network",
            "Test TCP connection: nc -zv {ip} {port} or telnet {ip} {port}".format(
                ip=self.device.ip_address, port=self.device.port
            ),
            "Check firewall settings - port 4370 should be open",
            "Verify device network settings (IP, subnet mask, gateway)",
            "Try pinging the device: ping {ip}".format(ip=self.device.ip_address),
            "Check device admin software can connect to verify IP/port",
        ]
        return suggestions
    
    def sync_attendance(self) -> Dict:
        """Sync attendance records from device"""
        if not self.connection and not self.connect():
            return {'synced': [], 'skipped': [], 'total_synced': 0, 'total_skipped': 0, 'error': 'Could not connect to device'}
        
        try:
            from zk import ZK, const
            
            # Get attendance records from device
            attendances = self.connection.get_attendance()
            
            synced_records = []
            skipped_records = []
            
            for att in attendances:
                # Find student by student_id (device stores student_id as user_id)
                # or by ID if user_id is numeric and matches student.id
                try:
                    # Try to match by student_id first (most common case)
                    student = None
                    if att.user_id:
                        try:
                            # Try matching by student_id (string)
                            student = Student.objects.get(
                                student_id=str(att.user_id),
                                is_active=True
                            )
                        except Student.DoesNotExist:
                            # Try matching by ID if user_id is numeric
                            try:
                                user_id_int = int(att.user_id)
                                student = Student.objects.get(
                                    id=user_id_int,
                                    is_active=True
                                )
                            except (ValueError, Student.DoesNotExist):
                                pass
                    
                    if not student:
                        raise Student.DoesNotExist()
                    
                    # Determine attendance type based on punch state
                    # Punch state: 0=Check-in, 1=Check-out (may vary by device)
                    attendance_type = 'CHECK_IN' if att.punch == 0 else 'CHECK_OUT'
                    
                    # Handle timezone: Device sends naive datetime in device's local time
                    # The device stores time in its local timezone (not UTC)
                    device_timestamp = att.timestamp
                    if timezone.is_naive(device_timestamp):
                        # Device timestamp is naive (no timezone info)
                        # IMPORTANT: The device stores time in its LOCAL timezone
                        # We need to localize it to the device's timezone, then convert to UTC for storage
                        from .utils import get_device_timezone
                        import pytz
                        device_tz = get_device_timezone()  # Get timezone from Django settings
                        # Localize the naive timestamp to device's timezone
                        device_timestamp = device_tz.localize(device_timestamp)
                        # Convert to UTC for database storage (Django stores datetimes in UTC)
                        device_timestamp = device_timestamp.astimezone(pytz.UTC)
                        # Django can work with pytz timezone-aware datetimes directly
                    
                    # Check if record already exists (within 1 minute tolerance)
                    from datetime import timedelta
                    time_tolerance = timedelta(minutes=1)
                    
                    existing = Attendance.objects.filter(
                        student=student,
                        timestamp__gte=device_timestamp - time_tolerance,
                        timestamp__lte=device_timestamp + time_tolerance
                    ).first()
                    
                    if not existing:
                        attendance = Attendance.create_attendance(
                            student=student,
                            attendance_type=attendance_type,
                            timestamp=device_timestamp,
                            device=self.device
                        )
                        
                        # Send WhatsApp notification to parents
                        notification_result = None
                        try:
                            from .notifications import WhatsAppNotificationService
                            whatsapp_service = WhatsAppNotificationService()
                            notification_result = whatsapp_service.send_attendance_notification(attendance)
                            
                            # Log notification results for debugging
                            if notification_result.get('success'):
                                print(f"✓ WhatsApp notification sent for {student.full_name}: {notification_result.get('sent', 0)} sent, {notification_result.get('failed', 0)} failed")
                            else:
                                print(f"✗ WhatsApp notification failed for {student.full_name}: {notification_result.get('errors', ['Unknown error'])}")
                        except Exception as e:
                            # Don't fail the sync if notification fails
                            import traceback
                            print(f"✗ Error sending WhatsApp notification for {student.full_name}: {str(e)}")
                            print(f"  Traceback: {traceback.format_exc()}")
                            notification_result = {'success': False, 'error': str(e)}
                        
                        # Send SMS notification to parents
                        sms_notification_result = None
                        try:
                            from .notifications import SMSNotificationService
                            sms_service = SMSNotificationService()
                            sms_notification_result = sms_service.send_attendance_notification(attendance)
                            
                            # Log SMS notification results for debugging
                            if sms_notification_result.get('success'):
                                print(f"✓ SMS notification sent for {student.full_name}: {sms_notification_result.get('sent', 0)} sent, {sms_notification_result.get('failed', 0)} failed")
                            else:
                                print(f"✗ SMS notification failed for {student.full_name}: {sms_notification_result.get('errors', ['Unknown error'])}")
                        except Exception as e:
                            # Don't fail the sync if SMS notification fails
                            import traceback
                            print(f"✗ Error sending SMS notification for {student.full_name}: {str(e)}")
                            print(f"  Traceback: {traceback.format_exc()}")
                            sms_notification_result = {'success': False, 'error': str(e)}
                        
                        synced_records.append({
                            'id': attendance.id,
                            'student': student.full_name,
                            'student_id': student.student_id,
                            'timestamp': attendance.timestamp.isoformat(),
                            'type': attendance_type,
                            'notification': notification_result
                        })
                except Student.DoesNotExist:
                    # Student not found - log for review
                    skipped_records.append({
                        'fingerprint_id': att.user_id,
                        'timestamp': att.timestamp.isoformat(),
                        'reason': 'Student not found in database'
                    })
                    continue
            
            # Update last sync time
            self.device.last_sync = timezone.now()
            self.device.save(update_fields=['last_sync'])
            
            return {
                'synced': synced_records,
                'skipped': skipped_records,
                'total_synced': len(synced_records),
                'total_skipped': len(skipped_records)
            }
            
        except Exception as e:
            print(f"Error syncing attendance from device {self.device.name}: {str(e)}")
            return {'synced': [], 'skipped': [], 'error': str(e)}
        finally:
            self.disconnect()
    
    def sync_students_to_device(self) -> Dict:
        """Sync students from database to device (upload student IDs and fingerprint IDs)"""
        if not self.connection and not self.connect():
            return {'success': False, 'error': 'Could not connect to device'}
        
        try:
            # Get all active students for this device's grade category and branch
            students = Student.objects.filter(
                grade=self.device.grade_category,
                branch=self.device.branch,
                is_active=True
            )
            
            # Get existing users on device
            existing_users = self.connection.get_users()
            existing_uids = {u.uid for u in existing_users}
            
            synced_count = 0
            updated_count = 0
            errors = []
            
            for student in students:
                try:
                    # Generate fingerprint_id based on student.id (consistent and unique)
                    # Use student.id as base, but ensure it doesn't conflict with existing device users
                    base_id = student.id
                    fingerprint_id = base_id
                    
                    # If the generated ID conflicts with existing device users, find next available
                    if fingerprint_id in existing_uids:
                        all_ids = set(existing_uids)
                        for s in students:
                            # Use student.id as fingerprint_id for other students too
                            all_ids.add(s.id)
                        
                        next_id = 1
                        while next_id in all_ids:
                            next_id += 1
                        fingerprint_id = next_id
                    
                    # Check if user already exists on device (by the generated fingerprint_id)
                    user_exists = fingerprint_id in existing_uids
                    
                    if user_exists:
                        # Update existing user
                        try:
                            # Use the generated fingerprint_id
                            uid = int(fingerprint_id)
                            student_name = f"{student.first_name} {student.last_name}"
                            
                            # Convert user_id - use string format as pyzk expects string for user_id
                            try:
                                user_id_val = str(student.student_id) if student.student_id else ''
                            except (ValueError, TypeError, AttributeError):
                                user_id_val = ''
                            
                            # Use set_user with keyword arguments directly (same as creating new user)
                            self.connection.set_user(
                                uid=int(uid),
                                name=str(student_name),
                                privilege=int(0),
                                password=str(''),
                                group_id=str(''),
                                user_id=str(user_id_val),
                                card=int(0)
                            )
                            updated_count += 1
                        except Exception as e:
                            errors.append(f"Error updating {student.full_name}: {str(e)}")
                    else:
                        # Create new user on device
                        try:
                            # Use the generated fingerprint_id
                            uid = int(fingerprint_id)
                            student_name = f"{student.first_name} {student.last_name}"
                            
                            # Convert user_id - try to convert to int if possible, otherwise use string or 0
                            try:
                                if student.student_id and str(student.student_id).isdigit():
                                    user_id_val = int(student.student_id)
                                else:
                                    # If not numeric, use the string value or empty string
                                    user_id_val = str(student.student_id) if student.student_id else ''
                            except (ValueError, TypeError, AttributeError):
                                user_id_val = ''
                            
                            # Use set_user with keyword arguments directly (simpler and more reliable)
                            # This avoids the User class import issue
                            self.connection.set_user(
                                uid=int(uid),
                                name=str(student_name),
                                privilege=int(0),
                                password=str(''),
                                group_id=str(''),
                                user_id=str(user_id_val),
                                card=int(0)
                            )
                            
                            existing_uids.add(fingerprint_id)
                            synced_count += 1
                        except Exception as e:
                            import traceback
                            error_details = f"{str(e)}"
                            # Include traceback in error for debugging
                            tb_str = traceback.format_exc()
                            errors.append(f"Error creating {student.full_name}: {error_details}")
                            # Print full traceback for debugging
                            print(f"Full error for {student.full_name}: {tb_str}")
                            
                except Exception as e:
                    errors.append(f"Error processing {student.full_name}: {str(e)}")
                    continue
            
            # Update last sync time
            self.device.last_sync = timezone.now()
            self.device.save(update_fields=['last_sync'])
            
            return {
                'success': True,
                'synced_count': synced_count,
                'updated_count': updated_count,
                'total_students': students.count(),
                'errors': errors
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}
        finally:
            self.disconnect()
    
    def enroll_fingerprint(self, student: Student) -> bool:
        """Enroll a student's fingerprint on the device (physical enrollment)"""
        if not self.connection and not self.connect():
            return False
        
        try:
            # Generate fingerprint_id based on student.id
            fingerprint_id = student.id
            
            # Check if this ID conflicts with existing device users
            users = self.connection.get_users()
            existing_ids = [u.uid for u in users]
            
            if fingerprint_id in existing_ids:
                # Find next available ID
                next_id = max(existing_ids) + 1 if existing_ids else 1
                fingerprint_id = next_id
            
            # Create/update user on device first
            # Ensure uid is an integer
            uid = int(fingerprint_id)
            
            # Convert user_id - use string format as pyzk expects string for user_id
            user_id_val = str(student.student_id) if student.student_id else ''
            
            # Use set_user with keyword arguments directly
            self.connection.set_user(
                uid=int(uid),
                name=f"{student.first_name} {student.last_name}",
                privilege=int(0),
                password=str(''),
                group_id=str(''),
                user_id=str(user_id_val),
                card=int(0)
            )
            
            # Note: Physical fingerprint enrollment typically requires:
            # 1. User to place finger on device
            # 2. Device to capture fingerprint template
            # 3. Template to be saved to device
            # This usually requires device-specific SDK or manual enrollment on device
            # For now, we just ensure the user exists on the device
            
            return True
            
        except Exception as e:
            print(f"Error enrolling fingerprint for student {student.full_name}: {str(e)}")
            return False
        finally:
            self.disconnect()

