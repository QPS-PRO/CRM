"""
WhatsApp and SMS notification services for attendance alerts
- WhatsApp: Meta WhatsApp Cloud API
- SMS: Mora SMS API
"""
from typing import List, Dict, Optional
import requests
import pytz
from django.conf import settings
from django.utils import timezone
from core.models import Student, Parent
from .models import Attendance, SMSLog


class WhatsAppNotificationService:
    """Service for sending WhatsApp messages to parents about student attendance using Meta WhatsApp Cloud API"""
    
    def __init__(self):
        self.enabled = getattr(settings, 'WHATSAPP_ENABLED', False)
        self.access_token = getattr(settings, 'WHATSAPP_ACCESS_TOKEN', None)
        self.phone_number_id = getattr(settings, 'WHATSAPP_PHONE_NUMBER_ID', None)
        self.api_version = getattr(settings, 'WHATSAPP_API_VERSION', None) or 'v22.0'
        # Option to use local format (without country code) if numbers are added to allowed list in local format
        self.use_local_format = getattr(settings, 'WHATSAPP_USE_LOCAL_FORMAT', False)
        
    def _format_phone_number(self, phone: str) -> str:
        """Format phone number for WhatsApp API
        
        Send the number exactly as stored in database (e.g., +201011170770)
        Only remove spaces and 'whatsapp:' prefix, keep + sign and all other characters
        """
        # Remove only spaces and 'whatsapp:' prefix, keep everything else including +
        phone_number = phone.replace(' ', '').replace('whatsapp:', '').strip()
        
        # Return the number exactly as stored (with + sign if present)
        return phone_number
    
    def _send_whatsapp_message(self, to: str, message: str) -> Dict:
        """Send WhatsApp message using Meta WhatsApp Cloud API"""
        if not self.enabled:
            return {'success': False, 'error': 'WhatsApp notifications are disabled'}
        
        if not all([self.access_token, self.phone_number_id]):
            return {'success': False, 'error': 'WhatsApp API credentials not configured'}
        
        try:
            # Format phone number to international format
            phone_number = self._format_phone_number(to)
            print(f"📱 Formatted phone number: {to} -> {phone_number}")
            
            # WhatsApp Cloud API endpoint
            url = f'https://graph.facebook.com/{self.api_version}/{self.phone_number_id}/messages'
            
            # Headers
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json'
            }
            
            # Request body for text message
            payload = {
                'messaging_product': 'whatsapp',
                'to': phone_number,
                'type': 'text',
                'text': {
                    'body': message
                }
            }
            
            # Send request
            response = requests.post(url, json=payload, headers=headers)
            
            # Log response for debugging
            print(f"📡 WhatsApp API Response Status: {response.status_code}")
            
            if response.status_code != 200:
                error_data = response.json() if response.content else {}
                error_msg = error_data.get('error', {}).get('message', f'HTTP {response.status_code}: {response.text}')
                print(f"✗ WhatsApp API Error: {error_msg}")
                return {'success': False, 'error': f'WhatsApp API error: {error_msg}'}
            
            response.raise_for_status()
            result = response.json()
            
            # Extract important info from response
            message_id = result.get('messages', [{}])[0].get('id') if result.get('messages') else None
            contacts = result.get('contacts', [])
            wa_id = contacts[0].get('wa_id') if contacts else None
            
            print(f"  WhatsApp API Success:")
            print(f"  Message ID: {message_id}")
            print(f"  Input number: {phone_number}")
            print(f"  WhatsApp ID (wa_id): {wa_id}")
            print(f"  Full response: {result}")
            
            # Check if wa_id matches our input - if not, there might be a format issue
            if wa_id and wa_id != phone_number:
                print(f"⚠ Warning: wa_id ({wa_id}) doesn't match input ({phone_number}) - format might be incorrect")
            
            return {
                'success': True,
                'message_id': message_id,
                'wa_id': wa_id,
                'status': 'sent',
                'input_number': phone_number
            }
        except requests.exceptions.RequestException as e:
            error_msg = str(e)
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get('error', {}).get('message', str(e))
                    print(f"✗ WhatsApp API Request Exception: {error_msg}")
                except (ValueError, KeyError):
                    error_msg = e.response.text or str(e)
                    print(f"✗ WhatsApp API Request Exception (raw): {error_msg}")
            else:
                print(f"✗ WhatsApp API Request Exception: {error_msg}")
            return {'success': False, 'error': f'WhatsApp API error: {error_msg}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _format_attendance_message(self, student: Student, attendance: Attendance) -> str:
        """Format the attendance notification message"""
        attendance_type = 'checked in' if attendance.attendance_type == 'CHECK_IN' else 'checked out'
        
        # Convert UTC timestamp to device's local timezone for display
        # The timestamp is stored in UTC in the database, but we want to show the same time
        # as displayed on the fingerprint device (local time)
        from .utils import get_device_timezone
        device_tz = get_device_timezone()
        
        # Ensure timestamp is timezone-aware (should be UTC from database)
        if timezone.is_naive(attendance.timestamp):
            timestamp = timezone.make_aware(attendance.timestamp)
        else:
            timestamp = attendance.timestamp
        
        # Convert from UTC to device's local timezone
        local_timestamp = timestamp.astimezone(device_tz)
        
        time_str = local_timestamp.strftime('%I:%M %p')
        date_str = local_timestamp.strftime('%B %d, %Y')
        
        message = "📚 *Qurtubah School*\n\n"
        message += f"Hello! Your child *{student.full_name}* has {attendance_type} at {time_str} on {date_str}.\n\n"
        message += "Thank you for your attention."
        
        return message
    
    def send_attendance_notification(self, attendance: Attendance) -> Dict:
        """Send attendance notification to all parents of a student"""
        if not self.enabled:
            print("⚠ WhatsApp notifications are disabled (WHATSAPP_ENABLED=False)")
            return {'success': False, 'sent': 0, 'failed': 0, 'errors': ['WhatsApp notifications are disabled']}
        
        if not all([self.access_token, self.phone_number_id]):
            print(f"⚠ WhatsApp credentials missing: access_token={'set' if self.access_token else 'missing'}, phone_number_id={'set' if self.phone_number_id else 'missing'}")
            return {'success': False, 'sent': 0, 'failed': 0, 'errors': ['WhatsApp API credentials not configured']}
        
        student = attendance.student
        parents = student.parents.all()
        
        if not parents.exists():
            print(f"⚠ No parents found for student {student.full_name}")
            return {
                'success': False,
                'sent': 0,
                'failed': 0,
                'errors': [f'No parents found for student {student.full_name}']
            }
        
        message = self._format_attendance_message(student, attendance)
        results = {
            'success': True,
            'sent': 0,
            'failed': 0,
            'errors': []
        }
        
        for parent in parents:
            # Check if parent has phone number
            if not parent.phone_number:
                error_msg = f'Parent {parent.full_name} has no phone number'
                print(f"⚠ {error_msg}")
                results['errors'].append(error_msg)
                results['failed'] += 1
                continue
            
            # Send WhatsApp message
            print(f"📤 Sending WhatsApp message to {parent.full_name} ({parent.phone_number})...")
            result = self._send_whatsapp_message(parent.phone_number, message)
            
            if result.get('success'):
                print(f"✓ Message sent successfully to {parent.full_name}")
                results['sent'] += 1
            else:
                error_msg = f'Failed to send to {parent.full_name}: {result.get("error", "Unknown error")}'
                print(f"✗ {error_msg}")
                results['failed'] += 1
                results['errors'].append(error_msg)
        
        return results
    
    def send_bulk_attendance_notifications(self, attendances: List[Attendance]) -> Dict:
        """Send notifications for multiple attendance records"""
        total_sent = 0
        total_failed = 0
        all_errors = []
        
        for attendance in attendances:
            result = self.send_attendance_notification(attendance)
            total_sent += result.get('sent', 0)
            total_failed += result.get('failed', 0)
            all_errors.extend(result.get('errors', []))
        
        return {
            'success': total_failed == 0,
            'total_sent': total_sent,
            'total_failed': total_failed,
            'errors': all_errors
        }


class SMSNotificationService:
    """Service for sending SMS messages to parents about student attendance using Mora SMS API"""
    
    # Mora SMS API error codes mapping
    ERROR_CODES = {
        100: 'Numbers received successfully',
        105: 'Insufficient balance',
        106: 'Sender name not available',
        107: 'Sender name is blocked',
        108: 'No valid numbers for sending',
        112: 'Message contains prohibited words',
        114: 'Account is suspended',
        115: 'Mobile number not activated',
        116: 'Email not activated',
        117: 'Empty message cannot be sent',
        118: 'Sender name is empty',
        119: 'No recipient number provided',
    }
    
    def __init__(self):
        self.enabled = getattr(settings, 'SMS_ENABLED', False)
        self.api_key = getattr(settings, 'SMS_API_KEY', None)
        self.username = getattr(settings, 'SMS_USERNAME', None)
        self.sender_name = getattr(settings, 'SMS_SENDER_NAME', None)
        self.sender_number = getattr(settings, 'SMS_SENDER_NUMBER', None)
        self.api_base_url = getattr(settings, 'SMS_API_BASE_URL', 'https://mora-sa.com/api/v1')
    
    def _format_phone_number(self, phone: str) -> str:
        """Format phone number for Mora SMS API
        
        Mora SMS API expects numbers in international format (e.g., 966501234567)
        Remove spaces, +, and other characters, keep only digits
        """
        # Remove spaces, +, and other non-digit characters
        phone_number = ''.join(filter(str.isdigit, phone.replace(' ', '').replace('+', '').strip()))
        return phone_number
    
    def _send_sms_message(self, to: str, message: str) -> Dict:
        """Send SMS message using Mora SMS API"""
        if not self.enabled:
            return {'success': False, 'error': 'SMS notifications are disabled'}
        
        if not all([self.api_key, self.username, self.sender_name]):
            return {'success': False, 'error': 'SMS API credentials not configured'}
        
        try:
            # Format phone number
            phone_number = self._format_phone_number(to)
            if not phone_number:
                return {'success': False, 'error': 'Invalid phone number'}
            
            # Mora SMS API endpoint
            url = f'{self.api_base_url}/sendsms'
            
            # Request parameters
            data = {
                'api_key': self.api_key,
                'username': self.username,
                'message': message,
                'sender': self.sender_name,
                'numbers': phone_number,
                'return': 'json'
            }
            
            # Send request
            response = requests.post(url, data=data, timeout=30)
            
            response.raise_for_status()
            
            # Try to parse JSON response
            try:
                result = response.json()
            except ValueError:
                raw_response = response.text
                return {
                    'success': False,
                    'error': f'Invalid JSON response from API: {raw_response[:200]}',
                    'status': 'FAILED',
                    'response': {'raw': raw_response}
                }
            
            # Mora API returns nested structure: {status: {...}, data: {code: 100, message: "...", ref_id: ...}}
            # Check for data.code first (this is the actual SMS API response code)
            data = result.get('data', {})
            response_code = data.get('code') if isinstance(data, dict) else None
            
            # Fallback to top-level code if data.code doesn't exist
            if response_code is None:
                response_code = result.get('code') or result.get('Code') or result.get('status_code')
            
            # Get the message from data.message if available
            api_message = data.get('message', '') if isinstance(data, dict) else ''
            if not api_message:
                api_message = result.get('message') or result.get('Message') or ''
            
            # Get ref_id for tracking
            ref_id = data.get('ref_id') if isinstance(data, dict) else None
            
            # Extract timestamp from API response if available (format: "2026-01-18T10:45:30Z")
            api_timestamp = None
            if isinstance(data, dict) and data.get('timestamp'):
                try:
                    timestamp_str = data.get('timestamp')
                    # Replace 'Z' with '+00:00' for ISO format parsing, or handle it directly
                    if timestamp_str.endswith('Z'):
                        timestamp_str = timestamp_str[:-1] + '+00:00'
                    # Parse ISO format timestamp and make it timezone-aware
                    from datetime import datetime as dt
                    parsed_timestamp = dt.fromisoformat(timestamp_str)
                    if timezone.is_naive(parsed_timestamp):
                        api_timestamp = timezone.make_aware(parsed_timestamp, pytz.UTC)
                    else:
                        api_timestamp = parsed_timestamp
                except (ValueError, AttributeError):
                    api_timestamp = None
            
            if response_code == 100:
                return {
                    'success': True,
                    'code': response_code,
                    'message': api_message or 'SMS sent successfully',
                    'ref_id': ref_id,
                    'status': 'SENT',
                    'timestamp': api_timestamp,  # Include extracted timestamp
                    'response': result
                }
            else:
                # Error - check error codes
                error_msg = self.ERROR_CODES.get(response_code, f'Unknown error code: {response_code}')
                if api_message:
                    error_msg = f'{error_msg}: {api_message}'
                return {
                    'success': False,
                    'error': error_msg,
                    'code': response_code,
                    'status': 'FAILED',
                    'response': result
                }
                
        except requests.exceptions.RequestException as e:
            error_msg = str(e)
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_data = e.response.json()
                    error_msg = error_data.get('message', str(e))
                except (ValueError, KeyError):
                    error_msg = e.response.text or str(e)
            return {'success': False, 'error': f'SMS API error: {error_msg}', 'status': 'FAILED'}
        except Exception as e:
            return {'success': False, 'error': str(e), 'status': 'FAILED'}
    
    def _format_attendance_message(self, student: Student, attendance: Attendance, parent: Parent = None) -> str:
        """Format the attendance notification SMS message using custom template from settings"""
        from .models import AttendanceSettings
        
        # Get settings template
        settings = AttendanceSettings.get_settings()
        template = settings.sms_template
        
        # Ensure timestamp is timezone-aware
        if timezone.is_naive(attendance.timestamp):
            timestamp = timezone.make_aware(attendance.timestamp)
        else:
            timestamp = attendance.timestamp
        
        # Format time directly from stored timestamp (no timezone conversion)
        time_str = timestamp.strftime('%I:%M %p')
        
        # Get parent name
        parent_name = parent.first_name if parent and parent.first_name else "Parent"
        
        # Replace template variables
        message = template.format(
            parent_name=parent_name,
            student_name=student.full_name,
            time_attended=time_str
        )
        
        return message
    
    def send_attendance_notification(self, attendance: Attendance) -> Dict:
        """Send attendance SMS notification to all parents of a student and log results"""
        student = attendance.student
        parents = student.parents.all()
        
        # Always create log entries for audit purposes, even if SMS is disabled
        results = {
            'success': True,
            'sent': 0,
            'failed': 0,
            'errors': [],
            'logs': []
        }
        
        if not self.enabled:
            # Create log entries for each parent indicating SMS is disabled
            for parent in parents:
                message = self._format_attendance_message(student, attendance, parent)
                sms_log = SMSLog.objects.create(
                    student=student,
                    parent=parent,
                    attendance=attendance,
                    phone_number=parent.phone_number or '',
                    message=message,
                    status='FAILED',
                    error_message='SMS notifications are disabled'
                )
                results['logs'].append(sms_log.id)
                results['failed'] += 1
            results['success'] = False
            results['errors'].append('SMS notifications are disabled')
            return results
        
        if not all([self.api_key, self.username, self.sender_name]):
            missing = []
            if not self.api_key:
                missing.append('SMS_API_KEY')
            if not self.username:
                missing.append('SMS_USERNAME')
            if not self.sender_name:
                missing.append('SMS_SENDER_NAME')
            error_msg = f'SMS API credentials not configured. Missing: {", ".join(missing)}'
            # Create log entries for each parent indicating credentials are missing
            for parent in parents:
                message = self._format_attendance_message(student, attendance, parent)
                sms_log = SMSLog.objects.create(
                    student=student,
                    parent=parent,
                    attendance=attendance,
                    phone_number=parent.phone_number or '',
                    message=message,
                    status='FAILED',
                    error_message=error_msg
                )
                results['logs'].append(sms_log.id)
                results['failed'] += 1
            results['success'] = False
            results['errors'].append(error_msg)
            return results
        
        if not parents.exists():
            error_msg = f'No parents found for student {student.full_name}'
            # No log entry created when no parents exist (parent field is required)
            results['success'] = False
            results['errors'].append(error_msg)
            return results
        
        for parent in parents:
            # Format personalized message for this parent
            message = self._format_attendance_message(student, attendance, parent)
            
            # Check if parent has phone number
            if not parent.phone_number:
                error_msg = f'Parent {parent.full_name} has no phone number'
                results['errors'].append(error_msg)
                results['failed'] += 1
                
                # Log failed attempt
                sms_log = SMSLog.objects.create(
                    student=student,
                    parent=parent,
                    attendance=attendance,
                    phone_number=parent.phone_number or '',
                    message=message,
                    status='FAILED',
                    error_message=error_msg
                )
                results['logs'].append(sms_log.id)
                continue
            
            # Send SMS message
            result = self._send_sms_message(parent.phone_number, message)
            
            # Determine status based on API response
            if result.get('success'):
                status = 'SENT'
                sent_at = result.get('timestamp') or timezone.now()
                results['sent'] += 1
            else:
                status = 'FAILED'
                sent_at = None
                error_msg = result.get('error', 'Unknown error')
                results['failed'] += 1
                results['errors'].append(f'Failed to send to {parent.full_name}: {error_msg}')
            
            # Create SMS log entry
            sms_log = SMSLog.objects.create(
                student=student,
                parent=parent,
                attendance=attendance,
                phone_number=parent.phone_number,
                message=message,
                status=status,
                api_response=result.get('response', {}),
                error_message=result.get('error', '') if not result.get('success') else '',
                message_id=str(result.get('ref_id', '')) if result.get('success') and result.get('ref_id') else '',
                sent_at=sent_at
            )
            results['logs'].append(sms_log.id)
        
        return results
    
    def send_bulk_attendance_notifications(self, attendances: List[Attendance]) -> Dict:
        """Send SMS notifications for multiple attendance records"""
        total_sent = 0
        total_failed = 0
        all_errors = []
        all_logs = []
        
        for attendance in attendances:
            result = self.send_attendance_notification(attendance)
            total_sent += result.get('sent', 0)
            total_failed += result.get('failed', 0)
            all_errors.extend(result.get('errors', []))
            all_logs.extend(result.get('logs', []))
        
        return {
            'success': total_failed == 0,
            'total_sent': total_sent,
            'total_failed': total_failed,
            'errors': all_errors,
            'logs': all_logs
        }