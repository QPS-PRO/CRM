from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ParentViewSet, StudentViewSet, BranchViewSet,
    login_view, logout_view, current_user_view
)

router = DefaultRouter()
router.register(r'branches', BranchViewSet, basename='branch')
router.register(r'parents', ParentViewSet, basename='parent')
router.register(r'students', StudentViewSet, basename='student')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', login_view, name='login'),
    path('auth/logout/', logout_view, name='logout'),
    path('auth/current-user/', current_user_view, name='current-user'),
]

