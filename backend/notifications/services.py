from datetime import date, datetime, timedelta

from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from calendar_events.services import get_occurrences
from task_planner.models import Task, agenda_tasks, overdue_filter as task_overdue_filter
from .models import NotificationSettings, SentNotification

DEFAULT_PREFERENCES = {
    'enabled': True,
    'apps': {
        'tasks': {'enabled': True, 'overdue': True, 'today': True},
        'calendar': {'enabled': True, 'today': True, 'tomorrow': True, 'holidays': True},
    },
}

REMINDER_HOURS = (22, 8)


def _merge(stored, defaults):
    """Значения пользователя поверх значений по умолчанию; лишние ключи отбрасываются"""
    stored = stored if isinstance(stored, dict) else {}
    result = {}
    for key, default in defaults.items():
        if isinstance(default, dict):
            result[key] = _merge(stored.get(key), default)
        else:
            value = stored.get(key, default)
            result[key] = value if isinstance(value, bool) else default
    return result


def _check_types(data, defaults):
    if not isinstance(data, dict):
        raise ValidationError({'error': 'Неверный формат настроек'})
    for key, value in data.items():
        if key not in defaults:
            continue
        if isinstance(defaults[key], dict):
            _check_types(value, defaults[key])
        elif not isinstance(value, bool):
            raise ValidationError({'error': f'Значение «{key}» должно быть true или false'})


def get_preferences(user):
    record = NotificationSettings.objects.filter(user=user).first()
    return _merge(record.preferences if record else None, DEFAULT_PREFERENCES)


def save_preferences(user, data):
    _check_types(data, DEFAULT_PREFERENCES)
    preferences = _merge(data, DEFAULT_PREFERENCES)
    NotificationSettings.objects.update_or_create(
        user=user, defaults={'preferences': preferences})
    return preferences


def client_date(value):
    """Дата пользователя: сервер работает в UTC, а «сегодня» зависит от часового пояса"""
    try:
        return date.fromisoformat(value)
    except (TypeError, ValueError):
        return timezone.localdate()


def client_now(value):
    """Момент времени с часовым поясом пользователя: от него зависит, наступило ли 8 утра"""
    try:
        moment = datetime.fromisoformat(value)
    except (TypeError, ValueError):
        return timezone.localtime()
    return moment if timezone.is_aware(moment) else timezone.make_aware(moment)


def _reminder_slot(now):
    """Последнее напоминание текущего дня; до 8 утра его ещё нет"""
    for hour in REMINDER_HOURS:
        if now.hour >= hour:
            return now.replace(hour=hour, minute=0, second=0, microsecond=0)
    return None


def _titles(titles, limit=2):
    shown = ', '.join(f'«{title}»' for title in titles[:limit])
    rest = len(titles) - limit
    return f'{shown} и ещё {rest}' if rest > 0 else shown


def _item(app, kind, title, titles, link, action_label):
    return {
        'key': f'{app}.{kind}',
        'app': app,
        'type': kind,
        'title': title,
        'message': _titles(titles),
        'titles': titles,
        'link': link,
        'action_label': action_label,
        'is_read': False,
    }


def _task_notifications(user, day, prefs, created_before):
    result = []
    tasks = agenda_tasks(user).exclude(status=Task.Status.COMPLETED).filter(
        created_at__lte=created_before)

    overdue_filter = task_overdue_filter(day)
    if prefs['overdue']:
        titles = list(tasks.filter(overdue_filter).values_list('title', flat=True))
        if titles:
            result.append(_item('tasks', 'overdue', f'Просроченные задачи: {len(titles)}',
                                titles, '/tasks', 'К задачам'))
    if prefs['today']:
        # Как на фронтенде: задача с прошедшей датой «доезжает» до дедлайна
        titles = list(tasks.exclude(overdue_filter).filter(
            Q(due_date=day) | Q(due_date__lt=day, deadline__gte=day)
        ).values_list('title', flat=True))
        if titles:
            result.append(_item('tasks', 'today', f'Задачи на сегодня: {len(titles)}',
                                titles, '/tasks?view=today', 'К задачам'))
    return result


