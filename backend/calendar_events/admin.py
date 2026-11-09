from django.contrib import admin

from .models import CalendarEvent


@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ['title', 'user', 'date', 'is_yearly']
    list_filter = ['is_yearly']
    search_fields = ['title', 'user__username']
    raw_id_fields = ['user']
