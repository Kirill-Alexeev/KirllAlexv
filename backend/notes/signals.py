from django.db.models.signals import post_delete
from django.dispatch import receiver

from .models import NoteImage


@receiver(post_delete, sender=NoteImage)
def delete_image_file(sender, instance, **kwargs):
    """Вместе с записью удаляем и сам файл (в том числе при удалении заметки)"""
    if instance.image:
        instance.image.delete(save=False)
