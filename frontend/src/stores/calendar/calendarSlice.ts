import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { CalendarOccurrence, CalendarRange, CalendarState } from '@/types'

const initialState: CalendarState = {
    events: [],
    range: null,
    isLoading: false,
    error: null,
}

const calendarSlice = createSlice({
    name: 'calendar',
    initialState,
    reducers: {
        setCalendarLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
        setCalendarError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },
        setCalendarRange: (state, action: PayloadAction<CalendarRange | null>) => {
            state.range = action.payload
        },
        setCalendarEvents: (state, action: PayloadAction<CalendarOccurrence[]>) => {
            state.events = action.payload
        },
    },
})

export const {
    setCalendarLoading,
    setCalendarError,
    setCalendarRange,
    setCalendarEvents,
} = calendarSlice.actions

export default calendarSlice.reducer
