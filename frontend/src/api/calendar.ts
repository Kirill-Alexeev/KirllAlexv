import { api } from './client'
import type { CalendarEventData, CalendarOccurrence, CalendarRange, Task } from '@/types'

export const calendarApi = {
    getEvents: ({ from, to }: CalendarRange) =>
        api.get<CalendarOccurrence[]>('/calendar/events/', { params: { from, to } }),
    createEvent: (data: CalendarEventData) => api.post('/calendar/events/', data),
    updateEvent: (id: number, data: CalendarEventData) =>
        api.put(`/calendar/events/${id}/`, data),
    deleteEvent: (id: number) => api.delete(`/calendar/events/${id}/`),
    getTasks: ({ from, to }: CalendarRange) =>
        api.get<Task[]>('/tasks/tasks/calendar/', { params: { from, to } }),
}
