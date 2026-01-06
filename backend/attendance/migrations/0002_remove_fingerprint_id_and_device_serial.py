# Generated migration to remove fingerprint_id and device_serial fields

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0001_initial'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='attendance',
            name='fingerprint_id',
        ),
        migrations.RemoveField(
            model_name='attendance',
            name='device_serial',
        ),
    ]

