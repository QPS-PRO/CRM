from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from django.utils import timezone
from django.db.models import Q, Max, Min, Count
from django.db import models
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse, JsonResponse

import pytz
import traceback
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta

from core.models import Student, Branch
from .models import FingerprintDevice, Attendance, SMSLog, AttendanceSettings
from .serializers import (
    FingerprintDeviceSerializer,
    AttendanceSerializer,
    AttendanceCreateSerializer,
    SMSLogSerializer,
    AttendanceSettingsSerializer,
)
from .utils import get_device_timezone
from .services import ZKtecoDeviceService
from .notifications import SMSNotificationService


class FingerprintDeviceViewSet(viewsets.ModelViewSet):
    queryset = FingerprintDevice.objects.all()
    serializer_class = FingerprintDeviceSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["name", "ip_address", "serial_number", "grade_category"]
    filterset_fields = ["model", "status", "grade_category", "is_connected", "branch"]
    ordering_fields = ["created_at", "name", "grade_category"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        branch_id = self.request.query_params.get("branch")
        if branch_id:
            try:
                branch = Branch.objects.get(id=branch_id)
                queryset = queryset.filter(branch=branch)
            except Branch.DoesNotExist:
                pass
        return queryset

    @action(detail=False, methods=["get"])
    def by_grade(self, request):
        """Get device assigned to a specific grade and branch"""
        grade = request.query_params.get("grade")
        branch_id = request.query_params.get("branch_id")
        if grade:
            branch = None
            if branch_id:
                try:
                    branch = Branch.objects.get(id=branch_id)
                except Branch.DoesNotExist:
                    return Response(
                        {"error": f"Branch with ID {branch_id} not found"}, status=404
                    )
            device = FingerprintDevice.get_device_for_grade(grade, branch)
            if device:
                serializer = self.get_serializer(device)
                return Response(serializer.data)
            return Response(
                {
                    "error": f"No active device found for grade: {grade}"
                    + (f" and branch: {branch.name}" if branch else "")
                },
                status=404,
            )
        return Response({"error": "grade parameter is required"}, status=400)

    @action(detail=True, methods=["post"])
    def sync_attendance(self, request, pk=None):
        """Sync attendance records from device"""
        device = self.get_object()

        service = ZKtecoDeviceService(device)
        result = service.sync_attendance()

        if "error" in result:
            return Response(
                {
                    "message": f"Error syncing attendance from device {device.name}",
                    "error": result["error"],
                    "device_id": device.id,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {
                "message": f"Synced {result.get('total_synced', 0)} attendance records from device {device.name}",
                "device_id": device.id,
                "synced_count": result.get("total_synced", 0),
                "skipped_count": result.get("total_skipped", 0),
                "synced_records": result.get("synced", []),
                "skipped_records": result.get("skipped", []),
            }
        )

    @action(detail=True, methods=["get"])
    def test_connection(self, request, pk=None):
        """Test connection to the device"""
        device = self.get_object()
        service = ZKtecoDeviceService(device)

        # Test TCP connectivity first
        tcp_ok, tcp_msg = service.test_tcp_connection()

        # Try to connect (this will update is_connected in the database)
        is_connected = service.connect()

        # Refresh device from database to get updated is_connected status
        device.refresh_from_db()

        if is_connected:
            device_info = service.get_device_info()
            service.disconnect()
            return Response(
                {
                    "connected": True,
                    "device_id": device.id,
                    "is_connected": device.is_connected,
                    "device_info": device_info,
                    "tcp_test": {"reachable": tcp_ok, "message": tcp_msg},
                }
            )
        else:
            # Get device info for troubleshooting
            device_info = service.get_device_info()
            service.disconnect()

            return Response(
                {
                    "connected": False,
                    "device_id": device.id,
                    "is_connected": device.is_connected,
                    "ip_address": device.ip_address,
                    "port": device.port,
                    "tcp_test": {"reachable": tcp_ok, "message": tcp_msg},
                    "error": device_info.get("error", "Could not connect to device"),
                    "suggestions": device_info.get("suggestions", []),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def sync_students(self, request, pk=None):
        """Sync students from database to device"""
        device = self.get_object()
        service = ZKtecoDeviceService(device)
        result = service.sync_students_to_device()

        if result.get("success"):
            return Response(
                {
                    "message": f"Successfully synced students to device {device.name}",
                    "device_id": device.id,
                    "synced_count": result.get("synced_count", 0),
                    "updated_count": result.get("updated_count", 0),
                    "total_students": result.get("total_students", 0),
                    "errors": result.get("errors", []),
                }
            )
        else:
            return Response(
                {
                    "message": f"Error syncing students to device {device.name}",
                    "error": result.get("error", "Unknown error"),
                    "device_id": device.id,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("student", "device").all()
    serializer_class = AttendanceSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = ["student__first_name", "student__last_name", "student__student_id"]
    filterset_fields = ["attendance_type", "is_synced", "device", "student"]
    ordering_fields = ["timestamp", "created_at"]
    ordering = ["-timestamp"]

    def get_queryset(self):
        queryset = super().get_queryset()
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        branch_id = self.request.query_params.get("branch")
        grade = self.request.query_params.get("grade")
        level = self.request.query_params.get("level")
        class_name = self.request.query_params.get("class")
        status = self.request.query_params.get("status")
        device_id = self.request.query_params.get("device")

        if date_from:
            queryset = queryset.filter(timestamp__gte=date_from)
        if date_to:
            queryset = queryset.filter(timestamp__lte=date_to)
        if branch_id:
            try:
                branch = Branch.objects.get(id=branch_id)
                queryset = queryset.filter(student__branch=branch)
            except Branch.DoesNotExist:
                pass
        if grade:
            queryset = queryset.filter(student__grade=grade)
        if level:
            queryset = queryset.filter(student__level=level)
        if class_name:
            queryset = queryset.filter(student__class_name=class_name)
        if status:
            queryset = queryset.filter(status=status)
        if device_id:
            try:
                device = FingerprintDevice.objects.get(id=device_id)
                queryset = queryset.filter(device=device)
            except FingerprintDevice.DoesNotExist:
                pass

        return queryset

    @action(detail=False, methods=["post"])
    def create_from_device(self, request):
        """Create attendance record from device sync data"""
        serializer = AttendanceCreateSerializer(data=request.data)
        if serializer.is_valid():
            fingerprint_id = serializer.validated_data["fingerprint_id"]
            attendance_type = serializer.validated_data["attendance_type"]
            timestamp = serializer.validated_data["timestamp"]
            device_serial = serializer.validated_data.get("device_serial")

            # Ensure timestamp is UTC-aware without timezone conversion
            if timezone.is_naive(timestamp):
                timestamp = timezone.make_aware(timestamp, pytz.UTC)
            else:
                timestamp = timestamp.astimezone(pytz.UTC)

            try:
                student = Student.objects.get(id=fingerprint_id, is_active=True)
            except Student.DoesNotExist:
                return Response(
                    {"error": f"Student with ID {fingerprint_id} not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            device = None
            if device_serial:
                try:
                    device = FingerprintDevice.objects.get(
                        serial_number=device_serial, status="ACTIVE"
                    )
                except FingerprintDevice.DoesNotExist:
                    pass

            if not device:
                device = FingerprintDevice.get_device_for_grade(
                    student.grade, student.branch, student.level
                )

            attendance = Attendance.create_attendance(
                student=student,
                attendance_type=attendance_type,
                timestamp=timestamp,
                device=device,
            )

            try:
                sms_service = SMSNotificationService()
                sms_service.send_attendance_notification(attendance)
            except Exception as e:
                print(f"✗ Error sending SMS notification: {str(e)}")
                print(f"  Traceback: {traceback.format_exc()}")

            return Response(
                AttendanceSerializer(attendance).data, status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def student_attendance(self, request):
        """Get attendance records for a specific student"""
        student_id = request.query_params.get("student_id")
        if not student_id:
            return Response({"error": "student_id parameter is required"}, status=400)

        try:
            student = Student.objects.get(id=student_id)
            attendances = self.queryset.filter(student=student)
            serializer = self.get_serializer(attendances, many=True)
            return Response(serializer.data)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)

    @action(detail=False, methods=["get"])
    def today_summary(self, request):
        """Get today's attendance summary - counts unique students, not records"""
        # Get today's date in device timezone for consistency
        device_tz = get_device_timezone()
        today_utc = timezone.now()
        today_local = today_utc.astimezone(device_tz).date()

        # Convert today's date range to UTC datetime range for database query
        # Start of today in device timezone
        start_of_day_local = datetime.combine(today_local, datetime.min.time())
        start_of_day_local_tz = device_tz.localize(start_of_day_local)
        start_of_day_utc = start_of_day_local_tz.astimezone(pytz.UTC)

        # End of today in device timezone
        end_of_day_local = datetime.combine(today_local, datetime.max.time())
        end_of_day_local_tz = device_tz.localize(end_of_day_local)
        end_of_day_utc = end_of_day_local_tz.astimezone(pytz.UTC)

        # Filter by branch if provided
        branch_id = request.query_params.get("branch_id")
        branch = None
        if branch_id:
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                pass

        # Get attendance records for today (filter by UTC timestamp range)
        today_attendances = self.queryset.filter(
            timestamp__gte=start_of_day_utc, timestamp__lte=end_of_day_utc
        )
        if branch:
            today_attendances = today_attendances.filter(student__branch=branch)

        # Get all CHECK_IN records for today
        today_check_ins = today_attendances.filter(attendance_type="CHECK_IN")

        # For each student, determine their best status (ATTENDED > LATE > ABSENT)
        # Status priority: ATTENDED = 3, LATE = 2, ABSENT = 1, None = 0
        student_status_map = {}
        for attendance in today_check_ins.select_related("student"):
            student_id = attendance.student_id
            status = attendance.status

            # Status priority: ATTENDED > LATE > ABSENT
            if status == "ATTENDED":
                priority = 3
            elif status == "LATE":
                priority = 2
            elif status == "ABSENT":
                priority = 1
            else:
                priority = 0

            # Keep the highest priority status for each student
            if (
                student_id not in student_status_map
                or priority > student_status_map[student_id]["priority"]
            ):
                student_status_map[student_id] = {
                    "status": status,
                    "priority": priority,
                }

        # Count students by their best status
        attended_count = sum(
            1 for v in student_status_map.values() if v["status"] == "ATTENDED"
        )
        late_count = sum(
            1 for v in student_status_map.values() if v["status"] == "LATE"
        )

        # Count unique students who checked in today (regardless of status)
        unique_check_in_students = len(student_status_map)

        # Count check-outs (can be multiple per student, so count records)
        check_outs_count = today_attendances.filter(attendance_type="CHECK_OUT").count()

        return Response(
            {
                "date": today_local.isoformat(),
                "check_ins": unique_check_in_students,  # Unique students who checked in
                "check_outs": check_outs_count,
                "attended": attended_count,  # Unique students with ATTENDED as best status
                "late": late_count,  # Unique students with LATE as best status (no ATTENDED)
                "total_records": today_attendances.count(),
            }
        )

    @action(detail=False, methods=["get"])
    def attendance_overview(self, request):
        """Get attendance overview data for chart with time period support"""

        # Get time period filter
        period = request.query_params.get("period", "week")  # week is now default

        # Check if date_from and date_to are provided (for week navigation)
        date_from_param = request.query_params.get("date_from")
        date_to_param = request.query_params.get("date_to")
        week_offset = request.query_params.get("week_offset", "0")

        # Calculate date range based on period
        if date_from_param and date_to_param:
            # Use provided date range
            try:
                start_date = datetime.strptime(date_from_param, "%Y-%m-%d").date()
                end_date = datetime.strptime(date_to_param, "%Y-%m-%d").date()
                num_days = (end_date - start_date).days + 1
            except ValueError:
                end_date = timezone.now().date()
                start_date = end_date - timedelta(days=6)
                num_days = 7
        elif period == "week":
            # Calculate week based on offset
            try:
                week_offset_int = int(week_offset)
            except (ValueError, TypeError):
                week_offset_int = 0

            end_date = timezone.now().date()
            # Calculate the start of the week (Sunday)
            # weekday() returns 0=Monday, 6=Sunday
            # To get days since Sunday: (weekday() + 1) % 7
            # This gives: Sunday=0, Monday=1, Tuesday=2, ..., Saturday=6
            days_since_sunday = (end_date.weekday() + 1) % 7

            # Get the start of the current week (Sunday)
            current_week_start = end_date - timedelta(days=days_since_sunday)
            # Adjust for week offset
            target_week_start = current_week_start - timedelta(weeks=week_offset_int)
            target_week_end = target_week_start + timedelta(days=6)

            start_date = target_week_start
            end_date = target_week_end
            num_days = 7
        elif period == "today":
            end_date = timezone.now().date()
            start_date = end_date
            num_days = 1
        else:  # default to week
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=6)
            num_days = 7

        # Filter by branch if provided
        branch_id = request.query_params.get("branch_id")
        branch = None
        if branch_id:
            try:
                branch = Branch.objects.get(id=branch_id)
            except Branch.DoesNotExist:
                pass

        # Get base queryset (will filter by date range in loop using UTC datetime ranges)
        queryset = self.queryset.all()
        if branch:
            queryset = queryset.filter(student__branch=branch)

        # Get total students count (filtered by branch if applicable)
        total_students_query = Student.objects.filter(is_active=True)
        if branch:
            total_students_query = total_students_query.filter(branch=branch)
        total_students_count = total_students_query.count()

        # Get daily breakdown
        daily_data = []
        device_tz = get_device_timezone()

        for i in range(num_days):
            date = start_date + timedelta(days=i)

            # Convert date to UTC datetime range for database query
            start_of_day_local = datetime.combine(date, datetime.min.time())
            start_of_day_local_tz = device_tz.localize(start_of_day_local)
            start_of_day_utc = start_of_day_local_tz.astimezone(pytz.UTC)

            end_of_day_local = datetime.combine(date, datetime.max.time())
            end_of_day_local_tz = device_tz.localize(end_of_day_local)
            end_of_day_utc = end_of_day_local_tz.astimezone(pytz.UTC)

            # Filter by UTC timestamp range for this day
            day_attendances = queryset.filter(
                timestamp__gte=start_of_day_utc, timestamp__lte=end_of_day_utc
            )

            # Get all CHECK_IN records for this day
            day_check_ins = day_attendances.filter(attendance_type="CHECK_IN")

            # For each student, determine their best status (ATTENDED > LATE > ABSENT)
            # Status priority: ATTENDED = 3, LATE = 2, ABSENT = 1, None = 0
            student_status_map = {}
            for attendance in day_check_ins.select_related("student"):
                student_id = attendance.student_id
                status = attendance.status

                # Status priority: ATTENDED > LATE > ABSENT
                if status == "ATTENDED":
                    priority = 3
                elif status == "LATE":
                    priority = 2
                elif status == "ABSENT":
                    priority = 1
                else:
                    priority = 0

                # Keep the highest priority status for each student
                if (
                    student_id not in student_status_map
                    or priority > student_status_map[student_id]["priority"]
                ):
                    student_status_map[student_id] = {
                        "status": status,
                        "priority": priority,
                    }

            # Count students by their best status
            students_attended = sum(
                1 for v in student_status_map.values() if v["status"] == "ATTENDED"
            )
            students_late = sum(
                1 for v in student_status_map.values() if v["status"] == "LATE"
            )

            # Present = students with ATTENDED or LATE status (best status)
            present = students_attended + students_late

            # Get unique students who checked in (for check_ins count)
            students_checked_in = len(student_status_map)
            check_ins = students_checked_in
            check_outs = day_attendances.filter(attendance_type="CHECK_OUT").count()

            # Calculate absent (students who didn't attend - no ATTENDED or LATE status)
            absent = max(0, total_students_count - present)

            # Format date label based on period
            DATE_FORMAT = "%d/%m"
            if period in ["year", "month", "week"]:
                date_label = date.strftime(DATE_FORMAT)
            else:
                date_label = str(date.day)

            daily_data.append(
                {
                    "date": date.isoformat(),
                    "day": date.day,
                    "date_label": date_label,
                    "present": present,
                    "absent": absent,
                    "check_ins": check_ins,
                    "check_outs": check_outs,
                    "total_students": total_students_count,
                }
            )

        # Calculate summary statistics for the period
        total_present = sum(d["present"] for d in daily_data)
        total_absent = sum(d["absent"] for d in daily_data)
        avg_present = total_present / num_days if num_days > 0 else 0
        avg_absent = total_absent / num_days if num_days > 0 else 0
        attendance_rate = (
            (avg_present / total_students_count * 100)
            if total_students_count > 0
            else 0
        )

        return Response(
            {
                "period": period,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "total_students": total_students_count,
                "daily_data": daily_data,
                "summary": {
                    "total_present": total_present,
                    "total_absent": total_absent,
                    "avg_present": round(avg_present, 1),
                    "avg_absent": round(avg_absent, 1),
                    "attendance_rate": round(attendance_rate, 1),
                },
            }
        )

    @action(detail=False, methods=["get"])
    def attendance_report(self, request):
        """Get attendance report with student attendance status"""
        # Get filter parameters
        branch_id = request.query_params.get("branch_id")
        grade = request.query_params.get("grade")
        level = request.query_params.get("level")
        class_name = request.query_params.get("class")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        # Default to today if no date range provided
        today = timezone.now().date()
        if not date_from:
            date_from = today.isoformat()
        if not date_to:
            date_to = today.isoformat()

        # Build student query
        students_query = Student.objects.filter(is_active=True)

        if branch_id:
            try:
                branch = Branch.objects.get(id=branch_id)
                students_query = students_query.filter(branch=branch)
            except Branch.DoesNotExist:
                pass

        if grade:
            students_query = students_query.filter(grade=grade)

        if level:
            students_query = students_query.filter(level=level)

        if class_name:
            students_query = students_query.filter(class_name=class_name)

        # Get all matching students
        students = students_query.select_related("branch").order_by(
            "first_name", "last_name"
        )

        # Get attendance records for the date range
        attendance_query = self.queryset.filter(
            timestamp__date__gte=date_from, timestamp__date__lte=date_to
        )

        if branch_id:
            try:
                branch = Branch.objects.get(id=branch_id)
                attendance_query = attendance_query.filter(student__branch=branch)
            except Branch.DoesNotExist:
                pass

        if grade:
            attendance_query = attendance_query.filter(student__grade=grade)

        if level:
            attendance_query = attendance_query.filter(student__level=level)

        if class_name:
            attendance_query = attendance_query.filter(student__class_name=class_name)

        # Build report data
        report_data = []
        for student in students:
            # Get attendance records for this student in the date range
            student_attendances = attendance_query.filter(student=student)

            # Check if student has any check-ins in the date range
            check_ins = student_attendances.filter(attendance_type="CHECK_IN")
            has_attended = check_ins.exists()

            # Determine the best status for this student (ATTENDED > LATE > ABSENT)
            # Status priority: ATTENDED = 3, LATE = 2, ABSENT = 1, None = 0
            best_status = "ABSENT"
            best_priority = 0

            if has_attended:
                for attendance in check_ins:
                    status = attendance.status
                    if status == "ATTENDED":
                        priority = 3
                    elif status == "LATE":
                        priority = 2
                    elif status == "ABSENT":
                        priority = 1
                    else:
                        priority = 0

                    # Keep the highest priority status
                    if priority > best_priority:
                        best_priority = priority
                        best_status = status if status else "ABSENT"

            # Map status to display value
            if best_status == "ATTENDED":
                attendance_status_display = "Present"
            elif best_status == "LATE":
                attendance_status_display = "Late"
            else:
                attendance_status_display = "Absent"

            # Get first check-in and last check-out if any
            first_check_in = check_ins.order_by("timestamp").first()
            last_check_out = (
                student_attendances.filter(attendance_type="CHECK_OUT")
                .order_by("-timestamp")
                .first()
            )

            # Count total check-ins and check-outs
            check_in_count = check_ins.count()
            check_out_count = student_attendances.filter(
                attendance_type="CHECK_OUT"
            ).count()

           # Get timestamps and format them in device timezone
            first_check_in_timestamp = None
            if first_check_in:
                # Convert timestamp from UTC to device timezone for display
                raw_timestamp = first_check_in.timestamp
                
                # Ensure timestamp is timezone-aware
                if timezone.is_naive(raw_timestamp):
                    raw_timestamp = timezone.make_aware(raw_timestamp, pytz.UTC)
                elif raw_timestamp.tzinfo != pytz.UTC:
                    # If it's in a different timezone, convert to UTC first
                    raw_timestamp = raw_timestamp.astimezone(pytz.UTC)
                
                # Convert from UTC to device timezone
                device_tz = get_device_timezone()
                device_timestamp = raw_timestamp.astimezone(device_tz)
                
                # Return ISO format string in device timezone
                first_check_in_timestamp = device_timestamp.isoformat()
           
           last_check_out_timestamp = None
            if last_check_out:
                # Convert timestamp from UTC to device timezone for display
                raw_timestamp = last_check_out.timestamp
                
                # Ensure timestamp is timezone-aware
                if timezone.is_naive(raw_timestamp):
                    raw_timestamp = timezone.make_aware(raw_timestamp, pytz.UTC)
                elif raw_timestamp.tzinfo != pytz.UTC:
                    # If it's in a different timezone, convert to UTC first
                    raw_timestamp = raw_timestamp.astimezone(pytz.UTC)
                
                # Convert from UTC to device timezone
                device_tz = get_device_timezone()
                device_timestamp = raw_timestamp.astimezone(device_tz)
                
                # Return ISO format string in device timezone
                last_check_out_timestamp = device_timestamp.isoformat()

            report_data.append(
                {
                    "student_id": student.id,
                    "student_name": student.full_name,
                    "student_id_number": student.student_id,
                    "grade": student.grade,
                    "level": student.level,
                    "class_name": student.class_name or "",
                    "branch": {"id": student.branch.id, "name": student.branch.name},
                    "has_attended": has_attended,
                    "attendance_status": attendance_status_display,
                    "attendance_status_code": best_status,
                    "first_check_in": first_check_in_timestamp,
                    "last_check_out": last_check_out_timestamp,
                    "check_in_count": check_in_count,
                    "check_out_count": check_out_count,
                    "total_attendance_days": check_in_count,
                }
            )

        # Calculate summary statistics
        total_students = len(report_data)
        present_count = sum(
            1 for item in report_data if item["attendance_status_code"] == "ATTENDED"
        )
        late_count = sum(
            1 for item in report_data if item["attendance_status_code"] == "LATE"
        )
        absent_count = sum(
            1 for item in report_data if item["attendance_status_code"] == "ABSENT"
        )

        return Response(
            {
                "date_from": date_from,
                "date_to": date_to,
                "filters": {
                    "branch_id": branch_id,
                    "grade": grade,
                    "level": level,
                    "class": class_name,
                },
                "summary": {
                    "total_students": total_students,
                    "present": present_count,
                    "late": late_count,
                    "absent": absent_count,
                    "attendance_rate": round((present_count / total_students * 100), 2)
                    if total_students > 0
                    else 0,
                },
                "students": report_data,
            }
        )


class SMSLogViewSet(viewsets.ModelViewSet):
    """ViewSet for viewing and managing SMS logs"""

    queryset = SMSLog.objects.select_related("student", "parent", "attendance").all()
    serializer_class = SMSLogSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    search_fields = [
        "student__first_name",
        "student__last_name",
        "student__student_id",
        "parent__first_name",
        "parent__last_name",
        "phone_number",
    ]
    filterset_fields = ["status", "student", "parent", "attendance"]
    ordering_fields = ["created_at", "sent_at", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = super().get_queryset()
        # Filter by date range if provided
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        student_id = self.request.query_params.get("student_id")
        branch_id = self.request.query_params.get("branch")

        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            # Add 1 day to include the entire end date
            try:
                end_date = datetime.strptime(date_to, "%Y-%m-%d").date()
                end_date_plus_one = end_date + timedelta(days=1)
                queryset = queryset.filter(created_at__date__lt=end_date_plus_one)
            except ValueError:
                # If date format is invalid, fall back to original behavior
                queryset = queryset.filter(created_at__lte=date_to)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if branch_id:
            try:
                branch = Branch.objects.get(id=branch_id)
                queryset = queryset.filter(student__branch=branch)
            except Branch.DoesNotExist:
                pass

        return queryset

    @action(detail=False, methods=["get"])
    def statistics(self, request):
        """Get SMS statistics"""
        queryset = self.get_queryset()

        total = queryset.count()
        sent = queryset.filter(status="SENT").count()
        failed = queryset.filter(status="FAILED").count()
        pending = queryset.filter(status="PENDING").count()

        return Response(
            {
                "total": total,
                "sent": sent,
                "failed": failed,
                "pending": pending,
                "success_rate": round((sent / total * 100), 2) if total > 0 else 0,
            }
        )


class AttendanceSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing attendance settings (singleton pattern)"""

    queryset = AttendanceSettings.objects.all()
    serializer_class = AttendanceSettingsSerializer

    def get_object(self):
        """Always return the single settings instance"""
        return AttendanceSettings.get_settings()

    def list(self, request, *args, **kwargs):
        """Return the single settings instance as a list"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response([serializer.data])

    def retrieve(self, request, *args, **kwargs):
        """Return the single settings instance"""
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Update existing settings or create if doesn't exist"""
        instance = AttendanceSettings.get_settings()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        """Update the single settings instance"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """Partially update the single settings instance"""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


@csrf_exempt
@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def iclock_cdata(request):
    """
    ZKTeco ADMS endpoint for receiving attendance data from devices.

    This endpoint handles:
    - GET requests: Device handshake/initialization
    - POST requests: Attendance data push from device

    Expected URL format: /iclock/cdata?SN=<serial_number>&table=<table_name>&OpStamp=<timestamp>
    """
    serial_number = request.GET.get("SN", "").strip()
    table = request.GET.get("table", "").strip()
    op_stamp = request.GET.get("OpStamp", "").strip()

    if not serial_number:
        return HttpResponse("SN parameter is required", status=400)

    try:
        device = FingerprintDevice.objects.get(
            serial_number=serial_number, status="ACTIVE"
        )
    except FingerprintDevice.DoesNotExist:
        return HttpResponse("OK", status=200)

    if request.method == "GET":
        request_path = request.path
        
        if 'getrequest' in request_path.lower():
            device_tz = get_device_timezone()
            server_now = timezone.now()
            server_local_time = server_now.astimezone(device_tz)
            
            info_param = request.GET.get("INFO", "")
            device_model = None
            device_version = None
            
            if info_param:
                try:
                    parts = info_param.split(",")
                    if len(parts) > 0 and "Ver" in parts[0]:
                        device_version = parts[0].strip()
                    if len(parts) > 1:
                        device_model = parts[1].strip() if parts[1].strip() else None
                except Exception:
                    pass
            
            time_formats = {
                'standard': server_local_time.strftime("%Y-%m-%d %H:%M:%S"),
                'iso': server_local_time.strftime("%Y-%m-%dT%H:%M:%S"),
                'compact': server_local_time.strftime("%Y%m%d%H%M%S"),
                'unix': str(int(server_local_time.timestamp())),
            }
            
            format_param = request.GET.get("format", "").lower()
            cmd_param = request.GET.get("cmd", "").lower()
            
            use_format = 'standard'
            use_cmd = 'GetTime'
            
            if format_param in time_formats:
                use_format = format_param
            
            if cmd_param in ['gettime', 'settime']:
                use_cmd = cmd_param.capitalize()
            
            time_str = time_formats[use_format]
            
            response_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
                        <Response>
                            <Cmd>{use_cmd}</Cmd>
                            <Status>OK</Status>
                            <Time>{time_str}</Time>
                        </Response>"""
            
            response = HttpResponse(response_xml, content_type="application/xml", status=200)
            
            response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            response['Content-Length'] = str(len(response_xml))
            
            return response
        else:
            response_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
                        <Response>
                            <Cmd>GetOptions</Cmd>
                            <Status>OK</Status>
                            <Options>
                                <PushVersion>2.4.1</PushVersion>
                                <Language>69</Language>
                            </Options>
                        </Response>"""
            return HttpResponse(response_xml, content_type="application/xml", status=200)

    elif request.method == "POST":
        try:
            body = request.body.decode("utf-8") if request.body else ""

            attendance_records = []
            if body:
                try:
                    root = ET.fromstring(body)
                    for record in root.findall(".//Record"):
                        user_id = None
                        timestamp_str = None
                        punch = "0"

                        pin_elem = (
                            record.find("PIN")
                            or record.find("pin")
                            or record.find("Pin")
                        )
                        if pin_elem is not None:
                            user_id = pin_elem.text

                        datetime_elem = (
                            record.find("DateTime")
                            or record.find("datetime")
                            or record.find("DateTime")
                            or record.find("time")
                        )
                        if datetime_elem is not None:
                            timestamp_str = datetime_elem.text

                        status_elem = (
                            record.find("Status")
                            or record.find("status")
                            or record.find("punch")
                            or record.find("Punch")
                        )
                        if status_elem is not None:
                            punch = status_elem.text or "0"

                        if user_id and timestamp_str:
                            attendance_records.append(
                                {
                                    "user_id": user_id,
                                    "timestamp_str": timestamp_str,
                                    "punch": punch,
                                }
                            )

                    if not attendance_records:
                        pin_elem = root.find("PIN") or root.find("pin")
                        datetime_elem = root.find("DateTime") or root.find("datetime")
                        status_elem = root.find("Status") or root.find("status")

                        if pin_elem is not None and datetime_elem is not None:
                            user_id = pin_elem.text
                            timestamp_str = datetime_elem.text
                            punch = status_elem.text if status_elem is not None else "0"
                            attendance_records.append(
                                {
                                    "user_id": user_id,
                                    "timestamp_str": timestamp_str,
                                    "punch": punch,
                                }
                            )

                except ET.ParseError:
                    pass

            if not attendance_records and body:
                lines = body.strip().split('\n')
                
                for line in lines:
                    line = line.strip()
                    if not line:
                        continue
                    
                    parts = line.split()
                    
                    if len(parts) >= 2:
                        user_id = parts[0]
                        
                        if len(parts) >= 3:
                            if (len(parts[1]) == 10 and ('-' in parts[1] or '/' in parts[1])) and ':' in parts[2]:
                                timestamp_str = f"{parts[1]} {parts[2]}"
                                punch = parts[3] if len(parts) > 3 else "0"
                            else:
                                timestamp_str = f"{parts[1]} {parts[2]}"
                                punch = parts[3] if len(parts) > 3 else "0"
                        elif len(parts) == 2:
                            timestamp_str = parts[1]
                            punch = "0"
                        else:
                            continue
                        
                        timestamp_valid = False
                        for fmt in ["%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S.%f"]:
                            try:
                                datetime.strptime(timestamp_str, fmt)
                                timestamp_valid = True
                                break
                            except ValueError:
                                continue
                        
                        if timestamp_valid:
                            attendance_records.append({
                                "user_id": user_id,
                                "timestamp_str": timestamp_str,
                                "punch": punch,
                            })

            processed_count = 0
            errors = []

            for record in attendance_records:
                try:
                    user_id = record["user_id"]
                    timestamp_str = record["timestamp_str"]
                    punch = int(record["punch"]) if record["punch"].isdigit() else 0

                    student = None
                    try:
                        student = Student.objects.get(
                            student_id=str(user_id), is_active=True
                        )
                    except Student.DoesNotExist:
                        try:
                            user_id_int = int(user_id)
                            student = Student.objects.get(
                                id=user_id_int, is_active=True
                            )
                        except (ValueError, Student.DoesNotExist):
                            pass

                    if not student:
                        errors.append(f"Student not found for user_id: {user_id}")
                        continue

                    try:
                        timestamp = datetime.strptime(
                            timestamp_str, "%Y-%m-%d %H:%M:%S"
                        )
                    except ValueError:
                        try:
                            timestamp = datetime.strptime(
                                timestamp_str, "%Y/%m/%d %H:%M:%S"
                            )
                        except ValueError:
                            try:
                                timestamp = datetime.strptime(
                                    timestamp_str, "%Y-%m-%dT%H:%M:%S"
                                )
                            except ValueError:
                                timestamp = timezone.now()
                                errors.append(
                                    f"Could not parse timestamp: {timestamp_str}, using current time"
                                )
                    
                    if timezone.is_naive(timestamp):
                        timestamp = timezone.make_aware(timestamp, pytz.UTC)
                    else:
                        timestamp = timestamp.astimezone(pytz.UTC)

                    attendance_type = "CHECK_IN"

                    time_tolerance = timedelta(minutes=1)
                    existing = Attendance.objects.filter(
                        student=student,
                        timestamp__gte=timestamp - time_tolerance,
                        timestamp__lte=timestamp + time_tolerance,
                        attendance_type=attendance_type,
                    ).first()

                    if not existing:
                        attendance = Attendance.create_attendance(
                            student=student,
                            attendance_type=attendance_type,
                            timestamp=timestamp,
                            device=device,
                        )

                        try:
                            sms_service = SMSNotificationService()
                            sms_result = sms_service.send_attendance_notification(attendance)
                            
                            if not sms_result.get('success') and sms_result.get('errors'):
                                errors.extend([f"SMS: {err}" for err in sms_result.get('errors', [])])
                        except Exception as e:
                            errors.append(f"Error sending SMS notification: {str(e)}")

                        processed_count += 1

                except Exception as e:
                    errors.append(f"Error processing record: {str(e)}")
                    continue

            device.last_sync = timezone.now()
            device.save(update_fields=["last_sync"])

            response_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
                            <Response>
                                <Cmd>Data</Cmd>
                                <Status>OK</Status>
                                <Processed>{processed_count}</Processed>
                                <Errors>{len(errors)}</Errors>
                            </Response>"""

            return HttpResponse(
                response_xml, content_type="application/xml", status=200
            )

        except Exception as e:
            error_msg = f"Error processing attendance data from device {serial_number}: {str(e)}"

            response_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
                            <Response>
                                <Cmd>Data</Cmd>
                                <Status>ERROR</Status>
                                <Message>{error_msg}</Message>
                            </Response>"""
            return HttpResponse(
                response_xml, content_type="application/xml", status=200
            )

    return HttpResponse("Method not allowed", status=405)
