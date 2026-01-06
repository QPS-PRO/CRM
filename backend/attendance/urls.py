from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FingerprintDeviceViewSet, AttendanceViewSet, SMSLogViewSet, AttendanceSettingsViewSet

router = DefaultRouter()
router.register(r'devices', FingerprintDeviceViewSet, basename='device')
router.register(r'records', AttendanceViewSet, basename='attendance')
router.register(r'sms-logs', SMSLogViewSet, basename='sms-log')
router.register(r'settings', AttendanceSettingsViewSet, basename='attendance-settings')

urlpatterns = [
    path('', include(router.urls)),
]

