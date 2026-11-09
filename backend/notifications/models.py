from django.conf import settings
from django.db import models


class NotificationSettings(models.Model):
    """Какие уведомления получает пользователь (структура — в services.DEFAULT_PREFERENCES)"""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_settings',
        verbose_name='пользователь'
    )
    preferences = models.JSONField('настройки', default=dict, blank=True)
    last_reminder_at = models.DateTimeField('последнее напоминание', null=True, blank=True)

    class Meta:
        verbose_name = 'настройки уведомлений'
        verbose_name_plural = 'настройки уведомлений'

    def __str__(self):
        return f'Настройки уведомлений: {self.user}'


class SentNotification(models.Model):
    """Выпущенное уведомление: на каждый тип (key) одна запись, новое напоминание её обновляет"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_notifications',
        verbose_name='пользователь'
    )
    key = models.CharField('ключ', max_length=100)
    is_read = models.BooleanField('просмотрено', default=False)
    is_deleted = models.BooleanField('удалено', default=False)
    created_at = models.DateTimeField('отправлено', auto_now_add=True)

    class Meta:
        verbose_name = 'отправленное уведомление'
        verbose_name_plural = 'отправленные уведомления'
        constraints = [
            models.UniqueConstraint(fields=['user', 'key'], name='unique_sent_notification'),
        ]

    def __str__(self):
        return f'{self.user}: {self.key}'
