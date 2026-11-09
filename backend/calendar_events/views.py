from rest_framework import permissions, viewsets
from rest_framework.response import Response

from .models import CalendarEvent
from .serializers import CalendarEventSerializer
from .services import get_occurrences, parse_date_range


class CalendarEventViewSet(viewsets.ModelViewSet):
    serializer_class = CalendarEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return CalendarEvent.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def list(self, request, *args, **kwargs):
        start, end = parse_date_range(request.query_params)
        return Response(get_occurrences(request.user, start, end))
