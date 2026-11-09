from django.urls import path
from . import views

urlpatterns = [
    path('csrf/', views.get_csrf_token, name='csrf_token'),
    path('register/', views.register, name='register'),
    path('login/', views.login_view, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('profile/', views.user_profile, name='user_profile'),
    path('profile/update/', views.update_profile, name='update_profile'),
    path('profile/stats/', views.profile_stats, name='profile_stats'),
    path('profile/sidebar-actions/', views.sidebar_actions, name='sidebar_actions'),
    path('change-password/', views.change_password, name='change_password'),
    path('account/delete/', views.delete_account, name='delete_account'), 
    path('users/', views.user_list, name='user_list'),
    path('users/<int:pk>/', views.user_detail, name='user_detail'),
]
