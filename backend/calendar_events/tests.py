from datetime import date

from rest_framework.test import APITestCase

from task_planner.models import Task, Workspace, WorkspaceMembership
from users.models import User
from .models import CalendarEvent

URL = '/api/calendar/events/'


class CalendarEventTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='u', email='u@x.ru', password='pass12345')
        self.other = User.objects.create_user(username='o', email='o@x.ru', password='pass12345')
        self.client.force_authenticate(self.user)

    def _range(self, start, end):
        return self.client.get(f'{URL}?from={start}&to={end}')

    def test_system_holidays_included(self):
        data = self._range('2026-03-01', '2026-03-31').data
        self.assertEqual([(e['date'], e['is_system']) for e in data], [('2026-03-08', True)])

    def test_yearly_repeats_only_from_source_year(self):
        CalendarEvent.objects.create(user=self.user, title='y', date=date(2025, 6, 15), is_yearly=True)
        CalendarEvent.objects.create(user=self.user, title='once', date=date(2025, 6, 16))
        titles = lambda year: [
            e['title'] for e in self._range(f'{year}-06-14', f'{year}-06-17').data]
        self.assertEqual(titles(2024), [])
        self.assertEqual(titles(2025), ['y', 'once'])
        self.assertEqual(titles(2026), ['y'])

    def test_leap_day_moves_to_feb_28(self):
        CalendarEvent.objects.create(user=self.user, title='l', date=date(2024, 2, 29), is_yearly=True)
        data = self._range('2025-02-24', '2025-02-28').data
        self.assertEqual([e['date'] for e in data], ['2025-02-28'])
        self.assertEqual(data[0]['source_date'], '2024-02-29')

    def test_invalid_range_rejected(self):
        self.assertEqual(self.client.get(URL).status_code, 400)
        self.assertEqual(self._range('2026-02-01', '2026-01-01').status_code, 400)
        self.assertEqual(self._range('2020-01-01', '2026-01-01').status_code, 400)

    def test_other_users_events_are_private(self):
        event = CalendarEvent.objects.create(user=self.other, title='s', date=date(2026, 6, 15))
        self.assertEqual(self._range('2026-06-15', '2026-06-15').data, [])
        self.assertEqual(self.client.delete(f'{URL}{event.id}/').status_code, 404)

    def test_crud(self):
        body = {'title': 'a', 'date': '2026-06-15', 'is_yearly': True}
        event_id = self.client.post(URL, body, format='json').data['id']
        self.assertEqual(CalendarEvent.objects.get(pk=event_id).user, self.user)
        body['title'] = 'b'
        self.assertEqual(self.client.put(f'{URL}{event_id}/', body, format='json').data['title'], 'b')
        self.assertEqual(self.client.delete(f'{URL}{event_id}/').status_code, 204)


class CalendarTasksTests(APITestCase):
    def test_returns_personal_and_assigned_in_range(self):
        user = User.objects.create_user(username='u', email='u@x.ru', password='pass12345')
        other = User.objects.create_user(username='o', email='o@x.ru', password='pass12345')
        ws = Workspace.objects.create(title='w', owner=other)
        WorkspaceMembership.objects.create(user=user, workspace=ws, role=1)
        day = date(2026, 6, 15)
        Task.objects.create(title='personal', owner=user, due_date=day)
        Task.objects.create(title='deadline only', owner=user, deadline=day)
        Task.objects.create(title='outside', owner=user, due_date=date(2026, 7, 1))
        Task.objects.create(title='foreign', owner=other, workspace=ws, due_date=day)
        Task.objects.create(title='assigned', owner=other, workspace=ws, due_date=day).assignees.add(user)

        self.client.force_authenticate(user)
        data = self.client.get('/api/tasks/tasks/calendar/?from=2026-06-01&to=2026-06-30').data
        self.assertEqual({t['title'] for t in data}, {'personal', 'deadline only', 'assigned'})
