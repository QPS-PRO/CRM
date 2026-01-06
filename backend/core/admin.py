from django.contrib import admin
from .models import Parent, Student


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

