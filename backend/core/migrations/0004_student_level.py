# Generated manually for adding level field to Student model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_branch_student_branch'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='level',
            field=models.IntegerField(
                choices=[(1, '1'), (2, '2'), (3, '3'), (4, '4'), (5, '5'), (6, '6'), (7, '7'), (8, '8'), (9, '9'), (10, '10'), (11, '11'), (12, '12')],
                help_text='Level number from 1 to 12',
                null=True,
                blank=True,
            ),
        ),
    ]

