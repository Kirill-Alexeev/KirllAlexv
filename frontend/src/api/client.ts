import axios from 'axios'

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: false,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Интерцептор запросов — только токен авторизации
api.interceptors.request.use((config) => {
    const authToken = localStorage.getItem('authToken')
    if (authToken) {
        config.headers.Authorization = `Token ${authToken}`
    }
    return config
})

// Интерцептор ответов
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('authToken')
            localStorage.removeItem('user')
            window.location.href = '/auth/login'
        }
        return Promise.reject(error)
    }
)