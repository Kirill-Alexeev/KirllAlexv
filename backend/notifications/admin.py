from django.contrib import admin

from .models import NotificationSettings, SentNotification


@admin.register(NotificationSettings)
class NotificationSettingsAdmin(admin.ModelAdmin):
    list_display = ['user']
    raw_id_fields = ['user']


@admin.register(SentNotification)
class SentNotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'key', 'created_at']
    search_fields = ['user__username', 'key']
    raw_id_fields = ['user']
