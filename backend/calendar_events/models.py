from django.conf import settings
from django.db import models


class CalendarEvent(models.Model):
    """Личное событие пользователя. Системные праздники хранятся в holidays.py"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='calendar_events',
        verbose_name='пользователь'
    )
    title = models.CharField('название', max_length=200)
    description = models.TextField('описание', blank=True)
    date = models.DateField('дата')
    is_yearly = models.BooleanField('повторять каждый год', default=False)
    created_at = models.DateTimeField('дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('дата обновления', auto_now=True)

    class Meta:
        verbose_name = 'событие календаря'
        verbose_name_plural = 'события календаря'
        ordering = ['date', 'id']

    def __str__(self):
        return f'{self.title} ({self.date})'
