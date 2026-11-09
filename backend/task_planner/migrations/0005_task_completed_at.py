from django.db import migrations, models
from django.db.models import F

COMPLETED = 2


def fill_completed_at(apps, schema_editor):
    """Точной даты у старых задач нет: ближайшая к ней — последнее изменение"""
    apps.get_model('task_planner', 'Task').objects.filter(status=COMPLETED).update(
        completed_at=F('updated_at'))


class Migration(migrations.Migration):

    dependencies = [
        ('task_planner', '0004_task_subtasks'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='completed_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='когда завершена'),
        ),
        migrations.RunPython(fill_completed_at, migrations.RunPython.noop),
    ]
