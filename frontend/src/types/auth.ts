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

export interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
}

export interface LoginData {
    username: string
    password: string
}

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