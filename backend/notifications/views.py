from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from . import services


@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def notification_settings(request):
    if request.method == 'PUT':
        return Response(services.save_preferences(request.user, request.data))
    return Response(services.get_preferences(request.user))


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_notifications(request):
    day = services.client_date(request.query_params.get('date'))
    return Response(services.current_notifications(request.user, day))


@api_view(['DELETE'])
@permission_classes([permissions.IsAuthenticated])
def delete_notification(request, key):
    services.delete_notification(request.user, key)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def read_notifications(request):
    """Отмечает текущие уведомления просмотренными и возвращает их"""
    day = services.client_date(request.data.get('date'))
    return Response(services.mark_all_read(request.user, day))


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def poll_notifications(request):
    """Новые уведомления для тостов: появляются только в 8:00 и 22:00 у пользователя"""
    now = services.client_now(request.data.get('now'))
    return Response(services.take_new_notifications(request.user, now))
