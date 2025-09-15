from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
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
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        workspace = self.get_object()
        if workspace.owner != request.user:
            return Response(
                {'error': 'Только владелец может добавлять участников'},
                status=status.HTTP_403_FORBIDDEN
            )

        return Response({'status': 'member added'})


class WorkspaceMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = WorkspaceMembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkspaceMembership.objects.filter(
            Q(workspace__owner=self.request.user) |
            Q(user=self.request.user)
        )


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

    @action(detail=False, methods=['get'])
    def personal(self, request):
        """Личные задачи (без workspace)"""
        tasks = self.get_queryset().filter(workspace__isnull=True)
        serializer = self.get_serializer(tasks, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def workspace_tasks(self, request):
        """Задачи в workspace"""
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

        if new_status in dict(Task.Status.choices):
            task.status = new_status
            task.save()
            return Response({'status': 'Status updated'})
        return Response(
            {'error': 'Invalid status'},
            status=status.HTTP_400_BAD_REQUEST
        )


class SubtaskViewSet(viewsets.ModelViewSet):
    serializer_class = SubtaskSerializer
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


class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
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
