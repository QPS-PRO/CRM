"""
Quick script to add a fingerprint device to the database
Usage: python manage.py shell < add_device.py
Or: python manage.py shell
    >>> exec(open('attendance/scripts/add_device.py').read())
"""
from attendance.models import FingerprintDevice

# Device configuration - UPDATE THESE VALUES
DEVICE_CONFIG = {
    'name': 'Primary Grade Device',
    'model': 'ZK702',
    'ip_address': '192.168.1.100',  # UPDATE THIS with your device IP
    'port': 4370,
    'grade_category': 'PRIMARY',
    'status': 'ACTIVE'
}

# Check if device already exists for this grade
existing = FingerprintDevice.objects.filter(grade_category='PRIMARY').first()
if existing:
    print(f"Device already exists for PRIMARY grade: {existing}")
    print(f"  ID: {existing.id}")
    print(f"  Name: {existing.name}")
    print(f"  IP: {existing.ip_address}")
    response = input("Do you want to update it? (yes/no): ")
    if response.lower() == 'yes':
        for key, value in DEVICE_CONFIG.items():
            setattr(existing, key, value)
        existing.save()
        print(f"Device updated: {existing}")
    else:
        print("Skipping device creation.")
else:
    # Create new device
    device = FingerprintDevice.objects.create(**DEVICE_CONFIG)
    print("Device created successfully!")
    print(f"  ID: {device.id}")
    print(f"  Name: {device.name}")
    print(f"  IP: {device.ip_address}")
    print(f"  Grade: {device.grade_category}")
    print("\nNext steps:")
    print(f"1. Test connection: GET /api/attendance/devices/{device.id}/test_connection/")
    print(f"2. Sync students: POST /api/attendance/devices/{device.id}/sync_students/")
    print(f"3. Sync attendance: POST /api/attendance/devices/{device.id}/sync_attendance/")

