import { Dispatch } from 'redux'
import { authApi } from '@/api/auth'
import { setLoading, setError, loginSuccess, logout } from './authSlice'
import { LoginData, RegisterData } from '@/types'
import { parseApiError } from '@/utils/index'

export const loginUser = (data: LoginData) => async (dispatch: Dispatch) => {
    try {
        dispatch(setLoading(true))
        dispatch(setError(null))

        const response = await authApi.login(data)
        dispatch(loginSuccess(response.data))

        return response.data
    } catch (error: any) {
        const errorMessage = parseApiError(error)
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
        const errorMessage = parseApiError(error)
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

    if (!token) {
        dispatch(logout())
        return
    }

    try {
        dispatch(setLoading(true))
        const response = await authApi.getProfile()
        dispatch(loginSuccess({
            user: response.data,
            token
        }))
    } catch (error) {
        dispatch(logout())
    } finally {
        dispatch(setLoading(false))
    }
}

export const deleteAccount = () => async (dispatch: Dispatch) => {
    try {
        dispatch(setLoading(true))
        dispatch(setError(null))

        await authApi.deleteAccount()
        dispatch(logout())

        localStorage.clear()
        sessionStorage.clear()

    } catch (error: any) {
        dispatch(setError(parseApiError(error)))
        throw error
    } finally {
        dispatch(setLoading(false))
    }
}