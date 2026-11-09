import { Dispatch } from 'redux'
import { calendarApi } from '@/api/calendar'
import { parseApiError } from '@/utils'
import type { RootState } from '@/stores'
import type { CalendarEventData, CalendarRange } from '@/types'
import { rollForwardTasks } from '@/stores/tasks/tasksActions'
import { setTasks } from '@/stores/tasks/tasksSlice'
import { refreshNotifications } from '@/stores/notifications/notificationsActions'
import {
    setCalendarError,
    setCalendarEvents,
    setCalendarLoading,
    setCalendarRange,
} from './calendarSlice'

// При быстром переключении месяцев учитываем только последний запрос
let lastRequestId = 0

/** События и задачи месяца. Задачи кладём в общий стор, чтобы работали их модалки */
export const fetchCalendar = (range: CalendarRange) => async (dispatch: Dispatch) => {
    const requestId = ++lastRequestId
    dispatch(setCalendarRange(range))
    dispatch(setCalendarLoading(true))
    dispatch(setCalendarError(null))
    try {
        await rollForwardTasks()
        const [events, tasks] = await Promise.all([
            calendarApi.getEvents(range),
            calendarApi.getTasks(range),
        ])
        if (requestId !== lastRequestId) return
        dispatch(setCalendarEvents(events.data))
        dispatch(setTasks(tasks.data))
    } catch (error: unknown) {
        if (requestId === lastRequestId) dispatch(setCalendarError(parseApiError(error)))
    } finally {
        if (requestId === lastRequestId) dispatch(setCalendarLoading(false))
    }
}

/** Перечитать события, если сейчас открыт календарь */
const refreshEvents = async (dispatch: Dispatch, getState: () => RootState) => {
    const { range } = getState().calendar
    if (!range) return
    const response = await calendarApi.getEvents(range)
    dispatch(setCalendarEvents(response.data))
}

/** Создать событие или, если передан id, изменить существующее */
export const saveEvent = (data: CalendarEventData, id?: number) =>
    async (dispatch: Dispatch, getState: () => RootState) => {
        if (id) await calendarApi.updateEvent(id, data)
        else await calendarApi.createEvent(data)
        refreshNotifications(dispatch)
        await refreshEvents(dispatch, getState)
    }

export const removeEvent = (id: number) =>
    async (dispatch: Dispatch, getState: () => RootState) => {
        await calendarApi.deleteEvent(id)
        refreshNotifications(dispatch)
        await refreshEvents(dispatch, getState)
    }