def _calendar_notifications(user, day, prefs, created_before):
    tomorrow = day + timedelta(days=1)
    occurrences = get_occurrences(user, day, tomorrow, created_before)
    today_iso, tomorrow_iso = day.isoformat(), tomorrow.isoformat()
    result = []

    def titles(on_date, system):
        return [e['title'] for e in occurrences
                if e['date'] == on_date and e['is_system'] == system]

    def add(kind, title, names, on_date):
        if names:
            result.append(_item('calendar', kind, title, names,
                                f'/calendar?date={on_date}', 'В календарь'))

    if prefs['holidays']:
        add('holidays', 'Сегодня праздник', titles(today_iso, True), today_iso)
    if prefs['today']:
        add('today', 'События сегодня', titles(today_iso, False), today_iso)
    if prefs['tomorrow']:
        add('tomorrow', 'События завтра', titles(tomorrow_iso, False), tomorrow_iso)
    return result


def build_notifications(user, day, created_before):
    """Уведомления на дату с учётом настроек — только о том, что создано до напоминания"""
    prefs = get_preferences(user)
    if not prefs['enabled']:
        return []
    result = []
    if prefs['apps']['tasks']['enabled']:
        result += _task_notifications(user, day, prefs['apps']['tasks'], created_before)
    if prefs['apps']['calendar']['enabled']:
        result += _calendar_notifications(user, day, prefs['apps']['calendar'], created_before)
    return result


def current_notifications(user, day):
    """Выпущенные напоминания: без удалённых и с отметкой о просмотре"""
    record = NotificationSettings.objects.filter(user=user).first()
    if record is None or record.last_reminder_at is None:
        return []
    states = {state.key: state for state in SentNotification.objects.filter(user=user)}
    result = []
    for item in build_notifications(user, day, record.last_reminder_at):
        state = states.get(item['key'])
        if state and not state.is_deleted:
            result.append({**item, 'is_read': state.is_read})
    return result


def mark_all_read(user, day):
    items = current_notifications(user, day)
    SentNotification.objects.filter(
        user=user, key__in=[item['key'] for item in items]
    ).update(is_read=True)
    return [{**item, 'is_read': True} for item in items]


def delete_notification(user, key):
    """Скрывает уведомление до следующего напоминания"""
    if not SentNotification.objects.filter(user=user, key=key).update(is_deleted=True):
        raise NotFound({'error': 'Уведомление не найдено'})


def _issue(user, items):
    """Записывает одиночными запросами: update_or_create читает и пишет в одной
    транзакции, и параллельные запросы падают в SQLite с «database is locked»"""
    SentNotification.objects.filter(
        user=user, key__in=[item['key'] for item in items]
    ).update(is_read=False, is_deleted=False)
    SentNotification.objects.bulk_create(
        [SentNotification(user=user, key=item['key']) for item in items],
        ignore_conflicts=True,
    )


def take_new_notifications(user, now):
    """Выпускает напоминание, если подошло его время, и возвращает новые уведомления.
    Непросмотренное уведомление того же типа продолжает висеть вместо нового"""
    slot = _reminder_slot(now)
    if slot is None:
        return []
    record, _ = NotificationSettings.objects.get_or_create(user=user)
    previous = record.last_reminder_at
    if previous is not None and previous >= slot:
        return []

    day = slot.date()
    hanging = {item['key'] for item in current_notifications(user, day) if not item['is_read']}
    # Из нескольких одновременных запросов (вкладок) напоминание выпустит только один
    claimed = NotificationSettings.objects.filter(
        pk=record.pk, last_reminder_at=previous
    ).update(last_reminder_at=slot)
    if not claimed:
        return []

    items = build_notifications(user, day, slot)
    SentNotification.objects.filter(user=user).exclude(
        key__in=[item['key'] for item in items]
    ).delete()
    fresh = [item for item in items if item['key'] not in hanging]
    _issue(user, fresh)
    return fresh
