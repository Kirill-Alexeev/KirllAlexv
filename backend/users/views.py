from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from django.contrib.auth import login, logout
from django.middleware.csrf import get_token
from django.db import transaction
from django.db.models import Q
from notifications.services import client_date
from task_planner.models import Workspace, task_stats
from .models import User
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, ChangePasswordSerializer
)


@api_view(['GET'])
def get_csrf_token(request):
    """Получить CSRF токен"""
    return Response({'csrfToken': get_token(request)})


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    """Регистрация нового пользователя"""
    serializer = UserCreateSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'token': token.key
        }, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login_view(request):
    """Авторизация пользователя"""
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        login(request, user)
        token, created = Token.objects.get_or_create(user=user)
        return Response({
            'user': UserSerializer(user, context={'request': request}).data,
            'token': token.key
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def logout_view(request):
    """Выход из системы"""
    logout(request)
    if hasattr(request, 'user') and request.user.is_authenticated:
        Token.objects.filter(user=request.user).delete()
    return Response({'detail': 'Successfully logged out'})


@api_view(['GET'])
def user_profile(request):
    """Получить профиль текущего пользователя"""
    serializer = UserSerializer(request.user, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
def profile_stats(request):
    """Статистика для страницы профиля"""
    user = request.user
    day = client_date(request.query_params.get('date'))
    return Response({
        **task_stats(user, day),
        'workspaces': Workspace.objects.filter(
            Q(owner=user) | Q(memberships__user=user)
        ).distinct().count(),
        'events': user.calendar_events.count(),
    })


@api_view(['PUT'])
def update_profile(request):
    """Обновить профиль пользователя"""
    serializer = UserUpdateSerializer(
        request.user,
        data=request.data,
        partial=True
    )
    if serializer.is_valid():
        serializer.save()
        return Response(UserSerializer(request.user, context={'request': request}).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def change_password(request):
    """Сменить пароль"""
    serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        if not request.user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': ['Неверный текущий пароль']},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            # Новый токен: другие устройства со старым паролем должны выйти из аккаунта
            Token.objects.filter(user=request.user).delete()
            token = Token.objects.create(user=request.user)
        return Response({'detail': 'Пароль успешно изменен', 'token': token.key})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
def delete_account(request):
    """Удаление аккаунта пользователя"""
    try:
        with transaction.atomic():
            user = request.user

            Token.objects.filter(user=user).delete()

            logout(request)

            photo = user.photo.name
            storage = user.photo.storage
            user.delete()
            if photo:
                storage.delete(photo)

            return Response(
                {'detail': 'Аккаунт успешно удален'},
                status=status.HTTP_200_OK
            )

    except Exception as e:
        return Response(
            {'detail': f'Ошибка при удалении аккаунта: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def user_list(request):
    """Список всех пользователей (только для админов)"""
    users = User.objects.all()
    serializer = UserSerializer(users, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def user_detail(request, pk):
    """Детальная информация о пользователе (только для админов)"""
    try:
        user = User.objects.get(pk=pk)
        serializer = UserSerializer(user)
        return Response(serializer.data)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Пользователь не найден'},
            status=status.HTTP_404_NOT_FOUND
        )


SIDEBAR_ACTIONS = ('task', 'workspace_task', 'event')


@api_view(['GET', 'PUT'])
@permission_classes([permissions.IsAuthenticated])
def sidebar_actions(request):
    """Какие кнопки быстрого добавления показывать в сайдбаре"""
    user = request.user
    if request.method == 'PUT':
        actions = request.data.get('actions')
        if not isinstance(actions, list) or any(a not in SIDEBAR_ACTIONS for a in actions):
            return Response(
                {'error': 'Недопустимый список действий'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # Порядок кнопок фиксированный, повторы отбрасываем
        user.sidebar_actions = [a for a in SIDEBAR_ACTIONS if a in actions]
        user.save(update_fields=['sidebar_actions'])
    return Response({'actions': user.sidebar_actions})
