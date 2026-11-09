import { configureStore } from '@reduxjs/toolkit'
import authReducer from './auth/authSlice'
import tasksReducer from './tasks/tasksSlice'
import calendarReducer from './calendar/calendarSlice'
import notificationsReducer from './notifications/notificationsSlice'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        tasks: tasksReducer,
        calendar: calendarReducer,
        notifications: notificationsReducer,
    },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch