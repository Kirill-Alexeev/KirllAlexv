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
