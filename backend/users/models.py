from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    photo = models.ImageField(
        'фото',
        upload_to='users/photos/',
        null=True,
        blank=True,
        help_text='Фото профиля пользователя'
    )

    phone = models.CharField(
        'номер телефона',
        max_length=20,
        null=True,
        blank=True,
        help_text='Телефонный номер в международном формате'
    )

    bio = models.TextField(
        'биография',
        max_length=500,
        null=True,
        blank=True,
        help_text='Короткая биография или описание'
    )

    date_of_birth = models.DateField(
        'дата рождения',
        null=True,
        blank=True,
        help_text='Дата рождения пользователя'
    )

    created_at = models.DateTimeField(
        'дата создания',
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        'дата обновления',
        auto_now=True
    )

    class Meta:
        verbose_name = 'пользователь'
        verbose_name_plural = 'пользователи'
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
