// API запросы для аутентификации и пользовательских данных
import { api } from './client'
import { LoginData } from "@/types/auth";
import { AuthResponse } from "@/types/auth";
import { RegisterData } from "@/types/auth";
import { ProfileStats, ProfileUpdateData, User } from "@/types/auth";
import type { SidebarActionId } from "@/types/notifications";

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
    updateProfile: (data: ProfileUpdateData) =>
        api.put<User>('/auth/profile/update/', data),

    // Фото профиля
    uploadPhoto: (file: File) => {
        const form = new FormData()
        form.append('photo', file)
        return api.put<User>('/auth/profile/update/', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
    },
    deletePhoto: () => api.put<User>('/auth/profile/update/', { photo: null }),

    // Статистика профиля
    getProfileStats: (date: string) =>
        api.get<ProfileStats>('/auth/profile/stats/', { params: { date } }),

    // Быстрые действия в сайдбаре
    getSidebarActions: () =>
        api.get<{ actions: SidebarActionId[] }>('/auth/profile/sidebar-actions/'),
    saveSidebarActions: (actions: SidebarActionId[]) =>
        api.put<{ actions: SidebarActionId[] }>('/auth/profile/sidebar-actions/', { actions }),

    // Смена пароля
    changePassword: (data: {
        old_password: string
        new_password: string
        new_password_confirm: string
    }) => api.post<{ detail: string; token: string }>('/auth/change-password/', data),

    // Удаление аккаунта
    deleteAccount: () => api.delete<{ detail: string }>('/auth/account/delete/'),
}