from django.contrib import admin

from .models import Note, NoteImage, NoteTag


class NoteImageInline(admin.TabularInline):
    model = NoteImage
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Note)
class NoteAdmin(admin.ModelAdmin):
    list_display = ['__str__', 'user', 'updated_at']
    search_fields = ['title', 'text', 'user__username']
    filter_horizontal = ['tags']
    raw_id_fields = ['user']
    inlines = [NoteImageInline]


@admin.register(NoteTag)
class NoteTagAdmin(admin.ModelAdmin):
    list_display = ['title', 'user']
    search_fields = ['title', 'user__username']
    raw_id_fields = ['user']
