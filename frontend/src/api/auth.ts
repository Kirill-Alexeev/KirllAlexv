// API запросы для аутентификации и пользовательских данных
import { api } from './client'

// Интерфейс данных для входа
export interface LoginData {
    username: string
    password: string
}

// Интерфейс данных для регистрации
export interface RegisterData {
    username: string
    email: string
    password: string
    password_confirm: string
    first_name?: string
    last_name?: string
    phone?: string
    date_of_birth?: string
}

// Интерфейс пользователя
export interface User {
    id: number
    username: string
    email: string
    first_name: string
    last_name: string
    photo: string | null
    photo_url: string | null
    phone: string | null
    bio: string | null
    date_of_birth: string | null
    is_staff: boolean
    is_active: boolean
    date_joined: string
    last_login: string | null
    created_at: string
    updated_at: string
}

// Интерфейс ответа аутентификации
export interface AuthResponse {
    user: User
    token: string
}

// Работа с API пользователей
export const authApi = {
    // Получение crsf токена
    getCsrfToken: () => api.get<{ csrfToken: string }>('/auth/csrf/'),

    // Вход
    login: (data: LoginData) =>
        api.post<AuthResponse>('/auth/login/', data),

    // Регистрация
    register: (data: RegisterData) =>
        api.post<AuthResponse>('/auth/register/', data),

    // Выход
    logout: () => api.post('/auth/logout/'),

    // Профиль
    getProfile: () => api.get<User>('/auth/profile/'),

    // Изменение профиля
    updateProfile: (data: Partial<User>) =>
        api.put<User>('/auth/profile/update/', data),

    // Смена пароля
    changePassword: (data: {
        old_password: string
        new_password: string
        new_password_confirm: string
    }) => api.post('/auth/change-password/', data),

    // Удаление аккаунта
    deleteAccount: () => api.delete<{ detail: string }>('/auth/account/delete/'),
}