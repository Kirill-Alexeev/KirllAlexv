import uuid
from datetime import timedelta

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from calendar_events.services import parse_date_range
from notifications.services import client_date
from users.models import User
from .models import (
    Tag, Workspace, WorkspaceMembership, Task, Comment, TaskReadState, agenda_tasks,
    roll_forward_tasks,
)
from .serializers import (
    TagSerializer, WorkspaceSerializer, WorkspaceDetailSerializer,
    WorkspaceMembershipSerializer, TaskSerializer, TaskCreateSerializer,
    TaskUpdateSerializer, CommentSerializer, CommentCreateSerializer, UserPreviewSerializer
)


class TagViewSet(viewsets.ModelViewSet):
    serializer_class = TagSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        if self.action == 'list':
            # ?workspace_id=N — теги пространства, без параметра — личные теги
            workspace_id = self.request.query_params.get('workspace_id')
            if workspace_id:
                return Tag.objects.filter(
                    workspace_id=workspace_id,
                    workspace__memberships__user=user,
                ).distinct().order_by('title')
            return Tag.objects.filter(user=user, workspace__isnull=True).order_by('title')
        return Tag.objects.filter(
            Q(user=user, workspace__isnull=True) |
            Q(workspace__memberships__user=user)
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


def _parse_invite_code(value):
    try:
        return uuid.UUID(str(value).strip())
    except (TypeError, ValueError, AttributeError):
        return None


def _get_workspace_membership(workspace, user):
    return workspace.memberships.filter(user=user).first()


def _is_workspace_admin(workspace, user):
    if workspace.owner_id == user.id:
        return True
    membership = _get_workspace_membership(workspace, user)
    return bool(
        membership and membership.role >= WorkspaceMembership.Role.ADMIN
    )


def _is_workspace_member(workspace, user):
    return workspace.owner_id == user.id or workspace.memberships.filter(user=user).exists()


def _can_manage_task(task, user):
    """Личной задачей управляет автор, задачей пространства — любой его участник"""
    if task.owner_id == user.id:
        return True
    if task.workspace_id and _is_workspace_member(task.workspace, user):
        return True
    return False


def _detach_from_workspace(workspace, user):
    """Убираем ушедшего участника из исполнителей задач пространства"""
    for task in Task.objects.filter(workspace=workspace, assignees=user):
        task.assignees.remove(user)


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

    @action(detail=False, methods=['get'])
    def preview(self, request):
        """Информация о пространстве по коду — чтобы подтвердить вступление"""
        code = _parse_invite_code(request.query_params.get('invite_code'))
        if not code:
            return Response(
                {'error': 'Неверный код приглашения'},
                status=status.HTTP_400_BAD_REQUEST
            )
        workspace = Workspace.objects.filter(invite_code=code).first()
        if not workspace:
            return Response(
                {'error': 'Пространство с таким кодом не найдено'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response({
            'id': workspace.id,
            'title': workspace.title,
            'description': workspace.description,
            'owner': UserPreviewSerializer(workspace.owner).data,
            'members_count': workspace.memberships.count(),
            'invite_code': str(workspace.invite_code),
            'is_member': workspace.memberships.filter(user=request.user).exists(),
        })

    @action(detail=False, methods=['post'])
    def join(self, request):
        invite_code = request.data.get('invite_code')
        if not invite_code:
            return Response(
                {'error': 'invite_code обязателен'},
                status=status.HTTP_400_BAD_REQUEST
            )

        code = _parse_invite_code(invite_code)
        if not code:
            return Response(
                {'error': 'Неверный код приглашения'},
                status=status.HTTP_400_BAD_REQUEST
            )
        workspace = get_object_or_404(Workspace, invite_code=code)

        # get_or_create + IntegrityError: двойной клик / повторный запрос не даёт 500
        try:
            with transaction.atomic():
                _, created = WorkspaceMembership.objects.get_or_create(
                    user=request.user,
                    workspace=workspace,
                    defaults={'role': WorkspaceMembership.Role.MEMBER},
                )
        except IntegrityError:
            created = False
        serializer = self.get_serializer(workspace)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )

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

        if (target.role == WorkspaceMembership.Role.ADMIN and
                membership.role != WorkspaceMembership.Role.OWNER):
            return Response(
                {'error': 'Удалить администратора может только владелец'},
                status=status.HTTP_403_FORBIDDEN
            )

        with transaction.atomic():
            _detach_from_workspace(workspace, target.user)
            target.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['post'])
    def set_role(self, request, pk=None):
        """Назначить участника администратором или снять с него эту роль"""
        workspace = self.get_object()
        membership = _get_workspace_membership(workspace, request.user)
        if not membership or membership.role < WorkspaceMembership.Role.ADMIN:
            return Response(
                {'error': 'Недостаточно прав'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            role = int(request.data.get('role'))
        except (TypeError, ValueError):
            role = None
        if role not in (WorkspaceMembership.Role.MEMBER, WorkspaceMembership.Role.ADMIN):
            return Response(
                {'error': 'Можно назначить только роль участника или администратора'},
                status=status.HTTP_400_BAD_REQUEST
            )

        target = get_object_or_404(
            WorkspaceMembership, workspace=workspace, user_id=request.data.get('user_id')
        )
        if target.role == WorkspaceMembership.Role.OWNER:
            return Response(
                {'error': 'Роль владельца меняется через передачу владения'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if (target.role == WorkspaceMembership.Role.ADMIN and
                role == WorkspaceMembership.Role.MEMBER and
                membership.role != WorkspaceMembership.Role.OWNER):
            return Response(
                {'error': 'Снять администратора может только владелец'},
                status=status.HTTP_403_FORBIDDEN
            )

        target.role = role
        target.save(update_fields=['role'])
        return Response(WorkspaceMembershipSerializer(target).data)

    @action(detail=True, methods=['post'])
    def transfer_ownership(self, request, pk=None):
        """Передать владение другому участнику; прежний владелец становится администратором"""
        workspace = self.get_object()
        if workspace.owner_id != request.user.id:
            return Response(
                {'error': 'Передать владение может только владелец'},
                status=status.HTTP_403_FORBIDDEN
            )
        error = self._transfer(workspace, request.user, request.data.get('user_id'))
        if error:
            return error
        workspace.refresh_from_db()
        return Response(
            WorkspaceDetailSerializer(workspace, context=self.get_serializer_context()).data
        )

    @action(detail=True, methods=['post'])
    def leave(self, request, pk=None):
        """Покинуть пространство. Владелец должен указать нового владельца (new_owner_id)"""
        workspace = self.get_object()
        membership = _get_workspace_membership(workspace, request.user)
        if not membership:
            return Response(
                {'error': 'Вы не состоите в этом пространстве'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            if workspace.owner_id == request.user.id:
                new_owner_id = request.data.get('new_owner_id')
                if not new_owner_id:
                    has_others = workspace.memberships.exclude(user=request.user).exists()
                    return Response(
                        {'error': 'Выберите нового владельца' if has_others
                         else 'Вы единственный участник — удалите пространство'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                error = self._transfer(workspace, request.user, new_owner_id)
                if error:
                    return error
                membership.refresh_from_db()

            _detach_from_workspace(workspace, request.user)
            membership.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    def _transfer(self, workspace, current_owner, new_owner_id):
        if not new_owner_id or str(new_owner_id) == str(current_owner.id):
            return Response(
                {'error': 'Выберите другого участника'},
                status=status.HTTP_400_BAD_REQUEST
            )
        target = workspace.memberships.filter(user_id=new_owner_id).first()
        if not target:
            return Response(
                {'error': 'Новый владелец должен быть участником пространства'},
                status=status.HTTP_400_BAD_REQUEST
            )
        with transaction.atomic():
            workspace.memberships.filter(user=current_owner).update(
                role=WorkspaceMembership.Role.ADMIN
            )
            target.role = WorkspaceMembership.Role.OWNER
            target.save(update_fields=['role'])
            workspace.owner_id = target.user_id
            workspace.save(update_fields=['owner', 'updated_at'])
        return None


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
        queryset = Task.objects.filter(
            Q(owner=user) |
            Q(assignees=user) |
            Q(workspace__memberships__user=user)
        ).distinct()
        if self.action in ('list', 'personal', 'workspace_tasks'):
            # Подзадачи показываются только внутри своей задачи
            queryset = queryset.filter(parent__isnull=True)
        return queryset

    def perform_create(self, serializer):
        task = serializer.save(owner=self.request.user)
        parent = task.parent
        if parent and parent.status == Task.Status.COMPLETED:
            # Новая подзадача — задача снова не выполнена
            parent.status = Task.Status.ACTIVE
            parent.save()

    def _full_task_response(self, task, status_code=status.HTTP_200_OK):
        """Возвращаем полную задачу (id, owner, теги объектами и т.д.)"""
        task.refresh_from_db()
        data = TaskSerializer(task, context=self.get_serializer_context()).data
        return Response(data, status=status_code)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return self._full_task_response(serializer.instance, status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        task = self.get_object()
        if not _can_manage_task(task, request.user):
            return Response(
                {'error': 'Недостаточно прав для редактирования задачи'},
                status=status.HTTP_403_FORBIDDEN
            )
        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(task, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return self._full_task_response(serializer.instance)

    def destroy(self, request, *args, **kwargs):
        task = self.get_object()
        if not _can_manage_task(task, request.user):
            return Response(
                {'error': 'Удалять задачи может только владелец или админ пространства'},
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

    @action(detail=False, methods=['get'])
    def calendar(self, request):
        """Задачи пользователя с датой в диапазоне ?from=&to= (дата или, если её нет, дедлайн)"""
        start, end = parse_date_range(request.query_params)
        tasks = agenda_tasks(request.user).filter(
            Q(due_date__range=(start, end)) |
            Q(due_date__isnull=True, deadline__range=(start, end))
        )
        return Response(TaskSerializer(
            tasks, many=True, context=self.get_serializer_context()).data)

    @action(detail=False, methods=['post'])
    def roll_forward(self, request):
        """Сдвигает дату задач пользователя на его «сегодня» (не дальше суток от сервера)"""
        server_day = timezone.localdate()
        one_day = timedelta(days=1)
        day = client_date(request.data.get('date'))
        day = min(max(day, server_day - one_day), server_day + one_day)
        return Response({'moved': roll_forward_tasks(request.user, day)})

    @action(detail=True, methods=['post'])
    def mark_comments_read(self, request, pk=None):
        task = self.get_object()
        TaskReadState.objects.update_or_create(
            user=request.user, task=task,
            defaults={'last_read_at': timezone.now()},
        )
        return self._full_task_response(task)

    @action(detail=True, methods=['get'])
    def subtasks(self, request, pk=None):
        task = self.get_object()
        subtasks = task.subtasks.order_by('created_at', 'id')
        serializer = TaskSerializer(subtasks, many=True, context=self.get_serializer_context())
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Отметить выполненной / вернуть в работу.
        Ответ: {task, parent} — parent есть, если изменился статус родительской задачи"""
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

        if not task.can_be_completed_by(request.user):
            return Response(
                {'error': 'Отметить задачу может только исполнитель, администратор или владелец пространства'},
                status=status.HTTP_403_FORBIDDEN
            )

        completing = new_status == Task.Status.COMPLETED
        if completing and task.has_open_subtasks():
            return Response(
                {'error': 'Сначала выполните все подзадачи'},
                status=status.HTTP_400_BAD_REQUEST
            )

        parent_changed = False
        with transaction.atomic():
            task.status = new_status
            task.save()

            parent = task.parent
            if parent:
                if completing and parent.status != Task.Status.COMPLETED                         and not parent.has_open_subtasks():
                    # Выполнена последняя подзадача — закрываем всю задачу
                    parent.status = Task.Status.COMPLETED
                    parent.save()
                    parent_changed = True
                elif not completing and parent.status == Task.Status.COMPLETED:
                    # Подзадачу вернули в работу — задача тоже не выполнена
                    parent.status = Task.Status.ACTIVE
                    parent.save()
                    parent_changed = True

        context = self.get_serializer_context()
        task.refresh_from_db()
        return Response({
            'task': TaskSerializer(task, context=context).data,
            'parent': TaskSerializer(task.parent, context=context).data if parent_changed else None,
        })


class CommentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return CommentCreateSerializer
        return CommentSerializer

    pagination_class = None

    def get_queryset(self):
        queryset = Comment.objects.filter(
            Q(task__owner=self.request.user) |
            Q(task__assignees=self.request.user) |
            Q(task__workspace__memberships__user=self.request.user)
        ).distinct().select_related('author').order_by('created_at')
        task_id = self.request.query_params.get('task')
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comment = serializer.save(author=request.user)
        # Свой комментарий автор уже «прочитал»
        TaskReadState.objects.update_or_create(
            user=request.user, task=comment.task,
            defaults={'last_read_at': comment.created_at},
        )
        return Response(
            CommentSerializer(comment, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED
        )

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
