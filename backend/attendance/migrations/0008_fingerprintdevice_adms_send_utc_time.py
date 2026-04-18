# Generated manually for adms_send_utc_time field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0007_alter_fingerprintdevice_unique_together_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='fingerprintdevice',
            name='adms_send_utc_time',
            field=models.BooleanField(
                default=False,
                help_text=(
                    'If enabled, ADMS /iclock/getrequest <Time> is sent in UTC. '
                    'Use for firmware (e.g. some Uface models) that treats the value as UTC and applies '
                    'the device timezone on top — sending local time would shift the clock by that offset.'
                ),
            ),
        ),
    ]
