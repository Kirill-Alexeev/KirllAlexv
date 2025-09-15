from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _


class User(AbstractUser):
    photo = models.ImageField(
        _('photo'),
        upload_to='users/photos/',
        null=True,
        blank=True,
        help_text=_('Фото профиля пользователя')
    )

    phone = models.CharField(
        _('phone number'),
        max_length=20,
        null=True,
        blank=True,
        help_text=_('Телефонный номер в международном формате')
    )

    bio = models.TextField(
        _('biography'),
        max_length=500,
        null=True,
        blank=True,
        help_text=_('Короткая биография или описание')
    )

    date_of_birth = models.DateField(
        _('date of birth'),
        null=True,
        blank=True,
        help_text=_('Дата рождения пользователя')
    )

    created_at = models.DateTimeField(
        _('created at'),
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        _('updated at'),
        auto_now=True
    )

    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-date_joined']

    def __str__(self):
        return self.username

    def get_full_name_or_username(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name if full_name else self.username

    def get_short_name(self):
        return self.first_name or self.username

    @property
    def has_photo(self):
        return bool(self.photo)
