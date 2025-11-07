import { Dispatch } from 'redux'
import { authApi } from '@/api/auth'
import { setLoading, setError, loginSuccess, logout } from './authSlice'
import { LoginData, RegisterData } from '@/types'

export const loginUser = (data: LoginData) => async (dispatch: Dispatch) => {
    try {
        dispatch(setLoading(true))
        dispatch(setError(null))

        const response = await authApi.login(data)
        dispatch(loginSuccess(response.data))

        return response.data
    } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Ошибка авторизации'
        dispatch(setError(errorMessage))
        throw error
    } finally {
        dispatch(setLoading(false))
    }
}

export const registerUser = (data: RegisterData) => async (dispatch: Dispatch) => {
    try {
        dispatch(setLoading(true))
        dispatch(setError(null))

        const response = await authApi.register(data)
        dispatch(loginSuccess(response.data))

        return response.data
    } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Ошибка регистрации'
        dispatch(setError(errorMessage))
        throw error
    } finally {
        dispatch(setLoading(false))
    }
}

export const logoutUser = () => async (dispatch: Dispatch) => {
    try {
        await authApi.logout()
    } catch (error) {
        console.error('Logout error:', error)
    } finally {
        dispatch(logout())
    }
}

export const checkAuth = () => async (dispatch: Dispatch) => {
    const token = localStorage.getItem('authToken')
    const userData = localStorage.getItem('user')

    if (token && userData) {
        try {
            const user = JSON.parse(userData)
            dispatch(loginSuccess({ user, token }))
        } catch (error) {
            dispatch(logout())
        }
    }
}

export const deleteAccount = () => async (dispatch: Dispatch) => {
    try {
        dispatch(setLoading(true))
        dispatch(setError(null))

        await authApi.deleteAccount()

        // Очищаем локальные данные
        dispatch(logout())

        // Очищаем localStorage
        const keysToRemove = [
            'authToken',
            'user',
            'userPreferences',
            'tasks',
            'notes',
            'books',
            'workouts',
            'budget',
            'sidebarState',
            'theme'
        ]

        keysToRemove.forEach(key => {
            localStorage.removeItem(key)
        })

        sessionStorage.clear()

    } catch (error: any) {
        const errorMessage = error.response?.data?.detail || 'Ошибка при удалении аккаунта'
        dispatch(setError(errorMessage))
        throw error
    } finally {
        dispatch(setLoading(false))
    }
}