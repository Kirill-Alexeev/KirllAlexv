from datetime import timedelta

from django.utils import timezone
from rest_framework.test import APITestCase

from users.models import User
from .models import Task, Workspace, WorkspaceMembership

COMPLETED = Task.Status.COMPLETED
ACTIVE = Task.Status.ACTIVE


class TaskCompletionTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(username='owner', email='o@x.ru', password='pass12345')
        self.admin = User.objects.create_user(username='admin', email='a@x.ru', password='pass12345')
        self.member = User.objects.create_user(username='member', email='m@x.ru', password='pass12345')
        self.other = User.objects.create_user(username='other', email='x@x.ru', password='pass12345')
        self.ws = Workspace.objects.create(title='WS', owner=self.owner)
        WorkspaceMembership.objects.create(user=self.owner, workspace=self.ws, role=3)
        WorkspaceMembership.objects.create(user=self.admin, workspace=self.ws, role=2)
        WorkspaceMembership.objects.create(user=self.member, workspace=self.ws, role=1)
        WorkspaceMembership.objects.create(user=self.other, workspace=self.ws, role=1)

    def _status(self, user, task, value):
        self.client.force_authenticate(user)
        return self.client.post(f'/api/tasks/tasks/{task.id}/change_status/', {'status': value})

    def test_assigned_task_only_assignee_or_admin(self):
        task = Task.objects.create(title='t', owner=self.owner, workspace=self.ws)
        task.assignees.add(self.member)
        self.assertEqual(self._status(self.other, task, COMPLETED).status_code, 403)
        self.assertEqual(self._status(self.member, task, COMPLETED).status_code, 200)
        self.assertEqual(self._status(self.admin, task, ACTIVE).status_code, 200)
        self.assertEqual(self._status(self.owner, task, COMPLETED).status_code, 200)

    def test_unassigned_task_any_member(self):
        task = Task.objects.create(title='t', owner=self.owner, workspace=self.ws)
        self.assertEqual(self._status(self.other, task, COMPLETED).status_code, 200)

    def test_subtasks_block_and_autoclose_parent(self):
        self.client.force_authenticate(self.member)
        parent = self.client.post('/api/tasks/tasks/', {'title': 'p', 'workspace': self.ws.id}).data
        s1 = self.client.post('/api/tasks/tasks/', {'title': 's1', 'parent': parent['id']}).data
        s2 = self.client.post('/api/tasks/tasks/', {'title': 's2', 'parent': parent['id']}).data
        self.assertEqual(s1['workspace'], self.ws.id)

        # Вложенность только на один уровень
        r = self.client.post('/api/tasks/tasks/', {'title': 'x', 'parent': s1['id']})
        self.assertEqual(r.status_code, 400)

        # Подзадачи не попадают в общий список
        ids = [t['id'] for t in self.client.get(
            f'/api/tasks/tasks/workspace_tasks/?workspace_id={self.ws.id}').data]
        self.assertEqual(ids, [parent['id']])

        parent_obj = Task.objects.get(pk=parent['id'])
        self.assertEqual(self._status(self.member, parent_obj, COMPLETED).status_code, 400)

        r = self._status(self.member, Task.objects.get(pk=s1['id']), COMPLETED)
        self.assertIsNone(r.data['parent'])
        r = self._status(self.member, Task.objects.get(pk=s2['id']), COMPLETED)
        self.assertEqual(r.data['parent']['status'], COMPLETED)

        # Вернули подзадачу в работу — задача тоже открыта
        r = self._status(self.member, Task.objects.get(pk=s2['id']), ACTIVE)
        self.assertEqual(r.data['parent']['status'], ACTIVE)

        sub = self.client.get(f'/api/tasks/tasks/{parent["id"]}/subtasks/').data
        self.assertEqual([s['title'] for s in sub], ['s1', 's2'])

    def test_personal_subtasks(self):
        self.client.force_authenticate(self.member)
        parent = self.client.post('/api/tasks/tasks/', {'title': 'p'}).data
        s1 = self.client.post('/api/tasks/tasks/', {'title': 's1', 'parent': parent['id']}).data
        self.assertIsNone(s1['workspace'])
        r = self._status(self.member, Task.objects.get(pk=s1['id']), COMPLETED)
        self.assertEqual(r.data['parent']['status'], COMPLETED)

        self.client.force_authenticate(self.other)
        r = self.client.post('/api/tasks/tasks/', {'title': 'x', 'parent': parent['id']})
        self.assertEqual(r.status_code, 400)


class TaskRollForwardTests(APITestCase):
    URL = '/api/tasks/tasks/roll_forward/'

    def setUp(self):
        self.user = User.objects.create_user(username='u', email='u@x.ru', password='pass12345')
        self.other = User.objects.create_user(username='o', email='o@x.ru', password='pass12345')
        self.client.force_authenticate(self.user)
        self.today = timezone.localdate()

    def _task(self, due_shift, deadline_shift=None, owner=None, **extra):
        deadline = None if deadline_shift is None else self.today + timedelta(days=deadline_shift)
        return Task.objects.create(
            title='t', owner=owner or self.user,
            due_date=self.today + timedelta(days=due_shift), deadline=deadline, **extra)

    def _roll(self, day=None):
        return self.client.post(self.URL, {'date': (day or self.today).isoformat()}, format='json')

    def _due(self, task):
        task.refresh_from_db()
        return task.due_date

    def test_moves_past_date_until_deadline(self):
        task = self._task(-2, 5)
        on_deadline = self._task(-1, 0)
        self.assertEqual(self._roll().data['moved'], 2)
        self.assertEqual(self._due(task), self.today)
        self.assertEqual(self._due(on_deadline), self.today)
        self.assertEqual(self._roll().data['moved'], 0)

    def test_keeps_tasks_that_should_not_move(self):
        cases = {
            'deadline passed': self._task(-3, -1),
            'no deadline': self._task(-2),
            'future date': self._task(2, 5),
            'completed': self._task(-2, 5, status=COMPLETED),
            'other user': self._task(-2, 5, owner=self.other),
        }
        before = {name: task.due_date for name, task in cases.items()}
        self._roll()
        for name, task in cases.items():
            self.assertEqual(self._due(task), before[name], name)

    def test_moves_assigned_workspace_task_once(self):
        ws = Workspace.objects.create(title='w', owner=self.other)
        WorkspaceMembership.objects.create(user=self.user, workspace=ws, role=1)
        assigned = self._task(-2, 5, owner=self.other, workspace=ws)
        assigned.assignees.add(self.user, self.other)
        unassigned = self._task(-2, 5, owner=self.other, workspace=ws)
        self.assertEqual(self._roll().data['moved'], 1)
        self.assertEqual(self._due(assigned), self.today)
        self.assertEqual(self._due(unassigned), self.today - timedelta(days=2))

    def test_client_date_limited_to_one_day(self):
        task = self._task(-2, 30)
        self._roll(self.today + timedelta(days=20))
        self.assertEqual(self._due(task), self.today + timedelta(days=1))
