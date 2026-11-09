import shutil
import tempfile
from datetime import date, timedelta
from io import BytesIO
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from calendar_events.models import CalendarEvent
from task_planner.models import Task, Workspace, WorkspaceMembership
from users.models import User

URL = '/api/auth/'
PASSWORD = 'Zx9-long-pass'
NEW_PASSWORD = 'Qw7-other-pass'
MEDIA_ROOT = tempfile.mkdtemp()


def image_file(name='me.png'):
    buffer = BytesIO()
    Image.new('RGB', (10, 10), 'green').save(buffer, 'PNG')
    return SimpleUploadedFile(name, buffer.getvalue(), content_type='image/png')


@override_settings(MEDIA_ROOT=MEDIA_ROOT)
class ProfileTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA_ROOT, ignore_errors=True)

    def setUp(self):
        self.user = User.objects.create_user(username='u', email='u@x.ru', password=PASSWORD)
        self.other = User.objects.create_user(username='taken', email='o@x.ru', password=PASSWORD)
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')

    def _update(self, **data):
        return self.client.put(f'{URL}profile/update/', data, format='json')

    def _upload(self, file):
        return self.client.put(f'{URL}profile/update/', {'photo': file}, format='multipart')

    def _change_password(self, old=PASSWORD, new=NEW_PASSWORD, confirm=None):
        return self.client.post(f'{URL}change-password/', {
            'old_password': old, 'new_password': new, 'new_password_confirm': confirm or new,
        }, format='json')

    def test_updates_name_and_login(self):
        response = self._update(first_name='Иван', last_name='Петров', username='ivan')
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(
            (self.user.first_name, self.user.last_name, self.user.username),
            ('Иван', 'Петров', 'ivan'))

    def test_login_must_be_unique(self):
        response = self._update(username='taken')
        self.assertEqual(response.status_code, 400)
        self.assertIn('username', response.data)

    def test_photo_upload_returns_absolute_url(self):
        response = self._upload(image_file())
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['photo_url'].startswith('http://testserver/media/'))
        profile = self.client.get(f'{URL}profile/').data
        self.assertEqual(profile['photo_url'], response.data['photo_url'])

    def test_replaced_and_removed_photo_files_are_deleted(self):
        self._upload(image_file('first.png'))
        self.user.refresh_from_db()
        first, storage = self.user.photo.name, self.user.photo.storage
        self._upload(image_file('second.png'))
        self.assertFalse(storage.exists(first))
        self.user.refresh_from_db()
        second = self.user.photo.name
        self.assertTrue(storage.exists(second))

        response = self._update(photo=None)
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data['photo_url'])
        self.assertFalse(storage.exists(second))

    def test_rejects_not_an_image(self):
        file = SimpleUploadedFile('me.png', b'not an image', content_type='image/png')
        response = self._upload(file)
        self.assertEqual(response.status_code, 400)
        self.assertIn('photo', response.data)

    @patch('users.serializers.MAX_PHOTO_SIZE', 10)
    def test_rejects_too_big_photo(self):
        response = self._upload(image_file())
        self.assertEqual(response.status_code, 400)
        self.assertIn('photo', response.data)

    def test_change_password_rotates_token(self):
        response = self._change_password()
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        self.assertNotEqual(response.data['token'], self.token.key)
        self.assertEqual(self.client.get(f'{URL}profile/').status_code, 401)
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")
        self.assertEqual(self.client.get(f'{URL}profile/').status_code, 200)

    def test_change_password_needs_current_password(self):
        response = self._change_password(old='wrong-password')
        self.assertEqual(response.status_code, 400)
        self.assertIn('old_password', response.data)

    def test_change_password_rejects_weak_password(self):
        response = self._change_password(new='12345678')
        self.assertEqual(response.status_code, 400)
        self.assertIn('new_password', response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_completed_at_follows_status(self):
        task = Task.objects.create(title='t', owner=self.user)
        self.assertIsNone(task.completed_at)
        task.status = Task.Status.COMPLETED
        task.save()
        finished = task.completed_at
        self.assertIsNotNone(finished)
        task.save()
        self.assertEqual(task.completed_at, finished)
        task.status = Task.Status.ACTIVE
        task.save()
        self.assertIsNone(task.completed_at)

    def _completed(self, days_ago, **fields):
        task = Task.objects.create(
            title='done', owner=self.user, status=Task.Status.COMPLETED, **fields)
        Task.objects.filter(pk=task.pk).update(
            completed_at=timezone.now() - timedelta(days=days_ago))
        return task

    def test_stats(self):
        day = date(2026, 3, 8)
        recent = self._completed(1)
        self._completed(10)
        self._completed(40)
        Task.objects.create(title='sub', owner=self.user, parent=recent)
        Task.objects.create(title='later', owner=self.user, due_date=day + timedelta(days=1))
        late = Task.objects.create(title='late', owner=self.user, due_date=day - timedelta(days=1))
        Task.objects.filter(pk=late.pk).update(status=Task.Status.ACTIVE)
        Task.objects.create(title='foreign', owner=self.other, status=Task.Status.COMPLETED)

        workspace = Workspace.objects.create(title='w', owner=self.other)
        WorkspaceMembership.objects.create(user=self.user, workspace=workspace, role=1)
        assigned = Task.objects.create(title='given', owner=self.other, workspace=workspace)
        assigned.assignees.add(self.user)
        Workspace.objects.create(title='mine', owner=self.user)
        CalendarEvent.objects.create(user=self.user, title='e', date=day)

        data = self.client.get(f'{URL}profile/stats/?date={day}').data
        self.assertEqual(data, {
            'total': 6,
            'completed': 3,
            'completed_week': 1,
            'completed_month': 2,
            'unfinished': 3,
            'overdue': 1,
            'completion_rate': 50,
            'workspaces': 2,
            'events': 1,
        })

    def test_stats_without_tasks(self):
        data = self.client.get(f'{URL}profile/stats/').data
        self.assertEqual((data['total'], data['completion_rate']), (0, 0))

    def test_profile_requires_auth(self):
        self.client.credentials()
        self.assertEqual(self.client.get(f'{URL}profile/stats/').status_code, 401)
