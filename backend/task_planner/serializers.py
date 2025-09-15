from rest_framework import serializers
from .models import Tag, Workspace, WorkspaceMembership, Task, Subtask, Comment
from users.serializers import UserSerializer


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ['id', 'title', 'description', 'user']
        read_only_fields = ['id', 'user']


class WorkspaceMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = WorkspaceMembership
        fields = ['id', 'user', 'workspace', 'role', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class WorkspaceSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    members_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = [
            'id', 'title', 'description', 'owner',
            'created_at', 'updated_at', 'members_count'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_members_count(self, obj):
        return obj.memberships.count()


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
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'owner', 'workspace',
            'due_date', 'deadline', 'status', 'priority', 'tags',
            'assignees', 'created_at', 'updated_at', 'is_overdue',
            'is_personal', 'subtasks_count', 'comments_count'
        ]
        read_only_fields = ['id', 'owner', 'created_at', 'updated_at']

    def get_subtasks_count(self, obj):
        return obj.subtasks.count()

    def get_comments_count(self, obj):
        return obj.comments.count()


class TaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'workspace',
            'due_date', 'deadline', 'priority',
            'tags', 'assignees'
        ]

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class TaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'due_date', 'deadline',
            'status', 'priority', 'tags', 'assignees'
        ]


class SubtaskSerializer(serializers.ModelSerializer):
    assignee = UserSerializer(read_only=True)

    class Meta:
        model = Subtask
        fields = ['id', 'title', 'description', 'status',
                  'parent_task', 'assignee', 'created_at']
        read_only_fields = ['id', 'created_at']


class SubtaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subtask
        fields = ['title', 'description', 'parent_task', 'assignee']

    def validate_parent_task(self, value):
        user = self.context['request'].user
        if value.owner != user and user not in value.assignees.all():
            raise serializers.ValidationError("Нет доступа к этой задаче")
        return value


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

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        return super().create(validated_data)
