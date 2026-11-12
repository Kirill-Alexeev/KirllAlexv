from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('tags', views.NoteTagViewSet, basename='note-tag')
router.register('notes', views.NoteViewSet, basename='note')

urlpatterns = [
    path('', include(router.urls)),
]
