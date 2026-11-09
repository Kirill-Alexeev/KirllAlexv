import { Dispatch } from 'redux'
import { notificationsApi } from '@/api/notifications'
import { toIso, today } from '@/utils/tasksUtils'
import { removeNotification, setNotifications } from './notificationsSlice'

export const fetchNotifications = () => async (dispatch: Dispatch) => {
    const { data } = await notificationsApi.getCurrent(toIso(today()))
    dispatch(setNotifications(data))
}

/** После изменения задач и событий: счётчик в сайдбаре не должен ждать следующего опроса */
export const refreshNotifications = (dispatch: Dispatch) => {
    fetchNotifications()(dispatch).catch(() => {
        // не критично: счётчик обновится при следующем опросе
    })
}

export const markNotificationsRead =() => async (dispatch: Dispatch) => {
    const { data } = await notificationsApi.markRead(toIso(today()))
    dispatch(setNotifications(data))
}

export const deleteNotification = (key: string) => async (dispatch: Dispatch) => {
    await notificationsApi.delete(key)
    dispatch(removeNotification(key))
}
