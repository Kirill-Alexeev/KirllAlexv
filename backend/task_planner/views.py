from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.shortcuts import get_object_or_404
from users.models import User
from .models import Tag, Workspace, WorkspaceMembership, Task, Subtask, Comment
from .serializers import (
    TagSerializer, WorkspaceSerializer, WorkspaceDetailSerializer,
    WorkspaceMembershipSerializer, TaskSerializer, TaskCreateSerializer,
    TaskUpdateSerializer, SubtaskSerializer, SubtaskCreateSerializer,
    CommentSerializer, CommentCreateSerializer
)


class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Tag.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WorkspaceViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(
            Q(owner=self.request.user) |
            Q(memberships__user=self.request.user)
        ).distinct()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return WorkspaceDetailSerializer
        return WorkspaceSerializer

    def perform_create(self, serializer):
        workspace = serializer.save(owner=self.request.user)
        WorkspaceMembership.objects.create(
            user=self.request.user,
            workspace=workspace,
            role=WorkspaceMembership.Role.OWNER
        )

    def perform_destroy(self, instance):
        if instance.owner != self.request.user:
            raise permissions.exceptions.PermissionDenied(
                'Только владелец может удалить рабочее пространство'
            )
        instance.delete()

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        workspace = self.get_object()

        membership = workspace.memberships.filter(user=request.user).first()
        if not membership or membership.role < WorkspaceMembership.Role.ADMIN:
            return Response(
                {'error': 'Недостаточно прав для добавления участников'},
                status=status.HTTP_403_FORBIDDEN
            )

        user_id = request.data.get('user_id')
        role = request.data.get('role', WorkspaceMembership.Role.MEMBER)

        if not user_id:
            return Response(
                {'error': 'user_id обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = get_object_or_404(User, id=user_id)

        if workspace.memberships.filter(user=user).exists():
            return Response(
                {'error': 'Пользователь уже является участником'},
                status=status.HTTP_400_BAD_REQUEST
            )

        WorkspaceMembership.objects.create(
            user=user,
            workspace=workspace,
            role=role
        )

        return Response(
            {'status': 'Участник добавлен'},
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['delete'], url_path='remove_member/(?P<user_id>[^/.]+)')
    def remove_member(self, request, pk=None, user_id=None):
        workspace = self.get_object()

        membership = workspace.memberships.filter(user=request.user).first()
        if not membership or membership.role < WorkspaceMembership.Role.ADMIN:
            return Response(
                {'error': 'Недостаточно прав'},
                status=status.HTTP_403_FORBIDDEN
            )

        target = get_object_or_404(
            WorkspaceMembership,
            workspace=workspace,
            user_id=user_id
        )

        if target.role == WorkspaceMembership.Role.OWNER:
            return Response(
                {'error': 'Нельзя удалить владельца'},
                status=status.HTTP_400_BAD_REQUEST
            )

        target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WorkspaceMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkspaceMembership.objects.filter(
            Q(workspace__owner=self.request.user) |
            Q(user=self.request.user)
        )

    def perform_destroy(self, instance):
        if instance.role == WorkspaceMembership.Role.OWNER:
            raise permissions.exceptions.PermissionDenied(
                'Нельзя удалить владельца рабочего пространства'
            )
        instance.delete()


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return TaskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TaskUpdateSerializer
        return TaskSerializer

    def get_queryset(self):
        user = self.request.user
        return Task.objects.filter(
            Q(owner=user) |
            Q(assignees=user) |
            Q(workspace__memberships__user=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        if task.owner != request.user:
            return Response(
                {'error': 'Только владелец может редактировать задачу'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        if task.owner != request.user:
            return Response(
                {'error': 'Только владелец может удалить задачу'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def personal(self, request):
        tasks = self.get_queryset().filter(workspace__isnull=True)
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def workspace_tasks(self, request):
        workspace_id = request.query_params.get('workspace_id')
        if workspace_id:
            tasks = self.get_queryset().filter(workspace_id=workspace_id)
            serializer = self.get_serializer(tasks, many=True)
            return Response(serializer.data)
        return Response(
            {'error': 'workspace_id parameter required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        task = self.get_object()
        new_status = request.data.get('status')

        try:
            new_status = int(new_status)
        except (TypeError, ValueError):
            return Response(
                {'error': 'Статус должен быть числом'},
                status=status.HTTP_400_BAD_REQUEST
            )

        valid_statuses = dict(Task.Status.choices).keys()
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Допустимые статусы: {list(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        task.status = new_status
        task.save()
        return Response({'status': 'Статус обновлён'})


class SubtaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return SubtaskCreateSerializer
        return SubtaskSerializer

    def get_queryset(self):
        return Subtask.objects.filter(
            Q(parent_task__owner=self.request.user) |
            Q(parent_task__assignees=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        subtask = self.get_object()
        if subtask.parent_task.owner != request.user:
            return Response(
                {'error': 'Недостаточно прав'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)


class CommentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return CommentCreateSerializer
        return CommentSerializer

    def get_queryset(self):
        return Comment.objects.filter(
            Q(task__owner=self.request.user) |
            Q(task__assignees=self.request.user) |
            Q(task__workspace__memberships__user=self.request.user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def update(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.author != request.user:
            return Response(
                {'error': 'Можно редактировать только свои комментарии'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        comment = self.get_object()
        if comment.author != request.user:
            return Response(
                {'error': 'Можно удалять только свои комментарии'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)
