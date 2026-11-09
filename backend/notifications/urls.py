from django.urls import path

from . import views

urlpatterns = [
    path('settings/', views.notification_settings, name='notification_settings'),
    path('current/', views.current_notifications, name='current_notifications'),
    path('current/<str:key>/', views.delete_notification, name='delete_notification'),
    path('read/', views.read_notifications, name='read_notifications'),
    path('poll/', views.poll_notifications, name='poll_notifications'),
]
