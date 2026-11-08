import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from users.models import User


class Tag(models.Model):
    """Тег: личный (workspace пустой) или общий тег рабочего пространства"""
    title = models.CharField('название', max_length=50)
    description = models.TextField('описание', blank=True)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='tags',
        verbose_name='пользователь'
    )
    workspace = models.ForeignKey(
        'Workspace',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tags',
        verbose_name='рабочее пространство'
    )

    class Meta:
        verbose_name = 'тег'
        verbose_name_plural = 'теги'
        constraints = [
            models.UniqueConstraint(
                fields=['title', 'user'],
                condition=models.Q(workspace__isnull=True),
                name='unique_personal_tag_title',
            ),
            models.UniqueConstraint(
                fields=['title', 'workspace'],
                condition=models.Q(workspace__isnull=False),
                name='unique_workspace_tag_title',
            ),
        ]

    def __str__(self):
        return self.title


class Workspace(models.Model):
    """Модель рабочего пространства"""
    title = models.CharField('название', max_length=100)
    description = models.TextField('описание', blank=True)
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_workspaces',
        verbose_name='владелец'
    )
    invite_code = models.UUIDField(
        'код приглашения',
        default=uuid.uuid4,
        unique=True,
        editable=False
    )
    created_at = models.DateTimeField('дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('дата обновления', auto_now=True)

    class Meta:
        verbose_name = 'рабочее пространство'
        verbose_name_plural = 'рабочие пространства'
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class WorkspaceMembership(models.Model):
    """Модель членства в рабочем пространстве с ролями"""
    class Role(models.IntegerChoices):
        MEMBER = 1, 'Участник'
        ADMIN = 2, 'Администратор'
        OWNER = 3, 'Владелец'

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='workspace_memberships',
        verbose_name='пользователь'
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='memberships',
        verbose_name='рабочее пространство'
    )
    role = models.IntegerField(
        'роль',
        choices=Role.choices,
        default=Role.MEMBER
    )
    joined_at = models.DateTimeField(
        'дата присоединения', auto_now_add=True)

    class Meta:
        verbose_name = 'членство в рабочем пространстве'
        verbose_name_plural = 'членства в рабочем пространстве'
        unique_together = ('user', 'workspace')

    def __str__(self):
        return f"{self.user.username} в {self.workspace.title} ({self.get_role_display()})"


class Task(models.Model):
    """Основная модель задачи"""
    class Status(models.IntegerChoices):
        ACTIVE = 1, 'Активна'
        COMPLETED = 2, 'Завершена'
        OVERDUE = 3, 'Просрочена'

    class Priority(models.IntegerChoices):
        LOW = 1, 'Низкий'
        MEDIUM = 2, 'Средний'
        HIGH = 3, 'Высокий'

    title = models.CharField('название', max_length=200)
    description = models.TextField('описание', blank=True)
    created_at = models.DateTimeField('дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('дата обновления', auto_now=True)
    due_date = models.DateField('дата выполнения', null=True, blank=True)
    deadline = models.DateField('срок сдачи', null=True, blank=True)
    status = models.IntegerField(
        'статус',
        choices=Status.choices,
        default=Status.ACTIVE
    )
    priority = models.IntegerField(
        'приоритет',
        choices=Priority.choices,
        default=Priority.LOW
    )

    tags = models.ManyToManyField(
        Tag,
        blank=True,
        related_name='tasks',
        verbose_name='теги'
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='owned_tasks',
        verbose_name='владелец'
    )
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tasks',
        verbose_name='рабочее пространство'
    )
    assignees = models.ManyToManyField(
        User,
        blank=True,
        related_name='assigned_tasks',
        verbose_name='исполнители'
    )
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subtasks',
        verbose_name='родительская задача'
    )

    class Meta:
        verbose_name = 'задача'
        verbose_name_plural = 'задачи'
        ordering = ['-priority', 'due_date']

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        """Автоматически обновляем статус 'Просрочена' / 'Активна' при сохранении"""
        if self.status != self.Status.COMPLETED:
            limit = self.deadline or self.due_date
            if limit and timezone.now().date() > limit:
                self.status = self.Status.OVERDUE
            elif self.status == self.Status.OVERDUE:
                # Задачу перенесли — она снова активна
                self.status = self.Status.ACTIVE
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        """Проверка, просрочена ли задача"""
        return self.status == self.Status.OVERDUE

    @property
    def is_personal(self):
        """Проверка, является ли задача личной (не в workspace)"""
        return self.workspace is None

    @property
    def is_subtask(self):
        return self.parent_id is not None

    def can_be_completed_by(self, user):
        """Личную задачу отмечает автор. В пространстве: если есть исполнители —
        только они или админ/владелец пространства, иначе любой участник"""
        if not user or not user.is_authenticated:
            return False
        if not self.workspace_id:
            return self.owner_id == user.id
        workspace = self.workspace
        if workspace.owner_id == user.id:
            return True
        membership = workspace.memberships.filter(user=user).first()
        if not membership:
            return False
        if membership.role >= WorkspaceMembership.Role.ADMIN:
            return True
        assignee_ids = [a.id for a in self.assignees.all()]
        return not assignee_ids or user.id in assignee_ids

    def has_open_subtasks(self):
        return self.subtasks.exclude(status=self.Status.COMPLETED).exists()


class Comment(models.Model):
    """Модель комментария к задаче"""
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='задача'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='comments',
        verbose_name='автор'
    )
    text = models.TextField('текст')
    created_at = models.DateTimeField('дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('дата обновления', auto_now=True)

    class Meta:
        verbose_name = 'комментарий'
        verbose_name_plural = 'комментарии'
        ordering = ['-created_at']

    def __str__(self):
        return f"Комментарий от {self.author.username} к задаче '{self.task.title}'"


class TaskReadState(models.Model):
    """Когда пользователь последний раз читал комментарии задачи"""
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='task_read_states',
        verbose_name='пользователь'
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='read_states',
        verbose_name='задача'
    )
    last_read_at = models.DateTimeField('прочитано до')

    class Meta:
        verbose_name = 'прочтение комментариев'
        verbose_name_plural = 'прочтения комментариев'
        unique_together = ('user', 'task')

    def __str__(self):
        return f"{self.user.username}: {self.task.title}"
