from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('tags', views.TagViewSet, basename='tag')
router.register('workspaces', views.WorkspaceViewSet, basename='workspace')
router.register('workspace-memberships',
                views.WorkspaceMembershipViewSet, basename='workspacemembership')
router.register('tasks', views.TaskViewSet, basename='task')
router.register('subtasks', views.SubtaskViewSet, basename='subtask')
router.register('comments', views.CommentViewSet, basename='comment')

urlpatterns = [
    path('', include(router.urls)),
]
