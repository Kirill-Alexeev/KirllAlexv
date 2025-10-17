import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { User, AuthState } from '@/types'

const initialState: AuthState = {
    user: null,
    token: localStorage.getItem('authToken'),
    isAuthenticated: !!localStorage.getItem('authToken'),
    isLoading: false,
    error: null,
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload
        },
        loginSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
            state.user = action.payload.user
            state.token = action.payload.token
            state.isAuthenticated = true
            state.error = null
            localStorage.setItem('authToken', action.payload.token)
            localStorage.setItem('user', JSON.stringify(action.payload.user))
        },
        logout: (state) => {
            state.user = null
            state.token = null
            state.isAuthenticated = false
            localStorage.removeItem('authToken')
            localStorage.removeItem('user')
        },
        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload }
                localStorage.setItem('user', JSON.stringify(state.user))
            }
        },
    },
})

export const { setLoading, setError, loginSuccess, logout, updateUser } = authSlice.actions
export default authSlice.reducer