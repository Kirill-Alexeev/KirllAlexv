from datetime import date, datetime, timedelta, timezone

from rest_framework.test import APITestCase

from calendar_events.models import CalendarEvent
from task_planner.models import Task, Workspace, WorkspaceMembership
from users.models import User

DAY = date(2026, 3, 8)
URL = '/api/notifications/'
LONG_AGO = datetime(2026, 3, 1, tzinfo=timezone.utc)
MIDDAY = datetime(2026, 3, 8, 9, 0, tzinfo=timezone.utc)  # 12:00 у пользователя (UTC+3)
TODAY_KEY = 'tasks.today'
OVERDUE_KEY = 'tasks.overdue'
EVENT_KEY = 'calendar.today'


class NotificationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u', email='u@x.ru', password='pass12345')
        self.other = User.objects.create_user(username='o', email='o@x.ru', password='pass12345')
        self.client.force_authenticate(self.user)

    def _created(self, obj, at=LONG_AGO):
        type(obj).objects.filter(pk=obj.pk).update(created_at=at)
        return obj

    def _task(self, title='now', at=LONG_AGO, **fields):
        fields.setdefault('owner', self.user)
        fields.setdefault('due_date', DAY)
        return self._created(Task.objects.create(title=title, **fields), at)

    def _event(self, title='event', at=LONG_AGO, **fields):
        fields.setdefault('date', DAY)
        return self._created(CalendarEvent.objects.create(user=self.user, title=title, **fields), at)

    def _poll(self, hour=8, minute=5):
        now = f'{DAY}T{hour:02}:{minute:02}:00+03:00'
        return self.client.post(f'{URL}poll/', {'now': now}, format='json').data

    def _keys(self, items):
        return [item['key'] for item in items]

    def _current(self):
        return self.client.get(f'{URL}current/?date={DAY}').data

    def _item(self, key):
        return next((n for n in self._current() if n['key'] == key), None)

    def _types(self):
        return set(self._keys(self._current()))

    def _read(self):
        return self.client.post(f'{URL}read/', {'date': DAY.isoformat()}, format='json').data

    def _settings(self, **tasks):
        prefs = self.client.get(f'{URL}settings/').data
        prefs['apps']['tasks'].update(tasks)
        return self.client.put(f'{URL}settings/', prefs, format='json')

    def test_builds_by_type_and_respects_settings(self):
        self._task('late', due_date=DAY - timedelta(days=2))
        self._task('now')
        self._event('e', date=DAY + timedelta(days=1))
        self._poll()
        self.assertEqual(self._types(), {
            OVERDUE_KEY, TODAY_KEY, 'calendar.holidays', 'calendar.tomorrow'})

        self.assertEqual(self._settings(overdue=False).status_code, 200)
        self.assertNotIn(OVERDUE_KEY, self._types())
        self.assertIn(TODAY_KEY, self._types())

        self._settings(enabled=False)
        self.assertFalse({TODAY_KEY, OVERDUE_KEY} & self._types())

        prefs = self.client.get(f'{URL}settings/').data
        prefs['enabled'] = False
        self.client.put(f'{URL}settings/', prefs, format='json')
        self.assertEqual(self._types(), set())

    def test_rejects_non_boolean(self):
        response = self.client.put(f'{URL}settings/', {'enabled': 'yes'}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_nothing_before_first_reminder(self):
        self._task()
        self.assertEqual(self._poll(hour=7, minute=59), [])
        self.assertEqual(self._current(), [])

    def test_reminder_is_issued_once_per_slot(self):
        self._task()
        self.assertIn(TODAY_KEY, self._keys(self._poll()))
        self.assertEqual(self._poll(hour=12), [])

    def test_hour_is_taken_from_client_timezone(self):
        self._task()
        # 08:05 UTC+3 — это 05:05 UTC: напоминание приходит по времени пользователя
        self.assertIn(TODAY_KEY, self._keys(self._poll(hour=8)))

    def test_task_created_after_morning_waits_for_evening(self):
        self._task(at=MIDDAY)
        self.assertNotIn(TODAY_KEY, self._keys(self._poll()))
        self.assertIsNone(self._item(TODAY_KEY))
        self.assertIn(TODAY_KEY, self._keys(self._poll(hour=22)))

    def test_created_task_does_not_touch_existing_notification(self):
        self._task('old')
        self._poll()
        self._read()
        self._task('new', at=MIDDAY)
        item = self._item(TODAY_KEY)
        self.assertTrue(item['is_read'])
        self.assertEqual(item['titles'], ['old'])
        self.assertEqual(self._poll(hour=12), [])

    def test_task_rescheduled_between_reminders_gives_no_toast(self):
        self._poll()
        self._task('moved')
        self.assertEqual(self._poll(hour=12), [])
        self.assertIsNone(self._item(TODAY_KEY))

    def test_unread_notification_keeps_hanging(self):
        self._task('late', due_date=DAY - timedelta(days=1))
        self.assertIn(OVERDUE_KEY, self._keys(self._poll()))
        self.assertEqual(self._poll(hour=22), [])
        self.assertFalse(self._item(OVERDUE_KEY)['is_read'])

    def test_hanging_notification_gets_evening_content(self):
        self._task('old')
        self._poll()
        self._task('afternoon', at=MIDDAY)
        self.assertEqual(self._poll(hour=22), [])
        self.assertEqual(set(self._item(TODAY_KEY)['titles']), {'old', 'afternoon'})

    def test_read_notification_is_issued_again(self):
        self._task('late', due_date=DAY - timedelta(days=1))
        self._poll()
        self._read()
        self.assertIn(OVERDUE_KEY, self._keys(self._poll(hour=22)))
        self.assertFalse(self._item(OVERDUE_KEY)['is_read'])

    def test_emptied_notification_is_not_treated_as_hanging(self):
        task = self._task()
        self._poll()
        Task.objects.filter(pk=task.pk).update(status=Task.Status.COMPLETED)
        self._task('fresh', at=MIDDAY)
        self.assertIn(TODAY_KEY, self._keys(self._poll(hour=22)))

    def test_read_marks_all_current(self):
        self._task()
        self._poll()
        self.assertTrue(all(not n['is_read'] for n in self._current()))
        data = self._read()
        self.assertTrue(data and all(n['is_read'] for n in data))
        self.assertTrue(all(n['is_read'] for n in self._current()))

    def test_read_is_per_user(self):
        self._task()
        self._task('their', owner=self.other)
        self._poll()
        self._read()
        self.client.force_authenticate(self.other)
        self._poll()
        self.assertTrue(self._current() and all(not n['is_read'] for n in self._current()))

    def test_deleted_hidden_until_next_reminder(self):
        self._task()
        self._poll()
        response = self.client.delete(f'{URL}current/{TODAY_KEY}/')
        self.assertEqual(response.status_code, 204)
        self.assertIsNone(self._item(TODAY_KEY))
        self.assertEqual(self._poll(hour=12), [])
        self.assertIn(TODAY_KEY, self._keys(self._poll(hour=22)))
        self.assertIsNotNone(self._item(TODAY_KEY))

    def test_delete_unknown_key_is_404(self):
        response = self.client.delete(f'{URL}current/{TODAY_KEY}/')
        self.assertEqual(response.status_code, 404)

    def test_calendar_events_follow_the_same_schedule(self):
        self._event('morning')
        self._event('later', at=MIDDAY)
        self._poll()
        self.assertEqual(self._item(EVENT_KEY)['titles'], ['morning'])

    def test_only_personal_and_assigned_tasks(self):
        ws = Workspace.objects.create(title='w', owner=self.other)
        WorkspaceMembership.objects.create(user=self.user, workspace=ws, role=1)
        self._task('foreign', owner=self.other, workspace=ws)
        self._poll()
        self.assertNotIn(TODAY_KEY, self._types())
        mine = self._task('mine', owner=self.other, workspace=ws)
        mine.assignees.add(self.user)
        self._poll(hour=22)
        self.assertIn(TODAY_KEY, self._types())

    def test_completed_and_subtasks_ignored(self):
        parent = self._task('done', status=Task.Status.COMPLETED)
        self._task('sub', parent=parent)
        self._poll()
        self.assertNotIn(TODAY_KEY, self._types())
