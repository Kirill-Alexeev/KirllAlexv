import { api } from './client'
import type { AppNotification, NotificationPreferences } from '@/types'

export const notificationsApi = {
    getSettings: () => api.get<NotificationPreferences>('/notifications/settings/'),
    saveSettings: (data: NotificationPreferences) =>
        api.put<NotificationPreferences>('/notifications/settings/', data),
    getCurrent: (date: string) =>
        api.get<AppNotification[]>('/notifications/current/', { params: { date } }),
    /** Отмечает текущие уведомления просмотренными и возвращает их */
    markRead: (date: string) => api.post<AppNotification[]>('/notifications/read/', { date }),
    delete: (key: string) => api.delete(`/notifications/current/${encodeURIComponent(key)}/`),
    /** Новые уведомления для тостов: сервер выпускает их в 8:00 и 22:00 по времени now */
    poll: (now: string) => api.post<AppNotification[]>('/notifications/poll/', { now }),
}
