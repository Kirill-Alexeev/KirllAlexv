from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import Tag, Workspace, WorkspaceMembership, Task, Subtask, Comment


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'description_short']
    list_filter = ['user']
    search_fields = ['title', 'user__username', 'description']
    raw_id_fields = ['user']
    list_per_page = 20

    def description_short(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_short.short_description = 'описание'


class WorkspaceMembershipInline(admin.TabularInline):
    model = WorkspaceMembership
    extra = 1
    fields = ['user', 'role', 'joined_at']
    raw_id_fields = ['user']
    readonly_fields = ['joined_at']


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ['title', 'owner', 'created_at', 'members_count']
    list_filter = ['created_at', 'owner']
    search_fields = ['title', 'description', 'owner__username']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [WorkspaceMembershipInline]
    raw_id_fields = ['owner']
    list_per_page = 20

    def members_count(self, obj):
        return obj.memberships.count()
    members_count.short_description = 'участников'


@admin.register(WorkspaceMembership)
class WorkspaceMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'workspace', 'role', 'joined_at']
    list_filter = ['role', 'joined_at', 'workspace']
    search_fields = ['user__username', 'workspace__title']
    readonly_fields = ['joined_at']
    raw_id_fields = ['user', 'workspace']
    list_per_page = 20


class SubtaskInline(admin.TabularInline):
    model = Subtask
    extra = 1
    fields = ['title', 'status', 'assignee', 'created_at']
    raw_id_fields = ['assignee']
    readonly_fields = ['created_at']


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 1
    fields = ['author', 'text_short', 'created_at']
    raw_id_fields = ['author']
    readonly_fields = ['created_at', 'author', 'text_short']

    def text_short(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_short.short_description = 'текст'

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'owner',
        'workspace',
        'status',
        'priority',
        'due_date',
        'is_overdue_display',
        'assignees_count'
    ]

    list_filter = [
        'status',
        'priority',
        'due_date',
        'created_at',
        'workspace'
    ]

    search_fields = [
        'title',
        'description',
        'owner__username',
        'tags__title'
    ]

    readonly_fields = [
        'created_at',
        'updated_at',
        'is_overdue'
    ]

    fieldsets = (
        (None, {
            'fields': ('title', 'description')
        }),
        ('Детали задачи', {
            'fields': (
                'owner',
                'workspace',
                'due_date',
                'deadline',
                'status',
                'priority'
            )
        }),
        ('Участники и теги', {
            'fields': (
                'assignees',
                'tags'
            )
        }),
        ('Даты', {
            'fields': (
                'created_at',
                'updated_at',
            ),
            'classes': ('collapse',)
        }),
    )

    filter_horizontal = ['assignees', 'tags']

    inlines = [SubtaskInline, CommentInline]
    
    raw_id_fields = ['owner', 'workspace']

    list_per_page = 25

    def is_overdue_display(self, obj):
        if obj.is_overdue:
            return '⚠️ Просрочена'
        return '—'
    is_overdue_display.short_description = 'просрочена'

    def assignees_count(self, obj):
        return obj.assignees.count()
    assignees_count.short_description = 'исполнителей'


@admin.register(Subtask)
class SubtaskAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'parent_task',
        'status',
        'assignee',
        'created_at'
    ]

    list_filter = [
        'status',
        'created_at',
        'parent_task'
    ]

    search_fields = [
        'title',
        'description',
        'parent_task__title',
        'assignee__username'
    ]

    readonly_fields = ['created_at']
    
    raw_id_fields = ['parent_task', 'assignee']

    fieldsets = (
        (None, {
            'fields': ('title', 'description', 'parent_task')
        }),
        (_('Статус и исполнитель'), {
            'fields': ('status', 'assignee')
        }),
        (_('Даты'), {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )

    list_per_page = 20


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = [
        'task',
        'author',
        'text_short',
        'created_at'
    ]

    list_filter = [
        'created_at',
        'author',
        'task'
    ]

    search_fields = [
        'text',
        'author__username',
        'task__title'
    ]

    readonly_fields = [
        'created_at',
        'updated_at',
        'author'
    ]

    fieldsets = (
        (None, {
            'fields': ('task', 'author', 'text')
        }),
        (_('Даты'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    raw_id_fields = ['task', 'author']

    list_per_page = 25

    def text_short(self, obj):
        return obj.text[:50] + '...' if len(obj.text) > 50 else obj.text
    text_short.short_description = 'текст'

    def save_model(self, request, obj, form, change):
        if not change:  # Только при создании
            obj.author = request.user
        super().save_model(request, obj, form, change)


# Дополнительные настройки админки
admin.site.site_header = 'Администрирование планировщика задач'
admin.site.site_title = _('Планировщик задач')
admin.site.index_title = _('Управление задачами и рабочими пространствами')
