from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from .models import Parent, Student, UserProfile


@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'phone_number', 'created_at']
    search_fields = ['first_name', 'last_name', 'email', 'phone_number']
    list_filter = ['created_at']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'student_id', 'grade', 'level', 'is_active', 'created_at']
    search_fields = ['first_name', 'last_name', 'student_id', 'parents__first_name', 'parents__last_name']
    list_filter = ['grade', 'level', 'gender', 'is_active', 'created_at']
    filter_horizontal = ['parents']  # Better UI for many-to-many
    readonly_fields = ['created_at', 'updated_at']


class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'


class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)


# Re-register UserAdmin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'role', 'created_at']
    search_fields = ['user__username', 'user__email']
    list_filter = ['role', 'created_at']

