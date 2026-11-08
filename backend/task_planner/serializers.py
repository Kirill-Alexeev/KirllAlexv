from rest_framework import serializers
from .models import (
    Tag, Workspace, WorkspaceMembership, Task, Comment, TaskReadState
)
from users.serializers import UserSerializer


class UserPreviewSerializer(serializers.ModelSerializer):
    """Минимум данных о пользователе для тех, кто ещё не в пространстве"""
    class Meta:
        model = UserSerializer.Meta.model
        fields = ['id', 'username', 'first_name', 'last_name']


def _is_member(workspace, user):
    return workspace.owner_id == user.id or workspace.memberships.filter(user=user).exists()


class TagSerializer(serializers.ModelSerializer):
    """Личный тег (workspace = null) или общий тег пространства"""

    class Meta:
        model = Tag
        fields = ['id', 'title', 'description', 'user', 'workspace']
        read_only_fields = ['id', 'user']

    def validate(self, attrs):
        user = self.context['request'].user
        workspace = attrs.get('workspace', getattr(self.instance, 'workspace', None))
        title = attrs.get('title', getattr(self.instance, 'title', '')).strip()
        if not title:
            raise serializers.ValidationError({'title': 'Введите название тега'})
        attrs['title'] = title

        if workspace and not _is_member(workspace, user):
            raise serializers.ValidationError({'workspace': 'Вы не состоите в этом пространстве'})

        same = Tag.objects.filter(title__iexact=title)
        same = same.filter(workspace=workspace) if workspace else same.filter(
            workspace__isnull=True, user=user)
        if self.instance:
            same = same.exclude(pk=self.instance.pk)
        if same.exists():
            raise serializers.ValidationError({'title': 'Такой тег уже есть'})
        return attrs


class WorkspaceMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceMembership
        fields = ['id', 'user', 'workspace', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members_count = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    invite_code = serializers.UUIDField(read_only=True)

    class Meta:
        model = Workspace
        fields = [
            'id', 'title', 'description', 'owner', 'invite_code',
            'created_at', 'updated_at', 'members_count', 'my_role'
        ]
        read_only_fields = [
            'id', 'owner', 'invite_code', 'created_at', 'updated_at'
        ]

    def get_members_count(self, obj):
        return obj.memberships.count()

    def get_my_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        membership = obj.memberships.filter(user=request.user).first()
        return membership.role if membership else None


class WorkspaceDetailSerializer(WorkspaceSerializer):
    members = WorkspaceMembershipSerializer(
        source='memberships', many=True, read_only=True)

    class Meta(WorkspaceSerializer.Meta):
        fields = WorkspaceSerializer.Meta.fields + ['members']


class TaskSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    assignees = UserSerializer(many=True, read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    is_personal = serializers.BooleanField(read_only=True)
    subtasks_count = serializers.SerializerMethodField()
    completed_subtasks_count = serializers.SerializerMethodField()
    parent_title = serializers.SerializerMethodField()
    can_complete = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    unread_comments_count = serializers.SerializerMethodField()
    comments_last_read_at = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'owner', 'workspace',
            'due_date', 'deadline', 'status', 'priority', 'tags',
            'assignees', 'created_at', 'updated_at', 'is_overdue',
            'is_personal', 'parent', 'parent_title', 'subtasks_count',
            'completed_subtasks_count', 'can_complete', 'comments_count',
            'unread_comments_count', 'comments_last_read_at'
        ]
        read_only_fields = ['id', 'owner', 'parent', 'created_at', 'updated_at']

    def _user(self):
        request = self.context.get('request')
        return request.user if request and request.user.is_authenticated else None

    def _last_read_at(self, obj):
        user = self._user()
        if not user:
            return None
        state = obj.read_states.filter(user=user).first()
        return state.last_read_at if state else None

    def get_subtasks_count(self, obj):
        return obj.subtasks.count()

    def get_completed_subtasks_count(self, obj):
        return obj.subtasks.filter(status=Task.Status.COMPLETED).count()

    def get_parent_title(self, obj):
        return obj.parent.title if obj.parent_id else None

    def get_can_complete(self, obj):
        return obj.can_be_completed_by(self._user())

    def get_comments_count(self, obj):
        return obj.comments.count()

    def get_unread_comments_count(self, obj):
        user = self._user()
        if not user or not obj.workspace_id:
            return 0
        comments = obj.comments.exclude(author=user)
        last_read_at = self._last_read_at(obj)
        if last_read_at:
            comments = comments.filter(created_at__gt=last_read_at)
        return comments.count()

    def get_comments_last_read_at(self, obj):
        value = self._last_read_at(obj)
        return value.isoformat() if value else None


class TaskRelationsValidationMixin:
    """Теги — только своего пространства (или личные для личной задачи),
    исполнители — только участники пространства"""

    def _validate_relations(self, attrs, workspace):
        user = self.context['request'].user
        existing_tag_ids = set(
            self.instance.tags.values_list('id', flat=True)) if self.instance else set()

        for tag in attrs.get('tags', []):
            if tag.id in existing_tag_ids:
                continue  # уже стоящие на задаче теги не трогаем
            if workspace:
                ok = tag.workspace_id == workspace.id
            else:
                ok = tag.workspace_id is None and tag.user_id == user.id
            if not ok:
                raise serializers.ValidationError(
                    {'tags': f'Тег «{tag.title}» нельзя использовать в этой задаче'})

        if workspace:
            member_ids = set(workspace.memberships.values_list('user_id', flat=True))
            for assignee in attrs.get('assignees', []):
                if assignee.id not in member_ids:
                    raise serializers.ValidationError(
                        {'assignees': 'Исполнитель должен быть участником пространства'})
        return attrs


class TaskCreateSerializer(TaskRelationsValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'workspace', 'parent',
            'due_date', 'deadline', 'priority',
            'tags', 'assignees'
        ]

    def validate_workspace(self, value):
        user = self.context['request'].user
        if value and not _is_member(value, user):
            raise serializers.ValidationError('Вы не состоите в этом пространстве')
        return value

    def validate_parent(self, parent):
        if parent is None:
            return parent
        user = self.context['request'].user
        if parent.parent_id:
            raise serializers.ValidationError('У подзадачи не может быть своих подзадач')
        if parent.workspace_id:
            if not _is_member(parent.workspace, user):
                raise serializers.ValidationError('Нет доступа к этой задаче')
        elif parent.owner_id != user.id:
            raise serializers.ValidationError('Нет доступа к этой задаче')
        return parent

    def validate(self, attrs):
        parent = attrs.get('parent')
        if parent:
            # Подзадача всегда живёт там же, где родительская задача
            attrs['workspace'] = parent.workspace
        return self._validate_relations(attrs, attrs.get('workspace'))

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class TaskUpdateSerializer(TaskRelationsValidationMixin, serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'due_date', 'deadline',
            'priority', 'tags', 'assignees'
        ]

    def validate(self, attrs):
        return self._validate_relations(attrs, self.instance.workspace)


class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'task', 'author', 'text', 'created_at', 'updated_at']
        read_only_fields = ['id', 'author', 'created_at', 'updated_at']


class CommentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['task', 'text']

    def validate_task(self, task):
        user = self.context['request'].user
        if not task.workspace_id:
            raise serializers.ValidationError('Комментарии доступны только в рабочих пространствах')
        if not _is_member(task.workspace, user):
            raise serializers.ValidationError('Вы не состоите в этом пространстве')
        return task

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Комментарий не может быть пустым')
        return value

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)
