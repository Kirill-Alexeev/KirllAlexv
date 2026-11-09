from datetime import date, timedelta

from django.db.models import Q
from rest_framework.exceptions import ValidationError

from .holidays import SYSTEM_HOLIDAYS
from .models import CalendarEvent

MAX_RANGE_DAYS = 400


def parse_date_range(query_params):
    """Разбирает ?from=YYYY-MM-DD&to=YYYY-MM-DD"""
    try:
        start = date.fromisoformat(query_params.get('from', ''))
        end = date.fromisoformat(query_params.get('to', ''))
    except ValueError:
        raise ValidationError({'error': 'Укажите from и to в формате ГГГГ-ММ-ДД'})
    if end < start or end - start > timedelta(days=MAX_RANGE_DAYS):
        raise ValidationError({'error': 'Некорректный диапазон дат'})
    return start, end


def _in_year(source, year):
    """Дата ежегодного события в нужном году (29 февраля в невисокосный — 28-е)"""
    try:
        return source.replace(year=year)
    except ValueError:
        return date(year, 2, 28)


def _serialize(event, day):
    return {
        'id': event.id,
        'title': event.title,
        'description': event.description,
        'date': day.isoformat(),
        'source_date': event.date.isoformat(),
        'is_yearly': event.is_yearly,
        'is_system': False,
    }


def get_occurrences(user, start, end, created_before=None):
    """Системные и личные события в диапазоне, ежегодные развёрнуты по датам"""
    years = range(start.year, end.year + 1)
    result = []

    for year in years:
        for month, day_number, title in SYSTEM_HOLIDAYS:
            day = date(year, month, day_number)
            if start <= day <= end:
                result.append({
                    'id': f'system-{day.isoformat()}',
                    'title': title,
                    'description': '',
                    'date': day.isoformat(),
                    'source_date': day.isoformat(),
                    'is_yearly': True,
                    'is_system': True,
                })

    events = CalendarEvent.objects.filter(user=user).filter(
        Q(is_yearly=False, date__range=(start, end)) |
        Q(is_yearly=True, date__lte=end)
    )
    if created_before is not None:
        events = events.filter(created_at__lte=created_before)
    for event in events:
        if not event.is_yearly:
            result.append(_serialize(event, event.date))
            continue
        for year in years:
            day = _in_year(event.date, year)
            if start <= day <= end and day >= event.date:
                result.append(_serialize(event, day))

    result.sort(key=lambda item: (item['date'], not item['is_system'], item['title']))
    return result
