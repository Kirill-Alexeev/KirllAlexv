import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { AppNotification, NotificationsState } from '@/types'

const initialState: NotificationsState = {
    items: [],
}

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        setNotifications: (state, action: PayloadAction<AppNotification[]>) => {
            state.items = action.payload
        },
        removeNotification: (state, action: PayloadAction<string>) => {
            state.items = state.items.filter(item => item.key !== action.payload)
        },
    },
})

export const { setNotifications, removeNotification } = notificationsSlice.actions

export default notificationsSlice.reducer
