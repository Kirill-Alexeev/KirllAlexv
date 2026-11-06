import uuid

from django.db import migrations, models


def generate_invite_codes(apps, schema_editor):
    Workspace = apps.get_model('task_planner', 'Workspace')
    for workspace in Workspace.objects.filter(invite_code__isnull=True):
        workspace.invite_code = uuid.uuid4()
        workspace.save(update_fields=['invite_code'])


class Migration(migrations.Migration):

    dependencies = [
        ('task_planner', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='workspace',
            name='invite_code',
            field=models.UUIDField(
                null=True,
                editable=False,
                verbose_name='код приглашения',
            ),
        ),
        migrations.RunPython(generate_invite_codes, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='workspace',
            name='invite_code',
            field=models.UUIDField(
                default=uuid.uuid4,
                editable=False,
                unique=True,
                verbose_name='код приглашения',
            ),
        ),
    ]
