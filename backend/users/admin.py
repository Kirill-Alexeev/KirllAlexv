from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = [
        'username',
        'email',
        'first_name',
        'last_name',
        'phone',
        'date_of_birth',
        'is_staff',
        'is_active',
        'date_joined'
    ]

    list_filter = [
        'is_staff',
        'is_superuser',
        'is_active',
        'date_joined',
        'date_of_birth'
    ]

    search_fields = [
        'username',
        'email',
        'first_name',
        'last_name',
        'phone'
    ]

    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        (_('Personal info'), {
            'fields': (
                'first_name',
                'last_name',
                'email',
                'photo',
                'phone',
                'bio',
                'date_of_birth'
            )
        }),
        (_('Permissions'), {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions'
            ),
        }),
        (_('Important dates'), {
            'fields': (
                'last_login',
                'date_joined',
                'created_at',
                'updated_at'
            )
        }),
    )

    readonly_fields = [
        'last_login',
        'date_joined',
        'created_at',
        'updated_at'
    ]

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'username',
                'email',
                'password1',
                'password2',
                'first_name',
                'last_name',
                'phone'
            ),
        }),
    )

    ordering = ['-date_joined']

    list_per_page = 20


admin.site.site_header = _('User Administration')
admin.site.site_title = _('User Admin')
admin.site.index_title = _('User Management')
