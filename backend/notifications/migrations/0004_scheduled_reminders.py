from django.db import migrations, models


def clear_daily_states(apps, schema_editor):
    """Старые записи привязаны к дате в ключе; теперь на каждый тип одна запись"""
    apps.get_model('notifications', 'SentNotification').objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('notifications', '0003_sentnotification_seen_titles'),
    ]

    operations = [
        migrations.RunPython(clear_daily_states, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='sentnotification',
            name='seen_titles',
        ),
        migrations.AddField(
            model_name='notificationsettings',
            name='last_reminder_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='последнее напоминание'),
        ),
    ]
