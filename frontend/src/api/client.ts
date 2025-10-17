import axios from 'axios'

export const API_BASE_URL = 'http://localhost:8000/api'

export const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: false,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Переменная для хранения CSRF токена
let csrfToken: string | null = null

// Функция для получения CSRF токена
export const getCsrfToken = async (): Promise<string> => {
    if (!csrfToken) {
        try {
            const response = await api.get<{ csrfToken: string }>('/auth/csrf/')
            csrfToken = response.data.csrfToken
        } catch (error) {
            console.error('Failed to get CSRF token:', error)
            throw error
        }
    }
    return csrfToken
}

// Интерцептор для добавления CSRF токена
api.interceptors.request.use(async (config) => {
    // Для методов, которые требуют CSRF защиты
    if (['post', 'put', 'patch', 'delete'].includes(config.method?.toLowerCase() || '')) {
        try {
            const token = await getCsrfToken()
            if (token) {
                config.headers['X-CSRFToken'] = token
            }
        } catch (error) {
            console.error('CSRF token not available')
        }
    }

    // Добавляем токен аутентификации если есть
    const authToken = localStorage.getItem('authToken')
    if (authToken) {
        config.headers.Authorization = `Token ${authToken}`
    }

    return config
})

// Интерцептор для обработки ошибок
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('authToken')
            localStorage.removeItem('user')
        }
        return Promise.reject(error)
    }
)