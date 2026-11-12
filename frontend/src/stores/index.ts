import { configureStore } from '@reduxjs/toolkit'
import authReducer from './auth/authSlice'
import tasksReducer from './tasks/tasksSlice'
import calendarReducer from './calendar/calendarSlice'
import notificationsReducer from './notifications/notificationsSlice'
import notesReducer from './notes/notesSlice'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        tasks: tasksReducer,
        calendar: calendarReducer,
        notifications: notificationsReducer,
        notes: notesReducer,
    },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch