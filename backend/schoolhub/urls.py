"""
URL configuration for schoolhub project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from attendance.views import iclock_cdata

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/core/', include('core.urls')),
    path('api/attendance/', include('attendance.urls')),
    # ZKTeco ADMS endpoint for device push data
    path('iclock/cdata', iclock_cdata, name='iclock_cdata'),
    # ZKTeco ADMS endpoint for device time sync (getrequest)
    path('iclock/getrequest', iclock_cdata, name='iclock_getrequest'),
   
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

