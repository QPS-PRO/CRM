from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Parent, Student, Branch, UserProfile, UserRole


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Branch
        fields = ['id', 'name', 'address', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudentBasicSerializer(serializers.ModelSerializer):
    """Basic student serializer for parent details"""
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Student
        fields = ['id', 'first_name', 'last_name', 'full_name', 'student_id']
        read_only_fields = ['id', 'first_name', 'last_name', 'full_name', 'student_id']


class ParentSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()
    students = StudentBasicSerializer(many=True, read_only=True)
    
    class Meta:
        model = Parent
        fields = ['id', 'first_name', 'last_name', 'full_name', 'email', 'phone_number', 'address', 'students', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudentSerializer(serializers.ModelSerializer):
    parents = ParentSerializer(many=True, read_only=True)
    branch = BranchSerializer(read_only=True)
    branch_id = serializers.IntegerField(write_only=True, help_text="Branch ID this student belongs to")
    parent_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="List of parent IDs to link to this student"
    )
    new_parents = serializers.ListField(
        child=serializers.DictField(),
        write_only=True,
        required=False,
        allow_empty=True,
        help_text="List of new parent objects to create and link to this student"
    )
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = Student
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'student_id', 'grade', 'level', 'class_name',
            'gender', 'date_of_birth', 'branch', 'branch_id', 'parents', 'parent_ids', 'new_parents',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def create(self, validated_data):
        parent_ids = validated_data.pop('parent_ids', [])
        new_parents_data = validated_data.pop('new_parents', [])
        branch_id = validated_data.pop('branch_id', None)
        
        # Set branch if provided
        if branch_id:
            from .models import Branch
            validated_data['branch'] = Branch.objects.get(id=branch_id)
        
        # Create the student first
        student = super().create(validated_data)
        
        # Link existing parents
        if parent_ids:
            parents = Parent.objects.filter(id__in=parent_ids)
            student.parents.add(*parents)
        
        # Create and link new parents
        for parent_data in new_parents_data:
            # Check if parent with same email already exists
            email = parent_data.get('email')
            if email:
                parent, _ = Parent.objects.get_or_create(
                    email=email,
                    defaults={
                        'first_name': parent_data.get('first_name', ''),
                        'last_name': parent_data.get('last_name', ''),
                        'phone_number': parent_data.get('phone_number', ''),
                        'address': parent_data.get('address', '')
                    }
                )
            else:
                # If no email, create new parent
                parent = Parent.objects.create(
                    first_name=parent_data.get('first_name', ''),
                    last_name=parent_data.get('last_name', ''),
                    email=parent_data.get('email', ''),
                    phone_number=parent_data.get('phone_number', ''),
                    address=parent_data.get('address', '')
                )
            student.parents.add(parent)
        
        return student
    
    def update(self, instance, validated_data):
        parent_ids = validated_data.pop('parent_ids', None)
        new_parents_data = validated_data.pop('new_parents', None)
        branch_id = validated_data.pop('branch_id', None)
        
        # Update branch if provided
        if branch_id is not None:
            from .models import Branch
            validated_data['branch'] = Branch.objects.get(id=branch_id)
        
        # Update student fields
        instance = super().update(instance, validated_data)
        
        # Update parents if provided
        if parent_ids is not None:
            instance.parents.clear()
            if parent_ids:
                parents = Parent.objects.filter(id__in=parent_ids)
                instance.parents.add(*parents)
        
        # Add new parents if provided
        if new_parents_data:
            for parent_data in new_parents_data:
                email = parent_data.get('email')
                if email:
                    parent, _ = Parent.objects.get_or_create(
                        email=email,
                        defaults={
                            'first_name': parent_data.get('first_name', ''),
                            'last_name': parent_data.get('last_name', ''),
                            'phone_number': parent_data.get('phone_number', ''),
                            'address': parent_data.get('address', '')
                        }
                    )
                else:
                    parent = Parent.objects.create(
                        first_name=parent_data.get('first_name', ''),
                        last_name=parent_data.get('last_name', ''),
                        email=parent_data.get('email', ''),
                        phone_number=parent_data.get('phone_number', ''),
                        address=parent_data.get('address', '')
                    )
                instance.parents.add(parent)
        
        return instance


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    role = serializers.CharField(source='profile.role', read_only=True)
    profile_id = serializers.IntegerField(source='profile.id', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_staff', 'is_superuser', 'role', 'profile_id', 'date_joined']
        read_only_fields = ['id', 'is_staff', 'is_superuser', 'date_joined']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users"""
    password = serializers.CharField(write_only=True, min_length=8)
    role = serializers.ChoiceField(choices=UserRole.choices, default=UserRole.VIEWER)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'role']
        read_only_fields = ['id']
    
    def create(self, validated_data):
        role = validated_data.pop('role')
        password = validated_data.pop('password')
        
        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=password
        )
        
        # Create profile with role
        UserProfile.objects.create(user=user, role=role)
        
        return user

