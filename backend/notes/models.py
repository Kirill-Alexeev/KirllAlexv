import re

from django.conf import settings
from django.db import models

from .sanitizer import html_to_text

IMAGE_ID_RE = re.compile(r'data-image-id="(\d+)"')


class NoteTag(models.Model):
    """Личный тег заметок. С тегами задач не пересекается"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='note_tags',
        verbose_name='пользователь'
    )
    title = models.CharField('название', max_length=50)

    class Meta:
        verbose_name = 'тег заметок'
        verbose_name_plural = 'теги заметок'
        ordering = ['title']
        constraints = [
            models.UniqueConstraint(fields=['user', 'title'], name='unique_note_tag_title'),
        ]

    def __str__(self):
        return self.title


class Note(models.Model):
    """Заметка. Текст хранится очищенным HTML (см. sanitizer.py)"""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notes',
        verbose_name='пользователь'
    )
    title = models.CharField('название', max_length=200, blank=True)
    content = models.TextField('текст', blank=True)
    # Текст без разметки: для поиска и превью в списке
    text = models.TextField('текст без разметки', blank=True, editable=False)
    tags = models.ManyToManyField(
        NoteTag,
        blank=True,
        related_name='notes',
        verbose_name='теги'
    )
    created_at = models.DateTimeField('дата создания', auto_now_add=True)
    updated_at = models.DateTimeField('дата обновления', auto_now=True)

    class Meta:
        verbose_name = 'заметка'
        verbose_name_plural = 'заметки'
        ordering = ['-updated_at', '-id']

    def __str__(self):
        return self.title or f'Заметка #{self.pk}'

    def save(self, *args, **kwargs):
        self.text = html_to_text(self.content)
        update_fields = kwargs.get('update_fields')
        if update_fields is not None and 'content' in update_fields:
            kwargs['update_fields'] = {*update_fields, 'text'}
        super().save(*args, **kwargs)

    def image_ids_in_content(self):
        """id фотографий в порядке их появления в тексте"""
        return [int(value) for value in IMAGE_ID_RE.findall(self.content)]


def note_image_path(instance, filename):
    return f'notes/{instance.note.user_id}/{filename}'


class NoteImage(models.Model):
    """Фото, вставленное в заметку. В тексте на него ссылается data-image-id"""
    note = models.ForeignKey(
        Note,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name='заметка'
    )
    image = models.ImageField('изображение', upload_to=note_image_path)
    created_at = models.DateTimeField('дата загрузки', auto_now_add=True)

    class Meta:
        verbose_name = 'фото заметки'
        verbose_name_plural = 'фото заметок'
        ordering = ['id']

    def __str__(self):
        return f'Фото #{self.pk} ({self.note})'
