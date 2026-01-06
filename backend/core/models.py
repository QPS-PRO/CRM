from django.db import models


class Grade(models.TextChoices):
    """Student grade/category choices"""
    PRIMARY = 'PRIMARY', 'Primary'
    SECONDARY = 'SECONDARY', 'Secondary'
    HIGH_SCHOOL = 'HIGH_SCHOOL', 'High School'
    KINDERGARTEN = 'KINDERGARTEN', 'Kindergarten'


class Branch(models.Model):
    """Branch model for school locations"""
    name = models.CharField(max_length=200, help_text="Branch name")
    address = models.TextField(help_text="Branch address")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'Branches'

    def __str__(self):
        return self.name


class Parent(models.Model):
    """Parent model"""
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=15, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Student(models.Model):
    """Student model"""
    GENDER_CHOICES = [
        ('M', 'Male'),
        ('F', 'Female'),
    ]

    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    student_id = models.CharField(max_length=50, unique=True, help_text="Unique student identifier")
    grade = models.CharField(max_length=20, choices=Grade.choices)
    level = models.IntegerField(choices=[(i, str(i)) for i in range(1, 13)], help_text="Level number from 1 to 12", null=True, blank=True)
    class_name = models.CharField(max_length=2, blank=True, help_text="Class identifier (e.g., A, B, 1, 2)")
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    date_of_birth = models.DateField()
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='students', help_text="Branch this student belongs to")
    parents = models.ManyToManyField(Parent, related_name='students', blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.student_id})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

