// API запросы для аутентификации и пользовательских данных
import { api } from './client'
import { LoginData } from "@/types/auth";
import { AuthResponse } from "@/types/auth";
import { RegisterData } from "@/types/auth";
import { User } from "@/types/auth";

// Работа с API пользователей
export const authApi = {
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