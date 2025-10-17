import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { registerUser } from '@/stores/auth/authActions'
import { RootState } from '@/stores'
import './Register.scss'

export const Register: React.FC = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { isLoading, error, isAuthenticated } = useSelector((state: RootState) => state.auth)

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        phone: '',
    })

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/')
        }
    }, [isAuthenticated, navigate])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement
        setFormData(prev => ({
            ...prev,
            [target.name]: target.value
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        try {
            await dispatch(registerUser(formData) as any)
            navigate('/')
        } catch (error) {
            // Ошибка обрабатывается в slice
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    <h1 className="auth-title">Регистрация</h1>
                    <p className="auth-subtitle">Создайте новый аккаунт</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && (
                        <div className="auth-error">
                            {error}
                        </div>
                    )}

                    <div className="form-row">
                        <Input
                            type="text"
                            name="first_name"
                            label="Имя"
                            placeholder="Введите ваше имя"
                            value={formData.first_name}
                            onChange={handleChange}
                        />
                        <Input
                            type="text"
                            name="last_name"
                            label="Фамилия"
                            placeholder="Введите вашу фамилию"
                            value={formData.last_name}
                            onChange={handleChange}
                        />
                    </div>

                    <Input
                        type="text"
                        name="username"
                        label="Имя пользователя"
                        placeholder="Введите имя пользователя"
                        value={formData.username}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        type="email"
                        name="email"
                        label="Email"
                        placeholder="Введите ваш email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        type="text"
                        name="phone"
                        label="Телефон"
                        placeholder="Введите ваш телефон"
                        value={formData.phone}
                        onChange={handleChange}
                    />

                    <Input
                        type="password"
                        name="password"
                        label="Пароль"
                        placeholder="Введите пароль"
                        value={formData.password}
                        onChange={handleChange}
                        required
                    />

                    <Input
                        type="password"
                        name="password_confirm"
                        label="Подтверждение пароля"
                        placeholder="Повторите пароль"
                        value={formData.password_confirm}
                        onChange={handleChange}
                        required
                    />

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        loading={isLoading}
                        className="auth-submit-btn"
                    >
                        Зарегистрироваться
                    </Button>
                </form>

                <div className="auth-footer">
                    <p>
                        Уже есть аккаунт?{' '}
                        <Link to="/auth/login" className="auth-link">
                            Войти
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}