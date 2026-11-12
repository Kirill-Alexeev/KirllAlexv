from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .models import Note, NoteTag
from .serializers import (
    NoteImageSerializer, NoteListSerializer, NoteSerializer, NoteTagSerializer,
)

# Фото, убранное из текста, удаляем не сразу: его ещё можно вернуть через Ctrl+Z
ORPHAN_IMAGE_TTL = timedelta(days=1)


class NoteTagViewSet(viewsets.ModelViewSet):
    serializer_class = NoteTagSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return NoteTag.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NoteViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return Note.objects.filter(user=self.request.user).prefetch_related('tags', 'images')

    def get_serializer_class(self):
        return NoteListSerializer if self.action == 'list' else NoteSerializer

    def list(self, request, *args, **kwargs):
        notes = self.get_queryset()
        tag_id = request.query_params.get('tag')
        if tag_id and tag_id.isdigit():
            notes = notes.filter(tags__id=int(tag_id))
        # Поиск в Python: SQLite не различает регистр кириллицы в LIKE
        query = request.query_params.get('search', '').strip().casefold()
        if query:
            notes = [n for n in notes if query in f'{n.title} {n.text}'.casefold()]
        return Response(self.get_serializer(notes, many=True).data)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        note = serializer.save()
        used = set(note.image_ids_in_content())
        note.images.exclude(id__in=used).filter(
            created_at__lt=timezone.now() - ORPHAN_IMAGE_TTL
        ).delete()

    @action(detail=True, methods=['post'])
    def images(self, request, pk=None):
        """Загрузить фото в заметку. В текст его вставляет фронтенд по id"""
        note = self.get_object()
        serializer = NoteImageSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save(note=note)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
